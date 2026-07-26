const environment = import.meta.env.MODE || 'development';

const detectContextPath = (): string => {
  if (typeof window === 'undefined') return '';
  if (typeof (window as any).__contextPath__ === 'string') {
    return (window as any).__contextPath__;
  }
  const pathname = window.location.pathname;
  const parts = pathname.split('/');
  const appRoutes = ['login', 'set-new-password', 'reset-password', 'dashboard'];
  
  const appRouteIndex = parts.findIndex(part => appRoutes.includes(part));
  if (appRouteIndex > 1) {
    return parts.slice(0, appRouteIndex).join('/');
  }
  
  if (parts.length > 1 && parts[1] !== '' && !appRoutes.includes(parts[1])) {
    return '/' + parts[1];
  }
  
  return '';
};

interface EnvConfig {
  hostname: string;
  contextPath: string;
}

const configs: Record<string, EnvConfig> = {
  development: {
    hostname: 'http://localhost:8080',
    contextPath: '/devtrack',
  },
  production: {
    hostname: typeof window !== 'undefined' ? window.location.origin : '',
    contextPath: detectContextPath(),
  }
};

const currentConfig = configs[environment] || configs.development;

export const APP_CONFIG = {
  ...currentConfig,
  apiUrl: `${currentConfig.hostname}${currentConfig.contextPath}`,
};

/**
 * Reads a runtime feature flag with two override layers, most specific first:
 *   1. window.__FEATURES__[winKey] (boolean) — flip at runtime before app
 *      bootstrap without a rebuild (true reversibility for canary/rollback).
 *   2. Vite env var (VITE_*) — build-time default.
 *   3. `fallback` — hard default when neither is set.
 */
const readFlag = (winKey: string, envValue: unknown, fallback = true): boolean => {
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).__FEATURES__ === 'object' &&
    (window as any).__FEATURES__ !== null &&
    typeof (window as any).__FEATURES__[winKey] === 'boolean'
  ) {
    return (window as any).__FEATURES__[winKey];
  }
  if (envValue === undefined || envValue === null) return fallback;
  return String(envValue).toLowerCase() !== 'false';
};

export const FEATURES = {
  ENABLE_MULTI_DEV_CR:
    String(import.meta.env.VITE_ENABLE_MULTI_DEV_CR ?? 'true').toLowerCase() !== 'false',

  // Phase 1.1 (perf) — singleton WebSocket connection manager in
  // notificationStore.ts. Reversible without a code change:
  //   • runtime:    window.__FEATURES__.ENABLE_WS_LIFECYCLE_V2 = false (before bootstrap)
  //   • build-time: VITE_ENABLE_WS_LIFECYCLE_V2=false
  // Disabling restores the legacy connection manager (rollback for perf-phase1).
  ENABLE_WS_LIFECYCLE_V2: readFlag(
    'ENABLE_WS_LIFECYCLE_V2',
    import.meta.env.VITE_ENABLE_WS_LIFECYCLE_V2,
    true,
  ),

  // Phase 1.2 (perf) — DashboardLayout is the single owner of the core task +
  // sprint bootstrap. When enabled, dashboard pages (developerDashboard, etc.)
  // trust that bootstrap and do NOT re-issue fetchData(true)/fetchSprints() on
  // mount, removing the duplicate concurrent cold-load fetch. Reversible without
  // a code change:
  //   • runtime:    window.__FEATURES__.ENABLE_NEW_BOOTSTRAP = false (before bootstrap)
  //   • build-time: VITE_ENABLE_NEW_BOOTSTRAP=false
  // Disabling restores each page's own mount-time bootstrap (rollback for perf-phase1.2).
  ENABLE_NEW_BOOTSTRAP: readFlag(
    'ENABLE_NEW_BOOTSTRAP',
    import.meta.env.VITE_ENABLE_NEW_BOOTSTRAP,
    true,
  ),

  // Phase 1.3 (perf) — /api/audit (~4MB, the single heaviest cold-load payload) is
  // removed from the blocking secondary batch in taskStore.fetchData and loaded
  // deferred (requestIdleCallback, setTimeout fallback) after first paint. auditLogs
  // remains the single store source every consumer reads; it just populates off the
  // critical path so the initial payload stays lean. Reversible without a code change:
  //   • runtime:    window.__FEATURES__.ENABLE_LAZY_AUDIT = false (before bootstrap)
  //   • build-time: VITE_ENABLE_LAZY_AUDIT=false
  // Disabling restores the eager audit load inside the secondary batch (rollback for perf-phase1.3).
  ENABLE_LAZY_AUDIT: readFlag(
    'ENABLE_LAZY_AUDIT',
    import.meta.env.VITE_ENABLE_LAZY_AUDIT,
    true,
  ),
};

export default APP_CONFIG;
