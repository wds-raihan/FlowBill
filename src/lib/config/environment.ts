// Environment configuration with validation and type safety

import { z } from "zod";

// Environment schema validation
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  
  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  
  // Authentication Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  
  // Email Configuration
  EMAIL_SERVER_HOST: z.string().min(1, "EMAIL_SERVER_HOST is required"),
  EMAIL_SERVER_PORT: z.string().regex(/^\d+$/, "EMAIL_SERVER_PORT must be a number"),
  EMAIL_SERVER_USER: z.string().email("EMAIL_SERVER_USER must be a valid email"),
  EMAIL_SERVER_PASSWORD: z.string().min(1, "EMAIL_SERVER_PASSWORD is required"),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email"),
  
  // Optional Services
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ANALYTICS_ID: z.string().optional(),
  
  // Feature Flags
  ENABLE_ANALYTICS: z.string().transform(val => val === "true").default("false"),
  ENABLE_ERROR_REPORTING: z.string().transform(val => val === "true").default("false"),
  ENABLE_PERFORMANCE_MONITORING: z.string().transform(val => val === "true").default("false"),
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === "true").default("true"),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val) || 100).default("100"),
  
  // File Upload
  MAX_FILE_SIZE_MB: z.string().transform(val => parseInt(val) || 5).default("5"),
  ALLOWED_FILE_TYPES: z.string().default("image/jpeg,image/png,image/webp"),
  
  // Security
  CORS_ORIGIN: z.string().optional(),
  TRUSTED_HOSTS: z.string().optional(),
});

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Export validated environment configuration
export const env = parseEnv();

// Environment utilities
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

// Database configuration
export const dbConfig = {
  uri: env.MONGODB_URI,
  options: {
    maxPoolSize: isProduction ? 10 : 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
  },
};

// Email configuration
export const emailConfig = {
  host: env.EMAIL_SERVER_HOST,
  port: parseInt(env.EMAIL_SERVER_PORT),
  secure: parseInt(env.EMAIL_SERVER_PORT) === 465,
  auth: {
    user: env.EMAIL_SERVER_USER,
    pass: env.EMAIL_SERVER_PASSWORD,
  },
  from: env.EMAIL_FROM,
};

// Authentication configuration
export const authConfig = {
  secret: env.NEXTAUTH_SECRET,
  url: env.NEXTAUTH_URL,
  providers: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      enabled: !!(env.GITHUB_ID && env.GITHUB_SECRET),
    },
  },
};

// Feature flags
export const features = {
  analytics: env.ENABLE_ANALYTICS,
  errorReporting: env.ENABLE_ERROR_REPORTING,
  performanceMonitoring: env.ENABLE_PERFORMANCE_MONITORING,
  rateLimit: env.RATE_LIMIT_ENABLED,
};

// Rate limiting configuration
export const rateLimitConfig = {
  enabled: env.RATE_LIMIT_ENABLED,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  windowMs: 60 * 1000, // 1 minute
};

// File upload configuration
export const uploadConfig = {
  maxSizeMB: env.MAX_FILE_SIZE_MB,
  allowedTypes: env.ALLOWED_FILE_TYPES.split(','),
  maxSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
};

// Security configuration
export const securityConfig = {
  corsOrigin: env.CORS_ORIGIN?.split(',') || [],
  trustedHosts: env.TRUSTED_HOSTS?.split(',') || [],
  csrfEnabled: isProduction,
  httpsOnly: isProduction,
};

// Logging configuration
export const loggingConfig = {
  level: isProduction ? "info" : "debug",
  enableConsole: !isProduction,
  enableFile: isProduction,
  enableRemote: isProduction && env.SENTRY_DSN,
};

// Cache configuration
export const cacheConfig = {
  enabled: true,
  defaultTTL: isProduction ? 300 : 60, // 5 minutes in prod, 1 minute in dev
  maxSize: 1000,
  redisUrl: env.REDIS_URL,
};

// Performance monitoring configuration
export const performanceConfig = {
  enabled: env.ENABLE_PERFORMANCE_MONITORING,
  sampleRate: isProduction ? 0.1 : 1.0, // 10% in production, 100% in development
  enableWebVitals: true,
  enableResourceTiming: true,
};

// Validate critical configurations on startup
export function validateConfiguration() {
  const errors: string[] = [];

  // Check database connection string
  if (!env.MONGODB_URI.includes('mongodb')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Check authentication secret strength
  if (env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET should be at least 32 characters for security');
  }

  // Check email configuration
  if (!env.EMAIL_SERVER_HOST || !env.EMAIL_SERVER_USER) {
    errors.push('Email configuration is incomplete');
  }

  // Check production-specific requirements
  if (isProduction) {
    if (!env.NEXTAUTH_URL.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }

    if (!env.SENTRY_DSN && env.ENABLE_ERROR_REPORTING) {
      errors.push('SENTRY_DSN is required when error reporting is enabled');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Export environment info for debugging (safe for logs)
export function getEnvironmentInfo() {
  return {
    nodeEnv: env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    features: features,
    hasDatabase: !!env.MONGODB_URI,
    hasEmail: !!(env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER),
    hasRedis: !!env.REDIS_URL,
    hasSentry: !!env.SENTRY_DSN,
    authProviders: Object.entries(authConfig.providers)
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name),
  };
}