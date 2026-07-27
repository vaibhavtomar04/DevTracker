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
 *
 * Phase 3 (perf): a typed-event router consumes ENTITY_EVENT frames emitted by
 * the backend DomainEventPublisher (Phase 2) and refreshes the task store off
 * the real mutation signal, sharing a single debounce with the notification
 * path. This lets Phase 4 remove the idle dashboard poll without losing
 * freshness. No feature flag — the router only adds handling for a new frame
 * type; existing NOTIFICATION handling is unchanged.
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

  // ── Fetch from REST ────────────────────────────────────────
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

  // ── Mark single read ─────────────────────────────────────
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

  // ── Mark all read ───────────────────────────────────────
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

  // ── Clear all ─────────────────────────────────────────
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

  // 📣 Add notification (from WS push) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
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

  // ── WebSocket connect ───────────────────────────────────
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
            const data = JSON.parse(event.data) as { type: string; notification?: AppNotification };
            if (data.type === 'NOTIFICATION' && data.notification) {
              get().addNotification(data.notification);
              // Phase A: no data refresh on notifications (see v2 handler).
            } else if (data.type === 'ENTITY_EVENT') {
              routeEntityEvent(data as unknown as EntityEventPayload);
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

  // ── WebSocket disconnect ────────────────────────────────
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

// ────────────────────────────────────────────────────────────
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
//
// Phase 1.1 (r2): every route in App.tsx renders its own ProtectedRoute →
// DashboardLayout → Navbar, and Navbar owns the WS lifecycle effect. So every
// navigation UNMOUNTS + REMOUNTS Navbar, firing disconnect() then connect()
// (StrictMode double-invokes this too). The plain idempotency guard cannot
// dedupe across a disconnect (it resets activeUserId and tears the socket
// down), so each navigation opened a NEW socket → the socket leak. Two
// mechanisms fix this without touching routing/Navbar/UI/backend:
//   1) grace-period teardown: disconnect() defers the teardown; a connect()
//      for the same user within TEARDOWN_GRACE_MS cancels it and reuses the
//      SAME live socket, so remounts + StrictMode collapse to one socket.
//   2) CONNECTING-safe teardown: closing a not-yet-open socket is deferred to
//      its onopen, so we never leave a half-open orphan the server keeps alive.
// ────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const STABILITY_RESET_MS = 10000;
const ENTITY_SYNC_DEBOUNCE_MS = 250;
const POLL_INTERVAL_MS = 15000;
const TEARDOWN_GRACE_MS = 2000;

let activeSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stabilityTimer: ReturnType<typeof setTimeout> | null = null;
let entitySyncTimer: ReturnType<typeof setTimeout> | null = null;
const pendingTaskIds = new Set<number>();
const pendingBugIds = new Set<number>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pendingTeardownTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let intentionalDisconnect = false;
let connectionGeneration = 0;
let activeUserId: number | null = null;

function clearManagerTimers(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (stabilityTimer) { clearTimeout(stabilityTimer); stabilityTimer = null; }
  if (entitySyncTimer) { clearTimeout(entitySyncTimer); entitySyncTimer = null; }
  pendingTaskIds.clear();
  pendingBugIds.clear();
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ────────────────────────────────────────────────────────────
// Phase 3 — Typed-event router (consumes ENTITY_EVENT frames from Phase 2)
//
// The backend DomainEventPublisher emits one ENTITY_EVENT frame per domain
// mutation (TASK/BUG CREATED/UPDATED/DELETED) to every user in that entity's
// audience, over the SAME socket as notifications (P2 "1 WS" budget). Reacting
// to these real mutation signals — rather than a notification row or a timer —
// is what lets Phase 4 drop the idle dashboard poll without losing freshness.
// ────────────────────────────────────────────────────────────
interface EntityEventPayload {
  type: 'ENTITY_EVENT';
  entity: string; // 'TASK' | 'BUG'
  action: string; // 'CREATED' | 'UPDATED' | 'DELETED'
  id: number;
  actorId: number | null;
  ts: number;
}

// ── Phase A: surgical, event-driven refresh (no full fetchData batch) ──────
// A TASK/BUG domain event fetches ONLY the affected row and upserts it into
// the task store. Same-id and mixed TASK/BUG events inside one short window
// coalesce into a single flush. DELETED is applied locally with no GET.
function flushEntitySync(): void {
  entitySyncTimer = null;
  const store = useTaskStore.getState();
  const taskIds = Array.from(pendingTaskIds); pendingTaskIds.clear();
  const bugIds = Array.from(pendingBugIds); pendingBugIds.clear();
  taskIds.forEach((id) => { void store.syncTaskById(id); });
  bugIds.forEach((id) => { void store.syncBugById(id); });
}

function scheduleEntitySync(): void {
  if (entitySyncTimer) return; // already scheduled — accumulate ids, flush once
  entitySyncTimer = setTimeout(flushEntitySync, ENTITY_SYNC_DEBOUNCE_MS);
}

function routeEntityEvent(payload: EntityEventPayload): void {
  if (typeof payload.id !== 'number') return;
  const store = useTaskStore.getState();
  switch (payload.entity) {
    case 'TASK':
      if (payload.action === 'DELETED') { store.removeTaskById(payload.id); return; }
      pendingTaskIds.add(payload.id);
      scheduleEntitySync();
      return;
    case 'BUG':
      if (payload.action === 'DELETED') { store.removeBugById(payload.id); return; }
      pendingBugIds.add(payload.id);
      scheduleEntitySync();
      return;
    default:
      // BUG_REVIEW / USER / CONFIG / SPRINT / SPRINT_TASK / TEST_CASE /
      // RECOGNITION are not emitted by the backend yet — surgical handlers
      // land in Phase F with the payload contract. NO collection refetch here.
      return;
  }
}

function teardownSocket(): void {
  if (!activeSocket) return;
  const old = activeSocket;
  activeSocket = null;
  old.onmessage = null;
  old.onerror = null;
  old.onclose = null;
  try {
    if (old.readyState === WebSocket.CONNECTING) {
      // Closing a socket that has not finished its handshake does not reliably
      // abort the server-side upgrade, which would leave an orphaned session
      // (the backend frees sessions only in afterConnectionClosed). Defer the
      // close until the socket actually opens.
      old.onopen = () => { try { old.close(); } catch { /* ignore */ } };
    } else {
      old.onopen = null;
      old.close();
    }
  } catch { /* ignore */ }
}

function startPollTimer(userId: number): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (useNotificationStore.getState().wsStatus !== 'connected') {
      useNotificationStore.getState().fetchNotifications(userId);
    }
  }, POLL_INTERVAL_MS);
}

