from __future__ import annotations

import logging
from typing import Dict, Any

from fastapi import UploadFile, HTTPException
from bson import ObjectId

from config.mongo_config import ai_outputs, image_analysis, rag_logs
from services.image_service import save_upload, build_image_summary
from services.notification_service import notify_experts_new_request, notify_farmer_review_result
from services.rag_service import retrieve_recommendations, build_rag_context
from services.llm_service import generate_diagnosis

logger = logging.getLogger("grapeguard.report")


def create_report_from_upload(
    *,
    farmer_id: str,
    farmer_name: str = "Farmer",
    user_supabase,
    file: UploadFile,
    farmer_note: str,
) -> Dict[str, Any]:
    image_meta = save_upload(file)
    image_summary = build_image_summary(image_meta, farmer_note)
    cnn_disease = image_meta.get("cnn_disease", "Unknown")
    try:
        cnn_confidence = float(image_meta.get("cnn_confidence", "0") or 0)
    except Exception:
        cnn_confidence = 0.0

    logger.info("CNN prediction: %s (%.2f confidence)", cnn_disease, cnn_confidence)

    # First pass retrieval using symptom text to give model some context.
    initial_recs = retrieve_recommendations(cnn_disease if cnn_disease != "Unknown" else "", context_text=image_summary)
    initial_context = build_rag_context(initial_recs)

    llm_result = generate_diagnosis(image_summary, initial_context)
    llm_disease = llm_result.get("disease_name", "Unknown")
    logger.info("LLM diagnosis candidate: %s", llm_disease)

    # Robust fusion:
    # 1) Prefer high-confidence CNN.
    # 2) If LLM is unavailable/unknown, still use CNN if available.
    # 3) Otherwise use LLM.
    if cnn_disease != "Unknown" and cnn_confidence >= 0.6:
        disease_name = cnn_disease
    elif llm_disease == "Unknown" and cnn_disease != "Unknown":
        disease_name = cnn_disease
    else:
        disease_name = llm_disease

    # Second retrieval pass with identified disease.
    recommendations = retrieve_recommendations(disease_name, context_text=image_summary)
    if disease_name == "Unknown" and recommendations:
        disease_name = recommendations[0].get("disease_name", "Unknown")
    rag_context = build_rag_context(recommendations)
    logger.info("Final disease: %s | recommendations: %d", disease_name, len(recommendations))

    ai_doc = {
        "farmer_id": farmer_id,
        "image_url": image_meta["image_url"],
        "image_path": image_meta["image_path"],
        "farmer_note": farmer_note,
        "image_summary": image_summary,
        "disease_name": disease_name,
        "llm_output": llm_result.get("llm_output", ""),
        "recommendations": recommendations,
        "status": "pending",
        "cnn_prediction": {
            "disease_name": cnn_disease,
            "confidence": cnn_confidence,
            "source": image_meta.get("cnn_source", "unknown"),
        },
    }
    mongo_result = ai_outputs.insert_one(ai_doc)
    mongo_doc_id = str(mongo_result.inserted_id)

    image_analysis.insert_one(
        {
            "mongo_doc_id": mongo_doc_id,
            "meta": image_meta,
            "summary": image_summary,
        }
    )
    rag_logs.insert_one(
        {
            "mongo_doc_id": mongo_doc_id,
            "disease_name": disease_name,
            "recommendations": recommendations,
            "rag_context": rag_context,
        }
    )

    response = user_supabase.table("reports").insert(
        {
            "farmer_id": farmer_id,
            "image_url": image_meta["image_url"],
            "disease_name": disease_name,
            "mongo_doc_id": mongo_doc_id,
            "status": "pending",
            "expert_id": None,
            "expert_comment": "",
        }
    ).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create report in Supabase")

    report_data = response.data[0]
    report_data["farmer_name"] = farmer_name

    logger.info("Report created: %s for farmer %s, disease: %s", report_data.get("id"), farmer_id, disease_name)
    try:
        notify_experts_new_request(
            report_id=report_data.get("id", ""),
            disease_name=disease_name,
            farmer_name=farmer_name,
            user_supabase=user_supabase,
        )
    except Exception as exc:
        logger.warning("Expert notification failed for report %s: %s", report_data.get("id"), exc)

    return {
        "report": report_data,
        "ai_output": {
            "mongo_doc_id": mongo_doc_id,
            "farmer_id": farmer_id,
            "disease_name": disease_name,
            "image_url": image_meta["image_url"],
            "farmer_note": farmer_note,
            "llm_output": llm_result.get("llm_output", ""),
            "recommendations": recommendations,
            "cnn_prediction": ai_doc["cnn_prediction"],
        },
    }


def get_report_with_ai(report_id: str, user_supabase, farmer_id: str | None = None, farmer_name: str | None = None) -> Dict[str, Any]:
    query = user_supabase.table("reports").select("*").eq("id", report_id)
    if farmer_id:
        query = query.eq("farmer_id", farmer_id)
    report_resp = query.single().execute()
    report = report_resp.data
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Enrich with farmer_name if provided, or look it up
    if farmer_name:
        report["farmer_name"] = farmer_name
    elif not report.get("farmer_name"):
        fid = report.get("farmer_id")
        if fid:
            try:
                profile_resp = (
                    user_supabase.table("profiles")
                    .select("full_name")
                    .eq("id", fid)
                    .single()
                    .execute()
                )
                report["farmer_name"] = (profile_resp.data or {}).get("full_name", "Farmer")
            except Exception:
                report["farmer_name"] = "Farmer"

    mongo_doc_id = report.get("mongo_doc_id")
    ai_doc = None
    if mongo_doc_id:
        try:
            ai_doc = ai_outputs.find_one({"_id": ObjectId(mongo_doc_id)}, {"_id": 0})
        except Exception:
            ai_doc = ai_outputs.find_one({"mongo_doc_id": mongo_doc_id}, {"_id": 0})

    return {
        "report": report,
        "ai_output": ai_doc or {},
    }


def update_report_status(
    *,
    report_id: str,
    status: str,
    expert_id: str,
    expert_comment: str,
    user_supabase,
) -> Dict[str, Any]:
    response = (
        user_supabase.table("reports")
        .update(
            {
                "status": status,
                "expert_id": expert_id,
                "expert_comment": expert_comment,
            }
        )
        .eq("id", report_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = response.data[0]
    mongo_doc_id = report.get("mongo_doc_id")
    if mongo_doc_id:
        try:
            ai_outputs.update_one(
                {"_id": ObjectId(mongo_doc_id)},
                {"$set": {"status": status, "expert_id": expert_id, "expert_comment": expert_comment}},
            )
        except Exception:
            ai_outputs.update_one(
                {"mongo_doc_id": mongo_doc_id},
                {"$set": {"status": status, "expert_id": expert_id, "expert_comment": expert_comment}},
            )

    try:
        notify_farmer_review_result(
            farmer_id=report.get("farmer_id", ""),
            report_id=report.get("id", ""),
            status=status,
            disease_name=report.get("disease_name", ""),
            expert_comment=expert_comment,
            user_supabase=user_supabase,
        )
    except Exception as exc:
        logger.warning("Farmer notification failed for report %s: %s", report.get("id"), exc)

    return report
