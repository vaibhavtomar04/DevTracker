export interface ApiMetric {
  url: string;
  method: string;
  durationMs: number;
  status: number;
  timestamp: number;
  isSlow: boolean;
}

export interface PerformanceSummary {
  dashboardLoadTimeMs: number | null;
  avgApiResponseTimeMs: number;
  totalRequests: number;
  slowRequestsCount: number;
  failedRequestsCount: number;
  slowApis: ApiMetric[];
  recentMetrics: ApiMetric[];
}

class PerformanceMonitor {
  private metrics: ApiMetric[] = [];
  private dashboardLoadTime: number | null = null;
  private maxMetrics = 100;

  recordDashboardLoad(durationMs: number) {
    this.dashboardLoadTime = durationMs;
  }

  recordApiCall(url: string, method: string, durationMs: number, status: number) {
    const isSlow = durationMs > 500;
    const metric: ApiMetric = {
      url,
      method,
      durationMs,
      status,
      timestamp: Date.now(),
      isSlow,
    };
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getSummary(): PerformanceSummary {
    const total = this.metrics.length;
    const totalDuration = this.metrics.reduce((acc, m) => acc + m.durationMs, 0);
    const avgApiResponseTimeMs = total > 0 ? Math.round(totalDuration / total) : 0;
    const slowApis = this.metrics.filter((m) => m.isSlow);
    const failedRequestsCount = this.metrics.filter((m) => m.status >= 400).length;

    return {
      dashboardLoadTimeMs: this.dashboardLoadTime,
      avgApiResponseTimeMs,
      totalRequests: total,
      slowRequestsCount: slowApis.length,
      failedRequestsCount,
      slowApis: slowApis.slice(-10),
      recentMetrics: this.metrics.slice(-20).reverse(),
    };
  }

  clearMetrics() {
    this.metrics = [];
    this.dashboardLoadTime = null;
  }
}

export const performanceMonitor = new PerformanceMonitor();
