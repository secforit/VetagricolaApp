'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppSession } from '@/lib/types';

type ImportJob = {
  id: string;
  source_type: string;
  source_name: string;
  target_table: string;
  status: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  summary_json: Record<string, unknown> | null;
};

type ImportJobDetails = {
  id: string;
  source_type: string;
  source_name: string;
  target_table: string;
  status: string;
  summary_json: Record<string, unknown> | null;
  counters: {
    rowsTotal: number;
    rowsLoaded: number;
    rowsError: number;
    suggestionsCount: number;
  };
  recentErrors: Array<{
    id: string;
    source_row_index: number;
    error_message: string | null;
  }>;
};

const TARGET_TABLES = [
  'clients',
  'pets',
  'vets',
  'appointments',
  'records',
  'prescriptions',
  'reminders',
  'sales',
] as const;

type TargetTable = (typeof TARGET_TABLES)[number];

const SOURCE_TYPES = ['csv', 'json'] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

interface ImportJobsPageProps {
  session: AppSession;
}

function normalizeCsvRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.length;
}

export default function ImportJobsPage({ session }: ImportJobsPageProps) {
  const [sourceName, setSourceName] = useState('legacy-export');
  const [sourceType, setSourceType] = useState<SourceType>('csv');
  const [targetTable, setTargetTable] = useState<TargetTable>('clients');
  const [csvText, setCsvText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ImportJobDetails | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [analyzePreview, setAnalyzePreview] = useState<{
    suggestions: Array<{ sourceField: string; targetField: string; confidence: number; reason: string }>;
    unmappedFields: string[];
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const parsedJsonRows = useMemo(() => {
    if (sourceType !== 'json' || !jsonText.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }

      return parsed.filter((row) => row && typeof row === 'object') as Record<string, unknown>[];
    } catch {
      return null;
    }
  }, [jsonText, sourceType]);

  async function loadJobs(selectJobId?: string | null) {
    setLoadingJobs(true);
    try {
      const response = await fetch('/api/import/jobs');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut încărca joburile de import.');
      }

      const list = (payload.data ?? []) as ImportJob[];
      setJobs(list);

      const nextSelected = selectJobId ?? selectedJobId ?? list[0]?.id ?? null;
      setSelectedJobId(nextSelected);
      if (nextSelected) {
        await loadJobDetails(nextSelected);
      } else {
        setSelectedJob(null);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nu am putut încărca joburile de import.',
      });
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadJobDetails(jobId: string) {
    try {
      const response = await fetch(`/api/import/jobs/${jobId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nu am putut încărca detaliile jobului.');
      }
      setSelectedJob(payload.data as ImportJobDetails);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nu am putut încărca detaliile jobului.',
      });
    }
  }

  useEffect(() => {
    loadJobs().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateJob(event: FormEvent) {
    event.preventDefault();
    setAnalyzePreview(null);
    setMessage(null);
    setBusyAction('create');

    try {
      const payload: Record<string, unknown> = {
        sourceType,
        sourceName: sourceName.trim(),
        targetTable,
        idempotencyKey: idempotencyKey.trim() || undefined,
      };

      if (sourceType === 'csv') {
        payload.csvText = csvText;
      } else {
        if (!parsedJsonRows) {
          throw new Error('JSON invalid. Introdu un array de obiecte.');
        }
        payload.rows = parsedJsonRows;
      }

      const response = await fetch('/api/import/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Nu am putut crea jobul de import.');
      }

      const jobId = (body.data?.id ?? null) as string | null;
      await loadJobs(jobId);
      setMessage({ type: 'success', text: 'Job de import creat.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nu am putut crea jobul de import.',
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(action: 'analyze' | 'dry-run' | 'execute') {
    if (!selectedJobId) {
      setMessage({ type: 'error', text: 'Selectează un job de import.' });
      return;
    }

    setBusyAction(action);
    setMessage(null);

    try {
      const response = await fetch(`/api/import/jobs/${selectedJobId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? `Nu am putut rula acțiunea ${action}.`);
      }

      if (action === 'analyze') {
        setAnalyzePreview({
          suggestions: payload.data?.suggestions ?? [],
          unmappedFields: payload.data?.unmappedFields ?? [],
        });
      }

      await loadJobs(selectedJobId);
      setMessage({
        type: 'success',
        text:
          action === 'analyze'
            ? 'Analiza de mapping a fost finalizată.'
            : action === 'dry-run'
              ? 'Dry-run finalizat.'
              : 'Import executat.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Acțiune eșuată.',
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (session.role !== 'clinic_admin') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Importul de date este disponibil doar pentru administratorii clinicii.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Import date externe</h1>
        <p className="mt-2 text-sm text-slate-600">
          Phase 1 import pipeline: creezi jobul, rulezi analiză mapping, dry-run și apoi execute.
          Câmpurile ne-mapate se păstrează în staging.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. Creează job de import</h2>
        <form onSubmit={handleCreateJob} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Nume sursă</span>
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Idempotency key (opțional)</span>
              <input
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Tip sursă</span>
              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as SourceType)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Entitate țintă</span>
              <select
                value={targetTable}
                onChange={(event) => setTargetTable(event.target.value as TargetTable)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {TARGET_TABLES.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sourceType === 'csv' ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                CSV content ({normalizeCsvRows(csvText)} rânduri detectate)
              </span>
              <textarea
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                className="min-h-52 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                placeholder="first_name,last_name,email,phone"
                required
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">JSON array content</span>
              <textarea
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                className="min-h-52 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                placeholder='[{"first_name":"Ion","last_name":"Pop","email":"ion@example.com"}]'
                required
              />
            </label>
          )}

          <div>
            <button
              type="submit"
              disabled={busyAction !== null}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busyAction === 'create' ? 'Se creează...' : 'Creează job'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Rulează pipeline-ul</h2>
          <div className="text-xs text-slate-500">{loadingJobs ? 'Se încarcă...' : `${jobs.length} joburi`}</div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
            {jobs.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">Nu există joburi de import.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      loadJobDetails(job.id).catch(() => undefined);
                    }}
                    className={`w-full px-4 py-3 text-left ${
                      selectedJobId === job.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-medium">{job.source_name}</div>
                    <div className={`text-xs ${selectedJobId === job.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {job.target_table} · {job.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            {!selectedJob ? (
              <div className="text-sm text-slate-500">Selectează un job pentru detalii.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedJob.status}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Target</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedJob.target_table}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Rows</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedJob.counters.rowsTotal}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Loaded / Errors</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedJob.counters.rowsLoaded} / {selectedJob.counters.rowsError}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runAction('analyze')}
                    disabled={busyAction !== null}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busyAction === 'analyze' ? 'Analyze...' : 'Analyze mapping'}
                  </button>
                  <button
                    onClick={() => runAction('dry-run')}
                    disabled={busyAction !== null}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busyAction === 'dry-run' ? 'Dry-run...' : 'Dry-run'}
                  </button>
                  <button
                    onClick={() => runAction('execute')}
                    disabled={busyAction !== null}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busyAction === 'execute' ? 'Execute...' : 'Execute import'}
                  </button>
                </div>

                {analyzePreview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-900">Analyze preview</div>
                    <div className="mt-2 text-xs text-slate-600">
                      Suggestions: {analyzePreview.suggestions.length} · Unmapped fields: {analyzePreview.unmappedFields.length}
                    </div>
                    {analyzePreview.unmappedFields.length > 0 && (
                      <div className="mt-2 text-xs text-slate-600">
                        Unmapped: {analyzePreview.unmappedFields.slice(0, 12).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {selectedJob.recentErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <div className="text-sm font-semibold text-rose-800">Erori recente</div>
                    <div className="mt-2 space-y-1 text-xs text-rose-700">
                      {selectedJob.recentErrors.slice(0, 8).map((error) => (
                        <div key={error.id}>
                          Row {error.source_row_index}: {error.error_message ?? 'Eroare necunoscută'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
