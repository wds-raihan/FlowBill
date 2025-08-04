// Comprehensive performance monitoring system

import { env, features, performanceConfig } from "@/lib/config/environment";

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface WebVitalsMetric {
  name: "CLS" | "FID" | "FCP" | "LCP" | "TTFB";
  value: number;
  delta: number;
  id: string;
  timestamp: number;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percentage";
  timestamp: number;
  tags?: Record<string, string>;
}

// Performance monitoring class
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitalsMetric[] = [];
  private isInitialized = false;
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  async initialize() {
    if (this.isInitialized || !features.performanceMonitoring) return;

    try {
      // Initialize Web Vitals monitoring
      await this.initializeWebVitals();

      // Initialize custom performance observers
      this.initializePerformanceObservers();

      // Initialize API performance monitoring
      this.initializeAPIMonitoring();

      // Initialize resource monitoring
      this.initializeResourceMonitoring();

      // Start periodic reporting
      this.startPeriodicReporting();

      this.isInitialized = true;
      console.log("Performance monitoring initialized successfully");
    } catch (error) {
      console.error("Failed to initialize performance monitoring:", error);
    }
  }

  private async initializeWebVitals() {
    if (typeof window === "undefined") return;

    try {
      // Dynamic import to avoid SSR issues
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import("web-vitals");

      // Core Web Vitals
      getCLS((metric) => this.recordWebVital("CLS", metric));
      getFID((metric) => this.recordWebVital("FID", metric));
      getLCP((metric) => this.recordWebVital("LCP", metric));

      // Other important metrics
      getFCP((metric) => this.recordWebVital("FCP", metric));
      getTTFB((metric) => this.recordWebVital("TTFB", metric));

      console.log("Web Vitals monitoring initialized");
    } catch (error) {
      console.error("Failed to initialize Web Vitals:", error);
    }
  }

  private initializePerformanceObservers() {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    try {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          }
        }
      });
      navObserver.observe({ entryTypes: ["navigation"] });
      this.observers.push(navObserver);

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordResourceMetric(resourceEntry);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ["resource"] });
      this.observers.push(resourceObserver);

      // Long tasks
      if ("PerformanceObserver" in window) {
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              this.recordMetric("long_task_duration", entry.duration, {
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          });
          longTaskObserver.observe({ entryTypes: ["longtask"] });
          this.observers.push(longTaskObserver);
        } catch (error) {
          // Long task API not supported
        }
      }

      // Memory usage (if available)
      if ((performance as any).memory) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.recordMetric("memory_used", memory.usedJSHeapSize / 1024 / 1024, {
            unit: "MB",
            total: memory.totalJSHeapSize / 1024 / 1024,
            limit: memory.jsHeapSizeLimit / 1024 / 1024,
          });
        }, 30000); // Every 30 seconds
      }
    } catch (error) {
      console.error("Failed to initialize performance observers:", error);
    }
  }

  private initializeAPIMonitoring() {
    if (typeof window === "undefined") return;

    // Monkey patch fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === "string" ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordAPIMetric(url, endTime - startTime, response.status, "success");
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.recordAPIMetric(url, endTime - startTime, 0, "error");
        throw error;
      }
    };
  }

  private initializeResourceMonitoring() {
    if (typeof window === "undefined") return;

    // Monitor bundle size
    this.recordBundleMetrics();

    // Monitor DOM metrics
    this.recordDOMMetrics();
  }

  private recordWebVital(name: WebVitalsMetric["name"], metric: any) {
    const webVital: WebVitalsMetric = {
      name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
    };

    this.webVitals.push(webVital);
    this.sendWebVitalToAnalytics(webVital);

    // Log poor performance
    if (this.isWebVitalPoor(name, metric.value)) {
      console.warn(`Poor ${name} performance:`, metric.value);
    }
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connection: entry.connectEnd - entry.connectStart,
      ssl_negotiation: entry.connectEnd - entry.secureConnectionStart,
      request_time: entry.responseStart - entry.requestStart,
      response_time: entry.responseEnd - entry.responseStart,
      dom_processing: entry.domContentLoadedEventStart - entry.responseEnd,
      dom_content_loaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load_event: entry.loadEventEnd - entry.loadEventStart,
      total_load_time: entry.loadEventEnd - entry.fetchStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(`navigation_${name}`, value, { unit: "ms" });
      }
    });
  }

  private recordResourceMetric(entry: PerformanceResourceTiming) {
    const resourceType = this.getResourceType(entry.name);
    const size = entry.transferSize || 0;
    const duration = entry.responseEnd - entry.fetchStart;

    this.recordMetric("resource_load_time", duration, {
      type: resourceType,
      size,
      url: entry.name,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
    });

    // Track large resources
    if (size > 1024 * 1024) { // > 1MB
      this.recordMetric("large_resource_loaded", size, {
        type: resourceType,
        url: entry.name,
        unit: "bytes",
      });
    }
  }

  private recordAPIMetric(url: string, duration: number, status: number, result: "success" | "error") {
    const isAPICall = url.includes("/api/");
    if (!isAPICall) return;

    const endpoint = this.extractAPIEndpoint(url);
    
    this.recordMetric("api_request_duration", duration, {
      endpoint,
      status: status.toString(),
      result,
      unit: "ms",
    });

    // Track slow API calls
    if (duration > 2000) { // > 2 seconds
      this.recordMetric("slow_api_request", duration, {
        endpoint,
        status: status.toString(),
        unit: "ms",
      });
    }

    // Track API errors
    if (result === "error" || status >= 400) {
      this.recordMetric("api_error", 1, {
        endpoint,
        status: status.toString(),
        unit: "count",
      });
    }
  }

  private recordBundleMetrics() {
    if (typeof window === "undefined") return;

    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const stylesheets = Array.from(document.querySelectorAll("link[rel='stylesheet']"));

    this.recordMetric("bundle_script_count", scripts.length, { unit: "count" });
    this.recordMetric("bundle_stylesheet_count", stylesheets.length, { unit: "count" });

    // Estimate bundle size (rough approximation)
    let estimatedSize = 0;
    scripts.forEach((script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes("/_next/static/")) {
        estimatedSize += 200; // Rough estimate in KB
      }
    });

    this.recordMetric("estimated_bundle_size", estimatedSize, { unit: "KB" });
  }

  private recordDOMMetrics() {
    if (typeof window === "undefined") return;

    const domMetrics = {
      dom_nodes: document.querySelectorAll("*").length,
      dom_depth: this.calculateDOMDepth(),
      images: document.querySelectorAll("img").length,
      scripts: document.querySelectorAll("script").length,
      stylesheets: document.querySelectorAll("link[rel='stylesheet']").length,
    };

    Object.entries(domMetrics).forEach(([name, value]) => {
      this.recordMetric(`dom_${name}`, value, { unit: "count" });
    });
  }

  private calculateDOMDepth(): number {
    let maxDepth = 0;
    
    function traverse(element: Element, depth: number) {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of element.children) {
        traverse(child, depth + 1);
      }
    }
    
    if (document.body) {
      traverse(document.body, 1);
    }
    
    return maxDepth;
  }

  private getResourceType(url: string): string {
    if (url.includes(".js")) return "script";
    if (url.includes(".css")) return "stylesheet";
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "image";
    if (url.includes("/api/")) return "api";
    if (url.includes("font")) return "font";
    return "other";
  }

  private extractAPIEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const apiIndex = pathParts.indexOf("api");
      
      if (apiIndex !== -1 && pathParts.length > apiIndex + 1) {
        // Return the first two parts after /api/
        return pathParts.slice(apiIndex, apiIndex + 3).join("/");
      }
      
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private isWebVitalPoor(name: string, value: number): boolean {
    const thresholds = {
      CLS: 0.25,
      FID: 300,
      FCP: 3000,
      LCP: 4000,
      TTFB: 800,
    };
    
    return value > (thresholds[name as keyof typeof thresholds] || Infinity);
  }

  private async sendWebVitalToAnalytics(metric: WebVitalsMetric) {
    try {
      // Send to Google Analytics if available
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", metric.name, {
          event_category: "Web Vitals",
          value: Math.round(metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
        });
      }

      // Send to custom analytics endpoint
      if (env.NODE_ENV === "production") {
        await fetch("/api/analytics/web-vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metric),
        }).catch(() => {
          // Silently fail to avoid affecting user experience
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  private startPeriodicReporting() {
    // Report metrics every 30 seconds
    setInterval(() => {
      this.reportMetrics();
    }, 30000);

    // Report on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.reportMetrics();
      });
    }
  }

  private async reportMetrics() {
    if (this.metrics.length === 0) return;

    try {
      const metricsToSend = [...this.metrics];
      this.metrics = []; // Clear metrics after copying

      // Send to analytics endpoint
      if (env.NODE_ENV === "production") {
        await fetch("/api/analytics/performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metrics: metricsToSend,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }).catch(() => {
          // Silently fail
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Public methods
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  recordCustomMetric(metric: CustomMetric) {
    this.recordMetric(metric.name, metric.value, {
      unit: metric.unit,
      tags: metric.tags,
    });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getWebVitals(): WebVitalsMetric[] {
    return [...this.webVitals];
  }

  getPerformanceSummary() {
    const summary = {
      totalMetrics: this.metrics.length,
      webVitals: this.webVitals.reduce((acc, vital) => {
        acc[vital.name] = vital.value;
        return acc;
      }, {} as Record<string, number>),
      averageAPIResponseTime: this.getAverageMetric("api_request_duration"),
      totalAPIErrors: this.getMetricCount("api_error"),
      memoryUsage: this.getLatestMetric("memory_used"),
      bundleSize: this.getLatestMetric("estimated_bundle_size"),
    };

    return summary;
  }

  private getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  private getMetricCount(name: string): number {
    return this.metrics.filter(m => m.name === name).length;
  }

  private getLatestMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    return metrics.length > 0 ? metrics[metrics.length - 1].value : 0;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.webVitals = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions
export function recordPerformanceMetric(name: string, value: number, metadata?: Record<string, any>) {
  performanceMonitor.recordMetric(name, value, metadata);
}

export function measureFunction<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    recordPerformanceMetric(name, end - start, { unit: "ms" });
    return result;
  }) as T;
}

export function measureAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    recordPerformanceMetric(name, end - start, { unit: "ms" });
    return result;
  }) as T;
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const recordMetric = (name: string, value: number, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(name, value, metadata);
  };

  const getPerformanceSummary = () => {
    return performanceMonitor.getPerformanceSummary();
  };

  return {
    recordMetric,
    measureFunction,
    measureAsyncFunction,
    getPerformanceSummary,
  };
}

// Initialize performance monitoring
if (typeof window !== "undefined") {
  performanceMonitor.initialize();
}