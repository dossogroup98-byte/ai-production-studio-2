# -*- coding: utf-8 -*-
"""
Automated Test Suite for AI Production Studio (backend/test_studio.py)
Tests AGNES T2V, Hedra Avatars, Cloudflare T2I/I2I, and file encodings.
"""

import os
import sys
import asyncio

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from services.agnes_service import AgnesService
from services.hedra_service import HedraService
from services.cloudflare_service import CloudflareService

def test_file_encodings_no_bom():
    services_dir = os.path.join(os.path.dirname(__file__), "services")
    for fname in ["agnes_service.py", "hedra_service.py", "cloudflare_service.py"]:
        fpath = os.path.join(services_dir, fname)
        assert os.path.exists(fpath), f"{fname} must exist"
        with open(fpath, "rb") as f:
            header = f.read(3)
            assert header != b'\xef\xbb\xbf', f"{fname} MUST NOT contain UTF-8 BOM"
    print("  [PASS] test_file_encodings_no_bom (All service files are clean UTF-8)")

async def async_tests():
    # 1. Agnes T2V validation
    service = AgnesService()
    empty_res = await service.generate_text_to_video(prompt="")
    assert empty_res["success"] is False
    assert empty_res["status_code"] == 400
    print("  [PASS] test_agnes_empty_prompt_validation (Rejects empty prompt with 400)")

    # When no key is set, real service returns 401 (no fake generation!)
    if not service.is_configured():
        no_key_res = await service.generate_text_to_video(prompt="Valid test prompt")
        assert no_key_res["success"] is False
        assert no_key_res["status_code"] == 401
        assert "AGNES_API_KEY is not configured" in no_key_res["error"]
        print("  [PASS] test_agnes_missing_key_honesty (Correctly halts with 401 without mock simulation)")

    probe = await service.probe_connectivity()
    assert probe["status"] in ("NOT_CONFIGURED", "CONNECTED", "AUTH_ERROR", "SERVICE_UNAVAILABLE", "TIMEOUT", "NETWORK_ERROR", "HTTP_ERROR")
    print(f"  [PASS] test_agnes_probe_connectivity (Probe status: {probe['status']})")

    # 2. Hedra validation
    hedra = HedraService()
    h_empty = await hedra.generate_avatar(prompt="", voice_text="")
    assert h_empty["success"] is False
    assert h_empty["status_code"] == 400
    print("  [PASS] test_hedra_empty_input_validation (Rejects missing script with 400)")

    h_no_img = await hedra.generate_avatar(prompt="Speech text", image_data="")
    assert h_no_img["success"] is False
    print("  [PASS] test_hedra_missing_image_validation (Rejects missing avatar image)")

    # 3. Cloudflare T2I & I2I validation
    cf = CloudflareService()
    cf_empty = await cf.generate_text_to_image(prompt="")
    assert cf_empty["success"] is False
    assert cf_empty["status_code"] == 400
    print("  [PASS] test_cloudflare_t2i_empty_validation")

    # Verify that Flux is rejected for I2I
    cf_flux_i2i = await cf.generate_image_to_image(
        prompt="Transform this",
        image_data="dGVzdA==",
        model="@cf/black-forest-labs/flux-1-schnell"
    )
    assert cf_flux_i2i["success"] is False
    assert "does not support Image-to-Image" in cf_flux_i2i["error"]
    print("  [PASS] test_cloudflare_flux_i2i_rejection (Enforces SDXL for Image-to-Image)")

def main():
    print("==================================================")
    print("  AI PRODUCTION STUDIO - UNIT & ENCODING TESTS")
    print("==================================================")
    test_file_encodings_no_bom()
    asyncio.run(async_tests())
    print("==================================================")
    print("  ALL TESTS PASSED (0 FAILURES)")
    print("==================================================")

if __name__ == "__main__":
    main()
