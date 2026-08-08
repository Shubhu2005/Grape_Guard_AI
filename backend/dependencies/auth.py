"""Shared authentication dependencies for FastAPI route handlers."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, TypeVar

from fastapi import Header, HTTPException

from config.supabase_config import admin_supabase

logger = logging.getLogger("grapeguard.auth")
T = TypeVar("T")

TRANSIENT_SUPABASE_ERRORS = (
    "RemoteProtocolError",
    "ReadError",
    "ReadTimeout",
    "ConnectError",
    "ConnectTimeout",
    "PoolTimeout",
)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    role: str
    full_name: str


def _extract_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return authorization[7:].strip()


def _is_transient_supabase_error(exc: Exception) -> bool:
    haystack = f"{type(exc).__name__}: {exc}"
    return any(name in haystack for name in TRANSIENT_SUPABASE_ERRORS)


def _call_supabase(operation: Callable[[], T], description: str) -> T:
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            return operation()
        except Exception as exc:
            last_exc = exc
            if not _is_transient_supabase_error(exc):
                raise
            logger.warning(
                "Transient Supabase error during %s (attempt %d/3): %s",
                description,
                attempt + 1,
                exc,
            )
            time.sleep(0.2 * (attempt + 1))

    logger.error("Supabase unavailable during %s: %s", description, last_exc)
    raise HTTPException(status_code=503, detail="Authentication service is temporarily unavailable")


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    """Validate the Bearer token and return the authenticated user with profile."""
    token = _extract_token(authorization)
    try:
        user_resp = _call_supabase(lambda: admin_supabase.auth.get_user(token), "token validation")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user_resp.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = user_resp.user
    try:
        profile_resp = _call_supabase(
            lambda: (
                admin_supabase.table("profiles")
                .select("full_name, role, phone, location")
                .eq("id", user.id)
                .single()
                .execute()
            ),
            "profile lookup",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Profile lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Profile lookup is temporarily unavailable")

    if not profile_resp.data:
        raise HTTPException(status_code=404, detail="Profile not found for this account")

    return CurrentUser(
        id=user.id,
        email=user.email or "",
        role=profile_resp.data.get("role", ""),
        full_name=profile_resp.data.get("full_name", "User"),
    )


def require_farmer(current_user: CurrentUser = None) -> CurrentUser:
    """Verify the current user has farmer role."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if current_user.role != "farmer":
        raise HTTPException(status_code=403, detail="Farmer access required")
    return current_user


def require_expert(current_user: CurrentUser = None) -> CurrentUser:
    """Verify the current user has expert role."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if current_user.role != "expert":
        raise HTTPException(status_code=403, detail="Expert access required")
    return current_user
