/**
 * NotificationPanel — full-featured slide-over notification center
 *
 * Features:
 *  - Animated slide-in panel from the right
 *  - Unread badge counter on bell icon
 *  - Grouped: Unread | All
 *  - Mark individual + mark all read
 *  - Clear all button
 *  - Real-time via notificationStore (WebSocket + polling)
 *  - WS connection status indicator
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type AppNotification } from '../../store/notificationStore';

interface NotificationPanelProps {
  userId: number;
  open: boolean;
  onClose: () => void;
}

function timeAgo(timeStr: string): string {
  if (!timeStr || timeStr === 'Just now') return 'Just now';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return timeStr;
  }
}

const WS_STATUS_COLORS: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-400',
  disconnected: 'bg-zinc-500',
  error: 'bg-rose-500',
};

const matchesCategory = (n: AppNotification, cat: string) => {
  if (cat === 'all') return true;
  const title = n.title.toLowerCase();
  const desc = (n.desc || '').toLowerCase();
  if (cat === 'bug') return title.includes('bug') || desc.includes('bug');
  if (cat === 'approval') return title.includes('approve') || title.includes('approval') || desc.includes('approve');
  if (cat === 'task') return title.includes('task') || title.includes('cr-') || desc.includes('task');
  if (cat === 'quality') return title.includes('quality') || title.includes('risk') || desc.includes('quality');
  if (cat === 'sla') return title.includes('sla') || title.includes('overdue') || desc.includes('sla');
  return false;
};

const matchesSearch = (n: AppNotification, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return n.title.toLowerCase().includes(q) || (n.desc || '').toLowerCase().includes(q);
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ userId, open, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    wsStatus, 
    markRead, 
    markAllRead, 
    clearAll,
    togglePin,
    snoozeNotification
  } = useNotificationStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const filteredNotifications = notifications
    .filter((n) => matchesSearch(n, searchQuery))
    .filter((n) => matchesCategory(n, selectedCategory));

  const unread = filteredNotifications.filter((n) => n.unread);
  const read = filteredNotifications.filter((n) => !n.unread);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-card dark:bg-[#0d1120] border-l border-border dark:border-white/[0.08] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground dark:text-zinc-100">Notifications</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${WS_STATUS_COLORS[wsStatus] ?? 'bg-zinc-500'}`} />
                    <span className="text-xs text-muted-foreground dark:text-zinc-500 capitalize">{wsStatus}</span>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead(userId)}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-200 transition-colors text-lg"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 border-b border-border/55 dark:border-white/[0.04] bg-muted/20 dark:bg-white/[0.01]">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-background dark:bg-black/40 border border-border dark:border-white/[0.08] focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1.5 outline-none placeholder:text-muted-foreground dark:placeholder:text-zinc-600 text-foreground dark:text-zinc-100"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-border/55 dark:border-white/[0.04] scrollbar-none text-[10px] bg-muted/20 dark:bg-white/[0.01]">
              {['all', 'bug', 'approval', 'task', 'quality', 'sla'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedCategory(tab)}
                  className={`px-2.5 py-1 rounded-md font-bold uppercase transition-all whitespace-nowrap ${
                    selectedCategory === tab
                      ? 'bg-primary/15 text-primary border border-primary/30 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30'
                      : 'text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <span className="text-4xl">🔔</span>
                  <p className="text-muted-foreground dark:text-zinc-400 text-sm font-medium">All caught up!</p>
                  <p className="text-muted-foreground/60 dark:text-zinc-600 text-xs">No notifications matching filters</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {/* Unread section */}
                  {unread.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                        Unread ({unread.length})
                      </p>
                      {unread.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onMarkRead={() => markRead(n.id)}
                          onTogglePin={() => togglePin(n.id)}
                          onSnooze={(mins) => snoozeNotification(n.id, mins)}
                        />
                      ))}
                      {read.length > 0 && (
                        <div className="border-t border-border dark:border-white/[0.06] my-3" />
                      )}
                    </>
                  )}

                  {/* Read section */}
                  {read.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground/80 dark:text-zinc-600 uppercase tracking-wider mb-2 px-1">
                        Earlier
                      </p>
                      {read.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onMarkRead={() => markRead(n.id)}
                          onTogglePin={() => togglePin(n.id)}
                          onSnooze={(mins) => snoozeNotification(n.id, mins)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-border dark:border-white/[0.08]">
                <button
                  onClick={() => clearAll(userId)}
                  className="text-xs text-muted-foreground hover:text-destructive dark:text-zinc-600 dark:hover:text-rose-400 transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Notification Item ─────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: () => void;
  onTogglePin: () => void;
  onSnooze: (minutes: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkRead, 
  onTogglePin, 
  onSnooze 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      onClick={notification.unread ? onMarkRead : undefined}
      className={`flex gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group relative ${
        notification.unread
          ? 'bg-primary/5 dark:bg-sky-500/5 border border-primary/20 dark:border-sky-500/20 hover:bg-primary/10 dark:hover:bg-sky-500/10'
          : 'border border-border dark:border-white/[0.04] hover:bg-muted/40 dark:hover:bg-white/[0.03]'
      } ${notification.isPinned ? 'border-l-2 border-l-amber-500 bg-amber-500/[0.02]' : ''}`}
    >
      {/* Pinned Indicator or Unread Dot */}
      <div className="shrink-0 mt-1.5 flex flex-col items-center gap-1.5">
        {notification.isPinned ? (
          <span className="text-xs text-amber-500" title="Pinned notification">📌</span>
        ) : notification.unread ? (
          <div className="w-2 h-2 rounded-full bg-sky-500" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60 dark:bg-zinc-700" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${notification.unread ? 'text-foreground dark:text-zinc-100' : 'text-muted-foreground dark:text-zinc-400'} pr-12`}>
          {notification.title}
        </p>
        {notification.desc && (
          <p className="text-[11px] text-muted-foreground/80 dark:text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{notification.desc}</p>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground/65 dark:text-zinc-600">{timeAgo(notification.time)}</p>
          
          {/* Quick Snooze controls */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background dark:bg-black/40 px-1 py-0.5 rounded border border-border dark:border-white/[0.04]">
            <span className="text-[9px] text-muted-foreground dark:text-zinc-500 mr-1 font-semibold uppercase">Snooze:</span>
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(15); }}
              className="px-1 text-[9px] font-bold text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-sky-400"
              title="Snooze 15 minutes"
            >
              15m
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(60); }}
              className="px-1 text-[9px] font-bold text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-sky-400"
              title="Snooze 1 hour"
            >
              1h
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(1440); }}
              className="px-1 text-[9px] font-bold text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-sky-400"
              title="Snooze 1 day"
            >
              1d
            </button>
          </div>
        </div>
      </div>

      {/* Pin and Mark Read Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className={`p-1 rounded text-xs transition-colors ${notification.isPinned ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-400'}`}
          title={notification.isPinned ? "Unpin notification" : "Pin notification"}
        >
          📌
        </button>

        {notification.unread && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
            className="p-1 rounded text-xs text-muted-foreground hover:text-primary dark:text-zinc-600 dark:hover:text-sky-400 transition-colors font-bold"
            title="Mark read"
          >
            ✓
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationPanel;
