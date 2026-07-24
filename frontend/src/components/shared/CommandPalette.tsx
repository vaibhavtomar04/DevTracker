/**
 * CommandPalette — Cmd+K (or Ctrl+K) global search
 *
 * Features:
 *  - Backend API search via /api/tasks?search=query (debounced 300ms)
 *  - Keyboard navigation: ↑↓ to select, Enter to open, Escape to close
 *  - Recent searches stored in sessionStorage
 *  - Result grouping: CRs | Bugs
 *  - Match highlight
 *  - Animated overlay
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import APP_CONFIG from '@/config/appConfig';
import { getCRStatusBadgeClass } from '@/utils/statusColors';

interface SearchResult {
  id: number;
  type: 'CR' | 'BUG';
  jtrackId: string;
  title: string;
  status: string;
  priority?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectCR?: (id: number, type?: 'CR' | 'BUG') => void;
}

const RECENT_KEY = 'devtrack_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((r) => r !== query);
    recent.unshift(query);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-primary dark:bg-sky-500/30 dark:text-sky-200 rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

async function searchBackend(query: string): Promise<SearchResult[]> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [tasksRes, bugsRes] = await Promise.allSettled([
    fetch(`${APP_CONFIG.apiUrl}/api/tasks?page=0&size=10&search=${encodeURIComponent(query)}`, { headers }),
    fetch(`${APP_CONFIG.apiUrl}/api/bugs?page=0&size=5&search=${encodeURIComponent(query)}`, { headers }),
  ]);

  const results: SearchResult[] = [];

  if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
    try {
      const data = await tasksRes.value.json();
      const content = (data.content ?? data) as Array<{
        id: number;
        jtrackId?: string;
        title?: string;
        status?: string;
        priority?: string;
      }>;
      content.forEach((t) => {
        results.push({
          id: t.id,
          type: 'CR',
          jtrackId: t.jtrackId ?? `#${t.id}`,
          title: t.title ?? 'Untitled',
          status: t.status ?? 'OPEN',
          priority: t.priority,
        });
      });
    } catch { /* ignore */ }
  }

  if (bugsRes.status === 'fulfilled' && bugsRes.value.ok) {
    try {
      const data = await bugsRes.value.json();
      const content = (data.content ?? data) as Array<{
        id: number;
        bugId?: string;
        jtrackId?: string;
        title?: string;
        status?: string;
        priority?: string;
      }>;
      content.forEach((b) => {
        results.push({
          id: b.id,
          type: 'BUG',
          jtrackId: b.bugId ?? b.jtrackId ?? `BUG-${b.id}`,
          title: b.title ?? 'Untitled Bug',
          status: b.status ?? 'OPEN',
          priority: b.priority,
        });
      });
    } catch { /* ignore */ }
  }

  return results;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSelectCR }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchBackend(value);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = results.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, total - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) handleSelect(selected);
      }
    },
    [results, selectedIndex]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(query || result.jtrackId);
      onSelectCR?.(result.id, result.type);
      onClose();
    },
    [query, onSelectCR, onClose]
  );

  const crResults = results.filter((r) => r.type === 'CR');
  const bugResults = results.filter((r) => r.type === 'BUG');
  const showRecent = !query.trim() && recentSearches.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-900/60">
              <span className="text-primary dark:text-sky-400 text-lg font-bold shrink-0">🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search CRs, bugs, developers..."
                className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm font-semibold outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary dark:border-sky-400 border-t-transparent rounded-full shrink-0"
                />
              )}
              <kbd className="text-xs text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono font-bold shrink-0">
                ESC
              </kbd>
            </div>

            {/* Results / Recent */}
            <div className="max-h-[400px] overflow-y-auto">
              {showRecent && (
                <div className="p-3">
                  <p className="text-xs text-primary dark:text-sky-400 uppercase tracking-wider font-extrabold px-2 mb-2">
                    Recent Searches
                  </p>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleQueryChange(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors"
                    >
                      <span className="text-primary dark:text-sky-400 text-sm font-bold">🕐</span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="p-3 space-y-4">
                  {crResults.length > 0 && (
                    <ResultGroup
                      title="Change Requests"
                      results={crResults}
                      query={query}
                      allResults={results}
                      selectedIndex={selectedIndex}
                      onSelect={handleSelect}
                    />
                  )}
                  {bugResults.length > 0 && (
                    <ResultGroup
                      title="Bugs"
                      results={bugResults}
                      query={query}
                      allResults={results}
                      selectedIndex={selectedIndex}
                      onSelect={handleSelect}
                    />
                  )}
                </div>
              )}

              {query.trim() && !loading && results.length === 0 && (
                <div className="py-12 text-center">
                  <span className="text-3xl">🔍</span>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold mt-2">No results for "{query}"</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">Try a different keyword or CR ID</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-900/90 flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span><kbd className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono font-black shadow-sm mr-1.5">↑↓</kbd> navigate</span>
              <span><kbd className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono font-black shadow-sm mr-1.5">↵</kbd> open</span>
              <span><kbd className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono font-black shadow-sm mr-1.5">ESC</kbd> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface ResultGroupProps {
  title: string;
  results: SearchResult[];
  query: string;
  allResults: SearchResult[];
  selectedIndex: number;
  onSelect: (r: SearchResult) => void;
}

const ResultGroup: React.FC<ResultGroupProps> = ({
  title, results, query, allResults, selectedIndex, onSelect,
}) => (
  <div>
    <p className="text-xs text-primary dark:text-sky-400 uppercase tracking-wider font-extrabold px-2 mb-1.5">{title}</p>
    {results.map((result) => {
      const globalIndex = allResults.indexOf(result);
      const isSelected = globalIndex === selectedIndex;
      return (
        <button
          key={`${result.type}-${result.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(result);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
            isSelected ? 'bg-primary/10 border border-primary/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <span className="font-mono text-xs font-bold text-primary dark:text-sky-400 shrink-0 w-20 truncate">
            {result.jtrackId}
          </span>
          <span className="flex-1 text-sm text-slate-900 dark:text-slate-100 font-semibold truncate">
            {highlightMatch(result.title, query)}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border uppercase shrink-0 ${getCRStatusBadgeClass(result.status)}`}>
            {result.status.replace(/_/g, ' ')}
          </span>
          {result.priority && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">{result.priority}</span>
          )}
        </button>
      );
    })}
  </div>
);

export default CommandPalette;
