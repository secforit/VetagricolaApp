'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import DataTable from './DataTable';
import { Column } from '@/lib/types';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SectionPageProps {
  title: string;
  apiPath: string;
  columns: Column[];
}

export default function SectionPage({ title, apiPath, columns }: SectionPageProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const initialSearch = (searchParams.get('search') ?? '').trim().slice(0, 100);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${apiPath}?limit=5000`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Eroare ${res.status}`);
      }
      const json = await res.json();
      setData(json.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la încărcarea datelor';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(record: Record<string, unknown>, isNew: boolean) {
    try {
      const url = isNew ? `/api/${apiPath}` : `/api/${apiPath}/${record.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Eroare ${res.status}`);
      }
      showToast(isNew ? 'Înregistrare creată cu succes' : 'Înregistrare actualizată cu succes', 'success');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la salvare';
      showToast(msg, 'error');
      throw err;
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/${apiPath}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Eroare ${res.status}`);
      }
      showToast('Înregistrare ștearsă cu succes', 'success');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la ștergere';
      showToast(msg, 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Modul clinic în context multi-tenant, cu editare sigură pe clinica activă.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {error}
            <button onClick={load} className="ml-2 underline font-medium">Reîncearcă</button>
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        onSave={handleSave}
        onDelete={handleDelete}
        loading={loading}
        initialSearch={initialSearch}
      />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} aria-hidden="true" />
            : <AlertCircle size={16} aria-hidden="true" />
          }
          {toast.message}
        </div>
      )}
    </div>
  );
}
