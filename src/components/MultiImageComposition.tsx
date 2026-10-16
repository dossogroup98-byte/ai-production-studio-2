
import React, { useEffect, useState } from 'react';

export const MultiImageComposition: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [files]);


    const resizeImage = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const scale = Math.min(1, 512 / img.width, 512 / img.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Görsel dönüştürülemedi.'));
                    return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Görsel okunamadı.'));
            };

            img.src = url;
        });




    const generate = async () => {
        if (files.length < 2 || files.length > 4) {
            setError('Lütfen 2–4 referans görsel seç.');
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
            const images = await Promise.all(files.map(resizeImage));

            const safePrompt = `${prompt.trim()}

           IMPORTANT:
           Reference image 1 represents PERSON 1.
           Reference image 2 represents PERSON 2.
           Reference image 3 represents PERSON 3.
           Include ALL THREE people in the final image.
           Exactly three distinct people must be visible simultaneously.
           Do not omit, merge, duplicate, or replace any person.
           Preserve each person's original face, hairstyle, hair length,
           hairline, facial hair, age, and identity from their own reference.
           Do not add hair, change hairstyles, or invent facial features.
           Place all three people naturally together in ONE realistic photograph.
           Full single frame only. No collage, split screen, panels, or duplicate images.`;

            const response = await fetch('/api/studio/multi-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: safePrompt, images }),
            });

            const data = await response.json();
            if (!response.ok || !data.success || !data.image_url) {
                throw new Error(data.error || 'Görsel üretilemedi.');
            }

            setResult(data.image_url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Beklenmeyen hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
            <h1 className="text-2xl font-bold">Multi-Image Composition — Tek Kare</h1>
            <p className="text-sm text-zinc-400">
                2–4 görsel seç. Hepsini tek Prompt ile tek karede birleştirmeyi dene.
            </p>

            <label className="block rounded-xl border-2 border-dashed border-violet-500/60 bg-zinc-900 p-6 text-center cursor-pointer">
                <span className="font-semibold text-violet-300">＋ Görselleri Seç (2–4 adet)</span>
                <p className="mt-1 text-xs text-zinc-400">PNG, JPG veya WEBP</p>
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
                            <img src={url} alt={files[i].name}
                                className="h-36 w-full rounded-lg border border-zinc-700 object-contain bg-black" />
                            <p className="truncate text-xs text-zinc-300">{files[i].name}</p>
                        </div>
                    ))}
                </div>
            )}

            <label className="block text-sm">
                Prompt
                <textarea
                    rows={5}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Görsel 1'deki kişinin yüz kimliğini ve Görsel 2'deki kişinin yüz kimliğini ayrı ayrı koru. Görsel 3'teki ortamda yan yana dursunlar. Tek bir kesintisiz, gerçekçi fotoğraf oluştur. Bölünmüş ekran, kolaj, çift kare veya ikinci bir görüntü oluşturma. Her kişinin yüzünü kendi referansıyla eşleştir."
                    className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white"
                />
            </label>

            <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-3 font-semibold"
            >
                {loading ? 'Görsel oluşturuluyor...' : 'Tek Kare Oluştur'}
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {result && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Oluşturulan Görsel</h2>
                    <img src={result} alt="Oluşturulan çoklu referans görseli"
                        className="w-full rounded-xl border border-zinc-700" />
                    <a href={result} download="multi-reference.png"
                        className="inline-block rounded-lg bg-zinc-700 px-4 py-2">
                        Görseli Kaydet
                    </a>
                </div>
            )}
        </section>
    );
};

