from __future__ import annotations

import logging
import os
import re
from typing import Dict

import requests

from services.rag_service import get_supported_diseases

logger = logging.getLogger("grapeguard.llm")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def _clean_label(value: str) -> str:
    first_line = (value or "").strip().splitlines()[0]
    return re.sub(r"[^A-Za-z\s]", "", first_line).strip()


def _match_supported_disease(value: str) -> str:
    label = _clean_label(value).lower()
    if not label:
        return "Unknown"

    for disease in get_supported_diseases():
        disease_l = disease.lower()
        if label == disease_l or disease_l in label or label in disease_l:
            return disease
    return "Unknown"


def _extract_disease(text: str) -> str:
    patterns = [
        r"^Disease\s*[:\-]\s*([^\n\r]+)",
        r"^Likely disease\s*[:\-]\s*([^\n\r]+)",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE | re.MULTILINE)
        if m:
            disease = _match_supported_disease(m.group(1))
            if disease != "Unknown":
                return disease

    for disease in get_supported_diseases():
        if re.search(rf"\b{re.escape(disease)}\b", text, flags=re.IGNORECASE):
            return disease
    return "Unknown"


def _fallback_response(image_summary: str, rag_context: str) -> Dict[str, str]:
    merged = f"Image summary: {image_summary}\nKnowledge: {rag_context}"
    return {
        "disease_name": "Unknown",
        "llm_output": (
            "LLM service unavailable. Generated fallback summary. "
            "Please review symptoms manually and verify with expert.\n\n" + merged
        ),
    }


def generate_diagnosis(image_summary: str, rag_context: str) -> Dict[str, str]:
    supported_diseases = get_supported_diseases()
    allowed_disease_text = ", ".join(supported_diseases) if supported_diseases else "the disease names present in the provided knowledge"
    system_msg = (
        "You are an agriculture assistant for grape disease detection. "
        f"Identify the likely disease using only one of these labels: {allowed_disease_text}. "
        "If none match, use Unknown. "
        "Then provide pesticide guidance using only provided knowledge. "
        "Format:\n"
        "Disease: <name>\n"
        "Reasoning: <short reasoning>\n"
        "Recommendation: <actionable steps>"
    )
    user_msg = (
        f"IMAGE SUMMARY:\n{image_summary}\n\n"
        f"RAG KNOWLEDGE:\n{rag_context}"
    )

    try:
        logger.info("Querying Groq (%s)", GROQ_MODEL)
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            },
            timeout=30,
        )
        resp.raise_for_status()
        payload = resp.json()
        text = payload["choices"][0]["message"]["content"].strip()
        if not text:
            logger.warning("Groq returned empty response, using fallback")
            return _fallback_response(image_summary, rag_context)

        disease = _extract_disease(text)
        logger.info("Groq diagnosis: %s", disease)
        return {
            "disease_name": disease,
            "llm_output": text,
        }
    except Exception as exc:
        logger.warning("Groq service error (%s), using fallback", exc)
        return _fallback_response(image_summary, rag_context)
