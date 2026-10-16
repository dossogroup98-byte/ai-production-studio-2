
import React, { useEffect, useState } from 'react';

export const MultiReferenceStartEnd: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [startImage, setStartImage] = useState('');
    const [endImage, setEndImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [files]);

    const readImage = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(`${file.name} okunamadı.`));
            reader.readAsDataURL(file);
        });

    const generate = async () => {
        if (files.length > 4) {
            setError('En fazla 4 referans fotoğrafı seçebilirsin.');
            return;
        }

        if (!prompt.trim()) {
            setError('Lütfen sahne Promptunu yaz.');
            return;
        }

        setLoading(true);
        setError('');
        setStartImage('');
        setEndImage('');

        try {
            const referenceImages = await Promise.all(files.map(readImage));

            const response = await fetch('/api/studio/multi-reference-start-end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    referenceImages,
                }),
            });

            const data = await response.json();

            if (
                !response.ok ||
                !data.success ||
                !data.start_image_url ||
                !data.end_image_url
            ) {
                throw new Error(data.error || 'Start/End görselleri üretilemedi.');
            }

            setStartImage(data.start_image_url);
            setEndImage(data.end_image_url);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Görsel üretimi başarısız.'
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
                İstersen 1–4 karakter referansı ekle. Yapay zekâ aynı sahne için
                iki ayrı görsel üretir. Start veya End fotoğrafı yüklemek gerekmez.
            </p>

            <label className="block rounded-xl border-2 border-dashed border-violet-500/60 bg-zinc-900 p-6 text-center cursor-pointer">
                <span className="font-semibold text-violet-300">
                    ＋ Karakter Referanslarını Seç (İsteğe bağlı, en fazla 4)
                </span>
                <p className="mt-1 text-xs text-zinc-400">PNG, JPG veya WEBP</p>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                        setFiles(Array.from(e.target.files ?? []).slice(0, 4));
                        setStartImage('');
                        setEndImage('');
                        setError('');
                    }}
                />
            </label>


            {previews.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-300">
                            Seçilen referanslar: {files.length}/4
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setFiles([]);
                                setPreviews([]);
                                setStartImage('');
                                setEndImage('');
                                setError('');
                            }}
                            disabled={loading}
                            className="rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
                        >
                            Tümünü Temizle
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {previews.map((url, i) => (
                            <div key={url} className="rounded-lg border border-zinc-700 p-2">
                                <img
                                    src={url}
                                    alt={files[i]?.name ?? `Referans ${i + 1}`}
                                    className="h-36 w-full rounded-lg object-contain bg-black"
                                />

                                <p className="mt-2 truncate text-xs text-zinc-300">
                                    {files[i]?.name}
                                </p>

                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => {
                                        setFiles(current =>
                                            current.filter((_, index) => index !== i)
                                        );
                                        setStartImage('');
                                        setEndImage('');
                                        setError('');
                                    }}
                                    className="mt-2 w-full rounded-lg bg-red-700 px-2 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
                                >
                                    Kaldır
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <label className="block text-sm">
                Prompt
                <textarea
                    rows={5}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Sahneyi, karakterleri ve hareketi tarif et."
                    className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white"
                />
            </label>

            <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-3 font-semibold"
            >
                {loading ? 'Start ve End oluşturuluyor...' : 'Start + End Görsellerini Oluştur'}
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                    { title: 'Start Frame — Başlangıç', image: startImage, name: 'start-frame.png' },
                    { title: 'End Frame — Bitiş', image: endImage, name: 'end-frame.png' },
                ].map(frame => (
                    <div key={frame.title} className="space-y-3">
                        <h2 className="font-semibold">{frame.title}</h2>
                        {frame.image ? (
                            <>
                                <img
                                    src={frame.image}
                                    alt={frame.title}
                                    className="w-full rounded-xl border border-zinc-700"
                                />
                                <a
                                    href={frame.image}
                                    download={frame.name}
                                    className="inline-block rounded-lg bg-zinc-700 px-4 py-2"
                                >
                                    Görseli Kaydet
                                </a>
                            </>
                        ) : (
                            <div className="flex min-h-48 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-zinc-500">
                                {loading ? 'Oluşturuluyor...' : 'Henüz görsel yok'}
                            </div>
                        )}
                    </div>
                ))}
            </div>

        </section>
    );
};
