# -*- coding: utf-8 -*-
"""
AI Production Studio - FastAPI Main Application (backend/main.py)
Entry point for the backend API service.
"""

import os
import sys
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables
load_dotenv()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("studio.main")

app = FastAPI(
    title="AI Production Studio API",
    description="Unified API server for AGNES video, HEDRA talking avatars, and Cloudflare Workers AI.",
    version="2.0.0"
)

# CORS Configuration - Supports local development on ports 3000, 5173, 8011 and production domains
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8011",
    "http://127.0.0.1:8011",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler for unhandled exceptions to return consistent JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception: %s", str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error occurred",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

# Include Studio Router
from routers.studio import router as studio_router
app.include_router(studio_router)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint for container probes and frontend heartbeat.
    """
    return {
        "status": "healthy",
        "service": "AI Production Studio Backend",
        "version": "2.0.0",
        "python_version": sys.version.split()[0],
        "port": os.getenv("PORT", "8011"),
        "providers": {
            "agnes_configured": bool(os.getenv("AGNES_API_KEY")),
            "hedra_configured": bool(os.getenv("HEDRA_API_KEY")),
            "cloudflare_configured": bool(os.getenv("CLOUDFLARE_API_TOKEN")),
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8011"))
    host = os.getenv("HOST", "127.0.0.1")
    logger.info("Starting AI Production Studio Backend on http://%s:%s with --reload enabled", host, port)
    # Notice: reload=True ensures code edits to services/agnes_service.py immediately take effect
    uvicorn.run("main:app", host=host, port=port, reload=True)
