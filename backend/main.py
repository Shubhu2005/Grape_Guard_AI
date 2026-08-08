import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.mongo_config import ping_mongo
from config.supabase_config import ping_supabase
from routes import auth, farmer, expert, notifications
from services.cnn_service import predict_disease
from services.leaf_validation_service import validate_leaf_image
from services.rag_service import retrieve_recommendations, build_rag_context

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
HTTPX_LOG_LEVEL = os.getenv("HTTPX_LOG_LEVEL", "WARNING").upper()
UVICORN_ACCESS_LOG_LEVEL = os.getenv("UVICORN_ACCESS_LOG_LEVEL", "WARNING").upper()
WATCHFILES_LOG_LEVEL = os.getenv("WATCHFILES_LOG_LEVEL", "WARNING").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("grapeguard")
logging.getLogger("httpx").setLevel(HTTPX_LOG_LEVEL)
logging.getLogger("httpcore").setLevel(HTTPX_LOG_LEVEL)
logging.getLogger("uvicorn.access").setLevel(UVICORN_ACCESS_LOG_LEVEL)
logging.getLogger("watchfiles").setLevel(WATCHFILES_LOG_LEVEL)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GrapeGuard AI",
    version="1.0.0",
    description="AI-powered grape disease detection and pesticide recommendation platform",
)

# ---------------------------------------------------------------------------
# CORS – configurable via CORS_ORIGINS env var (comma-separated)
# ---------------------------------------------------------------------------
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_env_origins = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] if _env_origins else _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(farmer.router, prefix="/farmer", tags=["Farmer"])
app.include_router(expert.router, prefix="/expert", tags=["Expert"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup():
    logger.info("GrapeGuard AI starting up …")
    if ping_mongo():
        logger.info("MongoDB: connected")
    else:
        logger.warning("MongoDB: connection failed – some features may not work")
    if ping_supabase():
        logger.info("Supabase: connected")
    else:
        logger.warning("Supabase: connection failed – auth/reports will not work")


@app.get("/")
def root():
    return {"message": "GrapeGuard AI is running"}


@app.get("/health/db")
def db_health():
    mongo_ok = ping_mongo()
    supabase_ok = ping_supabase()
    status = "ok" if mongo_ok and supabase_ok else "degraded"
    return {
        "status": status,
        "mongo": "connected" if mongo_ok else "disconnected",
        "supabase": "connected" if supabase_ok else "disconnected",
    }


@app.get("/debug/rag")
def debug_rag(disease: str = "", context: str = "", top_k: int = 3):
    safe_top_k = max(1, min(top_k, 10))
    recommendations = retrieve_recommendations(disease_name=disease, context_text=context, top_k=safe_top_k)
    return {
        "query": {
            "disease": disease,
            "context": context,
            "top_k": safe_top_k,
        },
        "count": len(recommendations),
        "recommendations": recommendations,
        "rag_context": build_rag_context(recommendations),
    }


@app.post("/debug/cnn")
def debug_cnn(image: UploadFile = File(...)):
    content = image.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    prediction = predict_disease(content)
    return {
        "filename": image.filename,
        "prediction": prediction,
    }


@app.post("/debug/leaf-validation")
def debug_leaf_validation(image: UploadFile = File(...)):
    content = image.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    validation = validate_leaf_image(content)
    return {
        "filename": image.filename,
        "validation": validation,
    }
