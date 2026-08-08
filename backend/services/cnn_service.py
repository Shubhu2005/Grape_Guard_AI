from __future__ import annotations

import os
import logging
from pathlib import Path
from threading import Lock
from typing import Dict, Any

from dotenv import load_dotenv

# Run TensorFlow on CPU for local development. This avoids noisy CUDA DLL
# warnings on machines without the NVIDIA runtime installed.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
load_dotenv()

import numpy as np
from PIL import Image

try:
    import tensorflow as tf
except Exception:  # pragma: no cover
    tf = None


MODEL_PATH = Path(os.getenv("CNN_MODEL_PATH", "models/grape_disease_cnn.h5"))
CLASS_NAMES = [
    c.strip()
    for c in os.getenv(
        "CNN_CLASS_NAMES",
        "Downy Mildew,Powdery Mildew,Anthracnose,Black Rot,Leaf Blight,Rust,Botrytis,Healthy",
    ).split(",")
    if c.strip()
]
INPUT_SIZE = int(os.getenv("CNN_INPUT_SIZE", "224"))

_MODEL = None
_MODEL_LOAD_FAILED = False
_MODEL_LOCK = Lock()
logger = logging.getLogger("grapeguard.cnn")


def _load_model():
    """Lazy-load the TensorFlow model if available; otherwise return None to trigger heuristic."""
    global _MODEL, _MODEL_LOAD_FAILED
    if _MODEL is not None:
        return _MODEL
    if _MODEL_LOAD_FAILED:
        return None
    if tf is None:
        logger.warning("TensorFlow not available; falling back to heuristic predictions")
        _MODEL_LOAD_FAILED = True
        return None
    if not MODEL_PATH.exists():
        logger.error("CNN model file missing at %s; falling back to heuristic predictions", MODEL_PATH)
        _MODEL_LOAD_FAILED = True
        return None

    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        try:
            _MODEL = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
        except Exception as exc:
            _MODEL_LOAD_FAILED = True
            logger.error(
                "CNN model load failed from %s (%s); falling back to heuristic predictions",
                MODEL_PATH,
                exc,
            )
            return None
        logger.info("Loaded CNN model from %s", MODEL_PATH)
    return _MODEL


def _heuristic_fallback(img: Image.Image) -> Dict[str, Any]:
    """Simple color-based heuristic when model is unavailable."""
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    channel_means = arr.mean(axis=(0, 1))
    r, g, b = channel_means.tolist()

    if g > r and g > b and g > 95:
        disease = "Healthy"
    elif b > g and r < g:
        disease = "Downy Mildew"
    elif r > g and r > b:
        disease = "Bacterial Rot" if "Bacterial Rot" in CLASS_NAMES else "Anthracnose"
    else:
        disease = "Powdery Mildew"

    confidence = 0.55
    if disease == "Healthy" and confidence < 0.90:
        disease = "Not Healthy"

    logger.info("Heuristic fallback prediction: %s (means R=%.2f, G=%.2f, B=%.2f)", disease, r, g, b)
    return {
        "disease_name": disease,
        "confidence": confidence,
        "source": "heuristic_fallback",
    }


def predict_disease(image_bytes: bytes) -> Dict[str, Any]:
    """Return disease prediction dict: name, confidence, source."""
    if not image_bytes:
        return {"disease_name": "Unknown", "confidence": 0.0, "source": "invalid_input"}

    try:
        from io import BytesIO

        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return {"disease_name": "Unknown", "confidence": 0.0, "source": "invalid_image"}

    model = _load_model()
    if model is None:
        return _heuristic_fallback(img)

    try:
        resized = img.resize((INPUT_SIZE, INPUT_SIZE))
        arr = np.asarray(resized, dtype=np.float32) / 255.0
        batch = np.expand_dims(arr, axis=0)
        pred = model.predict(batch, verbose=0)[0]
        logger.info("Raw CNN probabilities: %s", pred.tolist() if hasattr(pred, "tolist") else pred)

        if pred.ndim == 0:
            confidence = float(pred)
            idx = 0
        else:
            idx = int(np.argmax(pred))
            confidence = float(pred[idx])

        disease = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else f"class_{idx}"
        if disease == "Healthy" and confidence < 0.90:
            disease = "Not Healthy"
        return {
            "disease_name": disease,
            "confidence": round(confidence, 4),
            "source": "cnn_model",
        }
    except Exception as exc:
        logger.warning("CNN predict failed (%s); using heuristic", exc)
        return _heuristic_fallback(img)
