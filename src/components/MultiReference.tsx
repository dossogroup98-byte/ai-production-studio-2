import React from 'react';

export const MultiReference: React.FC = () => (
  <section className="max-w-5xl mx-auto p-6 space-y-6">
    <h1 className="text-2xl font-bold text-white">Multi-Reference Image to Image</h1>
    <p className="text-sm text-zinc-400">2–3 referans görseli ve prompt ile yeni görsel tasarımı.</p>
    <label className="block text-sm text-zinc-200">Referans görselleri (2–3 adet)
      <input type="file" accept="image/*" multiple className="block mt-2 w-full text-sm text-zinc-300" />
    </label>
    <label className="block text-sm text-zinc-200">Prompt
      <textarea rows={5} placeholder="Oluşturmak istediğiniz görseli tarif edin..." className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white" />
    </label>
    <p className="text-xs text-amber-300">Arayüz hazır. Üretim bağlantısı ayrı adımda eklenecek.</p>
  </section>
);
