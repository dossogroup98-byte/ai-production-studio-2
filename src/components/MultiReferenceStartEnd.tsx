import React, { useEffect, useState } from 'react';

export const MultiReferenceStartEnd: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [startFile, setStartFile] = useState<File | null>(null);
  const [endFile, setEndFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [startPreview, setStartPreview] = useState('');
  const [endPreview, setEndPreview] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    if (!startFile) {
      setStartPreview('');
      return;
    }
    const url = URL.createObjectURL(startFile);
    setStartPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [startFile]);

  useEffect(() => {
    if (!endFile) {
      setEndPreview('');
      return;
    }
    const url = URL.createObjectURL(endFile);
    setEndPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [endFile]);

  const readImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new Error(`Görsel okunamadı: ${file.name}`));
      reader.readAsDataURL(file);
    });

  const generate = async () => {
    const totalImages =
      files.length + (startFile ? 1 : 0) + (endFile ? 1 : 0);

    if (totalImages < 1 || totalImages > 4) {
      setError('En az 1, en fazla 4 görsel seçebilirsin.');
      return;
    }

    if (!prompt.trim()) {
      setError('Lütfen Prompt yaz.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const referenceImages = await Promise.all(files.map(readImage));
      const startImage = startFile ? await readImage(startFile) : null;
      const endImage = endFile ? await readImage(endFile) : null;

      const images = [
        ...referenceImages,
        ...(startImage ? [startImage] : []),
        ...(endImage ? [endImage] : []),
      ];

      const response = await fetch(
        '/api/studio/multi-reference-start-end',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            images,
            referenceImages,
            startImage,
            endImage,
            mode: 'start-end-single-image',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.image_url) {
        throw new Error(
          data.error || 'Görsel üretilemedi.'
        );
      }

      setResult(data.image_url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Beklenmeyen hata oluştu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
      <h1 className="text-2xl font-bold">
        Multi-Reference — Start / End
      </h1>

      <p className="text-sm text-zinc-400">
        Referans, başlangıç veya bitiş görsellerinden istediğini seç.
        Toplam 1–4 görselle tek yeni görsel oluşturulur; video üretilmez.
      </p>

      <div className="space-y-2">
        <h2 className="font-semibold">
          Karakter / Referans Görselleri (İsteğe bağlı)
        </h2>

        <label className="block rounded-xl border-2 border-dashed border-violet-500/60 bg-zinc-900 p-5 text-center cursor-pointer">
          <span className="font-semibold text-violet-300">
            ＋ Referans Görsellerini Seç
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              setFiles(Array.from(e.target.files ?? []).slice(0, 4));
              setResult('');
              setError('');
            }}
          />
        </label>

        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {previews.map((url, i) => (
              <div key={url}>
                <img
                  src={url}
                  alt={files[i].name}
                  className="h-36 w-full rounded-lg border border-zinc-700 object-contain bg-black"
                />
                <p className="truncate text-xs text-zinc-300">
                  {files[i].name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <h2 className="font-semibold">Start Frame — Başlangıç (İsteğe bağlı)</h2>
          <label className="flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-500/60 bg-zinc-900 p-4 text-center cursor-pointer">
            {startPreview ? (
              <img
                src={startPreview}
                alt="Start Frame"
                className="max-h-64 rounded-lg object-contain"
              />
            ) : (
              <span className="text-indigo-300">
                ＋ Başlangıç Görseli Seç
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                setStartFile(e.target.files?.[0] ?? null);
                setResult('');
                setError('');
              }}
            />
          </label>
          {startFile && (
            <button
              type="button"
              onClick={() => setStartFile(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Başlangıcı kaldır
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">End Frame — Bitiş (İsteğe bağlı)</h2>
          <label className="flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-500/60 bg-zinc-900 p-4 text-center cursor-pointer">
            {endPreview ? (
              <img
                src={endPreview}
                alt="End Frame"
                className="max-h-64 rounded-lg object-contain"
              />
            ) : (
              <span className="text-amber-300">
                ＋ Bitiş Görseli Seç
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                setEndFile(e.target.files?.[0] ?? null);
                setResult('');
                setError('');
              }}
            />
          </label>
          {endFile && (
            <button
              type="button"
              onClick={() => setEndFile(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Bitişi kaldır
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Seçilen görsel sayısı: {files.length + (startFile ? 1 : 0) + (endFile ? 1 : 0)} / 4
      </p>

      <label className="block text-sm">
        Prompt
        <textarea
          rows={5}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Karakteri referans görsellerinden koru. Seçtiğin sahne görsellerinden esinlenerek tek, gerçekçi bir fotoğraf oluştur."
          className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white"
        />
      </label>

      <button
        onClick={generate}
        disabled={loading}
        className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-3 font-semibold"
      >
        {loading ? 'Görsel oluşturuluyor...' : 'Tek Görsel Oluştur'}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Oluşturulan Görsel</h2>
          <img
            src={result}
            alt="Oluşturulan görsel"
            className="w-full rounded-xl border border-zinc-700"
          />
          <a
            href={result}
            download="multi-reference-start-end.png"
            className="inline-block rounded-lg bg-zinc-700 px-4 py-2"
          >
            Görseli Kaydet
          </a>
        </div>
      )}
    </section>
  );
};
