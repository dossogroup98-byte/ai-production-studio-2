import React, { useState, useRef } from 'react';
import { GenerationItem } from '../types';
import { getApiBaseUrl } from '../utils/api';
import { UserSquare2, Mic, Play, Download, Sparkles, RefreshCw, Ratio, Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface AvatarStudioProps {
  onItemCreated: (item: GenerationItem) => void;
}

export const AvatarStudio: React.FC<AvatarStudioProps> = ({ onItemCreated }) => {
  const [voiceText, setVoiceText] = useState('Merhaba, bu video Hedra API kullanılarak referans portre görseli ve metin senaryosu ile oluşturulmaktadır.');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Lütfen geçerli bir görsel dosyası (PNG, JPG, WEBP) seçin.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Görsel boyutu 15MB sınırını aşamaz.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      setBase64Image(result);
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
    if (!voiceText.trim()) {
      setErrorMsg('Lütfen avatar için konuşma metni (senaryo) veya prompt girin.');
      return;
    }

    if (!base64Image) {
      setErrorMsg('Hedra için bir referans avatar portre görseli yüklemeniz zorunludur.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusMessage('Hedra API sunucusuna karakter üretim isteği gönderiliyor...');

    const baseUrl = getApiBaseUrl();

    try {
      const resp = await fetch(`${baseUrl}/api/studio/hedra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceText: voiceText.trim(),
          prompt: voiceText.trim(),
          imageData: base64Image,
          aspectRatio,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Hedra avatar üretimi başlatılamadı');
        setLoading(false);
        return;
      }

      const jobId = data.job_id;
      const initialItem: GenerationItem = {
        id: jobId,
        type: 'avatar',
        title: 'Hedra Avatar: ' + voiceText.slice(0, 35) + '...',
        prompt: voiceText,
        provider: 'hedra',
        status: 'processing',
        progress: 0,
        aspectRatio,
        createdAt: Date.now(),
      };

      setCurrentJob(initialItem);
      setStatusMessage(`Hedra görevi oluşturuldu (ID: ${jobId}). Yüz ve dudak senkronizasyonu hesaplanıyor...`);

      // Polling
      const interval = setInterval(async () => {
        try {
          const sResp = await fetch(`${baseUrl}/api/studio/status/${jobId}`);
          const sData = await sResp.json();

          if (sData.status === 'completed') {
            clearInterval(interval);
            setLoading(false);
            const finished: GenerationItem = {
              ...initialItem,
              status: 'completed',
              progress: 100,
              url: sData.video_url,
            };
            setCurrentJob(finished);
            setStatusMessage('Avatar videosu başarıyla üretildi!');
            onItemCreated(finished);
          } else if (sData.status === 'failed') {
            clearInterval(interval);
            setLoading(false);
            setErrorMsg(sData.error || 'Hedra avatar üretimi başarısız oldu');
            setCurrentJob({ ...initialItem, status: 'failed', error: sData.error });
          } else {
            if (sData.message) {
              setStatusMessage(sData.message);
            }
          }
        } catch (e: any) {
          console.warn('Status poll warning:', e);
        }
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ağ bağlantı hatası');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
            HEDRA Engine
          </span>
          <span className="text-xs text-zinc-400">Resmi api.hedra.com/v1 Karakter Entegrasyonu</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Konuşan Avatar Stüdyosu (Hedra)</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Bilgisayarınızdan yüklediğiniz gerçek bir portre görselini Hedra sinir ağı ile konuşturan ve dudak senkronizasyonu sağlayan stüdyo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Real Image File Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-2 flex items-center justify-between">
              <span>Referans Karakter Görseli (Zorunlu)</span>
              <span className="text-zinc-500 text-[11px]">PNG, JPG, WEBP (Max 15MB)</span>
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
                className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-zinc-900/40 hover:bg-zinc-900/70 group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-xs text-zinc-200">Bilgisayarınızdan Portre Görseli Seçin</div>
                <p className="text-[11px] text-zinc-500 mt-1">Dosya gezginini açmak için tıklayın</p>
              </div>
            ) : (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0">
                    <img src={previewUrl} alt="Seçilen portre" className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-zinc-200 truncate">{selectedFile?.name || 'Yüklenen Portre'}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Görsel Hazır'}
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                      Hedra İçin Hazır
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

          {/* Dialogue Script */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>Konuşma Metni / Senaryo</span>
              </span>
              <span className="text-zinc-500 text-[11px]">{voiceText.length} karakter</span>
            </label>
            <textarea
              rows={4}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Avatarın seslendirmesini istediğiniz metni veya konuşma senaryosunu buraya yazın..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Ratio className="w-3.5 h-3.5 text-zinc-400" />
              <span>Video En-Boy Oranı</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1:1', label: '1:1 (Kare Portre)' },
                { id: '9:16', label: '9:16 (Dikey / Reels)' },
                { id: '16:9', label: '16:9 (Yatay Sinematik)' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                    aspectRatio === r.id
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={loading || !voiceText.trim() || !base64Image}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Hedra Avatarı İşleniyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Hedra ile Konuşan Avatar Üret</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Hedra Ekranı</span>
                {currentJob && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {currentJob.status}
                  </span>
                )}
              </div>

              {/* Status Message */}
              {loading && (
                <div className="mb-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <span className="truncate">{statusMessage || 'İşlem devam ediyor...'}</span>
                </div>
              )}

              {/* Viewport */}
              <div className="aspect-square w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80 relative flex items-center justify-center">
                {currentJob?.url ? (
                  <video src={currentJob.url} controls autoPlay loop className="w-full h-full object-cover" />
                ) : loading ? (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-zinc-300 font-medium">Hedra sinir ağı yüz hareketlerini oluşturuyor...</p>
                    <p className="text-[11px] text-zinc-500">Durum gerçek API üzerinden sorgulanıyor</p>
                  </div>
                ) : previewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={previewUrl} alt="Yüklenen Portre" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center p-4">
                        <UserSquare2 className="w-8 h-8 text-white mx-auto mb-1.5" />
                        <span className="text-xs text-zinc-200 font-medium">Portre Yüklendi • Üretime Hazır</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-zinc-500">
                    <ImageIcon className="w-10 h-10 stroke-[1.5] text-zinc-600 mx-auto mb-2" />
                    <span className="text-xs">Portre görseli yükleyin ve konuşma metnini girin</span>
                  </div>
                )}
              </div>
            </div>

            {currentJob?.url && (
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  <div className="font-medium text-zinc-200">Avatar Hazır</div>
                  <div className="text-[11px] text-zinc-500">Hedra Lip-Sync MP4</div>
                </div>
                <a
                  href={currentJob.url}
                  download={`hedra_avatar_${currentJob.id}.mp4`}
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
