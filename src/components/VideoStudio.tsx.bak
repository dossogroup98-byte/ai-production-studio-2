import React, { useState } from 'react';
import { GenerationItem } from '../types';
import { getApiBaseUrl } from '../utils/api';
import { Video, Sparkles, Play, Download, AlertTriangle, RefreshCw, Clock, Ratio } from 'lucide-react';

interface VideoStudioProps {
  onItemCreated: (item: GenerationItem) => void;
  openDiagnostics: () => void;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ onItemCreated, openDiagnostics }) => {
  const [prompt, setPrompt] = useState('Cinematic aerial drone shot of neon-lit cyber metropolis in rain, hyper-realistic reflections 8k');
  const [model, setModel] = useState('agnes-video-2.5');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<{ message: string; statusCode?: number } | null>(null);

  const presets = [
    { title: 'Neon Cyberpunk', prompt: 'Cinematic aerial drone shot of futuristic neon metropolis in rain, hyper-realistic reflections 8k' },
    { title: 'Mythical Forest', prompt: 'Magical enchanted glowing forest with bioluminescent particles floating through ancient oak trees' },
    { title: 'Liquid Gold Ocean', prompt: 'Slow motion macro waves of liquid gold shimmering under warm studio dramatic lighting' },
    { title: 'Hypercar Drift', prompt: 'Aggressive camera tracking luxury electric supercar drifting through mist on mountain highway' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorDetails(null);
    setStatusMessage('Agnes AI API sunucusuna video üretim görevi gönderiliyor...');

    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}/api/studio/t2v`;

    const payload = {
      prompt: prompt.trim(),
      duration,
      model,
      aspectRatio,
    };

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        const status = resp.status;
        const msg = data.error || (data.detail && typeof data.detail === 'string' ? data.detail : data.detail?.error) || 'Video generation request failed';
        setErrorDetails({ message: msg, statusCode: status });
        setLoading(false);
        return;
      }

      const jobId = data.job_id;
      const initialItem: GenerationItem = {
        id: jobId,
        type: 'video',
        title: prompt.slice(0, 45) + '...',
        prompt,
        provider: 'agnes',
        status: 'processing',
        progress: 0,
        aspectRatio,
        duration,
        createdAt: Date.now(),
      };

      setCurrentJob(initialItem);
      setStatusMessage(`Görev Agnes AI kuyruğuna alındı (Görev ID: ${jobId}). GPU işleme durumu bekleniyor...`);

      // Start real status polling
      pollJobStatus(jobId, initialItem);
    } catch (err: any) {
      setErrorDetails({ message: err.message || 'Network connection failed' });
      setLoading(false);
    }
  };

  const pollJobStatus = (jobId: string, itemRef: GenerationItem) => {
    const baseUrl = getApiBaseUrl();
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`${baseUrl}/api/studio/status/${jobId}`);
        const statusData = await resp.json();

        if (statusData.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          const completedItem: GenerationItem = {
            ...itemRef,
            status: 'completed',
            progress: 100,
            url: statusData.video_url,
          };
          setCurrentJob(completedItem);
          setStatusMessage('Video üretimi başarıyla tamamlandı!');
          onItemCreated(completedItem);
        } else if (statusData.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          setErrorDetails({ message: statusData.error || 'Agnes video üretimi başarısız oldu' });
          const failedItem: GenerationItem = {
            ...itemRef,
            status: 'failed',
            error: statusData.error,
          };
          setCurrentJob(failedItem);
        } else {
          // In progress
          if (statusData.message) {
            setStatusMessage(statusData.message);
          }
          if (statusData.progress !== undefined && statusData.progress !== null) {
            setCurrentJob((prev) => (prev ? { ...prev, progress: Number(statusData.progress) } : null));
          }
        }
      } catch (err: any) {
        console.warn('Polling warning:', err);
      }
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
            AGNES Video Engine (T2V)
          </span>
          <span className="text-xs text-zinc-400">Resmi apihub.agnes-ai.com/v1 Entegrasyonu</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Metinden Video Üretim Stüdyosu (T2V)</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Kamera açıları, sahne dinamikleri ve yüksek çözünürlüklü video render işlemini doğrudan resmi AGNES AI servisine iletin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">AGNES Video Modeli</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'agnes-video-2.5', name: 'Agnes Video 2.5 (En Yüksek Kalite)', desc: 'Sinematik hareket ve net detaylar' },
                { id: 'agnes-video-2.5-flash', name: 'Agnes Video 2.5 Flash', desc: 'Daha hızlı üretim süresi' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    model === m.id
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-zinc-200">{m.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Presets */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Örnek Promptlar</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p.prompt)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Box */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Sahne Açıklaması (Prompt)</span>
              <span className="text-zinc-500 text-[11px]">{prompt.length} karakter</span>
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sahne, hareket, kamera dinamikleri, aydınlatma ve fizik kurallarını detaylıca tarif edin..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Ratio className="w-3.5 h-3.5 text-zinc-400" />
                <span>En-Boy Oranı</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Video Süresi</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setDuration(dur)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                      duration === dur
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {dur} Saniye
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Banner with Real HTTP Status */}
          {errorDetails && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-red-300">
                    {errorDetails.statusCode ? `Hata Kodu HTTP ${errorDetails.statusCode}` : 'İstek Başarısız Oldu'}
                  </div>
                  <p className="mt-0.5 text-red-200/90 leading-relaxed">{errorDetails.message}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-red-500/20 flex items-center justify-between">
                <span className="text-[11px] text-red-300/80">API bağlantısını ve ortam değişkenlerini denetleyin:</span>
                <button
                  onClick={openDiagnostics}
                  className="px-2.5 py-1 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Tanılama Ekranına Git
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AGNES Video Render Ediliyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AGNES ile Video Üret ({duration}s • {aspectRatio})</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output & Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Video Önizleme Tuvali</span>
                {currentJob && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      currentJob.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : currentJob.status === 'processing'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {currentJob.status}
                  </span>
                )}
              </div>

              {/* Status Notice */}
              {loading && (
                <div className="mb-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <span className="truncate">{statusMessage || 'İşlem devam ediyor...'}</span>
                </div>
              )}

              {/* Canvas Preview Area */}
              <div className="aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80 relative flex items-center justify-center">
                {currentJob?.url ? (
                  <video
                    src={currentJob.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : loading ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-zinc-300 font-medium">Agnes AI GPU kümesinde kareler işleniyor...</p>
                    <p className="text-[11px] text-zinc-500">Durum sorgusu gerçek API üzerinden takip ediliyor</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-zinc-500">
                    <Play className="w-10 h-10 stroke-[1.5] text-zinc-600" />
                    <p className="text-xs">Prompt girip "Video Üret" butonuna basarak işlemi başlatın</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Actions */}
            {currentJob?.url && (
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  <div className="font-medium text-zinc-200">Video Hazır</div>
                  <div className="text-[11px] text-zinc-500">Agnes AI Video MP4</div>
                </div>
                <a
                  href={currentJob.url}
                  download={`agnes_video_${currentJob.id}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Videoyu İndir</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
