'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Column } from '@/lib/types';
import EditModal from './EditModal';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onSave: (record: Record<string, unknown>, isNew: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
}

const PAGE_SIZE = 50;

export default function DataTable({ columns, data, onSave, onDelete, loading }: DataTableProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [modalRecord, setModalRecord] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Split columns into table-visible and detail-only
  const tableColumns = useMemo(
    () => columns.filter(col => col.tableVisible !== false),
    [columns]
  );
  const detailColumns = useMemo(
    () => columns.filter(col => col.tableVisible === false),
    [columns]
  );

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
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function changePage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  async function handleDelete(id: number) {
    if (!confirm('Ștergi această înregistrare?')) return;
    await onDelete(id);
  }

  function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Caută înregistrări..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="border border-input rounded-[var(--radius)] pl-9 pr-4 py-2 text-sm w-full bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} înregistrări</span>
        <button
          onClick={() => setModalRecord(null)}
          className="ml-auto flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-[var(--radius)] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Adaugă
        </button>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Se încarcă...</span>
          </div>
        ) : pageData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nu s-au găsit înregistrări
          </div>
        ) : (
          pageData.map((row, i) => {
            const rowId = (row.id as number) ?? i;
            const isExpanded = expandedId === rowId;
            const visibleCols = tableColumns.filter(c => c.key !== 'id');

            return (
              <div key={rowId} className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
                {/* Card body */}
                <div className="px-4 py-3 flex flex-col gap-2">
                  {visibleCols.map(col => {
                    const v = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
                    if (!v) return null;
                    return (
                      <div key={col.key} className="flex gap-2 items-baseline">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 w-28">
                          {col.label}
                        </span>
                        <span className="text-sm text-foreground break-words min-w-0 flex items-center gap-1">
                          {v}
                          {col.linkTo && row[col.key] != null && String(row[col.key]) && (
                            <a href={col.linkTo(row[col.key], row)} className="shrink-0 text-primary/60 hover:text-primary transition-colors" title="Deschide">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded details */}
                {isExpanded && detailColumns.length > 0 && (
                  <div className="bg-muted/20 border-t border-border px-4 py-3 flex flex-col gap-2">
                    {detailColumns.map(col => {
                      const v = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
                      return (
                        <div key={col.key} className="flex gap-2 items-baseline">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 w-28">
                            {col.label}
                          </span>
                          <span className="text-sm text-foreground break-words min-w-0 flex items-center gap-1">
                            {v || <span className="italic text-muted-foreground">--</span>}
                            {col.linkTo && row[col.key] != null && String(row[col.key]) && (
                              <a href={col.linkTo(row[col.key], row)} className="shrink-0 text-primary/60 hover:text-primary transition-colors" title="Deschide">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Card footer: actions */}
                <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-muted/10">
                  {detailColumns.length > 0 ? (
                    <button
                      onClick={() => toggleExpand(rowId)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Restrânge' : 'Detalii'}
                    </button>
                  ) : <span />}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModalRecord(row)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editează
                    </button>
                    <button
                      onClick={() => handleDelete(row.id as number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block rounded-[var(--radius)] border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            {detailColumns.length > 0 && <col className="w-10" />}
            {tableColumns.map(col => (
              <col key={col.key} />
            ))}
            <col className="w-[100px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {detailColumns.length > 0 && (
                <th className="px-2 py-3 w-10" aria-label="Expand" />
              )}
              {tableColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-primary">{sortAsc ? '\u2191' : '\u2193'}</span>
                  )}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={tableColumns.length + (detailColumns.length > 0 ? 2 : 1)} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Se încarcă...</span>
                  </div>
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={tableColumns.length + (detailColumns.length > 0 ? 2 : 1)} className="px-4 py-12 text-center text-muted-foreground">
                  Nu s-au găsit înregistrări
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => {
                const rowId = (row.id as number) ?? i;
                const isExpanded = expandedId === rowId;

                return (
                  <tr key={rowId} className="group">
                    <td colSpan={tableColumns.length + (detailColumns.length > 0 ? 2 : 1)} className="p-0">
                      {/* Main row */}
                      <div className="flex items-center hover:bg-muted/30 transition-colors">
                        {detailColumns.length > 0 && (
                          <div className="w-10 flex-shrink-0 flex items-center justify-center px-2 py-2.5">
                            <button
                              onClick={() => toggleExpand(rowId)}
                              className="p-1 rounded-[var(--radius)] hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              aria-label={isExpanded ? 'Restrânge detaliile' : 'Extinde detaliile'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                        {tableColumns.map(col => {
                          const displayVal = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
                          return (
                            <div
                              key={col.key}
                              className="flex-1 min-w-0 px-3 py-2.5 text-foreground flex items-center gap-1"
                              title={displayVal}
                            >
                              <span className="truncate">{displayVal}</span>
                              {col.linkTo && row[col.key] != null && String(row[col.key]) && (
                                <a href={col.linkTo(row[col.key], row)} className="shrink-0 text-primary/60 hover:text-primary transition-colors" title="Deschide">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                        <div className="w-[100px] flex-shrink-0 px-3 py-2.5 flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalRecord(row)}
                            className="p-1.5 rounded-[var(--radius)] text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Editare înregistrare"
                            title="Editează"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id as number)}
                            className="p-1.5 rounded-[var(--radius)] text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Ștergere înregistrare"
                            title="Șterge"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable detail row */}
                      {isExpanded && detailColumns.length > 0 && (
                        <div className="bg-muted/20 border-t border-border px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            {detailColumns.map(col => {
                              const val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
                              return (
                                <div key={col.key} className="flex flex-col py-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {col.label}
                                  </span>
                                  <span className="text-sm text-foreground break-words flex items-center gap-1">
                                    {val || <span className="text-muted-foreground italic">--</span>}
                                    {col.linkTo && row[col.key] != null && String(row[col.key]) && (
                                      <a href={col.linkTo(row[col.key], row)} className="shrink-0 text-primary/60 hover:text-primary transition-colors" title="Deschide">
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => changePage(1)}
          disabled={page === 1}
          className="p-1.5 border border-border rounded-[var(--radius)] bg-card disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4 text-foreground" />
        </button>
        <button
          onClick={() => changePage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 border border-border rounded-[var(--radius)] bg-card disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
        <span className="text-muted-foreground px-2">
          Pagina <span className="font-medium text-foreground">{page}</span> din{' '}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <button
          onClick={() => changePage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 border border-border rounded-[var(--radius)] bg-card disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
        <button
          onClick={() => changePage(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 border border-border rounded-[var(--radius)] bg-card disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Modal */}
      {modalRecord !== undefined && (
        <EditModal
          columns={columns}
          record={modalRecord}
          onClose={() => setModalRecord(undefined)}
          onSave={async record => {
            await onSave(record, modalRecord === null);
            setModalRecord(undefined);
          }}
        />
      )}
    </div>
  );
}
