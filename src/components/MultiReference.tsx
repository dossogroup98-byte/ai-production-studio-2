
import React, { useEffect, useState } from 'react';

export const MultiReference: React.FC = () => {
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
            const images = await Promise.all(
                files.map(file => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
                    reader.readAsDataURL(file);
                }))
            );

            const response = await fetch('/api/studio/multi-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, images }),
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
            <h1 className="text-2xl font-bold">Multi-Reference — Çoklu Referans</h1>
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
                    placeholder="Örneğin: İlk görseldeki adam ve ikinci görseldeki kadın, üçüncü görseldeki sahilde yan yana dursun. Tek, gerçekçi fotoğraf oluştur."
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
