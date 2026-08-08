from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from config.supabase_config import admin_supabase
from dependencies.auth import CurrentUser, get_current_user
from services.notification_service import deactivate_device_token, upsert_device_token

router = APIRouter()
logger = logging.getLogger("grapeguard.notifications")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DeviceTokenRequest(BaseModel):
    fcm_token: str


@router.post("/register-token")
def register_token(
    payload: DeviceTokenRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    token = payload.fcm_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="FCM token is required")

    upsert_device_token(
        user_id=current_user.id,
        role=current_user.role,
        token=token,
        user_supabase=admin_supabase,
    )
    logger.info("Registered FCM token for user %s", current_user.id)
    return {"message": "Token registered"}


@router.post("/unregister-token")
def unregister_token(
    payload: DeviceTokenRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    token = payload.fcm_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="FCM token is required")

    deactivate_device_token(
        user_id=current_user.id,
        token=token,
        user_supabase=admin_supabase,
    )
    logger.info("Deactivated FCM token for user %s", current_user.id)
    return {"message": "Token deactivated"}


@router.get("")
def list_notifications(
    limit: int = Query(default=20, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
):
    response = (
        admin_supabase.table("notifications")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    notifications = response.data or []
    unread_response = (
        admin_supabase.table("notifications")
        .select("id")
        .eq("user_id", current_user.id)
        .is_("read_at", "null")
        .execute()
    )
    unread_count = len(unread_response.data or [])
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    response = (
        admin_supabase.table("notifications")
        .update({"read_at": _utc_now()})
        .eq("id", notification_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read", "notification": response.data[0]}


@router.post("/read-all")
def mark_all_notifications_read(current_user: CurrentUser = Depends(get_current_user)):
    response = (
        admin_supabase.table("notifications")
        .update({"read_at": _utc_now()})
        .eq("user_id", current_user.id)
        .is_("read_at", "null")
        .execute()
    )
    return {"message": "Notifications marked as read", "notifications": response.data or []}
