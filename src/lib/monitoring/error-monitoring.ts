// Comprehensive error monitoring and reporting system

import { env, features } from "@/lib/config/environment";

// Error types for better categorization
export enum ErrorType {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  DATABASE = "database",
  EXTERNAL_API = "external_api",
  FILE_UPLOAD = "file_upload",
  EMAIL = "email",
  PDF_GENERATION = "pdf_generation",
  RATE_LIMIT = "rate_limit",
  UNKNOWN = "unknown",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Enhanced error interface
export interface EnhancedError extends Error {
  type?: ErrorType;
  severity?: ErrorSeverity;
  userId?: string;
  orgId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  statusCode?: number;
}

// Error context for better debugging
export interface ErrorContext {
  userId?: string;
  orgId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  timestamp?: Date;
  sessionId?: string;
  buildId?: string;
  metadata?: Record<string, any>;
}

class ErrorMonitor {
  private static instance: ErrorMonitor;
  private isInitialized = false;
  private errorQueue: Array<{ error: EnhancedError; context: ErrorContext }> = [];

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry if enabled and DSN is provided
      if (features.errorReporting && env.SENTRY_DSN) {
        await this.initializeSentry();
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Process any queued errors
      await this.processErrorQueue();

      this.isInitialized = true;
      console.log("Error monitoring initialized successfully");
    } catch (error) {
      console.error("Failed to initialize error monitoring:", error);
    }
  }

  private async initializeSentry() {
    try {
      // Dynamic import to avoid bundling Sentry in development
      const Sentry = await import("@sentry/nextjs");
      
      Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,
        tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
        debug: env.NODE_ENV === "development",
        
        beforeSend(event, hint) {
          // Filter out non-critical errors in production
          if (env.NODE_ENV === "production") {
            const error = hint.originalException as EnhancedError;
            if (error?.severity === ErrorSeverity.LOW) {
              return null;
            }
          }
          return event;
        },

        integrations: [
          new Sentry.BrowserTracing({
            tracePropagationTargets: ["localhost", env.NEXTAUTH_URL],
          }),
        ],
      });

