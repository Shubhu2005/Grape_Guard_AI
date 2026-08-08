from __future__ import annotations

import logging
import os
from io import BytesIO
from threading import Lock
from typing import Any, Dict, List
import colorsys

# Run MobileNet validation on CPU. This avoids noisy CUDA DLL warnings on
# machines without an NVIDIA GPU/CUDA runtime.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
from PIL import Image

try:
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import (
        MobileNetV2,
        decode_predictions,
        preprocess_input,
    )
except Exception:  # pragma: no cover
    tf = None
    MobileNetV2 = None
    decode_predictions = None
    preprocess_input = None


logger = logging.getLogger("grapeguard.leaf_validation")

LEAF_VALIDATION_THRESHOLD = float(os.getenv("LEAF_VALIDATION_THRESHOLD", "0.5"))
LEAF_VALIDATION_TOP_K = int(os.getenv("LEAF_VALIDATION_TOP_K", "5"))
LEAF_VALIDATION_KEYWORDS = tuple(
    keyword.strip().lower()
    for keyword in os.getenv("LEAF_VALIDATION_KEYWORDS", "leaf,plant,tree,vegetation").split(",")
    if keyword.strip()
)
LEAF_VALIDATION_HINT_KEYWORDS = tuple(
    keyword.strip().lower()
    for keyword in os.getenv(
        "LEAF_VALIDATION_HINT_KEYWORDS",
        "grape,vine,cabbage,broccoli,artichoke,cauliflower,corn,maize",
    ).split(",")
    if keyword.strip()
)
LEAF_VALIDATION_HINT_THRESHOLD = float(os.getenv("LEAF_VALIDATION_HINT_THRESHOLD", "0.1"))
LEAF_VALIDATION_HINT_SUM_THRESHOLD = float(os.getenv("LEAF_VALIDATION_HINT_SUM_THRESHOLD", "0.15"))
LEAF_VALIDATION_HINT_MIN_MATCHES = int(os.getenv("LEAF_VALIDATION_HINT_MIN_MATCHES", "2"))
LEAF_VALIDATION_GREEN_RATIO_THRESHOLD = float(os.getenv("LEAF_VALIDATION_GREEN_RATIO_THRESHOLD", "0.35"))
LEAF_VALIDATION_LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LEAF_VALIDATION_LOW_CONFIDENCE_THRESHOLD", "0.6"))

_MODEL = None
_MODEL_LOCK = Lock()


def _load_validation_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    if tf is None or MobileNetV2 is None:
        raise RuntimeError("TensorFlow is required for leaf image validation")

    with _MODEL_LOCK:
        if _MODEL is None:
            _MODEL = MobileNetV2(weights="imagenet")
            logger.info("Loaded MobileNetV2 ImageNet model for leaf validation")
    return _MODEL


def _normalize_label(label: str) -> str:
    return str(label or "").replace("_", " ").lower()


def _label_tokens(label: str) -> set[str]:
    normalized = _normalize_label(label)
    return {token for token in normalized.replace("-", " ").split() if token}


def is_leaf_prediction(prediction: Dict[str, Any]) -> bool:
    label = _normalize_label(prediction.get("label", ""))
    probability = float(prediction.get("probability", 0.0) or 0.0)
    return probability > LEAF_VALIDATION_THRESHOLD and any(
        keyword in label for keyword in LEAF_VALIDATION_KEYWORDS
    )


def _is_plant_hint_prediction(prediction: Dict[str, Any]) -> bool:
    tokens = _label_tokens(prediction.get("label", ""))
    return any(keyword in tokens for keyword in LEAF_VALIDATION_HINT_KEYWORDS)


def _evaluate_hint_predictions(predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    hint_predictions = [prediction for prediction in predictions if _is_plant_hint_prediction(prediction)]
    if not hint_predictions:
        return {"is_valid": False, "matched_predictions": [], "score_sum": 0.0}

    score_sum = sum(float(prediction.get("probability", 0.0) or 0.0) for prediction in hint_predictions)
    high_confidence_match = any(
        float(prediction.get("probability", 0.0) or 0.0) >= LEAF_VALIDATION_HINT_THRESHOLD
        for prediction in hint_predictions
    )
    enough_matches = len(hint_predictions) >= LEAF_VALIDATION_HINT_MIN_MATCHES
    is_valid = high_confidence_match and enough_matches and score_sum >= LEAF_VALIDATION_HINT_SUM_THRESHOLD
    return {
        "is_valid": is_valid,
        "matched_predictions": hint_predictions,
        "score_sum": round(score_sum, 4),
    }


def _green_ratio(img: Image.Image) -> float:
    arr = np.asarray(img.convert("RGB").resize((224, 224)), dtype=np.float32) / 255.0
    green_pixels = 0
    total_pixels = arr.shape[0] * arr.shape[1]
    for pixel in arr.reshape(-1, 3):
        hue, lightness, saturation = colorsys.rgb_to_hls(*pixel.tolist())
        if 0.18 <= hue <= 0.45 and saturation >= 0.2 and lightness >= 0.15:
            green_pixels += 1
    return round(green_pixels / total_pixels, 4)


def validate_leaf_image(image_bytes: bytes) -> Dict[str, Any]:
    if not image_bytes:
        return {"is_valid": False, "reason": "Uploaded file is empty", "predictions": []}

    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return {"is_valid": False, "reason": "Invalid image file", "predictions": []}

    model = _load_validation_model()
    resized = img.resize((224, 224))
    arr = np.asarray(resized, dtype=np.float32)
    batch = np.expand_dims(arr, axis=0)
    batch = preprocess_input(batch)

    raw_predictions = model.predict(batch, verbose=0)
    decoded = decode_predictions(raw_predictions, top=LEAF_VALIDATION_TOP_K)[0]
    predictions: List[Dict[str, Any]] = [
        {
            "id": class_id,
            "label": label.replace("_", " "),
            "probability": round(float(probability), 4),
        }
        for class_id, label, probability in decoded
    ]

    direct_matches = [prediction for prediction in predictions if is_leaf_prediction(prediction)]
    hint_result = _evaluate_hint_predictions(predictions)
    green_ratio = _green_ratio(img)
    top_probability = float(predictions[0].get("probability", 0.0) or 0.0) if predictions else 0.0
    green_scene_match = (
        green_ratio >= LEAF_VALIDATION_GREEN_RATIO_THRESHOLD
        and top_probability < LEAF_VALIDATION_LOW_CONFIDENCE_THRESHOLD
    )
    is_valid = bool(direct_matches) or bool(hint_result["is_valid"]) or green_scene_match
    logger.info("Leaf validation: valid=%s predictions=%s", is_valid, predictions)

    return {
        "is_valid": is_valid,
        "reason": (
            "leaf_detected"
            if direct_matches
            else "plant_like_detected"
            if hint_result["is_valid"]
            else "green_leaf_scene_detected"
            if green_scene_match
            else "no_leaf_prediction_above_threshold"
        ),
        "predictions": predictions,
        "matched_predictions": direct_matches or hint_result["matched_predictions"],
        "hint_score_sum": hint_result["score_sum"],
        "green_ratio": green_ratio,
        "threshold": LEAF_VALIDATION_THRESHOLD,
        "keywords": list(LEAF_VALIDATION_KEYWORDS),
        "hint_keywords": list(LEAF_VALIDATION_HINT_KEYWORDS),
    }
