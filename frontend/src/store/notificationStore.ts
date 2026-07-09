/**
 * notificationStore — Zustand store for real-time notifications
 *
 * Architecture:
 *  - Primary: WebSocket at /ws/notifications?userId={userId}
 *  - Fallback: HTTP polling every 10 seconds when WS is disconnected
 *  - On reconnect: re-sync via REST to catch any missed messages
 *  - Frontend never loses notifications even if WS drops
 */

import { create } from 'zustand';
import { useTaskStore } from './taskStore';

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  isPinned: boolean;
  snoozedUntil?: string;
}

export interface PopupQueueItem {
  id: string;
  title: string;
  desc: string;
  type: 'info' | 'success' | 'warning' | 'default';
}

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  wsStatus: WsStatus;
  popupQueue: PopupQueueItem[];
  
  // Actions
  fetchNotifications: (userId: number) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: (userId: number) => Promise<void>;
  clearAll: (userId: number) => Promise<void>;
  togglePin: (id: number) => Promise<void>;
  snoozeNotification: (id: number, durationMinutes: number) => Promise<void>;
  addNotification: (n: AppNotification) => void;
  dismissPopup: (id: string) => void;
  
  // WebSocket lifecycle
  connect: (userId: number) => void;
  disconnect: () => void;
  
  // Internal
  _ws: WebSocket | null;
  _pollInterval: ReturnType<typeof setInterval> | null;
}

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  wsStatus: 'disconnected',
  popupQueue: [],
  _ws: null,
  _pollInterval: null,

  // ── Fetch from REST ───────────────────────────────────────────────
  fetchNotifications: async (userId: number) => {
    try {
      const data = await apiFetch<AppNotification[]>(
        `${API_BASE}/notifications/for-user/${userId}`
      );
      const sorted = [...data].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        return b.id - a.id;
      });
      set({
        notifications: sorted,
        unreadCount: sorted.filter((n) => n.unread).length,
      });
    } catch {
      // Silently fail — WS will compensate
    }
  },

  // ── Mark single read ─────────────────────────────────────────────
  markRead: async (id: number) => {
    try {
      await fetch(`${API_BASE}/notifications/read/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === id ? { ...n, unread: false } : n
        );
        return {
          notifications,
          unreadCount: notifications.filter((n) => n.unread).length,
        };
      });
    } catch { /* silent */ }
  },

  // ── Mark all read ────────────────────────────────────────────────
  markAllRead: async (userId: number) => {
    try {
      await fetch(`${API_BASE}/notifications/read-all/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
        unreadCount: 0,
      }));
    } catch { /* silent */ }
  },

  // ── Clear all ────────────────────────────────────────────────────
  clearAll: async (userId: number) => {
    try {
      await fetch(`${API_BASE}/notifications/clear/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      set({ notifications: [], unreadCount: 0 });
    } catch { /* silent */ }
  },

  togglePin: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/pin/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const updated = await res.json() as AppNotification;
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? updated : n
          );
          const sorted = [...notifications].sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
              return a.isPinned ? -1 : 1;
            }
            return b.id - a.id;
          });
          return { notifications: sorted };
        });
      }
    } catch { /* silent */ }
  },

  snoozeNotification: async (id: number, durationMinutes: number) => {
    try {
      const snoozeUntil = new Date(Date.now() + durationMinutes * 60000).toISOString().split('.')[0];
      const res = await fetch(`${API_BASE}/notifications/snooze/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozedUntil: snoozeUntil }),
      });
      if (res.ok) {
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter((n) => n.unread).length,
          };
        });
      }
    } catch { /* silent */ }
  },

  // 📣 Add notification (from WS push) ─────────────────────────────────────────────────────────────────────────────────────────────────
  addNotification: (notification: AppNotification) => {
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      const notifications = [notification, ...state.notifications];
      
      // Determine popup type from title content
      let popupType: PopupQueueItem['type'] = 'default';
      const titleLower = notification.title.toLowerCase();
      if (titleLower.includes('approved') || titleLower.includes('completed') || titleLower.includes('success')) {
        popupType = 'success';
      } else if (titleLower.includes('sent back') || titleLower.includes('rejected') || titleLower.includes('failed')) {
        popupType = 'warning';
      } else if (titleLower.includes('new') || titleLower.includes('assigned') || titleLower.includes('created')) {
        popupType = 'info';
      }
      
      // Add to popup queue
      const popupItem: PopupQueueItem = {
        id: `popup-${notification.id}-${Date.now()}`,
        title: notification.title,
        desc: notification.desc,
        type: popupType,
      };
      
      return {
        notifications,
        unreadCount: notifications.filter((n) => n.unread).length,
        popupQueue: [popupItem, ...state.popupQueue].slice(0, 6), // max 6 in queue
      };
    });
  },

  dismissPopup: (id: string) => {
    console.log("dismissPopup called for ID:", id);
    set((state) => {
      console.log("Current popupQueue before filter:", state.popupQueue.map(p => p.id));
      const nextQueue = state.popupQueue.filter((p) => p.id !== id);
      console.log("Next popupQueue after filter:", nextQueue.map(p => p.id));
      return { popupQueue: nextQueue };
    });
  },

  // ── WebSocket connect ────────────────────────────────────────────
  connect: (userId: number) => {
    const state = get();
    
    // Close existing connection
    if (state._ws) {
      try { state._ws.close(); } catch { /* ignore */ }
    }

    // Stop existing poll
    if (state._pollInterval) {
      clearInterval(state._pollInterval);
    }

    // Initial REST fetch
    get().fetchNotifications(userId);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications?userId=${userId}`;
    
    set({ wsStatus: 'connecting' });

    let ws: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const doConnect = () => {
      try {
        ws = new WebSocket(wsUrl);
        set({ _ws: ws });

        ws.onopen = () => {
          set({ wsStatus: 'connected' });
          reconnectAttempts = 0;
          // Re-sync on (re)connect to catch any missed messages
          get().fetchNotifications(userId);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { type: string; notification: AppNotification };
            if (data.type === 'NOTIFICATION' && data.notification) {
              get().addNotification(data.notification);
              // Trigger real-time task data and audit sync
              useTaskStore.getState().fetchData();
            }
          } catch { /* malformed message */ }
        };

        ws.onclose = () => {
          set({ wsStatus: 'disconnected' });
          // Exponential backoff reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            setTimeout(doConnect, delay);
          }
        };

        ws.onerror = () => {
          set({ wsStatus: 'error' });
          ws.close();
        };
      } catch {
        set({ wsStatus: 'error' });
      }
    };

    doConnect();

    // Fallback polling every 15 seconds (catches missed WS messages)
    const pollInterval = setInterval(() => {
      const currentWsStatus = get().wsStatus;
      if (currentWsStatus !== 'connected') {
        get().fetchNotifications(userId);
      }
    }, 15000);

    set({ _pollInterval: pollInterval });
  },

  // ── WebSocket disconnect ─────────────────────────────────────────
  disconnect: () => {
    const state = get();
    if (state._ws) {
      try { state._ws.close(); } catch { /* ignore */ }
    }
    if (state._pollInterval) {
      clearInterval(state._pollInterval);
    }
    set({ _ws: null, _pollInterval: null, wsStatus: 'disconnected' });
  },
}));
