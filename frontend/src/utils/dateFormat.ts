/**
 * Shared date formatting utility.
 * Always renders dates as DD/MM/YYYY (e.g. 25/07/2026).
 */
export function fmtDate(dateStr?: string | null | Date): string {
  if (!dateStr) return '—';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return typeof dateStr === 'string' ? dateStr : '—';
  }
}

/**
 * Formats a date-time string to DD/MM/YYYY HH:mm (24h).
 */
export function fmtDateTime(dateStr?: string | null | Date): string {
  if (!dateStr) return '—';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return typeof dateStr === 'string' ? dateStr : '—';
  }
}
