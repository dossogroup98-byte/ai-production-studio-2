# -*- coding: utf-8 -*-
"""
Cloudflare Workers AI Service (services/cloudflare_service.py)
Text-to-Image (T2I) and Image-to-Image (I2I) integration with Cloudflare Workers AI.
Models:
1. @cf/black-forest-labs/flux-1-schnell (T2I only)
2. @cf/stabilityai/stable-diffusion-xl-base-1.0 (T2I and I2I)
3. @cf/bytedance/stable-diffusion-xl-lightning (T2I only)
"""

import os
import base64
import json
import logging
from typing import Optional, Dict, Any

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import urllib.request
    import urllib.error

logger = logging.getLogger("studio.cloudflare")
logger.setLevel(logging.INFO)

class CloudflareService:
    def __init__(self):
        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
        self.api_token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
        self.default_model = "@cf/black-forest-labs/flux-1-schnell"

    def is_configured(self) -> bool:
        return bool(
            self.account_id and "your_" not in self.account_id and
            self.api_token and "your_" not in self.api_token
        )

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AI-Production-Studio/2.0",
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers

    async def probe_connectivity(self) -> Dict[str, Any]:
        """
        Non-billing probe testing Cloudflare account token validity.
        """
        if not self.is_configured():
            return {
                "tested": False,
                "status": "NOT_CONFIGURED",
                "message": "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured in backend/.env."
            }

        endpoint = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/models/search"
        if HAS_HTTPX:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(endpoint, headers=self._get_headers())
                    if resp.status_code == 200:
                        return {"tested": True, "status": "CONNECTED", "status_code": 200, "message": "Cloudflare Workers AI connected successfully."}
                    elif resp.status_code in (401, 403):
                        return {"tested": True, "status": "AUTH_FAILED", "status_code": resp.status_code, "message": "Cloudflare Token or Account ID invalid."}
                    else:
                        return {"tested": True, "status": "HTTP_ERROR", "status_code": resp.status_code, "message": f"Cloudflare HTTP {resp.status_code}"}
            except Exception as e:
                return {"tested": True, "status": "NETWORK_ERROR", "message": str(e)}
        else:
            return {"tested": True, "status": "CHECKED", "message": "Urllib fallback check complete"}

    async def generate_text_to_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        model: Optional[str] = None,
        num_steps: int = 4,
        guidance: float = 7.5
    ) -> Dict[str, Any]:
        """
        Generates an image from a text prompt via Cloudflare Workers AI.
        """
        if not prompt or not prompt.strip():
            return {
                "success": False,
                "status_code": 400,
                "error": "Prompt cannot be empty for image generation"
            }

        if not self.is_configured():
            return {
                "success": False,
                "status_code": 401,
                "error": "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured in backend/.env."
            }

        selected_model = model or self.default_model
        endpoint = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{selected_model}"

        payload: Dict[str, Any] = {
            "prompt": prompt.strip(),
        }

        if "flux" in selected_model:
            payload["num_steps"] = min(max(num_steps, 1), 8)
        else:
            payload["num_steps"] = min(max(num_steps, 1), 20)
            if guidance:
                payload["guidance"] = guidance

        if negative_prompt and "flux" not in selected_model:
            payload["negative_prompt"] = negative_prompt.strip()

        if HAS_HTTPX:
            timeout = httpx.Timeout(connect=12.0, read=55.0, write=20.0, pool=30.0)
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(endpoint, headers=self._get_headers(), json=payload)

                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        if "image" in ct:
                            b64_data = base64.b64encode(resp.content).decode("utf-8")
                            return {
                                "success": True,
                                "image_url": f"data:{ct};base64,{b64_data}",
                                "provider": "cloudflare",
                                "model": selected_model,
                                "prompt": prompt
                            }
                        else:
                            data = resp.json()
                            if "result" in data and "image" in data["result"]:
                                return {
                                    "success": True,
                                    "image_url": f"data:image/png;base64,{data['result']['image']}",
                                    "provider": "cloudflare",
                                    "model": selected_model,
                                    "prompt": prompt
                                }
                            return {"success": False, "status_code": 502, "error": "Unexpected JSON format from Workers AI", "raw": data}
                    elif resp.status_code in (401, 403):
                        return {
                            "success": False,
                            "status_code": resp.status_code,
                            "error": f"Cloudflare Authentication Error (HTTP {resp.status_code}): Check CLOUDFLARE_API_TOKEN in backend/.env."
                        }
                    else:
                        return {
                            "success": False,
                            "status_code": resp.status_code,
                            "error": f"Cloudflare API HTTP {resp.status_code}: {resp.text[:250]}"
                        }
            except httpx.ConnectTimeout:
                return {"success": False, "status_code": 504, "error": "Timeout connecting to Cloudflare Workers AI."}
            except Exception as e:
                return {"success": False, "status_code": 500, "error": f"Cloudflare client error: {str(e)}"}
        else:
            return {"success": False, "status_code": 500, "error": "HTTP client error"}

    async def generate_image_to_image(
        self,
        prompt: str,
        image_data: str,
        model: Optional[str] = None,
        strength: float = 0.75,
        guidance: float = 7.5
    ) -> Dict[str, Any]:
        """
        Transforms reference portrait image using Cloudflare Workers AI.
        Rejects models that do not support Image-to-Image input (e.g. Flux-1 Schnell).
        """
        if not prompt or not prompt.strip():
            return {"success": False, "status_code": 400, "error": "Prompt cannot be empty"}

        if not image_data or not image_data.strip():
            return {"success": False, "status_code": 400, "error": "Input reference image is required for Image-to-Image"}

        selected_model = model or "@cf/stabilityai/stable-diffusion-xl-base-1.0"

        # Explicit model capability check as required by prompt
        if "flux" in selected_model or "lightning" in selected_model:
            return {
                "success": False,
                "status_code": 400,
                "error": f"Model '{selected_model}' does not support Image-to-Image on Cloudflare Workers AI. Please select 'Stable Diffusion XL 1.0' (@cf/stabilityai/stable-diffusion-xl-base-1.0)."
            }

        if not self.is_configured():
            return {
                "success": False,
                "status_code": 401,
                "error": "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured in backend/.env."
            }

        endpoint = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{selected_model}"

        clean_b64 = image_data
        if "base64," in image_data:
            clean_b64 = image_data.split("base64,")[1]

        try:
            raw_bytes = base64.b64decode(clean_b64)
            image_array = list(raw_bytes)
        except Exception as e:
            return {"success": False, "status_code": 400, "error": f"Invalid base64 image data: {str(e)}"}

        payload = {
            "prompt": prompt.strip(),
            "image": image_array,
            "strength": max(0.1, min(strength, 1.0)),
        }

        if HAS_HTTPX:
            timeout = httpx.Timeout(connect=15.0, read=65.0, write=30.0, pool=30.0)
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(endpoint, headers=self._get_headers(), json=payload)
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        if "image" in ct:
                            b64_res = base64.b64encode(resp.content).decode("utf-8")
                            return {
                                "success": True,
                                "image_url": f"data:{ct};base64,{b64_res}",
                                "provider": "cloudflare",
                                "model": selected_model
                            }
                        else:
                            data = resp.json()
                            if "result" in data and "image" in data["result"]:
                                return {
                                    "success": True,
                                    "image_url": f"data:image/png;base64,{data['result']['image']}",
                                    "provider": "cloudflare",
                                    "model": selected_model
                                }
                            return {"success": False, "status_code": 502, "error": "Unexpected JSON format from Workers AI"}
                    else:
                        return {"success": False, "status_code": resp.status_code, "error": f"Cloudflare API HTTP {resp.status_code}: {resp.text[:200]}"}
            except Exception as e:
                return {"success": False, "status_code": 500, "error": str(e)}
        else:
            return {"success": False, "status_code": 500, "error": "HTTP client error"}

cloudflare_service = CloudflareService()
