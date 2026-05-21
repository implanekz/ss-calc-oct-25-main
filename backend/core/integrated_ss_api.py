try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

"""
Integrated Social Security API
Combines optimization calculator with XML processing for complete PIA analysis
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# Import API routers
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.auth import router as auth_router
from api.profiles import router as profiles_router
from api.partners import router as partners_router
from api.children import router as children_router
from api.preferences import router as preferences_router
from api.calculation_routes import router as calculation_router

# Load environment variables early
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="The RISE and SHINE Method™ API",
    description="Complete Social Security optimization with XML earnings analysis",
    version="2.0.0"
)

# Configure CORS from ALLOWED_ORIGINS env (comma-separated), default to "*"
_origins_env = os.getenv("ALLOWED_ORIGINS")
_allowed_origins = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(partners_router)
app.include_router(children_router)
app.include_router(preferences_router)
app.include_router(calculation_router)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"CORS allowed_origins={_allowed_origins}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "The RISE and SHINE Method™ API", "status": "healthy", "version": "2.0.0"}

@app.get("/healthz")
async def healthz():
    """Lightweight health check with config status"""
    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))
    return {
        "status": "ok",
        "version": "2.0.0",
        "supabase_configured": supabase_configured,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
