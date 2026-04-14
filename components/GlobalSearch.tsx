'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

type SearchResult = {
  key: string;
  section: string;
  sectionLabel: string;
  title: string;
  subtitle: string;
  href: string;
};

export default function GlobalSearch() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setError('');
  }, [pathname]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? 'Nu am putut căuta în date.');
        }

        setResults(Array.isArray(payload.data) ? payload.data : []);
      } catch (searchError) {
        setResults([]);
        setError(
          searchError instanceof Error ? searchError.message : 'Nu am putut căuta în date.'
        );
      } finally {
        setLoading(false);
      }
    }, 240);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="relative w-full max-w-[520px]" ref={containerRef}>
      <label className="relative block">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) {
              setOpen(true);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Caută global: client, animal, programare, fișă..."
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
            aria-hidden="true"
          />
        )}
      </label>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {query.trim().length < 2 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Scrie cel puțin 2 caractere pentru căutare.
            </div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Nu am găsit rezultate.</div>
          ) : (
            <div className="max-h-[360px] overflow-auto py-1.5">
              {results.map((result) => (
                <Link
                  key={result.key}
                  href={result.href}
                  className="flex items-start gap-3 px-4 py-2.5 transition hover:bg-cyan-50/60"
                >
                  <span className="mt-0.5 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {result.sectionLabel}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
