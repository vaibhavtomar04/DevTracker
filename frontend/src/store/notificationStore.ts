/**
 * notificationStore — Zustand store for real-time notifications
 *
 * Architecture:
 *  - Primary: WebSocket at /ws/notifications?userId={userId}
 *  - Fallback: HTTP polling every 15 seconds when WS is disconnected
 *  - On reconnect: re-sync via REST to catch any missed messages
 *  - Frontend never loses notifications even if WS drops
 *
 * Phase 1.1 (perf): a module-level singleton connection manager guarantees
 * exactly one socket, one message handler, one reconnect chain and one poll
 * timer per logged-in user. Gated behind FEATURES.ENABLE_WS_LIFECYCLE_V2; when
 * disabled the legacy connection manager (preserved below) is restored.
 */

import { create } from 'zustand';
import { useTaskStore } from './taskStore';
import { APP_CONFIG, FEATURES } from '@/config/appConfig';

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
  isNotificationsBlocked: boolean;
  
  // Actions
  fetchNotifications: (userId: number) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: (userId: number) => Promise<void>;
  clearAll: (userId: number) => Promise<void>;
  togglePin: (id: number) => Promise<void>;
  snoozeNotification: (id: number, durationMinutes: number) => Promise<void>;
  toggleBlockNotifications: () => void;
  addNotification: (n: AppNotification) => void;
  dismissPopup: (id: string) => void;
  
  // WebSocket lifecycle
  connect: (userId: number) => void;
  disconnect: () => void;
  
  // Internal (legacy manager only; the v2 singleton manager is module-scoped)
  _ws: WebSocket | null;
  _pollInterval: ReturnType<typeof setInterval> | null;
}

