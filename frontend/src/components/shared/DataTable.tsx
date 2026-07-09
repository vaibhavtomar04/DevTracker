/**
 * DataTable — reusable enterprise data table component with sorting, filtering, pagination, and export capabilities.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  actions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  searchPlaceholder = 'Filter records...',
  searchFields,
  actions,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records matching your criteria.',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => String(item[field] ?? '').toLowerCase().includes(term));
      }
      return Object.values(item).some((val) => String(val ?? '').toLowerCase().includes(term));
    });
  }, [data, searchTerm, searchFields]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const res = valA < valB ? -1 : 1;
      return sortOrder === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else setSortKey(null);
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">🔍</span>
        </div>
        {actions && <div className="flex items-center gap-2 w-full sm:w-auto justify-end">{actions}</div>}
      </div>

      {/* Table container */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-4 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer hover:text-zinc-200 select-none' : ''
                    } ${col.className ?? ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && sortKey === col.key && (
                        <span className="text-sky-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center">
                    <span className="text-3xl">📂</span>
                    <p className="text-sm font-medium text-zinc-300 mt-2">{emptyTitle}</p>
                    <p className="text-xs text-zinc-500 mt-1">{emptyDescription}</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <motion.tr
                    key={keyExtractor(row)}
                    onClick={() => onRowClick?.(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3.5 text-sm text-zinc-300 ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {sortedData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.01] text-xs text-zinc-400">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, sortedData.length)} to{' '}
              {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 font-medium text-zinc-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
