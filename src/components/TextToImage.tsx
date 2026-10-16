
import React, { useState } from 'react';

export const TextToImageFrames: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [startImage, setStartImage] = useState('');
    const [endImage, setEndImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


const generate = async () => {
    if (!prompt.trim()) {
        setError('Lütfen sahneyi tarif eden bir Prompt yaz.');
        return;
    }

    setLoading(true);
    setError('');
    setStartImage('');
    setEndImage('');

    try {
        // START: Mevcut T2I motoru
        const response = await fetch('/api/studio/t2i', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `${ prompt.trim() }. Create one realistic cinematic START FRAME.Establish the character's appearance, face, hairstyle, clothing, body proportions, lighting and scene.`,
}),
        });

const data = await response.json();

if (!response.ok || !data.image_url) {
    throw new Error(data.error || 'Başlangıç görseli üretilemedi.');
}

setStartImage(data.image_url);

// END: Start görselini referans alan mevcut I2I motoru
const endResponse = await fetch('/api/studio/i2i', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: `...`,
        imageData: data.image_url,
        strength: 0.35,
    }),
});

const endData = await endResponse.json();

if (!endResponse.ok || !endData.image_url) {
    throw new Error(endData.error || 'Bitiş görseli üretilemedi.');
}

setEndImage(endData.image_url);
    } catch (err) {
    setError(
        err instanceof Error
            ? err.message
            : 'Görsel üretimi başarısız.'
    );
} finally {
    setLoading(false);
}
};


    return (
        <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
            <h1 className="text-2xl font-bold">Text to Image — Start / End</h1>

            <p className="text-sm text-zinc-400">
                Bir sahne tarif et. Yapay zekâ başlangıç ve bitiş için iki ayrı görsel oluştursun.
            </p>

            <label className="block text-sm">
                Prompt
                <textarea
                    rows={5}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Örnek: Gün batımında sahilde yürüyen bir adam, sinematik ve gerçekçi..."
                    className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white"
                />
            </label>

            <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-3 font-semibold"
            >
                {loading ? 'Görseller oluşturuluyor...' : 'Start + End Görsellerini Oluştur'}
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
