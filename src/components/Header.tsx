import React from 'react';
import { StudioTab } from '../types';
import { Video, UserSquare2, Image as ImageIcon, Activity, Code2, Settings, Sparkles, FolderArchive } from 'lucide-react';

interface HeaderProps {
  currentTab: StudioTab;
  setTab: (tab: StudioTab) => void;
  openSettings: () => void;
  itemCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setTab, openSettings, itemCount }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight">AI Production Studio</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PROD v2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">AGNES Video • Hedra Avatars • Cloudflare AI</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setTab('video')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'video'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video (AGNES)</span>
          </button>

          <button
            onClick={() => setTab('avatar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'avatar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <UserSquare2 className="w-3.5 h-3.5" />
            <span>Avatars (Hedra)</span>
          </button>

          <button
            onClick={() => setTab('image')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'image'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images (Cloudflare)</span>
          </button>

          <button
            onClick={() => setTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'diagnostics'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AGNES 503 Diagnostics</span>
          </button>

          <button
            onClick={() => setTab('monorepo')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'monorepo'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Monorepo Code</span>
          </button>

          <button
            onClick={() => setTab('gallery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'gallery'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Library ({itemCount})</span>
          </button>
        </nav>

        {/* Right Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={openSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-colors"
            title="Configure API Keys & Backend URL"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Settings & Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
};
