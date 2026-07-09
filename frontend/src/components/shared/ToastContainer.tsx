import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskStore } from "@/store/taskStore"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />,
  error:   <XCircle    className="h-4 w-4 text-rose-400    flex-shrink-0" />,
  info:    <Info       className="h-4 w-4 text-sky-400     flex-shrink-0" />,
}

const BORDER_COLORS = {
  success: "border-l-emerald-500",
  error:   "border-l-rose-500",
  info:    "border-l-sky-500",
}

const PROGRESS_COLORS = {
  success: "bg-emerald-500",
  error:   "bg-rose-500",
  info:    "bg-sky-500",
}

interface ToastItemProps {
  id: string
  message: string
  type: "success" | "error" | "info"
}

function ToastItem({ id, message, type }: ToastItemProps) {
  const { removeToast } = useTaskStore()
  const [width, setWidth] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const duration = 4000
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className={`relative overflow-hidden w-80 rounded-xl border border-white/[0.08] border-l-4 ${BORDER_COLORS[type]} bg-[#0a0f1e]/95 backdrop-blur-xl shadow-2xl`}
    >
      {/* Content row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {ICONS[type]}
        <p className="flex-1 text-sm text-slate-100 leading-snug">{message}</p>
        <button
          onClick={() => removeToast(id)}
          className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.05]">
        <div
          className={`h-full ${PROGRESS_COLORS[type]} transition-none`}
          style={{ width: `${width}%`, transition: "width 50ms linear" }}
        />
      </div>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useTaskStore()

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem id={t.id} message={t.message} type={t.type} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
