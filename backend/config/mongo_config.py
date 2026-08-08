import os
import logging

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

load_dotenv()
logger = logging.getLogger("grapeguard.mongo")

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "grapeguard")
MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "15000"))

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is missing in .env")


def create_mongo_client() -> MongoClient:
    # Atlas can be slow on first DNS/TLS negotiation, especially on home/mobile
    # networks, so keep this configurable instead of failing too eagerly.
    return MongoClient(
        MONGO_URL,
        serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
        connectTimeoutMS=MONGO_TIMEOUT_MS,
        socketTimeoutMS=MONGO_TIMEOUT_MS,
        retryWrites=True,
    )


_client: MongoClient | None = None
_db: Database | None = None


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        _client = create_mongo_client()
    return _client


def get_db() -> Database:
    global _db
    if _db is None:
        _db = get_mongo_client()[MONGO_DB_NAME]
    return _db


class LazyCollection:
    def __init__(self, name: str):
        self.name = name

    @property
    def collection(self) -> Collection:
        return get_db()[self.name]

    def __getattr__(self, attr: str):
        return getattr(self.collection, attr)

# Collections
ai_outputs = LazyCollection("ai_outputs")
image_analysis = LazyCollection("image_analysis")
rag_logs = LazyCollection("rag_logs")
history = LazyCollection("history")


def ping_mongo() -> bool:
    try:
        get_mongo_client().admin.command("ping")
        return True
    except Exception as exc:
        logger.warning("MongoDB ping failed: %s: %s", type(exc).__name__, exc)
        return False
