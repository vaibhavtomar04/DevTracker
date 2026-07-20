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

export default APP_CONFIG;
