/**
 * NotificationPopupToast — Real-time popup notification toasts
 * 
 * Shows incoming notifications as premium floating popup cards in the top-right corner.
 * Auto-dismisses after 6 seconds. Stacks up to 3 at a time.
 */

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export interface PopupNotif {
  id: string
  title: string
  desc?: string
  type?: 'info' | 'success' | 'warning' | 'default'
  time?: string
}

interface NotificationPopupToastProps {
  notifications: PopupNotif[]
  onDismiss: (id: string) => void
}

function getIcon(type: PopupNotif['type']) {
  switch (type) {
    case 'success': return <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
    case 'info': return <Info className="h-4 w-4 text-primary shrink-0" />
    default: return <Bell className="h-4 w-4 text-secondary shrink-0" />
  }
}

function getAccentClass(type: PopupNotif['type']) {
  switch (type) {
    case 'success': return 'from-emerald-500/20 border-emerald-500/30'
    case 'warning': return 'from-amber-500/20 border-amber-500/30'
    case 'info': return 'from-primary/20 border-primary/30'
    default: return 'from-secondary/20 border-secondary/30'
  }
}

function getDotClass(type: PopupNotif['type']) {
  switch (type) {
    case 'success': return 'bg-emerald-400'
    case 'warning': return 'bg-amber-400'
    case 'info': return 'bg-primary'
    default: return 'bg-secondary'
  }
}

const PopupItem: React.FC<{ notif: PopupNotif; onDismiss: () => void }> = ({ notif, onDismiss }) => {
  const dismissRef = React.useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    console.log("PopupItem mounted, setting 6s timeout for:", notif.id);
    const timer = setTimeout(() => {
      console.log("PopupItem 6s timeout fired for:", notif.id);
      dismissRef.current()
    }, 6000)
    return () => {
      console.log("PopupItem unmounting, clearing timeout for:", notif.id);
      clearTimeout(timer)
    }
  }, [])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`relative w-[360px] max-w-[calc(100vw-2rem)] bg-gradient-to-r ${getAccentClass(notif.type)} to-[#0d1120]/95 border backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden cursor-default`}
    >
      {/* Progress bar — shrinks over 6 seconds */}
      <motion.div
        className={`absolute top-0 left-0 h-0.5 ${getDotClass(notif.type)}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 6, ease: 'linear' }}
      />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="mt-0.5">
          {getIcon(notif.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-100 leading-snug">{notif.title}</p>
          {notif.desc && (
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{notif.desc}</p>
          )}
          <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">Just now</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-all"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export const NotificationPopupToast: React.FC<NotificationPopupToastProps> = ({ notifications, onDismiss }) => {
  // Show at most 4 at a time (most recent first)
  const visible = notifications.slice(0, 4)

  return (
    <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((notif) => (
          <div key={notif.id} className="pointer-events-auto">
            <PopupItem notif={notif} onDismiss={() => onDismiss(notif.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default NotificationPopupToast
