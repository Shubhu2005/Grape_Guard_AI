from __future__ import annotations

import re
from pathlib import Path
import logging
from threading import Lock
from typing import Dict, List

import pandas as pd
import numpy as np

try:
    import faiss
except Exception:  # pragma: no cover - fallback if faiss is unavailable
    faiss = None


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / "pesticides.xlsx"

_INDEX_LOCK = Lock()
_INDEX_MTIME = None
_FAISS_INDEX = None
_VOCAB = {}
_DOCS = []
logger = logging.getLogger("grapeguard.rag")

FALLBACK_ROWS = [
    {
        "disease_name": "Downy Mildew",
        "symptoms": "yellow oil spots on upper leaf surface, white fungal growth on underside of leaves",
        "pesticide_name": "Metalaxyl + Mancozeb",
        "dosage": "2 g/L",
        "schedule": "Spray every 7-10 days during wet weather",
        "notes": "Systemic + contact action, avoid spraying before rain",
        "source": "ICAR",
    },
    {
        "disease_name": "Downy Mildew",
        "symptoms": "yellow oil spots, downy white growth under leaves",
        "pesticide_name": "Neem Oil (Azadirachtin)",
        "dosage": "3-5 mL/L",
        "schedule": "Spray every 7 days as preventive",
        "notes": "Organic botanical fungicide, also controls insects",
        "source": "Organic Farming Manual",
    },
    {
        "disease_name": "Powdery Mildew",
        "symptoms": "powdery white coating on leaves and berries, leaf curling",
        "pesticide_name": "Sulfur 80% WP",
        "dosage": "2 g/L",
        "schedule": "Spray every 10-14 days",
        "notes": "Do not spray in hot weather above 35°C",
        "source": "State Agriculture Department",
    },
    {
        "disease_name": "Powdery Mildew",
        "symptoms": "powdery white coating on foliage, stunted growth",
        "pesticide_name": "Baking Soda (Sodium Bicarbonate)",
        "dosage": "5 g/L with 2 mL liquid soap",
        "schedule": "Spray every 7 days as preventive",
        "notes": "Safe organic home remedy, prevents spore germination",
        "source": "Organic Farming Manual",
    },
    {
        "disease_name": "Anthracnose",
        "symptoms": "dark sunken lesions on berries and shoots, bird's eye spot",
        "pesticide_name": "Carbendazim 50% WP",
        "dosage": "1 g/L",
        "schedule": "2-3 sprays at 10-day intervals",
        "notes": "Systemic fungicide, use clean pruning tools",
        "source": "ICAR",
    },
    {
        "disease_name": "Anthracnose",
        "symptoms": "dark sunken spots, lesions on berries",
        "pesticide_name": "Bio-Pseudomonas fluorescens",
        "dosage": "5 g/L",
        "schedule": "Apply as soil drench and foliar spray every 15 days",
        "notes": "Biological organic control agent, promotes plant health",
        "source": "NBAIR",
    },
    {
        "disease_name": "Healthy",
        "symptoms": "no visible disease symptoms, normal green foliage",
        "pesticide_name": "No treatment required",
        "dosage": "N/A",
        "schedule": "Continue regular monitoring every 7-14 days",
        "notes": "Maintain vineyard hygiene, proper pruning, and balanced nutrition",
        "source": "General Best Practice",
    },
]


def _ensure_data_file() -> None:
    if DATA_FILE.exists():
        return
    df = pd.DataFrame(FALLBACK_ROWS)
    df.to_excel(DATA_FILE, index=False)


def _load_df() -> pd.DataFrame:
    _ensure_data_file()
    return pd.read_excel(DATA_FILE).fillna("")


def get_supported_diseases() -> List[str]:
    df = _load_df()
    if "disease_name" not in df.columns:
        return []
    diseases = {
        str(name).strip()
        for name in df["disease_name"].tolist()
        if str(name).strip()
    }
    return sorted(diseases)


def _tokenize(text: str) -> List[str]:
    return [t for t in re.split(r"\W+", text.lower()) if len(t) > 2]


def _doc_text(row: pd.Series) -> str:
    return (
        f"{row.get('disease_name', '')} "
        f"{row.get('symptoms', '')} "
        f"{row.get('pesticide_name', '')} "
        f"{row.get('dosage', '')} "
        f"{row.get('schedule', '')} "
        f"{row.get('notes', '')} "
        f"{row.get('source', '')}"
    )


def _build_vocab(docs: List[str]) -> Dict[str, int]:
    vocab = {}
    for doc in docs:
        for token in _tokenize(doc):
            if token not in vocab:
                vocab[token] = len(vocab)
    return vocab


