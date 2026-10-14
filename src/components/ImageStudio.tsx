import React, { useState, useRef } from 'react';
import { GenerationItem } from '../types';
import { getApiBaseUrl } from '../utils/api';
import { Image as ImageIcon, Sparkles, Download, RefreshCw, Upload, X, AlertTriangle, ArrowRight, Check } from 'lucide-react';

interface ImageStudioProps {
  onItemCreated: (item: GenerationItem) => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ onItemCreated }) => {
  const [tab, setTab] = useState<'t2i' | 'i2i'>('t2i');
  const [prompt, setPrompt] = useState('Studio portrait of a visionary astronaut, dramatic volumetric neon lighting, cinematic 8k octane render');
  const [model, setModel] = useState('@cf/black-forest-labs/flux-1-schnell');
  const [numSteps, setNumSteps] = useState(4);
  const [guidance, setGuidance] = useState(7.5);
  const [strength, setStrength] = useState(0.75);

  // File Upload state for I2I
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [i2iStage, setI2iStage] = useState<string | null>(null);
  const [i2iElapsedSeconds, setI2iElapsedSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const models = [
    {
      id: '@cf/black-forest-labs/flux-1-schnell',
      name: 'Flux-1 Schnell (12B Rectified Flow)',
      desc: 'En hızlı ve en detaylı metinden görsel modeli',
      supportsI2I: false,
    },
      {
          id: '@cf/black-forest-labs/flux-2-klein-4b',
          name: 'FLUX.2 Klein 4B',
          desc: 'Referans görselle düzenleme ve görsel üretimi',
          supportsI2I: true,
      },
    {
      id: '@cf/bytedance/stable-diffusion-xl-lightning',
      name: 'SDXL Lightning (ByteDance)',
      desc: 'Hızlı adımlı metinden görsel üretimi',
      supportsI2I: false,
    },
  ];

  const currentModelObj = models.find((m) => m.id === model) || models[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Lütfen geçerli bir görsel formatı (PNG, JPG, WEBP) seçin.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Görsel boyutu 10MB sınırını aşamaz.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setPreviewUrl(res);
      setBase64Image(res);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setBase64Image(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Görsel için bir açıklama (prompt) girin.');
      return;
    }

    if (tab === 'i2i') {
      if (!base64Image) {
        setErrorMsg('Görselden görsele (I2I) üretim için bilgisayarınızdan bir referans görsel seçmelisiniz.');
        return;
      }
      if (!currentModelObj.supportsI2I) {
        setErrorMsg(`${currentModelObj.name} modeli Cloudflare Workers AI üzerinde I2I desteklemez. Lütfen 'Stable Diffusion XL 1.0' seçin.`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);
    const baseUrl = getApiBaseUrl();
    let i2iTimer: ReturnType<typeof setInterval> | undefined;
    const i2iStartedAt = Date.now();

    if (tab === 'i2i') {
      setI2iStage('1/4 Referans görsel hazırlandı');
      setI2iElapsedSeconds(0);
      i2iTimer = setInterval(() => {
        setI2iElapsedSeconds(Math.floor((Date.now() - i2iStartedAt) / 1000));
      }, 1000);
    }

    try {
      const endpoint = tab === 't2i' ? `${baseUrl}/api/studio/t2i` : `${baseUrl}/api/studio/i2i`;
      const payload: any = {
        prompt: prompt.trim(),
        model,
        numSteps,
        guidance,
      };

      if (tab === 'i2i') {
        payload.imageData = base64Image;
        payload.strength = strength;
      }

      if (tab === 'i2i') setI2iStage('2/4 İstek gönderildi');
      const requestPromise = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (tab === 'i2i') setI2iStage('3/4 Cloudflare yanıtı bekleniyor');
      const resp = await requestPromise;
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || (data.detail && typeof data.detail === 'string' ? data.detail : 'Görsel üretimi başarısız oldu'));
        if (tab === 'i2i') setI2iStage('4/4 Hata oluştu');
        if (i2iTimer) clearInterval(i2iTimer);
        setLoading(false);
        return;
      }

      setGeneratedImage(data.image_url);
      if (tab === 'i2i') setI2iStage('4/4 Tamamlandı');
      if (i2iTimer) clearInterval(i2iTimer);
      setLoading(false);

      const item: GenerationItem = {
        id: `img_${Date.now()}`,
        type: 'image',
        title: `${tab.toUpperCase()}: ` + prompt.slice(0, 35) + '...',
        prompt,
        provider: 'cloudflare',
        status: 'completed',
        progress: 100,
        url: data.image_url,
        aspectRatio: '1:1',
        createdAt: Date.now(),
      };
      onItemCreated(item);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ağ bağlantı hatası');
      if (tab === 'i2i') setI2iStage('4/4 Hata oluştu');
      if (i2iTimer) clearInterval(i2iTimer);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
            Cloudflare Workers AI
          </span>
          <span className="text-xs text-zinc-400">Doğrulanmış Flux-1 Schnell & SDXL Modelleri</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Görsel Üretim Stüdyosu</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Cloudflare Workers AI GPU altyapısında doğrudan metinden veya referans görsel üzerinden üretim yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* T2I vs I2I Mode Tabs */}
          <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => {
                setTab('t2i');
                setErrorMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 't2i' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Metinden Görsel (T2I)</span>
            </button>
            <button
              onClick={() => {
                setTab('i2i');
                setErrorMsg(null);
                // Auto switch to SDXL if Flux was selected because Flux doesn't do I2I
                if (!currentModelObj.supportsI2I) {
                    setModel('@cf/runwayml/stable-diffusion-v1-5-img2img');
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'i2i' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Görselden Görsele (I2I)</span>
            </button>
          </div>

          {/* If I2I: Real Browse / File Picker */}
          {tab === 'i2i' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-200 flex items-center justify-between">
                <span>Referans Görsel Seçin (Bilgisayarınızdan)</span>
                <span className="text-zinc-500 text-[11px]">PNG, JPG, WEBP (Max 10MB)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/60 rounded-2xl p-7 text-center cursor-pointer transition-all bg-zinc-900/40 hover:bg-zinc-900/70 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-xs text-zinc-200">Görsel Seçmek İçin Tıklayın</div>
                  <p className="text-[11px] text-zinc-500 mt-1">Dosya seçici açılır ve görsel doğrudan isteğe eklenir</p>
                </div>
              ) : (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0">
                      <img src={previewUrl} alt="Seçilen kaynak" className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-zinc-200 truncate">{selectedFile?.name || 'Kaynak Görsel'}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Yüklendi'}
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                        I2I İsteğine Eklendi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      title="Görseli kaldır"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">Model Seçimi</label>
            <div className="grid grid-cols-1 gap-2.5">
              {models.map((m) => {
                const isSelected = model === m.id;
                const isUnsupportedInI2I = tab === 'i2i' && !m.supportsI2I;

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setModel(m.id);
                      setErrorMsg(null);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-zinc-200">{m.name}</div>
                      {tab === 'i2i' && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            m.supportsI2I
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {m.supportsI2I ? 'I2I Destekli' : 'Yalnızca T2I Destekler'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">{m.desc}</div>
                    <div className="text-[10px] font-mono text-zinc-600 mt-1">{m.id}</div>
                  </div>
                );
              })}
            </div>

            {/* Model capability notice */}
            {tab === 'i2i' && !currentModelObj.supportsI2I && (
              <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>{currentModelObj.name}</strong> Cloudflare Workers AI üzerinde doğrudan görsel girdisi desteklemez.
                  </p>
                </div>
                <button
                  onClick={() => setModel('@cf/black-forest-labs/flux-2-klein-4b')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg shrink-0 transition-colors"
                >
                  SDXL 1.0 Seç
                </button>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>{tab === 't2i' ? 'Görsel Promptu' : 'Dönüştürme Yönergesi (Prompt)'}</span>
              <span className="text-zinc-500 text-[11px]">{prompt.length} karakter</span>
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                tab === 't2i'
                  ? 'Üretmek istediğiniz sahneyi, konuyu, sanat tarzını ve aydınlatmayı tarif edin...'
                  : 'Yüklenen görselin nasıl değiştirilmesini veya stilize edilmesini istediğinizi yazın...'
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Advanced Sliders */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
            {tab === 't2i' ? (
              <>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Adım Sayısı (Steps)</span>
                    <span className="font-semibold text-indigo-400">{numSteps}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={model.includes('flux') ? 8 : 20}
                    value={numSteps}
                    onChange={(e) => setNumSteps(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {model.includes('flux') ? 'Flux için max 8 adım' : 'SDXL için max 20 adım'}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Yönlendirme (Guidance)</span>
                    <span className="font-semibold text-indigo-400">{guidance}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Değişim Gücü (Strength)</span>
                    <span className="font-semibold text-indigo-400">{strength}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.05"
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>0.1 (Orijinale çok yakın)</span>
                    <span>0.95 (Yüksek değişim)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* I2I işlem sayacı */}
          {tab === 'i2i' && i2iStage && (
            <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-indigo-200">{i2iStage}</span>
                <span className="text-sm tabular-nums text-zinc-300">{i2iElapsedSeconds} sn</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || (tab === 'i2i' && (!base64Image || !currentModelObj.supportsI2I))}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cloudflare Workers AI Görsel Üretiyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {tab === 't2i' ? 'Metinden Görsel Üret' : 'Seçilen Görsel Üzerinden Dönüştür (I2I)'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-4">
                Üretilen Görsel Çıktısı
              </span>

              <div className="aspect-square w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80 relative flex items-center justify-center">
                {generatedImage ? (
                  <img src={generatedImage} alt="Üretilen görsel" className="w-full h-full object-cover" />
                ) : loading ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-zinc-300 font-medium">Cloudflare edge GPU kümesinde inferans yapılıyor...</p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-zinc-500">
                    <ImageIcon className="w-10 h-10 stroke-[1.5] text-zinc-600 mx-auto mb-2" />
                    <span className="text-xs">Üretilen görsel burada görüntülenecek ve indirilebilecektir</span>
                  </div>
                )}
              </div>
            </div>

            {generatedImage && (
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  <div className="font-medium text-zinc-200">Görsel Hazır</div>
                  <div className="text-[11px] text-zinc-500">Cloudflare Workers AI PNG</div>
                </div>
                <a
                  href={generatedImage}
                  download="cloudflare_studio_image.png"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG İndir</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
