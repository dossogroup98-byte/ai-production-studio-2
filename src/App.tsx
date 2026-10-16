import React, { useState, useEffect } from 'react';
import { StudioTab, GenerationItem } from './types';
import { Header } from './components/Header';
import { VideoStudio } from './components/VideoStudio';
import { AvatarStudio } from './components/AvatarStudio';
import { ImageStudio } from './components/ImageStudio';
import { MultiReference } from './components/MultiReference';
import { MultiReferenceStartEnd } from './components/MultiReferenceStartEnd';
import { MultiImageComposition } from './components/MultiImageComposition';
import { TextToImageFrames } from './components/TextToImage';
import { ImageToImageFrames } from './components/ImageToImage';
import { DiagnosticsView } from './components/DiagnosticsView';
import { MonorepoCodeViewer } from './components/MonorepoCodeViewer';
import { GalleryView } from './components/GalleryView';
import { SettingsModal } from './components/SettingsModal';
import { CheckCircle2, ShieldCheck, Activity, Terminal } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<StudioTab>('image');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [items, setItems] = useState<GenerationItem[]>(() => {
    try {
      const stored = localStorage.getItem('ai_studio_items');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored items');
    }
    // Default initial portfolio items
    return [
      {
        id: 'seed_vid_1',
        type: 'video',
        title: 'Cinematic Cyberpunk Rain Metropolis',
        prompt: 'Cinematic aerial drone shot of neon-lit cyber metropolis in rain, hyper-realistic 8k reflection',
        provider: 'agnes',
        status: 'completed',
        progress: 100,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        aspectRatio: '16:9',
        duration: 5,
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'seed_avatar_1',
        type: 'avatar',
        title: 'Elena Talking Digital Human Host',
        prompt: 'Welcome to the AI Production Studio. Real-time neural lip-sync generation powered by Hedra.',
        provider: 'hedra',
        status: 'completed',
        progress: 100,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        sourceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        aspectRatio: '1:1',
        createdAt: Date.now() - 7200000,
      },
      {
        id: 'seed_img_1',
        type: 'image',
        title: 'Bioluminescent Deep Sea Coral Concept',
        prompt: 'Bioluminescent deep sea leviathan swimming through glowing coral reef, award winning octane render',
        provider: 'cloudflare',
        status: 'completed',
        progress: 100,
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1024&q=80',
        aspectRatio: '16:9',
        createdAt: Date.now() - 10800000,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ai_studio_items', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items to storage');
    }
  }, [items]);

  const handleItemCreated = (newItem: GenerationItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === newItem.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newItem;
        return copy;
      }
      return [newItem, ...prev];
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        setTab={setCurrentTab}
        openSettings={() => setIsSettingsOpen(true)}
        itemCount={items.length}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 pb-16">
        {currentTab === 'video' && (
          <VideoStudio
            onItemCreated={handleItemCreated}
            openDiagnostics={() => setCurrentTab('diagnostics')}
          />
        )}
        {currentTab === 'avatar' && (
          <AvatarStudio onItemCreated={handleItemCreated} />
        )}
        {currentTab === 'image' && (
          <ImageStudio onItemCreated={handleItemCreated} />
        )}
        {currentTab === 'multi-reference' && <MultiReference />}
      {currentTab === 'multi-reference-start-end' && <MultiReferenceStartEnd />}
        {currentTab === 'multi-image-composition' && <MultiImageComposition />}
        {currentTab === 'text-to-image-frames' && <TextToImageFrames />}
        {currentTab === 'image-to-image-frames' && <ImageToImageFrames />}
        {currentTab === 'diagnostics' && <DiagnosticsView />}
        {currentTab === 'monorepo' && <MonorepoCodeViewer />}
        {currentTab === 'gallery' && (
          <GalleryView items={items} onDeleteItem={handleDeleteItem} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Fixed Bottom Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-9 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md px-4 flex items-center justify-between text-[11px] text-zinc-400 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Studio Server: Online (Port 3000 / 8011)</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">â€¢</span>
          <div className="hidden sm:flex items-center gap-1 text-zinc-400">
            <span>AGNES 503 Guard:</span>
            <span className="text-emerald-400 font-mono">BOM-Clean / Async-Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('diagnostics')}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            <Activity className="w-3 h-3" />
            <span>503 Health Suite</span>
          </button>
          <span className="text-zinc-700">|</span>
          <button
            onClick={() => setCurrentTab('monorepo')}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <Terminal className="w-3 h-3" />
            <span>Monorepo Hub</span>
          </button>
        </div>
      </footer>
    </div>
  );
}






