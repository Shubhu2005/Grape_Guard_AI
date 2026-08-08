from __future__ import annotations

import logging
import hashlib
import os
from io import BytesIO
from uuid import uuid4
from typing import Dict

import cloudinary.uploader
from fastapi import UploadFile, HTTPException
from PIL import Image

from config.cloudinary_config import CLOUDINARY_FOLDER
from services.cnn_service import predict_disease
from services.leaf_validation_service import validate_leaf_image

logger = logging.getLogger("grapeguard.image")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DISEASE_MIN_CONFIDENCE = float(os.getenv("CNN_MIN_CONFIDENCE", "0"))


def _validate_extension(filename: str) -> str:
    filename = filename or ""
    suffix = ""
    if "." in filename:
        suffix = f".{filename.rsplit('.', 1)[-1].lower()}"
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP files are supported")
    return suffix


def save_upload(file: UploadFile) -> Dict[str, str]:
    suffix = _validate_extension(file.filename or "")
    image_name = f"{uuid4().hex}{suffix}"

    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_hash = hashlib.md5(content).hexdigest()

    try:
        with Image.open(BytesIO(content)) as img:
            width, height = img.size
            mode = img.mode
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        leaf_validation = validate_leaf_image(content)
    except RuntimeError as exc:
        logger.error("Leaf validation unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Leaf image validation is unavailable")
    except Exception as exc:
        logger.warning("Leaf validation failed: %s", exc)
        raise HTTPException(status_code=400, detail="Please upload a valid leaf image")

    if not leaf_validation.get("is_valid"):
        logger.info("Rejected non-leaf image %s: %s", file.filename, leaf_validation)
        raise HTTPException(status_code=400, detail="Please upload a valid leaf image")

    cnn_result = predict_disease(content)
    cnn_confidence = float(cnn_result.get("confidence", 0.0) or 0.0)
    if DISEASE_MIN_CONFIDENCE > 0 and cnn_confidence < DISEASE_MIN_CONFIDENCE:
        logger.info(
            "Rejected low-confidence disease prediction for %s: %.3f < %.3f",
            file.filename,
            cnn_confidence,
            DISEASE_MIN_CONFIDENCE,
        )
        raise HTTPException(
            status_code=400,
            detail="Leaf image could not be classified confidently. Please upload a clearer leaf image",
        )

    logger.info(
        "Uploaded image %s (%s) hash=%s size=%s mode=%s -> CNN: %s (%.3f, %s)",
        image_name,
        file.filename,
        file_hash,
        f"{width}x{height}",
        mode,
        cnn_result.get("disease_name"),
        cnn_result.get("confidence"),
        cnn_result.get("source"),
    )

    try:
        upload_result = cloudinary.uploader.upload(
            content,
            folder=CLOUDINARY_FOLDER,
            public_id=uuid4().hex,
            resource_type="image",
            overwrite=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {exc}")

    return {
        # Keep "image_path" key for backward compatibility with current report service.
        "image_path": upload_result.get("public_id", ""),
        "image_url": upload_result.get("secure_url", ""),
        "image_name": image_name,
        "width": str(upload_result.get("width", width)),
        "height": str(upload_result.get("height", height)),
        "mode": mode,
        "cloudinary_public_id": upload_result.get("public_id", ""),
        "cnn_disease": str(cnn_result.get("disease_name", "Unknown")),
        "cnn_confidence": str(cnn_confidence),
        "cnn_source": str(cnn_result.get("source", "unknown")),
        "leaf_validation": leaf_validation,
    }


def build_image_summary(image_meta: Dict[str, str], farmer_note: str) -> str:
    cnn_line = (
        f"CNN prediction: {image_meta.get('cnn_disease', 'Unknown')} "
        f"(confidence {image_meta.get('cnn_confidence', '0')}, source {image_meta.get('cnn_source', 'unknown')})."
    )
    return (
        f"Image info: {image_meta['width']}x{image_meta['height']} px, mode {image_meta['mode']}. "
        f"{cnn_line} "
        f"Farmer note: {farmer_note.strip() or 'No additional symptom text provided.'}"
    )
