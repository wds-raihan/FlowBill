// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart);
              this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
              this.recordMetric('first_byte', navEntry.responseStart - navEntry.fetchStart);
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported');
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.recordMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.fetchStart, {
                name: resourceEntry.name,
                type: this.getResourceType(resourceEntry.name),
                size: resourceEntry.transferSize,
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported');
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('largest_contentful_paint', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported');
      }

      // Observe first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('first_input_delay', entry.processingStart - entry.startTime);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported');
      }

      // Observe cumulative layout shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.recordMetric('cumulative_layout_shift', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported');
      }
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(metric => metric.name === name);
    }
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
  }

  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.getMetrics(name);
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  clearMetrics() {
    this.metrics = [];
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }

  // Get Core Web Vitals
  getCoreWebVitals(): {
    lcp?: number;
    fid?: number;
    cls?: number;
  } {
    return {
      lcp: this.getLatestMetric('largest_contentful_paint')?.value,
      fid: this.getLatestMetric('first_input_delay')?.value,
      cls: this.getLatestMetric('cumulative_layout_shift')?.value,
    };
  }

  // Get page load metrics
  getPageLoadMetrics(): {
    pageLoadTime?: number;
    domContentLoaded?: number;
    firstByte?: number;
  } {
    return {
      pageLoadTime: this.getLatestMetric('page_load_time')?.value,
      domContentLoaded: this.getLatestMetric('dom_content_loaded')?.value,
      firstByte: this.getLatestMetric('first_byte')?.value,
    };
  }

  // Export metrics for analytics
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      metrics: this.metrics,
      coreWebVitals: this.getCoreWebVitals(),
      pageLoadMetrics: this.getPageLoadMetrics(),
    });
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const recordMetric = (name: string, value: number, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(name, value, metadata);
  };

  const measureFunction = <T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      recordMetric(name, end - start);
      return result;
    }) as T;
  };

  const measureAsyncFunction = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string
  ): T => {
    return (async (...args: any[]) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      recordMetric(name, end - start);
      return result;
    }) as T;
  };

  return {
    recordMetric,
    measureFunction,
    measureAsyncFunction,
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getCoreWebVitals: performanceMonitor.getCoreWebVitals.bind(performanceMonitor),
    getPageLoadMetrics: performanceMonitor.getPageLoadMetrics.bind(performanceMonitor),
  };
}

// Performance timing decorator
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const end = performance.now();
      
      performanceMonitor.recordMetric(name, end - start, {
        method: propertyKey,
        class: target.constructor.name,
      });

      return result;
    };

    return descriptor;
  };
}

// Async performance timing decorator
export function measureAsyncPerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const end = performance.now();
      
      performanceMonitor.recordMetric(name, end - start, {
        method: propertyKey,
        class: target.constructor.name,
      });

      return result;
    };

    return descriptor;
  };
}

// Bundle size analyzer
export class BundleAnalyzer {
  static analyzeBundle() {
    if (typeof window === 'undefined') return null;

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

    const analysis = {
      scripts: scripts.map(script => ({
        src: (script as HTMLScriptElement).src,
        async: (script as HTMLScriptElement).async,
        defer: (script as HTMLScriptElement).defer,
      })),
      stylesheets: stylesheets.map(link => ({
        href: (link as HTMLLinkElement).href,
      })),
      totalScripts: scripts.length,
      totalStylesheets: stylesheets.length,
    };

    performanceMonitor.recordMetric('bundle_scripts_count', scripts.length);
    performanceMonitor.recordMetric('bundle_stylesheets_count', stylesheets.length);

    return analysis;
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  static getMemoryUsage() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    const usage = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };

    performanceMonitor.recordMetric('memory_usage_mb', memory.usedJSHeapSize / 1024 / 1024);
    performanceMonitor.recordMetric('memory_usage_percentage', usage.usagePercentage);

    return usage;
  }

  static startMemoryMonitoring(intervalMs: number = 30000) {
    if (typeof window === 'undefined') return null;

    const interval = setInterval(() => {
      this.getMemoryUsage();
    }, intervalMs);

    return () => clearInterval(interval);
  }
}