'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import DataTable from './DataTable';
import { Column } from '@/lib/types';

interface SectionPageProps {
  title: string;
  apiPath: string;
  columns: Column[];
}

export default function SectionPage({ title, apiPath, columns }: SectionPageProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${apiPath}?limit=5000`);
      const json = await res.json();
      setData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => { load(); }, [load]);

  function showNewId(id: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setNewId(id);
    toastTimer.current = setTimeout(() => setNewId(null), 5000);
  }

  async function handleSave(record: Record<string, unknown>, isNew: boolean) {
    const virtualKeys = new Set(columns.filter(c => c.virtual).map(c => c.key));
    const payload = Object.fromEntries(Object.entries(record).filter(([k]) => !virtualKeys.has(k)));
    if (isNew) {
      const res = await fetch(`/api/${apiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (created?.id) showNewId(created.id);
    } else {
      await fetch(`/api/${apiPath}/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    await load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/${apiPath}/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      {newId !== null && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-card border border-border rounded-[var(--radius)] shadow-lg px-4 py-3 text-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="text-muted-foreground">Înregistrare adăugată cu ID:</span>
          <span className="font-bold text-primary text-base">{newId}</span>
          <button onClick={() => setNewId(null)} className="ml-1 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">&times;</button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestionați înregistrările din această secțiune
        </p>
      </div>
      <Suspense>
        <DataTable
          columns={columns}
          data={data}
          onSave={handleSave}
          onDelete={handleDelete}
          loading={loading}
        />
      </Suspense>
    </div>
  );
}
