import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/environment";

export async function POST(request: NextRequest) {
  try {
    // Only collect in production
    if (env.NODE_ENV !== "production") {
      return NextResponse.json({ success: true });
    }

    const performanceData = await request.json();
    
    // Validate the performance data
    if (!performanceData.metrics || !Array.isArray(performanceData.metrics)) {
      return NextResponse.json(
        { error: "Invalid performance data" },
        { status: 400 }
      );
    }

    // Get client information
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    const clientIP = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";

    // Process metrics
    const processedMetrics = performanceData.metrics.map((metric: any) => ({
      ...metric,
      userAgent,
      referer,
      clientIP: clientIP.split(",")[0],
      sessionId: request.headers.get("x-session-id"),
      timestamp: metric.timestamp || Date.now(),
    }));

    // Log for debugging
    if (env.NODE_ENV === "development") {
      console.log("Performance metrics received:", processedMetrics.length);
    }

    // Aggregate metrics for analysis
    const aggregatedMetrics = aggregateMetrics(processedMetrics);
    
    // Log important performance issues
    logPerformanceIssues(aggregatedMetrics);

    // Here you would typically:
    // 1. Store in a time-series database (InfluxDB, TimescaleDB)
    // 2. Send to analytics service (DataDog, New Relic)
    // 3. Store in your main database for analysis
    // 4. Send alerts for performance degradation

    return NextResponse.json({ 
      success: true, 
      processed: processedMetrics.length,
      aggregated: Object.keys(aggregatedMetrics).length
    });
  } catch (error) {
    console.error("Error processing performance data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function aggregateMetrics(metrics: any[]) {
  const aggregated: Record<string, {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    recent: number[];
  }> = {};

  metrics.forEach(metric => {
    if (!aggregated[metric.name]) {
      aggregated[metric.name] = {
        count: 0,
        sum: 0,
        avg: 0,
        min: Infinity,
        max: -Infinity,
        recent: [],
      };
    }

    const agg = aggregated[metric.name];
    agg.count++;
    agg.sum += metric.value;
    agg.min = Math.min(agg.min, metric.value);
    agg.max = Math.max(agg.max, metric.value);
    agg.recent.push(metric.value);
    
    // Keep only last 10 values
    if (agg.recent.length > 10) {
      agg.recent = agg.recent.slice(-10);
    }
    
    agg.avg = agg.sum / agg.count;
  });

  return aggregated;
}

function logPerformanceIssues(aggregatedMetrics: any) {
  // Define performance thresholds
  const thresholds = {
    api_request_duration: 2000, // 2 seconds
    resource_load_time: 3000,   // 3 seconds
    memory_used: 100,           // 100 MB
    long_task_duration: 50,     // 50ms
  };

  Object.entries(aggregatedMetrics).forEach(([metricName, data]: [string, any]) => {
    const threshold = thresholds[metricName as keyof typeof thresholds];
    
    if (threshold && data.avg > threshold) {
      console.warn(`Performance issue detected: ${metricName} average is ${data.avg.toFixed(2)}, threshold is ${threshold}`);
      
      // Here you could:
      // 1. Send alert to monitoring service
      // 2. Create incident in issue tracker
      // 3. Notify development team
      // 4. Trigger auto-scaling if applicable
    }
  });

  // Check for memory leaks
  const memoryMetrics = aggregatedMetrics.memory_used;
  if (memoryMetrics && memoryMetrics.recent.length >= 5) {
    const trend = calculateTrend(memoryMetrics.recent);
    if (trend > 5) { // Memory increasing by more than 5MB per measurement
      console.warn("Potential memory leak detected, memory usage trending upward");
    }
  }

  // Check for API performance degradation
  const apiMetrics = aggregatedMetrics.api_request_duration;
  if (apiMetrics && apiMetrics.recent.length >= 5) {
    const recentAvg = apiMetrics.recent.reduce((a, b) => a + b, 0) / apiMetrics.recent.length;
    if (recentAvg > apiMetrics.avg * 1.5) {
      console.warn("API performance degradation detected");
    }
  }
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = values.reduce((sum, _, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}