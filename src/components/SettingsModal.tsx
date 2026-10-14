import React, { useState, useEffect } from 'react';
import { getApiBaseUrl, setApiBaseUrl } from '../utils/api';
import { X, Shield, Server, FileText, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [backendUrl, setBackendUrlState] = useState(getApiBaseUrl());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBackendUrlState(getApiBaseUrl());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBaseUrl(backendUrl);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Güvenli Yapılandırma & Sunucu Ayarları</h3>
              <p className="text-xs text-zinc-400">Anahtar yönetimi ve yerel backend yönlendirmesi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Security Architecture Box */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <Shield className="w-4 h-4" />
              <span>Güvenlik İlkesi: Sıfır Frontend Sızıntısı</span>
            </div>
            <p className="leading-relaxed text-zinc-300">
              API anahtarlarınız (AGNES, HEDRA, CLOUDFLARE) hiçbir zaman tarayıcı hafızasında (<code className="text-emerald-300 font-mono">localStorage</code>), JavaScript demetinde veya Git geçmişinde saklanmaz.
            </p>
            <p className="leading-relaxed text-zinc-300">
              Tüm hassas anahtarlar yalnızca sunucu tarafındaki <code className="text-emerald-300 font-mono">backend/.env</code> dosyasından okunur ve dışarıya sızdırılmaz.
            </p>
          </div>

          {/* Guide for editing backend/.env */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Anahtarları Tanımlama Adımı (<code className="text-indigo-300">backend/.env</code>)</span>
            </div>
            <p className="text-zinc-400">
              Bilgisayarınızda <code className="text-zinc-300">backend/.env</code> dosyasını oluşturun ve değerleri girin:
            </p>
            <div className="bg-zinc-900 p-3 rounded-lg font-mono text-[11px] text-zinc-300 leading-relaxed border border-zinc-800">
              <div className="text-zinc-500"># Agnes AI Resmi API Adresi & Anahtarı</div>
              <div>AGNES_BASE_URL="https://apihub.agnes-ai.com/v1"</div>
              <div>AGNES_API_KEY="your_real_agnes_key"</div>
              <div className="text-zinc-500 mt-2"># Hedra AI Karakter Anahtarı</div>
              <div>HEDRA_BASE_URL="https://api.hedra.com/v1"</div>
              <div>HEDRA_API_KEY="your_real_hedra_key"</div>
              <div className="text-zinc-500 mt-2"># Cloudflare Workers AI</div>
              <div>CLOUDFLARE_ACCOUNT_ID="your_account_id"</div>
              <div>CLOUDFLARE_API_TOKEN="your_workers_ai_token"</div>
            </div>
          </div>

          {/* Custom Backend URL */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Özel Backend Sunucu Adresi</span>
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              placeholder="Boş bırakın (varsayılan stüdyo sunucusu) veya http://127.0.0.1:8011"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-zinc-500">
              Kendi yerel FastAPI sürecinizi doğrudan bağlamak için <code className="text-zinc-400">http://127.0.0.1:8011</code> yazabilirsiniz. Boş bırakıldığında stüdyonun entegre proxy sunucusu kullanılır.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-900/90 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
          >
            Kapat
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-400" /> : null}
            <span>{saved ? 'Kaydedildi' : 'Adresi Güncelle'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
