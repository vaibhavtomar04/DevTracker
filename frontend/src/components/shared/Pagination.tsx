import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number      // 0-indexed
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : currentPage * pageSize + 1
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | "...")[] = []
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i)
    } else {
      pages.push(0)
      if (currentPage > 2) pages.push("...")
      for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 3) pages.push("...")
      pages.push(totalPages - 1)
    }
    return pages
  }

  if (totalItems === 0) return null

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 ${className}`}>
      {/* Result count info */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>
          Showing <span className="font-semibold text-slate-200">{startItem}–{endItem}</span> of{" "}
          <span className="font-semibold text-slate-200">{totalItems}</span> results
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value))
                onPageChange(0)
              }}
              className="h-7 px-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s} className="bg-[#0b0e1a]">{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5">
          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-500 select-none">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentPage === page
                    ? "bg-violet-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                }`}
              >
                {(page as number) + 1}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Utility hook to manage pagination state
 */
export function usePagination(totalItems: number, defaultPageSize = 20) {
  return { defaultPageSize, totalItems }
}

/**
 * Slice an array to the current page
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, (page + 1) * pageSize)
}
