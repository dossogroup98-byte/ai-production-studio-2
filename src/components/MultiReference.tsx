import React, { useEffect, useState } from 'react';

function ImagePicker({ label, multiple = false }: { label: string; multiple?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map(file => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 space-y-3">
      <label className="block text-sm font-medium text-white">{label}</label>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-violet-500/60 bg-zinc-950 p-4 text-center hover:bg-zinc-800">
        <span className="text-violet-300 font-semibold">＋ Görsel Seçin (Bilgisayarınızdan)</span>
        <span className="mt-1 text-xs text-zinc-400">PNG, JPG, WEBP</span>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={e => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {urls.map((url, i) => (
            <div key={url} className="space-y-1">
              <img src={url} alt={files[i].name} className="h-36 w-full rounded-lg border border-zinc-700 object-contain bg-black" />
              <p className="truncate text-xs text-zinc-300">{files[i].name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MultiReference: React.FC = () => (
  <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
    <h1 className="text-2xl font-bold">Multi-Reference Image to Image</h1>
    <p className="text-sm text-zinc-400">2–3 referans görseli seçin.</p>
    <ImagePicker label="Referans Görseller (2–3 adet)" multiple />
    <label className="block text-sm">Prompt
      <textarea rows={5} placeholder="Oluşturmak istediğiniz görseli tarif edin..." className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white" />
    </label>
    <p className="text-xs text-amber-300">Görsel üretim bağlantısı henüz eklenmedi.</p>
  </section>
);
