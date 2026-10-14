import React, { useState } from 'react';
import { GenerationItem } from '../types';
import { FolderArchive, Video, UserSquare2, Image as ImageIcon, Download, Trash2, ExternalLink, Play } from 'lucide-react';

interface GalleryViewProps {
  items: GenerationItem[];
  onDeleteItem: (id: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ items, onDeleteItem }) => {
  const [filter, setFilter] = useState<'all' | 'video' | 'avatar' | 'image'>('all');
  const [activeMedia, setActiveMedia] = useState<GenerationItem | null>(null);

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              Media Asset Store
            </span>
            <span className="text-xs text-zinc-400">{items.length} Total Generations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Studio Asset Library</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Browse, play back, inspect metadata, and download all generated videos, avatars, and images.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {(['all', 'video', 'avatar', 'image'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === t ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <FolderArchive className="w-12 h-12 stroke-[1.5] mx-auto mb-3 text-zinc-600" />
          <h3 className="text-sm font-semibold text-zinc-300">No assets in this category</h3>
          <p className="text-xs text-zinc-500 mt-1">Generate videos or images to build your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-zinc-700 transition-all"
            >
              {/* Media Preview Box */}
              <div className="aspect-video bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                {item.type === 'image' && item.url ? (
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                ) : item.url ? (
                  <video src={item.url} controls className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xs text-zinc-500">Preview pending...</div>
                )}

                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white uppercase border border-white/10">
                    {item.type}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                    {item.aspectRatio}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-zinc-200 line-clamp-2 font-medium">{item.prompt}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                    <span>{item.provider}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {item.url && (
                    <a
                      href={item.url}
                      download={`asset_${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
