import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, Languages, Film } from 'lucide-react';

type PromptResult = {
  turkishPrompt: string;
  englishPrompt: string;
  startPromptTR: string;
  startPromptEN: string;
  endPromptTR: string;
  endPromptEN: string;
};

const emptyResult: PromptResult = {
  turkishPrompt: '',
  englishPrompt: '',
  startPromptTR: '',
  startPromptEN: '',
  endPromptTR: '',
  endPromptEN: '',
};

export const PromptStudio: React.FC = () => {
  const [description, setDescription] = useState('');
  const [promptType, setPromptType] = useState('video');
  const [startEnd, setStartEnd] = useState(false);
  const [result, setResult] = useState<PromptResult>(emptyResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const generate = async (action: 'enhance' | 'create' | 'video') => {
    if (!description.trim()) {
      setError('Önce ne oluşturmak istediğini yaz dostum.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/studio/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          action,
          promptType,
          startEnd,
          turkishPrompt: result.turkishPrompt,
          englishPrompt: result.englishPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Prompt oluşturulamadı.');
      }

      setResult({
        turkishPrompt: data.turkishPrompt || '',
        englishPrompt: data.englishPrompt || '',
        startPromptTR: data.startPromptTR || '',
        startPromptEN: data.startPromptEN || '',
        endPromptTR: data.endPromptTR || '',
        endPromptEN: data.endPromptEN || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key: string, value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Kopyalama başarısız. Metni seçip manuel kopyalayabilirsin.');
    }
  };

  const editor = (
    key: string,
    title: string,
    value: string,
    onChange: (value: string) => void
  ) => (
    <section className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        <button
          type="button"
          onClick={() => copyText(key, value)}
          disabled={!value.trim()}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          {copied === key ? <Check size={16} /> : <Copy size={16} />}
          {copied === key ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Oluşturulan prompt burada görünecek. İstersen düzenleyebilirsin."
        rows={7}
        className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200 outline-none focus:border-violet-500"
      />
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-600/20 p-3 text-violet-300">
          <Sparkles size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prompt Studio</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Fikrini profesyonel Türkçe ve İngilizce AI promptlarına dönüştür.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <label className="block text-sm font-semibold text-zinc-200">
          Ne yapmak istiyorsun?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Örn: Adam yağmurlu bir İstanbul sokağında yürüsün, sonra yavaşça kameraya dönsün. Yüzü ve sakalı hiç değişmesin."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100 outline-none focus:border-violet-500"
        />

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-300">
            Prompt türü
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'image', label: 'Görsel' },
              { value: 'video', label: 'Video' },
              { value: 'start-end', label: 'Start + End' },
            ].map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setPromptType(option.value);
                  if (option.value === 'start-end') setStartEnd(true);
                }}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  promptType === option.value
                    ? 'border-violet-500 bg-violet-600 text-white'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={startEnd}
            onChange={(e) => setStartEnd(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          <span>
            <span className="block font-medium text-zinc-100">Start + End oluştur</span>
            <span className="text-xs text-zinc-500">
              Aynı sahnenin başlangıç ve bitiş karesi için ayrı promptlar hazırla.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => generate('enhance')}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
          >
            <Sparkles size={17} /> Prompt'u Güçlendir
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => generate('create')}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            <Languages size={17} /> Sıfırdan Prompt Oluştur
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => generate('video')}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            <Film size={17} /> Video Prompt'u
          </button>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-violet-300">
            <Loader2 size={17} className="animate-spin" />
            Gemini promptlarını hazırlıyor...
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {editor('tr', 'Türkçe Prompt', result.turkishPrompt, (v) =>
          setResult((r) => ({ ...r, turkishPrompt: v }))
        )}
        {editor('en', 'English Prompt', result.englishPrompt, (v) =>
          setResult((r) => ({ ...r, englishPrompt: v }))
        )}
      </div>

      {startEnd && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Start + End Kare Promptları</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {editor('start-tr', 'Start — Türkçe', result.startPromptTR, (v) =>
              setResult((r) => ({ ...r, startPromptTR: v }))
            )}
            {editor('start-en', 'Start — English', result.startPromptEN, (v) =>
              setResult((r) => ({ ...r, startPromptEN: v }))
            )}
            {editor('end-tr', 'End — Türkçe', result.endPromptTR, (v) =>
              setResult((r) => ({ ...r, endPromptTR: v }))
            )}
            {editor('end-en', 'End — English', result.endPromptEN, (v) =>
              setResult((r) => ({ ...r, endPromptEN: v }))
            )}
          </div>
        </section>
      )}

      <p className="text-xs leading-5 text-zinc-500">
        Promptları kendi üretim araçlarında veya harici video sitelerinde kullanmak için
        Kopyala düğmesini kullanabilirsin. Harici sitelere otomatik yapıştırma, sitenin
        desteklediği özelliklere bağlıdır.
      </p>
    </div>
  );
};
