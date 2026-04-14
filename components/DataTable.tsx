'use client';

import { useEffect, useMemo, useState } from 'react';
import { Column } from '@/lib/types';
import EditModal from './EditModal';
import { Search, Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onSave: (record: Record<string, unknown>, isNew: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
  initialSearch?: string;
}

const PAGE_SIZE = 50;

export default function DataTable({
  columns,
  data,
  onSave,
  onDelete,
  loading,
  initialSearch = '',
}: DataTableProps) {
  const [search, setSearch] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [modalRecord, setModalRecord] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setSearch(initialSearch);
    setPage(1);
  }, [initialSearch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const v = row[col.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: string) {
    if (key === sortKey) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  async function confirmDelete(id: number) {
    setPendingDeleteId(null);
    await onDelete(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Caută..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-56 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-2 text-sm text-slate-700 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} înregistrări</span>
        <button
          onClick={() => { setPendingDeleteId(null); setModalRecord(null); }}
          className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
        >
          <Plus size={15} aria-hidden="true" />
          Adaugă
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortAsc
                        ? <ChevronUp size={13} className="text-cyan-600" aria-hidden="true" />
                        : <ChevronDown size={13} className="text-cyan-600" aria-hidden="true" />
                    ) : (
                      <ChevronUp size={13} className="text-slate-300" aria-hidden="true" />
                    )}
                  </span>
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-600">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5">
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
                  </td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-12 text-center text-sm text-slate-400">
                  Nu s-au găsit înregistrări
                </td>
              </tr>
            ) : pageData.map((row, i) => (
              <tr
                key={row.id as number ?? i}
                className={`transition-colors hover:bg-cyan-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                onMouseLeave={() => {
                  if (pendingDeleteId === (row.id as number)) {
                    setPendingDeleteId(null);
                  }
                }}
              >
                {columns.map(col => (
                  <td key={col.key} className="max-w-[200px] truncate px-3 py-2 text-slate-800" title={String(row[col.key] ?? '')}>
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-3 py-2 whitespace-nowrap">
                  {pendingDeleteId === (row.id as number) ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Sigur?</span>
                      <button
                        onClick={() => confirmDelete(row.id as number)}
                        className="cursor-pointer rounded bg-rose-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-rose-600"
                      >
                        Da
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="cursor-pointer text-xs text-slate-500 transition-colors hover:text-slate-700"
                      >
                        Nu
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <button
                        onClick={() => setModalRecord(row)}
                        className="flex cursor-pointer items-center gap-1 text-xs text-cyan-700 transition-colors hover:text-cyan-900"
                      >
                        <Pencil size={12} aria-hidden="true" />
                        Editează
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(row.id as number)}
                        className="flex cursor-pointer items-center gap-1 text-xs text-rose-600 transition-colors hover:text-rose-800"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        Șterge
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          className="cursor-pointer rounded-lg border border-slate-300 p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          aria-label="Prima pagină"
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="cursor-pointer rounded-lg border border-slate-300 p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          aria-label="Pagina anterioară"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="px-2">Pagina {page} din {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="cursor-pointer rounded-lg border border-slate-300 p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          aria-label="Pagina următoare"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          className="cursor-pointer rounded-lg border border-slate-300 p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          aria-label="Ultima pagină"
        >
          <ChevronsRight size={15} />
        </button>
      </div>

      {/* Modal */}
      {modalRecord !== undefined && (
        <EditModal
          columns={columns}
          record={modalRecord}
          onClose={() => setModalRecord(undefined)}
          onSave={async (record) => {
            await onSave(record, modalRecord === null);
            setModalRecord(undefined);
          }}
        />
      )}
    </div>
  );
}
