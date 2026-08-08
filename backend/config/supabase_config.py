import os
import logging

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()
logger = logging.getLogger("grapeguard.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing in .env")
if not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_ANON_KEY is missing in .env")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing in .env")

admin_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_user_supabase(access_token: str) -> Client:
    # Backward-compatible shim.
    # Current backend uses explicit user checks + admin client queries.
    return admin_supabase


def ping_supabase() -> bool:
    try:
        # Read-only check against a table already used by this backend.
        admin_supabase.table("profiles").select("id").limit(1).execute()
        return True
    except Exception as exc:
        logger.warning("Supabase ping failed: %s: %s", type(exc).__name__, exc)
        return False