const API_BASE = `${APP_CONFIG.apiUrl}/api`;

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
  isNotificationsBlocked: false,
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

  toggleBlockNotifications: () => {
    set((state) => ({
      isNotificationsBlocked: !state.isNotificationsBlocked,
      popupQueue: !state.isNotificationsBlocked ? [] : state.popupQueue,
    }));
  },

  // 📣 Add notification (from WS push) ─────────────────────────────────────────────────────────────────────────────────────────────────
  addNotification: (notification: AppNotification) => {
    set((state) => {
      // Deduplication check: by ID only (title+desc would block real-time popups for same-text notifications)
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      
      const notifications = [notification, ...state.notifications];

      // If notifications are blocked by user toggle, update list silently without popups
      if (state.isNotificationsBlocked) {
        return {
          notifications,
          unreadCount: notifications.filter((n) => n.unread).length,
          popupQueue: [],
        };
      }
      
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
    if (FEATURES.ENABLE_WS_LIFECYCLE_V2) {
      // v2: delegate to the module-level singleton connection manager.
      startManagedConnection(userId);
      return;
    }

    // ===== LEGACY connection manager (rollback: ENABLE_WS_LIFECYCLE_V2=false) =====
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
    const wsUrl = `${wsProtocol}//${window.location.host}${APP_CONFIG.contextPath}/ws/notifications?userId=${userId}`;
    
    set({ wsStatus: 'connecting' });

    let ws: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    // Debounce timer: collapses rapid WS notifications into a single data refresh
    let fetchDataDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
              // Debounced fetchData: batch rapid WS messages into one data refresh
              // (prevents connection pool exhaustion from 9 parallel requests per message)
              if (fetchDataDebounceTimer) clearTimeout(fetchDataDebounceTimer);
              fetchDataDebounceTimer = setTimeout(() => {
                useTaskStore.getState().fetchData(true);
                fetchDataDebounceTimer = null;
              }, 500);
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
    if (FEATURES.ENABLE_WS_LIFECYCLE_V2) {
      stopManagedConnection();
      return;
    }

    // ===== LEGACY disconnect =====
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

// ─────────────────────────────────────────────────────────────────────────
// Phase 1.1 — Singleton WebSocket connection manager (module-scoped)
//
// Guarantees per logged-in user, regardless of how many times connect() is
// called (StrictMode double-invoke, route remounts, re-login):
//   • exactly one active socket        • exactly one poll interval
//   • exactly one message handler      • exactly one reconnect chain
//   • bounded retry that does NOT reset reconnectAttempts on every onopen
//   • no reconnect after an intentional disconnect
//
// A monotonically increasing `connectionGeneration` token invalidates every
// callback (onopen/onmessage/onclose/reconnect) belonging to a superseded
// connect() call, so an old orphan chain can never keep firing fetchData(true)
// in the background — the P2 compounding root cause.
// ─────────────────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const STABILITY_RESET_MS = 10000;
const FETCH_DEBOUNCE_MS = 500;
const POLL_INTERVAL_MS = 15000;

let activeSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stabilityTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
let intentionalDisconnect = false;
let connectionGeneration = 0;
let activeUserId: number | null = null;

function clearManagerTimers(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (stabilityTimer) { clearTimeout(stabilityTimer); stabilityTimer = null; }
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function teardownSocket(): void {
  if (activeSocket) {
    const old = activeSocket;
    activeSocket = null;
    try {
      old.onopen = null;
      old.onmessage = null;
      old.onclose = null;
      old.onerror = null;
      old.close();
    } catch { /* ignore */ }
  }
}

function scheduleReconnect(userId: number, myGen: number): void {
  if (myGen !== connectionGeneration) return;      // superseded chain
  if (intentionalDisconnect) return;               // do not reconnect after disconnect()
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return; // bounded retry
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_MS);
  reconnectAttempts++;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (myGen !== connectionGeneration || intentionalDisconnect) return;
    openManagedSocket(userId, myGen);
  }, delay);
}

function openManagedSocket(userId: number, myGen: number): void {
  if (myGen !== connectionGeneration) return;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}${APP_CONFIG.contextPath}/ws/notifications?userId=${userId}`;
  useNotificationStore.setState({ wsStatus: 'connecting' });

  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl);
  } catch {
    useNotificationStore.setState({ wsStatus: 'error' });
    scheduleReconnect(userId, myGen);
    return;
  }
  activeSocket = ws;

  ws.onopen = () => {
    if (myGen !== connectionGeneration) { try { ws.close(); } catch { /* ignore */ } return; }
    useNotificationStore.setState({ wsStatus: 'connected' });
    // Intentionally do NOT reset reconnectAttempts on every onopen — that turns
    // a flapping server into an unbounded reconnect storm. Reset only after the
    // socket has proven stable for STABILITY_RESET_MS.
    if (stabilityTimer) clearTimeout(stabilityTimer);
    stabilityTimer = setTimeout(() => {
      stabilityTimer = null;
      if (myGen === connectionGeneration) reconnectAttempts = 0;
    }, STABILITY_RESET_MS);
    // Re-sync on (re)connect to catch any missed messages
    useNotificationStore.getState().fetchNotifications(userId);
  };

  ws.onmessage = (event: MessageEvent) => {
    if (myGen !== connectionGeneration) return;
    try {
      const data = JSON.parse(event.data) as { type: string; notification: AppNotification };
      if (data.type === 'NOTIFICATION' && data.notification) {
        useNotificationStore.getState().addNotification(data.notification);
        // Strangler-fig fallback until typed events land (Phase 2). A single
        // shared debounce timer collapses a burst into one refresh.
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          useTaskStore.getState().fetchData(true);
        }, FETCH_DEBOUNCE_MS);
      }
    } catch { /* malformed message */ }
  };

  ws.onclose = () => {
    if (myGen !== connectionGeneration) return;    // superseded socket — ignore
    if (stabilityTimer) { clearTimeout(stabilityTimer); stabilityTimer = null; }
    if (activeSocket === ws) activeSocket = null;
    useNotificationStore.setState({ wsStatus: 'disconnected' });
    if (intentionalDisconnect) return;             // intentional close: no reconnect
    scheduleReconnect(userId, myGen);
  };

  ws.onerror = () => {
    if (myGen !== connectionGeneration) return;
    useNotificationStore.setState({ wsStatus: 'error' });
    try { ws.close(); } catch { /* ignore */ }
    // onclose drives the reconnect decision
  };
}

function startManagedConnection(userId: number): void {
  // Idempotent: reuse an existing live/connecting socket for the same user
  // instead of opening another → exactly one socket across remounts/StrictMode.
  if (
    activeUserId === userId &&
    activeSocket &&
    (activeSocket.readyState === WebSocket.OPEN ||
      activeSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  // Supersede any prior generation and fully tear it down (socket + all timers).
  connectionGeneration++;
  const myGen = connectionGeneration;
  intentionalDisconnect = false;
  reconnectAttempts = 0;
  activeUserId = userId;
  clearManagerTimers();
  teardownSocket();

  // Initial REST sync + single fallback poll timer.
  useNotificationStore.getState().fetchNotifications(userId);
  pollTimer = setInterval(() => {
    if (useNotificationStore.getState().wsStatus !== 'connected') {
      useNotificationStore.getState().fetchNotifications(userId);
    }
  }, POLL_INTERVAL_MS);

  openManagedSocket(userId, myGen);
}

function stopManagedConnection(): void {
  intentionalDisconnect = true;
  connectionGeneration++; // invalidate every in-flight callback / reconnect chain
  activeUserId = null;
  reconnectAttempts = 0;
  clearManagerTimers();
  teardownSocket();
  useNotificationStore.setState({ wsStatus: 'disconnected' });
}
