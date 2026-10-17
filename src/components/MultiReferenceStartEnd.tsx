
import React, { useEffect, useState } from 'react';

type PersonRole = 'Belirtilmedi' | 'Kadın' | 'Erkek' | 'Çocuk' | 'Diğer';

type ReferenceItem = {
    id: string;
    file: File;
    role: PersonRole;
    age: string;
};

export const MultiReferenceStartEnd: React.FC = () => {
    const [references, setReferences] = useState<ReferenceItem[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [startImage, setStartImage] = useState('');
    const [endImage, setEndImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const urls = references.map(ref => URL.createObjectURL(ref.file));
        setPreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [references]);

    const readImage = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(`${file.name} okunamadı.`));
            reader.readAsDataURL(file);
        });

    const clearResults = () => {
        setStartImage('');
        setEndImage('');
        setError('');
    };

    const updateReference = (
        index: number,
        changes: Partial<Pick<ReferenceItem, 'role' | 'age'>>
    ) => {
        setReferences(current =>
            current.map((ref, i) => i === index ? { ...ref, ...changes } : ref)
        );
        clearResults();
    };

    const moveReference = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= references.length) return;

        setReferences(current => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        clearResults();
    };

    const generate = async () => {
        if (references.length > 4) {
            setError('En fazla 4 referans fotoğrafı seçebilirsin.');
            return;
        }

        if (!prompt.trim()) {
            setError('Lütfen sahne promptunu yaz.');
            return;
        }

        setLoading(true);
        clearResults();

        try {
            const referenceImages = await Promise.all(
                references.map(ref => readImage(ref.file))
            );

            const referenceDetails = references.map(ref => ({
                role: ref.role,
                age: ref.age.trim(),
                fileName: ref.file.name,
            }));

            const response = await fetch('/api/studio/multi-reference-start-end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    referenceImages,
                    referenceDetails,
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
                1–4 fotoğrafı birlikte seç. Her fotoğrafın kişi türünü ve
                istersen yaşını belirt. Fotoğrafların sırası kimlik eşleştirmesini
                belirler; çocuk veya belirli bir yaş zorunlu değildir.
            </p>

            <label className="block rounded-xl border-2 border-dashed border-violet-500/60 bg-zinc-900 p-6 text-center cursor-pointer">
                <span className="font-semibold text-violet-300">
                    ＋ Karakter Referanslarını Seç (En fazla 4)
                </span>
                <p className="mt-1 text-xs text-zinc-400">PNG, JPG veya WEBP</p>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={loading}
                    className="hidden"
                    onChange={e => {
                        const selected = Array.from(e.target.files ?? [])
                            .filter(file => file.type.startsWith('image/'))
                            .slice(0, 4);

                        setReferences(selected.map((file, i) => ({
                            id: `${Date.now()}-${i}-${file.name}`,
                            file,
                            role: 'Belirtilmedi',
                            age: '',
                        })));
                        clearResults();
                        e.target.value = '';
                    }}
                />
            </label>

            {references.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-300">
                            Referanslar: {references.length}/4
                        </p>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                                setReferences([]);
                                clearResults();
                            }}
                            className="rounded-lg bg-red-700 px-3 py-2 text-sm disabled:opacity-50"
                        >
                            Tümünü Temizle
                        </button>
                    </div>

                    <div className="space-y-3">
                        {references.map((ref, i) => (
                            <div
                                key={ref.id}
                                className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3"
                            >
                                <div>
                                    <img
                                        src={previews[i]}
                                        alt={`Referans ${i + 1}`}
                                        className="h-32 w-full rounded-lg bg-black object-contain"
                                    />
                                    <p className="mt-2 text-xs font-semibold text-violet-300">
                                        Referans {i + 1}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        input_image_{i}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            disabled={loading || i === 0}
                                            onClick={() => moveReference(i, -1)}
                                            className="flex-1 rounded bg-zinc-700 p-2 disabled:opacity-30"
                                            title="Bir sıra yukarı taşı"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading || i === references.length - 1}
                                            onClick={() => moveReference(i, 1)}
                                            className="flex-1 rounded bg-zinc-700 p-2 disabled:opacity-30"
                                            title="Bir sıra aşağı taşı"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <p className="truncate text-xs text-zinc-400">
                                        {ref.file.name}
                                    </p>

                                    <label className="block text-sm">
                                        Kişi türü
                                        <select
                                            value={ref.role}
                                            disabled={loading}
                                            onChange={e => updateReference(i, {
                                                role: e.target.value as PersonRole,
                                            })}
                                            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                                        >
                                            <option>Belirtilmedi</option>
                                            <option>Kadın</option>
                                            <option>Erkek</option>
                                            <option>Çocuk</option>
                                            <option>Diğer</option>
                                        </select>
                                    </label>

                                    <label className="block text-sm">
                                        Yaş (isteğe bağlı)
                                        <input
                                            type="text"
                                            value={ref.age}
                                            disabled={loading}
                                            onChange={e => updateReference(i, {
                                                age: e.target.value,
                                            })}
                                            placeholder="Örn. 3 yaşında veya 30"
                                            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => {
                                            setReferences(current =>
                                                current.filter((_, index) => index !== i)
                                            );
                                            clearResults();
                                        }}
                                        className="rounded-lg bg-red-700 px-3 py-2 text-sm disabled:opacity-50"
                                    >
                                        Bu Fotoğrafı Kaldır
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {references.length === 4 && (
                        <p className="text-xs text-amber-300">
                            Not: Start dört referansı da kullanabilir. End karesinde
                            ise bir görsel yuvasını Start karesi kapladığından,
                            ilk üç referans kullanılabilir.
                        </p>
                    )}
                </div>
            )}

            <label className="block text-sm">
                Sahne Promptu
                <textarea
                    rows={5}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Sahneyi, kişileri ve hareketi tarif et."
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








//import React, { useEffect, useState } from 'react';

//export const MultiReferenceStartEnd: React.FC = () => {
//    const [files, setFiles] = useState<File[]>([]);
//    const [previews, setPreviews] = useState<string[]>([]);
//    const [prompt, setPrompt] = useState('');
//    const [startImage, setStartImage] = useState('');
//    const [endImage, setEndImage] = useState('');
//    const [loading, setLoading] = useState(false);
//    const [error, setError] = useState('');

//    useEffect(() => {
//        const urls = files.map(file => URL.createObjectURL(file));
//        setPreviews(urls);
//        return () => urls.forEach(url => URL.revokeObjectURL(url));
//    }, [files]);

//    const readImage = (file: File): Promise<string> =>
//        new Promise((resolve, reject) => {
//            const reader = new FileReader();
//            reader.onload = () => resolve(String(reader.result));
//            reader.onerror = () => reject(new Error(`${file.name} okunamadı.`));
//            reader.readAsDataURL(file);
//        });

//    const generate = async () => {
//        if (files.length > 4) {
//            setError('En fazla 4 referans fotoğrafı seçebilirsin.');
//            return;
//        }

//        if (!prompt.trim()) {
//            setError('Lütfen sahne Promptunu yaz.');
//            return;
//        }

//        setLoading(true);
//        setError('');
//        setStartImage('');
//        setEndImage('');

//        try {
//            const referenceImages = await Promise.all(files.map(readImage));

//            const response = await fetch('/api/studio/multi-reference-start-end', {
//                method: 'POST',
//                headers: { 'Content-Type': 'application/json' },
//                body: JSON.stringify({
//                    prompt: prompt.trim(),
//                    referenceImages,
//                }),
//            });

//            const data = await response.json();

//            if (
//                !response.ok ||
//                !data.success ||
//                !data.start_image_url ||
//                !data.end_image_url
//            ) {
//                throw new Error(data.error || 'Start/End görselleri üretilemedi.');
//            }

//            setStartImage(data.start_image_url);
//            setEndImage(data.end_image_url);
//        } catch (err) {
//            setError(
//                err instanceof Error ? err.message : 'Görsel üretimi başarısız.'
//            );
//        } finally {
//            setLoading(false);
//        }
//    };

//    return (
//        <section className="max-w-5xl mx-auto p-6 space-y-6 text-white">
//            <h1 className="text-2xl font-bold">
//                Multi-Reference — Start / End
//            </h1>

//            <p className="text-sm text-zinc-400">
//                İstersen 1–4 karakter referansı ekle. Yapay zekâ aynı sahne için
//                iki ayrı görsel üretir. Start veya End fotoğrafı yüklemek gerekmez.
//            </p>

//            <label className="block rounded-xl border-2 border-dashed border-violet-500/60 bg-zinc-900 p-6 text-center cursor-pointer">
//                <span className="font-semibold text-violet-300">
//                    ＋ Karakter Referanslarını Seç (İsteğe bağlı, en fazla 4)
//                </span>
//                <p className="mt-1 text-xs text-zinc-400">PNG, JPG veya WEBP</p>
//                <input
//                    type="file"
//                    accept="image/*"
//                    multiple
//                    className="hidden"
//                    onChange={e => {
//                        setFiles(Array.from(e.target.files ?? []).slice(0, 4));
//                        setStartImage('');
//                        setEndImage('');
//                        setError('');
//                    }}
//                />
//            </label>


//            {previews.length > 0 && (
//                <div className="space-y-3">
//                    <div className="flex items-center justify-between">
//                        <p className="text-sm text-zinc-300">
//                            Seçilen referanslar: {files.length}/4
//                        </p>
//                        <button
//                            type="button"
//                            onClick={() => {
//                                setFiles([]);
//                                setPreviews([]);
//                                setStartImage('');
//                                setEndImage('');
//                                setError('');
//                            }}
//                            disabled={loading}
//                            className="rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
//                        >
//                            Tümünü Temizle
//                        </button>
//                    </div>

//                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                        {previews.map((url, i) => (
//                            <div key={url} className="rounded-lg border border-zinc-700 p-2">
//                                <img
//                                    src={url}
//                                    alt={files[i]?.name ?? `Referans ${i + 1}`}
//                                    className="h-36 w-full rounded-lg object-contain bg-black"
//                                />

//                                <p className="mt-2 truncate text-xs text-zinc-300">
//                                    {files[i]?.name}
//                                </p>

//                                <button
//                                    type="button"
//                                    disabled={loading}
//                                    onClick={() => {
//                                        setFiles(current =>
//                                            current.filter((_, index) => index !== i)
//                                        );
//                                        setStartImage('');
//                                        setEndImage('');
//                                        setError('');
//                                    }}
//                                    className="mt-2 w-full rounded-lg bg-red-700 px-2 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
//                                >
//                                    Kaldır
//                                </button>
//                            </div>
//                        ))}
//                    </div>
//                </div>
//            )}

//            <label className="block text-sm">
//                Prompt
//                <textarea
//                    rows={5}
//                    value={prompt}
//                    onChange={e => setPrompt(e.target.value)}
//                    placeholder="Sahneyi, karakterleri ve hareketi tarif et."
//                    className="block mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white"
//                />
//            </label>

//            <button
//                type="button"
//                onClick={generate}
//                disabled={loading}
//                className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-3 font-semibold"
//            >
//                {loading ? 'Start ve End oluşturuluyor...' : 'Start + End Görsellerini Oluştur'}
//            </button>

//            {error && <p className="text-sm text-red-400">{error}</p>}

//            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                {[
//                    { title: 'Start Frame — Başlangıç', image: startImage, name: 'start-frame.png' },
//                    { title: 'End Frame — Bitiş', image: endImage, name: 'end-frame.png' },
//                ].map(frame => (
//                    <div key={frame.title} className="space-y-3">
//                        <h2 className="font-semibold">{frame.title}</h2>
//                        {frame.image ? (
//                            <>
//                                <img
//                                    src={frame.image}
//                                    alt={frame.title}
//                                    className="w-full rounded-xl border border-zinc-700"
//                                />
//                                <a
//                                    href={frame.image}
//                                    download={frame.name}
//                                    className="inline-block rounded-lg bg-zinc-700 px-4 py-2"
//                                >
//                                    Görseli Kaydet
//                                </a>
//                            </>
//                        ) : (
//                            <div className="flex min-h-48 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-zinc-500">
//                                {loading ? 'Oluşturuluyor...' : 'Henüz görsel yok'}
//                            </div>
//                        )}
//                    </div>
//                ))}
//            </div>

//        </section>
//    );
//};