function scheduleReconnect(userId: number, myGen: number): void {
  if (myGen !== connectionGeneration) return;      // superseded chain
  if (intentionalDisconnect) return;               // do not reconnect after disconnect()
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return; // bounded retry
  const capped = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_MS);
  const delay = Math.round(capped / 2 + Math.random() * (capped / 2));
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
      const data = JSON.parse(event.data) as { type: string; notification?: AppNotification };
      if (data.type === 'NOTIFICATION' && data.notification) {
        useNotificationStore.getState().addNotification(data.notification);
        // Phase A: notifications no longer trigger a data refresh. Freshness
        // comes exclusively from ENTITY_EVENT frames (routed below).
      } else if (data.type === 'ENTITY_EVENT') {
        routeEntityEvent(data as unknown as EntityEventPayload);
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
  // A route remount (React StrictMode double-invoke on mount, or navigating
  // between pages — every route wraps its own DashboardLayout/Navbar, which
  // owns the WS lifecycle effect) fires disconnect() then connect() almost
  // synchronously. Cancel any pending deferred teardown so the SAME socket is
  // reused across that gap instead of churning a new socket per navigation
  // (the P2 socket-leak root cause).
  if (pendingTeardownTimer) {
    clearTimeout(pendingTeardownTimer);
    pendingTeardownTimer = null;
  }
  intentionalDisconnect = false;

  // Idempotent: reuse an existing live/connecting socket for the same user
  // instead of opening another → exactly one socket across remounts/StrictMode.
  if (
    activeUserId === userId &&
    activeSocket &&
    (activeSocket.readyState === WebSocket.OPEN ||
      activeSocket.readyState === WebSocket.CONNECTING)
  ) {
    startPollTimer(userId); // ensure the fallback poll survived the cancelled teardown
    return;
  }

  // Supersede any prior generation and fully tear it down (socket + all timers).
  connectionGeneration++;
  const myGen = connectionGeneration;
  reconnectAttempts = 0;
  activeUserId = userId;
  clearManagerTimers();
  teardownSocket();

  // Initial REST sync + single fallback poll timer.
  useNotificationStore.getState().fetchNotifications(userId);
  startPollTimer(userId);

  openManagedSocket(userId, myGen);
}

function stopManagedConnection(): void {
  // Defer teardown by a short grace period. Navigation unmounts Navbar (which
  // calls disconnect()) and immediately remounts it on the next route (which
  // calls connect()); deferring lets that connect() reuse the live socket
  // instead of closing + reopening every navigation. A genuine logout has no
  // following remount, so the deferred teardown below runs and closes cleanly.
  intentionalDisconnect = true;
  if (pendingTeardownTimer) clearTimeout(pendingTeardownTimer);
  pendingTeardownTimer = setTimeout(() => {
    pendingTeardownTimer = null;
    connectionGeneration++; // invalidate every in-flight callback / reconnect chain
    activeUserId = null;
    reconnectAttempts = 0;
    clearManagerTimers();
    teardownSocket();
    useNotificationStore.setState({ wsStatus: 'disconnected' });
  }, TEARDOWN_GRACE_MS);
}