      console.log("Sentry initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Sentry:", error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Browser error handler
    if (typeof window !== "undefined") {
      window.addEventListener("error", (event) => {
        this.captureError(
          new Error(event.message) as EnhancedError,
          {
            url: event.filename,
            metadata: {
              lineno: event.lineno,
              colno: event.colno,
              stack: event.error?.stack,
            },
          }
        );
      });

      window.addEventListener("unhandledrejection", (event) => {
        this.captureError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`) as EnhancedError,
          {
            metadata: {
              reason: event.reason,
              promise: event.promise,
            },
          }
        );
      });
    }

    // Node.js error handlers
    if (typeof process !== "undefined") {
      process.on("uncaughtException", (error) => {
        this.captureError(error as EnhancedError, {
          metadata: { type: "uncaughtException" },
        });
      });

      process.on("unhandledRejection", (reason, promise) => {
        this.captureError(
          new Error(`Unhandled Rejection: ${reason}`) as EnhancedError,
          {
            metadata: { reason, promise },
          }
        );
      });
    }
  }

  captureError(error: EnhancedError, context: ErrorContext = {}) {
    // Enhance error with additional information
    const enhancedError = this.enhanceError(error, context);
    
    // Add to queue if not initialized
    if (!this.isInitialized) {
      this.errorQueue.push({ error: enhancedError, context });
      return;
    }

    // Log to console in development
    if (env.NODE_ENV === "development") {
      console.error("Error captured:", enhancedError, context);
    }

    // Send to external monitoring service
    this.sendToMonitoringService(enhancedError, context);

    // Store in local storage for offline scenarios
    this.storeErrorLocally(enhancedError, context);
  }

  private enhanceError(error: EnhancedError, context: ErrorContext): EnhancedError {
    // Add default values
    error.type = error.type || this.inferErrorType(error);
    error.severity = error.severity || this.inferErrorSeverity(error);
    error.requestId = context.requestId || this.generateRequestId();

    // Add timestamp
    context.timestamp = new Date();

    // Add build information
    context.buildId = process.env.VERCEL_GIT_COMMIT_SHA || "unknown";

    return error;
  }

  private inferErrorType(error: EnhancedError): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    if (message.includes("unauthorized") || message.includes("authentication")) {
      return ErrorType.AUTHENTICATION;
    }
    if (message.includes("forbidden") || message.includes("permission")) {
      return ErrorType.AUTHORIZATION;
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION;
    }
    if (message.includes("mongodb") || message.includes("database")) {
      return ErrorType.DATABASE;
    }
    if (message.includes("fetch") || message.includes("network")) {
      return ErrorType.EXTERNAL_API;
    }
    if (message.includes("file") || message.includes("upload")) {
      return ErrorType.FILE_UPLOAD;
    }
    if (message.includes("email") || message.includes("smtp")) {
      return ErrorType.EMAIL;
    }
    if (message.includes("pdf") || stack.includes("react-pdf")) {
      return ErrorType.PDF_GENERATION;
    }
    if (message.includes("rate limit") || error.statusCode === 429) {
      return ErrorType.RATE_LIMIT;
    }

    return ErrorType.UNKNOWN;
  }

  private inferErrorSeverity(error: EnhancedError): ErrorSeverity {
    // Critical errors
    if (
      error.message.includes("database") ||
      error.message.includes("authentication") ||
      error.statusCode === 500
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 404
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (
      error.statusCode === 400 ||
      error.statusCode === 422 ||
      error.statusCode === 429
    ) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private async sendToMonitoringService(error: EnhancedError, context: ErrorContext) {
    try {
      if (features.errorReporting && env.SENTRY_DSN) {
        const Sentry = await import("@sentry/nextjs");
        
        Sentry.withScope((scope) => {
          // Set user context
          if (context.userId) {
            scope.setUser({ id: context.userId });
          }

          // Set tags
          scope.setTag("error.type", error.type);
          scope.setTag("error.severity", error.severity);
          scope.setTag("environment", env.NODE_ENV);

          // Set extra context
          scope.setContext("error_context", context);
          scope.setContext("error_metadata", error.metadata);

          // Set level based on severity
          const level = this.getSentryLevel(error.severity);
          scope.setLevel(level);

          // Capture the error
          Sentry.captureException(error);
        });
      }
    } catch (monitoringError) {
      console.error("Failed to send error to monitoring service:", monitoringError);
    }
  }

  private getSentryLevel(severity?: ErrorSeverity): "fatal" | "error" | "warning" | "info" {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "fatal";
      case ErrorSeverity.HIGH:
        return "error";
      case ErrorSeverity.MEDIUM:
        return "warning";
      case ErrorSeverity.LOW:
      default:
        return "info";
    }
  }

  private storeErrorLocally(error: EnhancedError, context: ErrorContext) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const errorData = {
          error: {
            message: error.message,
            stack: error.stack,
            type: error.type,
            severity: error.severity,
          },
          context,
          timestamp: new Date().toISOString(),
        };

        const existingErrors = JSON.parse(
          localStorage.getItem("error_logs") || "[]"
        );
        
        existingErrors.push(errorData);
        
        // Keep only last 50 errors
        if (existingErrors.length > 50) {
          existingErrors.splice(0, existingErrors.length - 50);
        }

        localStorage.setItem("error_logs", JSON.stringify(existingErrors));
      }
    } catch (storageError) {
      console.error("Failed to store error locally:", storageError);
    }
  }

  private async processErrorQueue() {
    while (this.errorQueue.length > 0) {
      const { error, context } = this.errorQueue.shift()!;
      await this.sendToMonitoringService(error, context);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get stored errors for debugging
  getStoredErrors(): any[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return JSON.parse(localStorage.getItem("error_logs") || "[]");
      }
    } catch (error) {
      console.error("Failed to retrieve stored errors:", error);
    }
    return [];
  }

  // Clear stored errors
  clearStoredErrors(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("error_logs");
      }
    } catch (error) {
      console.error("Failed to clear stored errors:", error);
    }
  }
}

// Export singleton instance
export const errorMonitor = ErrorMonitor.getInstance();

// Utility functions for easy error reporting
export function captureError(
  error: Error | string,
  context: Partial<ErrorContext> = {},
  type?: ErrorType,
  severity?: ErrorSeverity
) {
  const enhancedError = typeof error === "string" ? new Error(error) : error;
  (enhancedError as EnhancedError).type = type;
  (enhancedError as EnhancedError).severity = severity;
  
  errorMonitor.captureError(enhancedError as EnhancedError, context as ErrorContext);
}

export function captureException(error: Error, context: Partial<ErrorContext> = {}) {
  errorMonitor.captureError(error as EnhancedError, context as ErrorContext);
}

export function captureMessage(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.LOW,
  context: Partial<ErrorContext> = {}
) {
  const error = new Error(message) as EnhancedError;
  error.severity = severity;
  errorMonitor.captureError(error, context as ErrorContext);
}

// React error boundary helper
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, {
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    }, ErrorType.UNKNOWN, ErrorSeverity.HIGH);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error!}
            resetError={() => this.setState({ hasError: false, error: null })}
          />
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  Something went wrong
                </h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>
                    We've been notified of this error and will fix it soon.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => window.location.reload()}
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize error monitoring
if (typeof window !== "undefined") {
  errorMonitor.initialize();
}