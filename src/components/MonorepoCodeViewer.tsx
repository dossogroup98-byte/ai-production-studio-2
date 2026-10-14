import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';
import { FileCode, Copy, Check, Download, Folder, FileText, CheckCircle2 } from 'lucide-react';

export const MonorepoCodeViewer: React.FC = () => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('services/agnes_service.py');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    const baseUrl = getApiBaseUrl();
    try {
      const resp = await fetch(`${baseUrl}/api/studio/files`);
      const data = await resp.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentContent = files[selectedFile] || '# Loading or file not found';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileCategories = [
    {
      group: 'Core Services (Fixes & Integrations)',
      items: [
        { path: 'services/agnes_service.py', desc: 'AGNES Video Service (BOM Clean & 503 Resilient)' },
        { path: 'services/hedra_service.py', desc: 'HEDRA Character Avatar Service' },
        { path: 'services/cloudflare_service.py', desc: 'Cloudflare Workers AI (Flux / SDXL)' },
      ],
    },
    {
      group: 'API & Server Entrypoints',
      items: [
        { path: 'main.py', desc: 'FastAPI Entry Point (CORS & Reload Support)' },
        { path: 'routers/studio.py', desc: 'Unified Studio API Router & Endpoints' },
      ],
    },
    {
      group: 'DevOps, Scripts & Testing',
      items: [
        { path: 'test_studio.py', desc: 'Automated Test Suite (Async & BOM scan)' },
        { path: 'start.bat', desc: 'Windows Startup Script (-X utf8 --reload)' },
        { path: 'start.sh', desc: 'Linux/Docker Startup Script' },
        { path: 'requirements.txt', desc: 'Python Dependencies & Locks' },
        { path: '.env.example', desc: 'Environment Variables Template' },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            Monorepo Code Distribution Hub
          </span>
          <span className="text-xs text-zinc-400">E:\ai-production-studio-monorepo\backend</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Eksiksiz Backend Dosyaları</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Tüm Python FastAPI backend dosyalarının tam, eksiksiz ve doğrulanmış içerikleri. Doğrudan kopyalayabilir veya indirebilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar File Tree (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-400" />
              <span>Backend Dosya Ağacı</span>
            </div>

            <div className="space-y-4">
              {fileCategories.map((cat, idx) => (
                <div key={idx}>
                  <div className="text-[11px] font-semibold text-zinc-400 mb-1.5 px-2">{cat.group}</div>
                  <div className="space-y-1">
                    {cat.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => setSelectedFile(item.path)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                          selectedFile === item.path
                            ? 'bg-emerald-600/10 text-emerald-300 border border-emerald-500/30 font-medium'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                        }`}
                      >
                        <FileCode className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
                        <div className="truncate">
                          <div className="truncate font-mono">{item.path}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code Content View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex-1 flex flex-col">
            {/* Top Bar */}
            <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  backend/{selectedFile}
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                  {currentContent.split('\n').length} lines
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Kopyalandı' : 'Tümünü Kopyala'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Dosyayı İndir</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="p-4 overflow-x-auto flex-1 font-mono text-xs text-zinc-300 leading-relaxed max-h-[650px] overflow-y-auto bg-zinc-950 select-text">
              <pre>
                <code>{currentContent}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