def _vectorize(text: str, vocab: Dict[str, int]) -> np.ndarray:
    vec = np.zeros(len(vocab), dtype=np.float32)
    if not vocab:
        return vec

    for token in _tokenize(text):
        idx = vocab.get(token)
        if idx is not None:
            vec[idx] += 1.0

    # L2 normalize for cosine-style similarity via inner product.
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def _ensure_faiss_index() -> None:
    global _INDEX_MTIME, _FAISS_INDEX, _VOCAB, _DOCS

    if faiss is None:
        logger.warning("FAISS not available; using fallback keyword retrieval only")
        return

    mtime = DATA_FILE.stat().st_mtime if DATA_FILE.exists() else None
    if _FAISS_INDEX is not None and _INDEX_MTIME == mtime:
        return

    with _INDEX_LOCK:
        mtime = DATA_FILE.stat().st_mtime if DATA_FILE.exists() else None
        if _FAISS_INDEX is not None and _INDEX_MTIME == mtime:
            return

        df = _load_df()
        _DOCS = df.to_dict(orient="records")
        doc_texts = [_doc_text(row) for _, row in df.iterrows()]
        _VOCAB = _build_vocab(doc_texts)

        if not _DOCS or not _VOCAB:
            _FAISS_INDEX = None
            _INDEX_MTIME = mtime
            return

        matrix = np.stack([_vectorize(text, _VOCAB) for text in doc_texts]).astype(np.float32)
        index = faiss.IndexFlatIP(matrix.shape[1])
        index.add(matrix)

        _FAISS_INDEX = index
        _INDEX_MTIME = mtime


def _retrieve_with_faiss(disease_name: str, context_text: str = "", top_k: int = 3) -> List[Dict[str, str]]:
    _ensure_faiss_index()

    if _FAISS_INDEX is None or not _DOCS:
        return []

    query_text = f"{disease_name} {context_text}".strip()
    qvec = _vectorize(query_text, _VOCAB)
    if float(np.linalg.norm(qvec)) == 0.0:
        return []

    qvec = np.expand_dims(qvec.astype(np.float32), axis=0)
    _, indices = _FAISS_INDEX.search(qvec, min(top_k, len(_DOCS)))

    results = []
    for idx in indices[0]:
        if idx < 0 or idx >= len(_DOCS):
            continue
        results.append(_DOCS[idx])
    return results


def retrieve_recommendations(disease_name: str, context_text: str = "", top_k: int = 3) -> List[Dict[str, str]]:
    df = _load_df()
    disease = (disease_name or "").strip().lower()

    if disease:
        disease_names = df["disease_name"].astype(str).str.strip().str.lower()
        exact = df[disease_names == disease]
        if exact.empty:
            exact = df[disease_names.apply(lambda name: name in disease or disease in name)]
        if not exact.empty:
            logger.info("RAG exact match for '%s': %d rows", disease_name, len(exact))
            return exact.head(top_k).to_dict(orient="records")

    # Vector retrieval path.
    faiss_results = _retrieve_with_faiss(disease_name, context_text, top_k=top_k)
    if faiss_results:
        logger.info("RAG faiss results for '%s': %d rows", disease_name, len(faiss_results))
        return faiss_results

    # Fallback keyword scoring path.
    query_tokens = set(_tokenize(f"{disease_name} {context_text}"))

    def score_row(row: pd.Series) -> int:
        hay = f"{row.get('disease_name', '')} {row.get('symptoms', '')}".lower()
        return sum(1 for t in query_tokens if t in hay)

    scored = df.copy()
    scored["_score"] = scored.apply(score_row, axis=1)
    scored = scored.sort_values(by=["_score", "disease_name"], ascending=[False, True])
    logger.info("RAG fallback results for '%s': %d rows", disease_name, len(scored))
    return scored.head(top_k).drop(columns=["_score"]).to_dict(orient="records")


def build_rag_context(recommendations: List[Dict[str, str]]) -> str:
    if not recommendations:
        return "No pesticide records found in local knowledge base."

    lines = []
    for rec in recommendations:
        lines.append(
            f"Disease: {rec.get('disease_name', '')}; "
            f"Pesticide: {rec.get('pesticide_name', '')}; "
            f"Dosage: {rec.get('dosage', '')}; "
            f"Schedule: {rec.get('schedule', '')}; "
            f"Notes: {rec.get('notes', '')}; Source: {rec.get('source', '')}"
        )
    return "\n".join(lines)
