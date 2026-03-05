'use client';

import { useState, useEffect } from 'react';
import { Column } from '@/lib/types';
import { X } from 'lucide-react';

interface EditModalProps {
  columns: Column[];
  record: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (record: Record<string, unknown>) => Promise<void>;
}

export default function EditModal({ columns, record, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      let val = record ? String(record[col.key] ?? '') : '';
      if (col.type === 'date' && val.length > 10) val = val.slice(0, 10);
      initial[col.key] = val;
    }
    setForm(initial);
  }, [record, columns]);

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-[var(--radius)] shadow-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {record ? 'Editare înregistrare' : 'Înregistrare nouă'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius)] hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {columns.map(col => {
              const inputClasses = "border border-input rounded-[var(--radius)] px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow";

              if (col.readOnly) {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</label>
                    <input
                      type="text"
                      value={form[col.key] ?? ''}
                      readOnly
                      className="border border-input rounded-[var(--radius)] px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                );
              }
              if (col.type === 'textarea') {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</label>
                    <textarea
                      value={form[col.key] ?? ''}
                      onChange={e => set(col.key, e.target.value)}
                      rows={3}
                      className={`${inputClasses} resize-y`}
                    />
                  </div>
                );
              }
              if (col.type === 'select' && col.options) {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</label>
                    <select
                      value={form[col.key] ?? ''}
                      onChange={e => set(col.key, e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">-- selectează --</option>
                      {col.options.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={col.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</label>
                  <input
                    type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                    value={form[col.key] ?? ''}
                    onChange={e => set(col.key, e.target.value)}
                    className={inputClasses}
                  />
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-[var(--radius)] bg-card text-foreground hover:bg-muted transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
