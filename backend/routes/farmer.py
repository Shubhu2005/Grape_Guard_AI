import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from config.supabase_config import admin_supabase
from dependencies.auth import CurrentUser, get_current_user
from services.report_service import create_report_from_upload, get_report_with_ai

router = APIRouter()
logger = logging.getLogger("grapeguard.farmer")


@router.post("/upload")
def upload_report(
    image: UploadFile = File(...),
    symptom_note: str = Form(default=""),
    current_user: CurrentUser = Depends(get_current_user),
):
    logger.info("Farmer %s uploading image for analysis", current_user.id)
    result = create_report_from_upload(
        farmer_id=current_user.id,
        farmer_name=current_user.full_name,
        user_supabase=admin_supabase,
        file=image,
        farmer_note=symptom_note,
    )
    return {"message": "Report created", **result}


@router.post("/reports")
def create_report_alias(
    image: UploadFile = File(...),
    symptom_note: str = Form(default=""),
    current_user: CurrentUser = Depends(get_current_user),
):
    return upload_report(image=image, symptom_note=symptom_note, current_user=current_user)


def _enrich_with_farmer_name(reports: list[dict], farmer_name: str) -> list[dict]:
    """Add farmer_name to each report dict."""
    return [{**r, "farmer_name": farmer_name} for r in reports]


@router.get("/reports")
def list_farmer_reports(current_user: CurrentUser = Depends(get_current_user)):
    response = (
        admin_supabase.table("reports")
        .select("*")
        .eq("farmer_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    reports = _enrich_with_farmer_name(response.data or [], current_user.full_name)
    return {"reports": reports}


@router.get("/reports/{report_id}")
def get_report_detail(report_id: str, current_user: CurrentUser = Depends(get_current_user)):
    return get_report_with_ai(report_id, admin_supabase, farmer_id=current_user.id, farmer_name=current_user.full_name)
