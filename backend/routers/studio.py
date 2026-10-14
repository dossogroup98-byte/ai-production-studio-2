# -*- coding: utf-8 -*-
"""
Studio Router (routers/studio.py)
Verified endpoints for Agnes T2V, Hedra Avatars, Cloudflare T2I & I2I, and Diagnostics.
Notice: AGNES I2V has been completely removed per specification.
"""

import os
import sys
import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from services.agnes_service import agnes_service
from services.hedra_service import hedra_service
from services.cloudflare_service import cloudflare_service

router = APIRouter(prefix="/api/studio", tags=["AI Production Studio"])

# ----------------- Request Models -----------------

class T2VRequest(BaseModel):
    prompt: str = Field(..., description="Prompt describing the video to generate")
    duration: int = Field(5, description="Video duration in seconds (5 or 10)")
    model: str = Field("agnes-video-2.5", description="Agnes AI video model")
    aspect_ratio: Optional[str] = None
    aspectRatio: Optional[str] = None

    def get_aspect_ratio(self) -> str:
        return self.aspect_ratio or self.aspectRatio or "16:9"

class HedraRequest(BaseModel):
    prompt: Optional[str] = None
    voice_text: Optional[str] = None
    voiceText: Optional[str] = None
    image_data: Optional[str] = None
    imageData: Optional[str] = None
    aspect_ratio: Optional[str] = None
    aspectRatio: Optional[str] = None

    def get_voice_text(self) -> str:
        text = self.voice_text or self.voiceText or self.prompt
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Prompt or speech script is required.")
        return text.strip()

    def get_image_data(self) -> str:
        data = self.image_data or self.imageData
        if not data:
            raise HTTPException(status_code=400, detail="Reference portrait image (image_data) is required for Hedra avatar generation.")
        return data

    def get_aspect_ratio(self) -> str:
        return self.aspect_ratio or self.aspectRatio or "1:1"

class T2IRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    negativePrompt: Optional[str] = None
    model: str = "@cf/black-forest-labs/flux-1-schnell"
    num_steps: Optional[int] = None
    numSteps: Optional[int] = None
    guidance: float = 7.5

    def get_num_steps(self) -> int:
        return self.num_steps or self.numSteps or 4

class I2IRequest(BaseModel):
    prompt: str
    image_data: Optional[str] = None
    imageData: Optional[str] = None
    model: str = "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    strength: float = 0.75
    guidance: float = 7.5

    def get_image_data(self) -> str:
        data = self.image_data or self.imageData
        if not data:
            raise HTTPException(status_code=400, detail="Input reference image (image_data) is required for Image-to-Image.")
        return data

# ----------------- Video Endpoints (AGNES - T2V Only) -----------------

@router.post("/t2v")
async def generate_text_to_video(req: T2VRequest):
    """
    Submits real Text-to-Video generation task to Agnes AI (POST /videos).
    """
    result = await agnes_service.generate_text_to_video(
        prompt=req.prompt,
        duration=req.duration,
        model=req.model,
        aspect_ratio=req.get_aspect_ratio()
    )

    if not result.get("success"):
        status_code = result.get("status_code", 500)
        raise HTTPException(status_code=status_code, detail=result.get("error", "Video generation failed"))

    return result

@router.get("/status/{job_id}")
async def get_video_status(job_id: str):
    """
    Polls real task status from Agnes AI or Hedra.
    """
    if "hedra" in job_id.lower():
        return await hedra_service.check_status(job_id)
    return await agnes_service.check_status(job_id)

# ----------------- Avatar Endpoints (HEDRA) -----------------

@router.post("/hedra")
async def generate_hedra_avatar(req: HedraRequest):
    """
    Submits talking avatar generation task to Hedra with real uploaded portrait image.
    """
    result = await hedra_service.generate_avatar(
        prompt=req.prompt,
        voice_text=req.get_voice_text(),
        image_data=req.get_image_data(),
        aspect_ratio=req.get_aspect_ratio()
    )

    if not result.get("success"):
        status_code = result.get("status_code", 500)
        raise HTTPException(status_code=status_code, detail=result.get("error", "Avatar generation failed"))

    return result

# ----------------- Image Endpoints (Cloudflare) -----------------

@router.post("/t2i")
async def generate_text_to_image(req: T2IRequest):
    """
    Text-to-Image generation with Cloudflare Workers AI.
    """
    result = await cloudflare_service.generate_text_to_image(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt or req.negativePrompt,
        model=req.model,
        num_steps=req.get_num_steps(),
        guidance=req.guidance
    )
    if not result.get("success"):
        raise HTTPException(status_code=result.get("status_code", 500), detail=result.get("error"))
    return result

@router.post("/i2i")
async def generate_image_to_image(req: I2IRequest):
    """
    Image-to-Image transformation with Cloudflare Workers AI using uploaded file.
    """
    result = await cloudflare_service.generate_image_to_image(
        prompt=req.prompt,
        image_data=req.get_image_data(),
        model=req.model,
        strength=req.strength,
        guidance=req.guidance
    )
    if not result.get("success"):
        raise HTTPException(status_code=result.get("status_code", 500), detail=result.get("error"))
    return result

# ----------------- Diagnostics & Health -----------------

@router.get("/diagnostics/agnes")
@router.post("/diagnostics/agnes")
async def run_diagnostics():
    """
    Performs verified non-billing diagnostic audit of environment, endpoints, and live connectivity.
    Strictly reports actual results without simulated passes.
    """
    backend_port = os.getenv("PORT", "8011")
    agnes_configured = agnes_service.is_configured()
    hedra_configured = hedra_service.is_configured()
    cf_configured = cloudflare_service.is_configured()

    env_checks = [
        {"name": "AGNES_API_KEY", "configured": agnes_configured},
        {"name": "AGNES_BASE_URL", "configured": bool(os.getenv("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1"))},
        {"name": "HEDRA_API_KEY", "configured": hedra_configured},
        {"name": "HEDRA_BASE_URL", "configured": bool(os.getenv("HEDRA_BASE_URL", "https://api.hedra.com/v3"))},
        {"name": "CLOUDFLARE_ACCOUNT_ID", "configured": bool(os.getenv("CLOUDFLARE_ACCOUNT_ID"))},
        {"name": "CLOUDFLARE_API_TOKEN", "configured": bool(os.getenv("CLOUDFLARE_API_TOKEN"))},
    ]

    agnes_probe = await agnes_service.probe_connectivity()
    hedra_probe = await hedra_service.probe_connectivity()
    cf_probe = await cloudflare_service.probe_connectivity()

    return {
        "timestamp": time.time(),
        "backend": {
            "host": os.getenv("HOST", "127.0.0.1"),
            "port": backend_port,
            "status": "RUNNING",
        },
        "environment_variables": env_checks,
        "probes": {
            "agnes": agnes_probe,
            "hedra": hedra_probe,
            "cloudflare": cf_probe
        },
        "agnes_probe": agnes_probe,
        "hedra_probe": hedra_probe,
        "cloudflare_probe": cf_probe,
        "providers_status": {
            "agnes": "Yapılandırıldı" if agnes_configured else "Eksik (backend/.env)",
            "hedra": "Yapılandırıldı" if hedra_configured else "Eksik (backend/.env)",
            "cloudflare": "Yapılandırıldı" if cf_configured else "Eksik (backend/.env)",
        }
    }
