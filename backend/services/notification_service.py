from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


logger = logging.getLogger("grapeguard.notifications")

FCM_SERVICE_ACCOUNT_PATH = os.getenv("FCM_SERVICE_ACCOUNT_PATH", "").strip()
FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "").strip()
FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


def _notifications_enabled() -> bool:
    return bool(FCM_SERVICE_ACCOUNT_PATH and FCM_PROJECT_ID)


def _get_credentials():
    if not _notifications_enabled():
        raise RuntimeError("FCM credentials are not configured")

    service_account_path = Path(FCM_SERVICE_ACCOUNT_PATH)
    if not service_account_path.exists():
        raise RuntimeError(f"Firebase service account file not found: {service_account_path}")

    return service_account.Credentials.from_service_account_file(
        str(service_account_path),
        scopes=FCM_SCOPES,
    )


def _get_access_token() -> str:
    credentials = _get_credentials()
    credentials.refresh(Request())
    return credentials.token


def notifications_ready() -> bool:
    if not _notifications_enabled():
        return False
    try:
        _get_access_token()
        return True
    except Exception as exc:
        logger.warning("Notifications unavailable: %s", exc)
        return False


def upsert_device_token(*, user_id: str, role: str, token: str, user_supabase) -> None:
    if not token:
        return
    user_supabase.table("device_tokens").upsert(
        {
            "user_id": user_id,
            "role": role,
            "fcm_token": token,
            "is_active": True,
        },
        on_conflict="user_id,fcm_token",
    ).execute()


def deactivate_device_token(*, user_id: str, token: str, user_supabase) -> None:
    if not token:
        return
    (
        user_supabase.table("device_tokens")
        .update({"is_active": False})
        .eq("user_id", user_id)
        .eq("fcm_token", token)
        .execute()
    )


def get_active_tokens_for_user(*, user_id: str, user_supabase) -> list[str]:
    response = (
        user_supabase.table("device_tokens")
        .select("fcm_token")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    return [row.get("fcm_token", "") for row in (response.data or []) if row.get("fcm_token")]


def get_active_tokens_for_role(*, role: str, user_supabase) -> list[str]:
    response = (
        user_supabase.table("device_tokens")
        .select("fcm_token")
        .eq("role", role)
        .eq("is_active", True)
        .execute()
    )
    return [row.get("fcm_token", "") for row in (response.data or []) if row.get("fcm_token")]


def get_user_ids_for_role(*, role: str, user_supabase) -> list[str]:
    response = (
        user_supabase.table("profiles")
        .select("id")
        .eq("role", role)
        .execute()
    )
    return [row.get("id", "") for row in (response.data or []) if row.get("id")]


def create_notification(
    *,
    user_id: str,
    role: str,
    title: str,
    body: str,
    notification_type: str,
    report_id: str,
    data: dict[str, Any],
    user_supabase,
) -> None:
    if not user_id:
        return
    try:
        user_supabase.table("notifications").insert(
            {
                "user_id": user_id,
                "role": role,
                "title": title,
                "body": body,
                "type": notification_type,
                "report_id": report_id or None,
                "data": data or {},
            }
        ).execute()
    except Exception as exc:
        logger.warning("Failed to save notification for user %s: %s", user_id, exc)


def _send_message(*, token: str, title: str, body: str, data: dict[str, str]) -> None:
    access_token = _get_access_token()
    url = f"https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send"
    payload = {
        "message": {
            "token": token,
            "notification": {
                "title": title,
                "body": body,
            },
            "data": data,
        }
    }
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        data=json.dumps(payload),
        timeout=20,
    )
    response.raise_for_status()


def _send_to_tokens(*, tokens: list[str], title: str, body: str, data: dict[str, str]) -> None:
    unique_tokens = [token for token in dict.fromkeys(tokens) if token]
    if not unique_tokens:
        return
    success_count = 0
    failure_count = 0
    for token in unique_tokens:
        try:
            _send_message(token=token, title=title, body=body, data=data)
            success_count += 1
        except Exception as exc:
            failure_count += 1
            logger.warning("FCM send failed for token: %s", exc)
    logger.info("FCM send finished: success=%s failure=%s", success_count, failure_count)


def notify_experts_new_request(*, report_id: str, disease_name: str, farmer_name: str, user_supabase) -> None:
    safe_disease_name = disease_name or "Unknown"
    safe_farmer_name = farmer_name or "Farmer"
    title = "New leaf review request"
    body = f"{safe_farmer_name} submitted a {safe_disease_name} analysis for review."
    data = {
        "type": "NEW_REVIEW_REQUEST",
        "report_id": report_id,
        "disease_name": safe_disease_name,
    }
    for expert_id in get_user_ids_for_role(role="expert", user_supabase=user_supabase):
        create_notification(
            user_id=expert_id,
            role="expert",
            title=title,
            body=body,
            notification_type="NEW_REVIEW_REQUEST",
            report_id=report_id,
            data=data,
            user_supabase=user_supabase,
        )

    if not notifications_ready():
        return
    tokens = get_active_tokens_for_role(role="expert", user_supabase=user_supabase)
    if not tokens:
        logger.info("No active expert FCM tokens found")
        return
    _send_to_tokens(
        tokens=tokens,
        title=title,
        body=body,
        data=data,
    )


def notify_farmer_review_result(
    *,
    farmer_id: str,
    report_id: str,
    status: str,
    disease_name: str,
    expert_comment: str,
    user_supabase,
) -> None:
    readable_status = "APPROVED" if status == "verified" else "REJECTED"
    body = f"Expert reviewed your {disease_name or 'plant disease'} request: {readable_status}."
    if expert_comment:
        body = f"{body} {expert_comment[:120]}"
    data = {
        "type": "REVIEW_RESULT",
        "report_id": report_id,
        "status": status,
        "disease_name": disease_name or "",
        "expert_comment": expert_comment or "",
    }
    create_notification(
        user_id=farmer_id,
        role="farmer",
        title="Expert review completed",
        body=body,
        notification_type="REVIEW_RESULT",
        report_id=report_id,
        data=data,
        user_supabase=user_supabase,
    )

    if not notifications_ready():
        return
    tokens = get_active_tokens_for_user(user_id=farmer_id, user_supabase=user_supabase)
    if not tokens:
        logger.info("No active FCM tokens found for farmer %s", farmer_id)
        return
    _send_to_tokens(
        tokens=tokens,
        title="Expert review completed",
        body=body,
        data=data,
    )
