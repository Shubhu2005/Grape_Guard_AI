import logging

from fastapi import APIRouter, Depends, HTTPException

from config.supabase_config import admin_supabase
from dependencies.auth import CurrentUser, get_current_user, require_expert
from services.report_service import get_report_with_ai, update_report_status

router = APIRouter()
logger = logging.getLogger("grapeguard.expert")


def _get_expert(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency that validates the user is an expert."""
    return require_expert(current_user)


def _with_farmer_names(reports: list[dict]) -> list[dict]:
    if not reports:
        return []

    farmer_ids = list({r.get("farmer_id") for r in reports if r.get("farmer_id")})
    if not farmer_ids:
        return reports

    profiles_resp = (
        admin_supabase.table("profiles")
        .select("id, full_name")
        .in_("id", farmer_ids)
        .execute()
    )
    profile_map = {p["id"]: p.get("full_name", "Farmer") for p in (profiles_resp.data or [])}

    enriched = []
    for report in reports:
        next_report = dict(report)
        next_report["farmer_name"] = profile_map.get(report.get("farmer_id"), "Farmer")
        enriched.append(next_report)
    return enriched


@router.get("/pending")
def list_pending_reports(expert: CurrentUser = Depends(_get_expert)):
    response = (
        admin_supabase.table("reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return {"reports": _with_farmer_names(response.data or [])}


@router.get("/history")
def list_reviewed_reports(expert: CurrentUser = Depends(_get_expert)):
    response = (
        admin_supabase.table("reports")
        .select("*")
        .in_("status", ["verified", "rejected"])
        .order("updated_at", desc=True)
        .execute()
    )
    return {"reports": _with_farmer_names(response.data or [])}


@router.put("/reports/{report_id}/verify")
def verify_report(report_id: str, expert_comment: str = "", expert: CurrentUser = Depends(_get_expert)):
    logger.info("Expert %s verifying report %s", expert.id, report_id)
    report = update_report_status(
        report_id=report_id,
        status="verified",
        expert_id=expert.id,
        expert_comment=expert_comment,
        user_supabase=admin_supabase,
    )
    return {"message": "Report verified", "report": report}


@router.put("/reports/{report_id}/reject")
def reject_report(report_id: str, expert_comment: str = "", expert: CurrentUser = Depends(_get_expert)):
    logger.info("Expert %s rejecting report %s", expert.id, report_id)
    report = update_report_status(
        report_id=report_id,
        status="rejected",
        expert_id=expert.id,
        expert_comment=expert_comment,
        user_supabase=admin_supabase,
    )
    return {"message": "Report rejected", "report": report}


@router.get("/reports/{report_id}")
def get_report_detail(report_id: str, expert: CurrentUser = Depends(_get_expert)):
    return get_report_with_ai(report_id, admin_supabase)


# Backward-compatible alias
@router.get("/reports")
def list_reports_alias(expert: CurrentUser = Depends(_get_expert)):
    return list_pending_reports(expert=expert)
