'use client';

import { useState, useEffect } from 'react';
import { Column } from '@/lib/types';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface EditModalProps {
  columns: Column[];
  record: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (record: Record<string, unknown>) => Promise<void>;
}

export default function EditModal({ columns, record, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      initial[col.key] = record ? String(record[col.key] ?? '') : '';
    }
    setForm(initial);
  }, [record, columns]);

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    for (const col of columns) {
      if (col.readOnly) continue;
      const val = form[col.key]?.trim() ?? '';
      if (col.type === 'number' && val && isNaN(Number(val))) {
        return `"${col.label}" trebuie să fie un număr valid`;
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const processed: Record<string, unknown> = { ...form };
      for (const col of columns) {
        const val = form[col.key];
        if (col.type === 'number' && val) {
          processed[col.key] = Number(val);
        }
        if (val === '') {
          processed[col.key] = null;
        }
      }
      if (record?.id) {
        processed.id = record.id;
      }
      await onSave(processed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la salvare';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const inputBase = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow w-full';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {record ? 'Editare înregistrare' : 'Adăugare înregistrare nouă'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-4 flex-1">
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {columns.map(col => {
              if (col.readOnly) {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-600">{col.label}</label>
                    <input
                      type="text"
                      value={form[col.key] ?? ''}
                      readOnly
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 w-full"
                    />
                  </div>
                );
              }
              if (col.type === 'textarea') {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">{col.label}</label>
                    <textarea
                      value={form[col.key] ?? ''}
                      onChange={e => set(col.key, e.target.value)}
                      rows={3}
                      className={`${inputBase} resize-y`}
                    />
                  </div>
                );
              }
              if (col.type === 'select' && col.options) {
                return (
                  <div key={col.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">{col.label}</label>
                    <select
                      value={form[col.key] ?? ''}
                      onChange={e => set(col.key, e.target.value)}
                      className={`${inputBase} cursor-pointer`}
                    >
                      <option value="">— selectează —</option>
                      {col.options.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={col.key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">{col.label}</label>
                  <input
                    type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                    value={form[col.key] ?? ''}
                    onChange={e => set(col.key, e.target.value)}
                    className={inputBase}
                  />
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-default"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Se salvează...
                </>
              ) : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
