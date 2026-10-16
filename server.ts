import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

function buildAgnesUrl(base: string, pathSegment: string): string {
  let cleanBase = base.trim().replace(/\/$/, '');
  if (cleanBase.endsWith('/v1')) {
    cleanBase = cleanBase.slice(0, -3);
  }
  let cleanPath = pathSegment.trim().replace(/^\//, '');
  if (cleanPath.startsWith('v1/')) {
    cleanPath = cleanPath.slice(3);
  }
  return `${cleanBase}/v1/${cleanPath}`;
}

function buildHedraUrl(base: string, pathSegment: string): string {
  let cleanBase = base.trim().replace(/\/$/, '');
  let cleanPath = pathSegment.trim().replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health endpoint
  app.get(['/health', '/api/health', '/api/studio/health'], (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'AI Production Studio Full-Stack Server',
      timestamp: Date.now(),
      providers: {
        agnes_configured: !!process.env.AGNES_API_KEY && !process.env.AGNES_API_KEY.includes('your_'),
        hedra_configured: !!process.env.HEDRA_API_KEY && !process.env.HEDRA_API_KEY.includes('your_'),
        cloudflare_configured: !!(
          process.env.CLOUDFLARE_ACCOUNT_ID && !process.env.CLOUDFLARE_ACCOUNT_ID.includes('your_') &&
          process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_API_TOKEN.includes('your_')
        ),
      },
    });
  });

  // ---------------- AGNES, HEDRA & CLOUDFLARE Diagnostics & Probe Endpoint ----------------
  app.all(['/api/studio/diagnostics', '/api/studio/diagnostics/agnes'], async (_req: Request, res: Response) => {
    const agnesKey = (process.env.AGNES_API_KEY || '').trim();
    const agnesBase = process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1';

    const hedraKey = (process.env.HEDRA_API_KEY || '').trim();
    const hedraBase = process.env.HEDRA_BASE_URL || 'https://api.hedra.com/v3';

    const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

    const agnesConfigured = !!agnesKey && !agnesKey.includes('your_') && !agnesKey.includes('MY_');
    const hedraConfigured = !!hedraKey && !hedraKey.includes('your_') && !hedraKey.includes('MY_');
    const cfConfigured = !!(
      cfAccount && !cfAccount.includes('your_') &&
      cfToken && !cfToken.includes('your_')
    );

    // 1. Agnes Probe
    let agnesProbe: any = {
      tested: false,
      status: 'NOT_CONFIGURED',
      message: 'AGNES_API_KEY is not configured or contains placeholder value in backend/.env.',
      statusCode: null,
    };

    if (agnesConfigured) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const startTime = Date.now();
        const probeUrl = buildAgnesUrl(agnesBase, 'models');

        const probeResp = await fetch(probeUrl, {
          headers: {
            Authorization: `Bearer ${agnesKey}`,
            'User-Agent': 'curl/7.88.1',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        const reqId = probeResp.headers.get('x-request-id') || probeResp.headers.get('cf-ray') || 'N/A';

        if (probeResp.status === 200) {
          agnesProbe = {
            tested: true,
            status: 'CONNECTED',
            statusCode: 200,
            latencyMs,
            requestId: reqId,
            endpointProbed: probeUrl,
            message: 'Agnes AI API connected successfully (HTTP 200).',
          };
        } else if (probeResp.status === 401 || probeResp.status === 403) {
          agnesProbe = {
            tested: true,
            status: 'AUTH_FAILED',
            statusCode: probeResp.status,
            requestId: reqId,
            endpointProbed: probeUrl,
            message: `HTTP ${probeResp.status} Auth Failed: Invalid key or insufficient subscription on Agnes AI.`,
          };
        } else {
          agnesProbe = {
            tested: true,
            status: 'HTTP_ERROR',
            statusCode: probeResp.status,
            requestId: reqId,
            endpointProbed: probeUrl,
            message: `Agnes AI returned HTTP ${probeResp.status}`,
          };
        }
      } catch (err: any) {
        agnesProbe = {
          tested: true,
          status: 'NETWORK_ERROR',
          statusCode: 502,
          message: `Network probe failed: ${err.message}`,
        };
      }
    }

    // 2. Hedra Probe
    let hedraProbe: any = {
      tested: false,
      status: 'NOT_CONFIGURED',
      message: 'HEDRA_API_KEY is not configured in backend/.env.',
    };

    if (hedraConfigured) {
      try {
        const rootBase = hedraBase.replace(/\/v[1-9]$/, '');
        const hUrl = `${rootBase}/healthz`;
        const hResp = await fetch(hUrl, {
          headers: {
            'X-API-KEY': hedraKey,
            Authorization: `Bearer ${hedraKey}`,
            'User-Agent': 'curl/7.88.1',
          },
        });
        if (hResp.status === 200) {
          hedraProbe = { tested: true, status: 'CONNECTED', statusCode: 200, message: 'Hedra v3 API connected successfully (HTTP 200).' };
        } else if (hResp.status === 401 || hResp.status === 403) {
          hedraProbe = { tested: true, status: 'AUTH_FAILED', statusCode: hResp.status, message: `Hedra v3 Auth Error (${hResp.status}).` };
        } else {
          hedraProbe = { tested: true, status: 'HTTP_ERROR', statusCode: hResp.status, message: `Hedra returned HTTP ${hResp.status}` };
        }
      } catch (err: any) {
        hedraProbe = { tested: true, status: 'NETWORK_ERROR', message: err.message };
      }
    }

    // 3. Cloudflare Probe
    let cfProbe: any = {
      tested: false,
      status: 'NOT_CONFIGURED',
      message: 'Cloudflare credentials not configured in backend/.env.',
    };

    if (cfConfigured) {
      try {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/models/search`;
        const cfResp = await fetch(cfUrl, {
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'User-Agent': 'curl/7.88.1',
          },
        });
        if (cfResp.status === 200) {
          cfProbe = { tested: true, status: 'CONNECTED', statusCode: 200, message: 'Cloudflare Workers AI connected successfully (HTTP 200).' };
        } else {
          cfProbe = { tested: true, status: 'AUTH_FAILED', statusCode: cfResp.status, message: `Cloudflare returned HTTP ${cfResp.status}` };
        }
      } catch (err: any) {
        cfProbe = { tested: true, status: 'NETWORK_ERROR', message: err.message };
      }
    }

    let isFastApiActive = false;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 800);
      const fResp = await fetch('http://127.0.0.1:8011/api/studio/health', { signal: c.signal });
      clearTimeout(t);
      isFastApiActive = fResp.ok;
    } catch (_) {}

    res.json({
      timestamp: Date.now(),
      backend: {
        host: '127.0.0.1',
        port: PORT,
        service: 'Node/Express & Vite Middleware (Port 3000)',
        fastapi_port: 8011,
        fastapi_status: isFastApiActive ? 'AKTÄ°F (Port 8011 - Uvicorn)' : 'DURDURULDU (start.bat ile baÅŸlatÄ±labilir)',
      },
      environment_variables: [
        { name: 'AGNES_API_KEY', configured: agnesConfigured },
        { name: 'AGNES_BASE_URL', configured: !!agnesBase },
        { name: 'HEDRA_API_KEY', configured: hedraConfigured },
        { name: 'HEDRA_BASE_URL', configured: !!hedraBase },
        { name: 'CLOUDFLARE_ACCOUNT_ID', configured: cfConfigured },
        { name: 'CLOUDFLARE_API_TOKEN', configured: cfConfigured },
      ],
      agnes_probe: agnesProbe,
      hedra_probe: hedraProbe,
      cloudflare_probe: cfProbe,
      providers_status: {
        agnes: agnesConfigured ? 'AyarlÄ± (backend/.env)' : 'Eksik (backend/.env)',
        hedra: hedraConfigured ? 'AyarlÄ± (backend/.env)' : 'Eksik (backend/.env)',
        cloudflare: cfConfigured ? 'AyarlÄ± (backend/.env)' : 'Eksik (backend/.env)',
      },
    });
  });


    // ---------------- Cloudflare Image-to-Image (FLUX.2 Klein 4B) ----------------
    app.post('/api/studio/i2i', async (req: Request, res: Response) => {
        try {
            const {
                prompt,
                imageData,
                image_data,
                image_url_or_b64,
                strength = 0.75,
            } = req.body;

            const finalImage = imageData || image_data || image_url_or_b64;
            const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
            const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

            if (typeof prompt !== 'string' || !prompt.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt is required for Image-to-Image.',
                });
            }

            if (typeof finalImage !== 'string' || !finalImage.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Input reference image is required for Image-to-Image.',
                });
            }

            if (!cfAccount || !cfToken ||
                cfAccount.includes('your_') || cfToken.includes('your_')) {
                return res.status(401).json({
                    success: false,
                    error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured.',
                });
            }

            const mimeMatch = finalImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
            const mimeType = mimeMatch?.[1] || 'image/png';
            const cleanB64 = finalImage.replace(/^data:[^,]*;base64,/, '').trim();

            if (!cleanB64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanB64)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference image must be a valid base64 image.',
                });
            }

            const imageBuffer = Buffer.from(cleanB64, 'base64');

            if (imageBuffer.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference image is empty.',
                });
            }

            // Cloudflare FLUX.2 Klein 4B requires multipart form data.
            const form = new FormData();
            form.append('prompt', prompt.trim());
            form.append(
                'input_image_0',
                new Blob([new Uint8Array(imageBuffer)], { type: mimeType }),
                'reference.png'
            );

            const numericStrength = Number(strength);
            const guidance = Number.isFinite(numericStrength)
                ? Math.min(Math.max(numericStrength * 10, 1), 20)
                : 7.5;

            form.append('guidance', String(guidance));

            const cfResp = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${cfToken}`,
                    },
                    body: form,
                }
            );

            if (!cfResp.ok) {
                const errText = await cfResp.text();
                console.error('[Cloudflare I2I]', cfResp.status, errText.slice(0, 1000));

                return res.status(cfResp.status).json({
                    success: false,
                    error: `Cloudflare I2I HTTP ${cfResp.status}: ${errText.slice(0, 500)}`,
                });
            }

            const contentType = cfResp.headers.get('content-type') || '';

            if (contentType.toLowerCase().includes('image/')) {
                const bytes = Buffer.from(await cfResp.arrayBuffer());

                return res.json({
                    success: true,
                    image_url: `data:${contentType};base64,${bytes.toString('base64')}`,
                    provider: 'cloudflare',
                    model: '@cf/black-forest-labs/flux-2-klein-4b',
                });
            }

            const json = await cfResp.json() as any;
            const image = json?.result?.image ?? json?.image;

            if (typeof image === 'string' && image.length > 0) {
                return res.json({
                    success: true,
                    image_url: image.startsWith('data:')
                        ? image
                        : `data:image/jpeg;base64,${image}`,
                    provider: 'cloudflare',
                    model: '@cf/black-forest-labs/flux-2-klein-4b',
                });
            }

            console.error(
                '[Cloudflare I2I] Unexpected response:',
                JSON.stringify(json).slice(0, 1000)
            );

            return res.status(502).json({
                success: false,
                error: 'Cloudflare I2I yanitinda gorsel verisi bulunamadi.',
            });
        } catch (err: any) {
            console.error('[Cloudflare I2I] Error:', err);

            return res.status(500).json({
                success: false,
                error: err instanceof Error ? err.message : 'Cloudflare I2I failed.',
            });
        }
    });


  // ---------------- Status Polling Endpoint (Real Status) ----------------
  app.get('/api/studio/status/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;

    // Route to Hedra if jobId indicates hedra
    if (jobId.toLowerCase().includes('hedra')) {
      const hedraKey = (process.env.HEDRA_API_KEY || '').trim();
      const baseUrl = (process.env.HEDRA_BASE_URL || 'https://api.hedra.com/v3').replace(/\/$/, '');
      if (!hedraKey || hedraKey.includes('your_')) {
        return res.status(401).json({ status: 'failed', error: 'HEDRA_API_KEY is not configured in backend/.env' });
      }
      try {
        const resp = await fetch(`${baseUrl}/jobs/${jobId}/status`, {
          headers: {
            'X-API-KEY': hedraKey,
            Authorization: `Bearer ${hedraKey}`,
            'User-Agent': 'curl/7.88.1',
          },
        });
        if (!resp.ok) {
          return res.status(resp.status).json({ status: 'failed', error: `Hedra check HTTP ${resp.status}` });
        }
        const data = (await resp.json()) as any;
        const st = String(data.status || '').toLowerCase();
        if (['completed', 'ready', 'done', 'succeeded'].includes(st)) {
          return res.json({ status: 'completed', video_url: data.output_url || data.video_url || data.url, raw: data });
        }
        if (['failed', 'error'].includes(st)) {
          return res.json({ status: 'failed', error: data.error || data.message || 'Avatar synthesis failed upstream' });
        }
        return res.json({ status: 'processing', progress: data.progress, raw: data });
      } catch (err: any) {
        return res.json({ status: 'processing', warning: err.message });
      }
    }

    // Default: Agnes status check
    const agnesKey = (process.env.AGNES_API_KEY || '').trim();
    const agnesBase = process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1';

    if (!agnesKey || agnesKey.includes('your_')) {
      return res.status(401).json({ status: 'failed', error: 'AGNES_API_KEY is not configured in backend/.env' });
    }

    try {
      const targetUrl = buildAgnesUrl(agnesBase, `videos/${jobId}`);
      let resp = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${agnesKey}`,
          'User-Agent': 'curl/7.88.1',
          Accept: '*/*',
        },
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          // Fallback to alternative agnesapi endpoint
          const altUrl = `${agnesBase.replace(/\/v1$/, '')}/agnesapi?video_id=${jobId}`;
          try {
            const altResp = await fetch(altUrl, {
              headers: {
                Authorization: `Bearer ${agnesKey}`,
                'User-Agent': 'curl/7.88.1',
                Accept: '*/*',
              },
            });
            if (altResp.ok) {
              resp = altResp;
            }
          } catch (_) {}
        }

        if (!resp.ok) {
          if (resp.status === 404) {
            return res.status(404).json({ status: 'failed', error: `Video task '${jobId}' not found on Agnes AI (HTTP 404)` });
          }
          if (resp.status === 503) {
            return res.json({ status: 'processing', warning: 'Upstream transient 503; retrying query...' });
          }
          return res.status(resp.status).json({ status: 'failed', error: `Status query HTTP ${resp.status}` });
        }
      }

      const data = (await resp.json()) as any;
      const rawStatus = String(data.status || '').toLowerCase();

      if (['completed', 'succeeded', 'success', 'done'].includes(rawStatus)) {
        return res.json({
          status: 'completed',
          video_url: data.video_url || data.output_url || data.url,
          provider: 'agnes',
          raw: data,
        });
      }

      if (['failed', 'error'].includes(rawStatus)) {
        return res.json({
          status: 'failed',
          error: data.error || data.message || 'Agnes video generation failed upstream',
          raw: data,
        });
      }

      return res.json({
        status: 'processing',
        progress: data.progress,
        message: data.message || 'Rendering video frames on Agnes GPU cluster...',
        provider: 'agnes',
        raw: data,
      });
    } catch (err: any) {
      return res.json({ status: 'processing', warning: `Transient query error: ${err.message}` });
    }
  });

  // ---------------- Hedra Avatar Generation ----------------
  app.post('/api/studio/hedra', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        voiceText,
        voice_text,
        imageData,
        image_data,
        aspectRatio,
        aspect_ratio,
      } = req.body;
      const hedraKey = (process.env.HEDRA_API_KEY || '').trim();
      const baseUrl = (process.env.HEDRA_BASE_URL || 'https://api.hedra.com/v3').replace(/\/$/, '');

      const textScript = voiceText || voice_text || prompt;
      const portraitImage = imageData || image_data;
      const finalAspectRatio = aspect_ratio || aspectRatio || '1:1';

      if (!textScript || !textScript.trim()) {
        return res.status(400).json({ success: false, error: 'Prompt or speech script is required.' });
      }

      if (!portraitImage) {
        return res.status(400).json({ success: false, error: 'Reference portrait image is required for Hedra avatar generation.' });
      }

      if (!hedraKey || hedraKey.includes('your_')) {
        return res.status(401).json({
          success: false,
          status_code: 401,
          provider: 'hedra',
          error: 'HEDRA_API_KEY is not configured in backend/.env. Please configure your key to generate avatars.',
        });
      }

      const payload = {
        image: portraitImage,
        text: textScript.trim(),
        aspect_ratio: finalAspectRatio,
      };

      const bodyStr = JSON.stringify(payload);
      const resp = await fetch(`${baseUrl}/models/hedra-character-3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          /*'Content-Length': Buffer.byteLength(bodyStr).toString(),*/
          'X-API-KEY': hedraKey,
          Authorization: `Bearer ${hedraKey}`,
          'User-Agent': 'curl/7.88.1',
        },
        body: bodyStr,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = `Hedra API HTTP ${resp.status}: ${errText.slice(0, 200)}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            errMsg = `Hedra API: ${parsed.error.message}`;
          }
        } catch (_) {}
        return res.status(resp.status).json({ success: false, error: errMsg });
      }

      const data = (await resp.json()) as any;
      const jobId = data.job_id || data.id || data.jobId;
      if (!jobId) {
        return res.status(502).json({ success: false, error: 'Hedra did not return a valid jobId', raw: data });
      }

      return res.json({
        success: true,
        job_id: String(jobId),
        status: 'processing',
        video_url: data.video_url || data.output_url || data.url,
        provider: 'hedra',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: `Hedra error: ${err.message}` });
    }
  });

  // ---------------- Cloudflare Workers AI (T2I & I2I) ----------------
  app.post('/api/studio/t2i', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        model = '@cf/black-forest-labs/flux-1-schnell',
        numSteps,
        num_steps,
        steps,
        guidance = 7.5,
      } = req.body;

      const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
      const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Prompt is required.' });
      }

      if (!cfAccount || !cfToken || cfAccount.includes('your_') || cfToken.includes('your_')) {
        return res.status(401).json({
          success: false,
          error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured.',
        });
      }

      const isFlux = String(model).includes('flux-1-schnell');
      const requestedSteps = Number(steps ?? num_steps ?? numSteps ?? (isFlux ? 4 : 20));
      const payload: Record<string, unknown> = { prompt: prompt.trim() };

      if (isFlux) {
        payload.steps = Math.min(Math.max(requestedSteps || 4, 1), 8);
      } else {
        payload.num_steps = Math.min(Math.max(requestedSteps || 20, 1), 20);
        if (Number.isFinite(Number(guidance))) {
          payload.guidance = Number(guidance);
        }
      }

      const cfResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!cfResp.ok) {
        const errText = await cfResp.text();
        console.error('[Cloudflare T2I]', cfResp.status, errText.slice(0, 1000));
        return res.status(cfResp.status).json({
          success: false,
          error: `Cloudflare T2I HTTP ${cfResp.status}: ${errText.slice(0, 500)}`,
        });
      }

      const contentType = cfResp.headers.get('content-type') || 'image/jpeg';

      if (contentType.toLowerCase().includes('image/')) {
        const bytes = Buffer.from(await cfResp.arrayBuffer());
        return res.json({
          success: true,
          image_url: `data:${contentType};base64,${bytes.toString('base64')}`,
          provider: 'cloudflare',
          model,
          prompt: prompt.trim(),
        });
      }

      const json = await cfResp.json() as any;
      const image = json?.result?.image ?? json?.image;

      if (typeof image === 'string' && image.length > 0) {
        const dataUri = image.startsWith('data:')
          ? image
          : `data:image/jpeg;base64,${image}`;

        return res.json({
          success: true,
          image_url: dataUri,
          provider: 'cloudflare',
          model,
          prompt: prompt.trim(),
        });
      }

      console.error('[Cloudflare T2I] Unexpected response:', JSON.stringify(json).slice(0, 1000));
      return res.status(502).json({
        success: false,
        error: 'Cloudflare T2I yanitinda gorsel verisi bulunamadi.',
      });
    } catch (err: any) {
      console.error('[Cloudflare T2I] Error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Cloudflare T2I failed.',
      });
    }
  });

  app.post('/api/studio/i2i', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        imageData,
        image_data,
        image_url_or_b64,
          model = '@cf/runwayml/stable-diffusion-v1-5-img2img',
        strength = 0.75,
      } = req.body;

      const finalImage = imageData || image_data || image_url_or_b64;
      const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
      const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Prompt is required for Image-to-Image.' });
      }

      if (typeof finalImage !== 'string' || !finalImage.trim()) {
        return res.status(400).json({ success: false, error: 'Input reference image is required for Image-to-Image.' });
      }

      if (String(model).includes('flux') || String(model).includes('lightning')) {
        return res.status(400).json({
          success: false,
            error: `Model '${model}' does not support this Image-to-Image route. Select Stable Diffusion 1.5 Image-to-Image.    `,
        });
      }

      if (!cfAccount || !cfToken || cfAccount.includes('your_') || cfToken.includes('your_')) {
        return res.status(401).json({
          success: false,
          error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not configured.',
        });
      }

      const cleanB64 = finalImage.replace(/^data:[^,]*;base64,/, '').trim();

      if (!cleanB64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanB64)) {
        return res.status(400).json({
          success: false,
          error: 'Reference image must be a valid base64 image.',
        });
      }

      const numericStrength = Number(strength);
      const safeStrength = Number.isFinite(numericStrength)
        ? Math.min(Math.max(numericStrength, 0), 1)
        : 0.75;

      const cfResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfToken}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
              image_b64: cleanB64,
            strength: safeStrength,
          }),
        }
      );

      if (!cfResp.ok) {
        const errText = await cfResp.text();
        console.error('[Cloudflare I2I]', cfResp.status, errText.slice(0, 1000));
        return res.status(cfResp.status).json({
          success: false,
          error: `Cloudflare I2I HTTP ${cfResp.status}: ${errText.slice(0, 500)}`,
        });
      }

      const contentType = cfResp.headers.get('content-type') || 'image/jpeg';

      if (contentType.toLowerCase().includes('image/')) {
        const bytes = Buffer.from(await cfResp.arrayBuffer());
        return res.json({
          success: true,
          image_url: `data:${contentType};base64,${bytes.toString('base64')}`,
          provider: 'cloudflare',
          model,
        });
      }

      const json = await cfResp.json() as any;
      const image = json?.result?.image ?? json?.image;

      if (typeof image === 'string' && image.length > 0) {
        return res.json({
          success: true,
          image_url: image.startsWith('data:')
            ? image
            : `data:image/jpeg;base64,${image}`,
          provider: 'cloudflare',
          model,
        });
      }

      console.error('[Cloudflare I2I] Unexpected response:', JSON.stringify(json).slice(0, 1000));
      return res.status(502).json({
        success: false,
        error: 'Cloudflare I2I yanitinda gorsel verisi bulunamadi.',
      });
    } catch (err: any) {
      console.error('[Cloudflare I2I] Error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Cloudflare I2I failed.',
      });
    }
  });
  // ---------------- Backend Monorepo Files Viewer & Downloader ----------------
  app.get('/api/studio/files', (_req: Request, res: Response) => {
    try {
      const backendDir = path.resolve(process.cwd(), 'backend');
      const fileList = [
        'main.py',
        'routers/studio.py',
        'services/agnes_service.py',
        'services/hedra_service.py',
        'services/cloudflare_service.py',
        'requirements.txt',
        '.env.example',
        'start.bat',
        'start.sh',
        'test_studio.py',
      ];

      const files: Record<string, string> = {};
      for (const relPath of fileList) {
        const fullPath = path.join(backendDir, relPath);
        if (fs.existsSync(fullPath)) {
          files[relPath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }

      res.json({ success: true, files });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------- Vite / Frontend Middleware ----------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  
  app.post('/api/studio/multi-reference', async (req: Request, res: Response) => {
    try {
      const { prompt, images } = req.body;
      const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
      const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Prompt gerekli.' });
      }

      if (!Array.isArray(images) || images.length < 2 || images.length > 4) {
        return res.status(400).json({
          success: false,
          error: 'Lütfen 2 ile 4 arasında referans görsel seçin.',
        });
      }

      if (!cfAccount || !cfToken) {
        return res.status(401).json({
          success: false,
          error: 'Cloudflare ayarları eksik.',
        });
      }

      const form = new FormData();
      form.append('prompt', prompt.trim());

      for (let i = 0; i < images.length; i++) {
        const value = images[i];
        if (typeof value !== 'string') {
          return res.status(400).json({ success: false, error: `Görsel ${i + 1} geçersiz.` });
        }

        const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) {
          return res.status(400).json({
            success: false,
            error: `Görsel ${i + 1} base64 formatında değil.`,
          });
        }

        const bytes = Buffer.from(match[2], 'base64');
        if (!bytes.length) {
          return res.status(400).json({ success: false, error: `Görsel ${i + 1} boş.` });
        }

        form.append(
          `input_image_${i}`,
          new Blob([new Uint8Array(bytes)], { type: match[1] }),
          `reference-${i + 1}.png`
        );
      }

      const cfResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfToken}` },
          body: form,
        }
      );

      if (!cfResp.ok) {
        const errorText = await cfResp.text();
        console.error('[Multi-reference]', cfResp.status, errorText.slice(0, 800));
        return res.status(cfResp.status).json({
          success: false,
          error: `Cloudflare HTTP ${cfResp.status}: ${errorText.slice(0, 400)}`,
        });
      }

      const contentType = cfResp.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('image/')) {
        const bytes = Buffer.from(await cfResp.arrayBuffer());
        return res.json({
          success: true,
          image_url: `data:${contentType};base64,${bytes.toString('base64')}`,
          provider: 'cloudflare',
          model: '@cf/black-forest-labs/flux-2-klein-4b',
        });
      }

      const json = await cfResp.json() as any;
      const image = json?.result?.image ?? json?.image;
      if (typeof image === 'string' && image.length > 0) {
        return res.json({
          success: true,
          image_url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
          provider: 'cloudflare',
          model: '@cf/black-forest-labs/flux-2-klein-4b',
        });
      }

      return res.status(502).json({ success: false, error: 'Üretilen görsel yanıtında bulunamadı.' });
    } catch (err) {
      console.error('[Multi-reference] Error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Çoklu referans üretimi başarısız.',
      });
    }
  });





    app.post('/api/studio/multi-reference-start-end', async (req: Request, res: Response) => {
        try {
            const { prompt, referenceImages = [] } = req.body;

            const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
            const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

            if (typeof prompt !== 'string' || !prompt.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt gerekli.',
                });
            }

            if (
                !Array.isArray(referenceImages) ||
                referenceImages.length > 4 ||
                referenceImages.some(
                    (image: unknown) =>
                        typeof image !== 'string' ||
                        !/^data:image\/[a-zA-Z0-9.+-]+;base64,.+$/.test(image)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'En fazla 4 geçerli karakter referansı yükleyebilirsin.',
                });
            }

            if (!cfAccount || !cfToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Cloudflare ayarları eksik.',
                });
            }

            const modelUrl =
                `https://api.cloudflare.com/client/v4/accounts/${cfAccount}` +
                '/ai/run/@cf/black-forest-labs/flux-2-klein-4b';

            const generateFrame = async (
                framePrompt: string,
                images: string[]
            ): Promise<string> => {
                const form = new FormData();
                form.append('prompt', framePrompt);

                for (let i = 0; i < images.length; i++) {
                    const match = images[i].match(
                        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
                    );

                    if (!match) {
                        throw new Error(`Görsel ${i + 1} okunamadı.`);
                    }

                    const mimeType = match[1];
                    const bytes = Buffer.from(match[2], 'base64');

                    if (!bytes.length) {
                        throw new Error(`Görsel ${i + 1} boş.`);
                    }

                    const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');

                    form.append(
                        `input_image_${i}`,
                        new Blob([new Uint8Array(bytes)], { type: mimeType }),
                        `reference-${i + 1}.${extension}`
                    );
                }

                const response = await fetch(modelUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${cfToken}`,
                    },
                    body: form,
                });

                if (!response.ok) {
                    const message = await response.text();
                    console.error(
                        '[Multi-reference Start-End]',
                        response.status,
                        message.slice(0, 800)
                    );
                    throw new Error(
                        `Cloudflare HTTP ${response.status}: ${message.slice(0, 300)}`
                    );
                }

                const contentType = response.headers.get('content-type') || '';

                if (contentType.toLowerCase().includes('image/')) {
                    const bytes = Buffer.from(await response.arrayBuffer());
                    return `data:${contentType};base64,${bytes.toString('base64')}`;
                }

                const json = await response.json() as any;
                const image = json?.result?.image ?? json?.image;

                if (typeof image !== 'string' || !image.length) {
                    throw new Error('Cloudflare görsel döndürmedi.');
                }

                return image.startsWith('data:')
                    ? image
                    : `data:image/jpeg;base64,${image}`;
            };

            const basePrompt = prompt.trim();

            const identityRules = [
                'Create a photorealistic cinematic image.',
                'Use the supplied character reference images to preserve facial identity, age, hairstyle, and appearance.',
                'Keep every person distinct. Do not merge identities.',
                'Maintain realistic body proportions and height differences.',
            ].join(' ');

            // 1. START: Karakter referanslarından ilk kareyi üret.
            const startImageUrl = await generateFrame(
                `${basePrompt}\n${identityRules}\n` +
                'Create the START FRAME: the opening moment of the scene.',
                referenceImages
            );

            // 2. END: Start görselini birinci sırada kullan.
            // Model en fazla 4 görsel kabul eder:
            // Start görseli + en fazla 3 karakter referansı.
            const endReferenceImages = [
                startImageUrl,
                ...referenceImages.slice(0, 3),
            ];

            const endPrompt = [
                'Edit image 0, the START FRAME, to create the END FRAME.',
                'Keep exactly the same three people and preserve their exact individual facial identities.',
                'IMPORTANT: The man must remain immediately recognizable as the exact same man in the START FRAME.',
                'MAN: Make only a very small head turn, about 10 degrees toward his own right. His face must remain mostly facing the camera, with both eyes visible. Do not create a side profile. Do not change his facial geometry, nose, lips, jaw, eyes, or face shape.',
                'WOMAN: Turn her head slightly toward her own right, about 15 degrees, while preserving her exact face.',
                'CHILD: Turn his head slightly toward his own right, about 10 degrees. Keep his youthful face and exact age.',
                'Only adjust head direction and gaze. Keep shoulders, torsos, body positions, and feet unchanged.',
                'Preserve the original hairstyles, beard, moustache, clothing, body proportions, background, lighting, camera angle, framing, and colors.',
                'Exactly the same three people. No face replacement, no new faces, no side-profile faces, no extra limbs or objects.',
                'Photorealistic image. Make a subtle change from the START FRAME, not a new composition.',
            ].join(' ');

            const endImageUrl = await generateFrame(
                endPrompt,
                endReferenceImages
            );

            return res.json({
                success: true,
                start_image_url: startImageUrl,
                end_image_url: endImageUrl,
                provider: 'cloudflare',
                model: '@cf/black-forest-labs/flux-2-klein-4b',
            });
        } catch (err) {
            console.error('[Multi-reference Start-End] Error:', err);

            return res.status(500).json({
                success: false,
                error:
                    err instanceof Error
                        ? err.message
                        : 'Start/End görsel üretimi başarısız.',
            });
        }
    });



  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Production Studio server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

