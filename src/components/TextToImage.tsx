import React from 'react';

export const TextToImageFrames: React.FC = () => (
  <section className="max-w-5xl mx-auto p-6 space-y-6">
    <h1 className="text-2xl font-bold text-white">Text to Image — Start / End</h1>
    <p className="text-sm text-zinc-400">Prompt ile birlikte başlangıç ve bitiş görsellerini seçin.</p>
    <label className="block text-sm text-zinc-200">Prompt
      <textarea rows={4} placeholder="Görselde olmasını istediğiniz sahneyi tarif edin..." className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white" />
    </label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <label className="block text-sm text-zinc-200">Start Frame — Başlangıç görseli
        <input type="file" accept="image/*" className="block mt-2 w-full text-sm text-zinc-300" />
      </label>
      <label className="block text-sm text-zinc-200">End Frame — Bitiş görseli
        <input type="file" accept="image/*" className="block mt-2 w-full text-sm text-zinc-300" />
      </label>
    </div>
    <p className="text-xs text-amber-300">Arayüz hazır. Üretim bağlantısı ayrı adımda eklenecek.</p>
  </section>
);
