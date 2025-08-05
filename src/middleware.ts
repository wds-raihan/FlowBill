import {
  InputValidator,
  RateLimiter,
  SecurityHeaders,
} from "@/lib/security/csrf";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Rate limiting configurations for different endpoints
const RATE_LIMITS = {
  // Authentication endpoints
  "/api/auth": { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes

  // Email sending endpoints
  "/api/invoices/*/send": { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 emails per 15 minutes
  "/api/invoices/*/remind": { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 reminders per hour

  // PDF generation
  "/api/invoices/*/pdf": { windowMs: 5 * 60 * 1000, maxRequests: 20 }, // 20 PDFs per 5 minutes

  // General API endpoints
  "/api": { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute

  // Registration endpoint
  "/api/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 registrations per hour
};

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/invoices",
  "/customers",
  "/reports",
  "/settings",
  "/api/invoices",
  "/api/customers",
  "/api/analytics",
  "/api/reports",
  "/api/dashboard",
  "/api/user",
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/error",
  "/api/auth",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers to all responses
  const securityHeaders = SecurityHeaders.getHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Redirect root path to dashboard for authenticated users
  if (pathname === "/") {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Get client IP for rate limiting
  const clientIP =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(pathname, clientIP);
  if (rateLimitResult.limited) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(
            (rateLimitResult.resetTime! - Date.now()) / 1000
          ).toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(
            rateLimitResult.resetTime!
          ).toISOString(),
          ...securityHeaders,
        },
      }
    );
  }

  // Add rate limit headers
  if (rateLimitResult.remaining !== undefined) {
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
    );
  }
  if (rateLimitResult.resetTime) {
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(rateLimitResult.resetTime).toISOString()
    );
  }

  // Input validation for API routes
  if (pathname.startsWith("/api") && request.method !== "GET") {
    const validationResult = await validateInput(request);
    if (!validationResult.isValid) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid input",
          details: validationResult.errors,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...securityHeaders,
          },
        }
      );
    }
  }

  // Authentication check for protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isProtectedRoute && !isPublicRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // Redirect to signin for page routes
      if (!pathname.startsWith("/api")) {
        const signInUrl = new URL("/auth/signin", request.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
      }

      // Return 401 for API routes
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...securityHeaders,
        },
      });
    }

    // Add user info to headers for API routes
    if (pathname.startsWith("/api")) {
      response.headers.set("X-User-ID", token.sub || "");
      response.headers.set("X-User-Email", token.email || "");
    }
  }

  return response;
}

function applyRateLimit(pathname: string, clientIP: string) {
  // Find matching rate limit configuration
  let config = RATE_LIMITS["/api"]; // default

  for (const [pattern, rateLimitConfig] of Object.entries(RATE_LIMITS)) {
    if (
      pathname.startsWith(pattern) ||
      pathname.match(pattern.replace("*", "[^/]+"))
    ) {
      config = rateLimitConfig;
      break;
    }
  }

  const identifier = `${clientIP}:${pathname.split("/").slice(0, 3).join("/")}`;
  return RateLimiter.isRateLimited(identifier, config);
}

async function validateInput(request: NextRequest): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Check content type for POST/PUT requests
    const contentType = request.headers.get("content-type");
    if (
      (request.method === "POST" || request.method === "PUT") &&
      contentType &&
      contentType.includes("application/json")
    ) {
      const body = await request.clone().json();

      // Validate common fields
      if (body.email && !InputValidator.isValidEmail(body.email)) {
        errors.push("Invalid email format");
      }

      if (body.phone && !InputValidator.isValidPhone(body.phone)) {
        errors.push("Invalid phone number format");
      }

      if (
        typeof body.total === "number" &&
        !InputValidator.isValidAmount(body.total)
      ) {
        errors.push("Invalid amount value");
      }

      // Check for SQL injection in text fields
      const textFields = ["name", "description", "notes", "address"];
      for (const field of textFields) {
        if (body[field] && typeof body[field] === "string") {
          if (InputValidator.containsSqlInjection(body[field])) {
            errors.push(`Invalid characters in ${field}`);
          }
        }
      }

      // Validate nested objects
      if (body.items && Array.isArray(body.items)) {
        body.items.forEach((item: any, index: number) => {
          if (
            item.description &&
            InputValidator.containsSqlInjection(item.description)
          ) {
            errors.push(`Invalid characters in item ${index + 1} description`);
          }
          if (
            typeof item.amount === "number" &&
            !InputValidator.isValidAmount(item.amount)
          ) {
            errors.push(`Invalid amount in item ${index + 1}`);
          }
        });
      }
    }
  } catch (error) {
    // If we can't parse the body, let the API endpoint handle it
    console.warn("Middleware: Could not parse request body for validation");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
