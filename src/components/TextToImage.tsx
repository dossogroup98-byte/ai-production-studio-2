import React from 'react';

function ImagePicker({ label }: { label: string }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    if (!file) { setUrl(''); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 space-y-3">
      <label className="block text-sm font-medium text-white">{label}</label>
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-violet-500/60 bg-zinc-950 p-4 text-center hover:bg-zinc-800">
        <span className="text-violet-300 font-semibold">＋ Görsel Seçin (Bilgisayarınızdan)</span>
        <span className="mt-1 text-xs text-zinc-400">PNG, JPG, WEBP</span>
        <input type="file" accept="image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {url && file && <div className="space-y-1">
        <img src={url} alt={file.name} className="h-48 w-full rounded-lg border border-zinc-700 object-contain bg-black" />
        <p className="truncate text-xs text-zinc-300">{file.name}</p>
      </div>}
    </div>
  );
}

export const TextToImageFrames: React.FC = () => (
  <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
    <h1 className="text-2xl font-bold">Text to Image — Start / End</h1>
    <label className="block text-sm">Prompt
      <textarea rows={4} placeholder="Görselde olmasını istediğiniz sahneyi tarif edin..." className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white" />
    </label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <ImagePicker label="Start Frame — Başlangıç Görseli" />
      <ImagePicker label="End Frame — Bitiş Görseli" />
    </div>
    <p className="text-xs text-amber-300">Görsel üretim bağlantısı henüz eklenmedi.</p>
  </section>
);
