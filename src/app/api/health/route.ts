import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { cache } from "@/lib/cache";

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "unknown",
    checks: {
      database: { status: "unknown", responseTime: 0 },
      cache: { status: "unknown", responseTime: 0 },
      memory: { status: "unknown", usage: 0 },
    },
  };

  try {
    // Database health check
    const dbStart = Date.now();
    try {
      await connectDB();
      health.checks.database = {
        status: "healthy",
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      health.checks.database = {
        status: "unhealthy",
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : "Database connection failed",
      };
      health.status = "unhealthy";
    }

    // Cache health check
    const cacheStart = Date.now();
    try {
      const testKey = "health-check";
      cache.set(testKey, "test", 1);
      const testValue = cache.get(testKey);
      cache.delete(testKey);
      
      health.checks.cache = {
        status: testValue === "test" ? "healthy" : "unhealthy",
        responseTime: Date.now() - cacheStart,
      };
    } catch (error) {
      health.checks.cache = {
        status: "unhealthy",
        responseTime: Date.now() - cacheStart,
        error: error instanceof Error ? error.message : "Cache operation failed",
      };
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimit = 512; // MB - adjust based on your container limits
    
    health.checks.memory = {
      status: memoryUsageMB < memoryLimit ? "healthy" : "warning",
      usage: Math.round(memoryUsageMB),
      limit: memoryLimit,
      percentage: Math.round((memoryUsageMB / memoryLimit) * 100),
    };

    // Overall health determination
    const allChecksHealthy = Object.values(health.checks).every(
      check => check.status === "healthy"
    );
    
    if (!allChecksHealthy) {
      health.status = "degraded";
    }

    // Add response time
    health.responseTime = Date.now() - startTime;

    // Return appropriate status code
    const statusCode = health.status === "healthy" ? 200 : 
                      health.status === "degraded" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}

// Detailed health check for monitoring systems
export async function POST() {
  const startTime = Date.now();
  
  try {
    const detailedHealth = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "unknown",
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
      },
      memory: {
        ...process.memoryUsage(),
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
        cpuCount: require('os').cpus().length,
      },
      cache: {
        stats: cache.getStats(),
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(detailedHealth);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Detailed health check failed",
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}