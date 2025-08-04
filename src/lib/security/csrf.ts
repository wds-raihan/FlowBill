import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";

// CSRF Token Management
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_HEADER = "x-csrf-token";
  private static readonly COOKIE_NAME = "csrf-token";

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString("hex");
  }

  /**
   * Create a hash of the token for secure storage
   */
  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(request: NextRequest, storedTokenHash: string): boolean {
    const tokenFromHeader = request.headers.get(this.TOKEN_HEADER);
    const tokenFromBody = request.nextUrl.searchParams.get("_token");
    
    const token = tokenFromHeader || tokenFromBody;
    
    if (!token || !storedTokenHash) {
      return false;
    }

    const tokenHash = this.hashToken(token);
    return tokenHash === storedTokenHash;
  }

  /**
   * Check if request method requires CSRF protection
   */
  static requiresProtection(method: string): boolean {
    return ["POST", "PUT", "DELETE", "PATCH"].includes(method.toUpperCase());
  }
}

// Rate Limiting Implementation
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private static store = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(
    identifier: string,
    config: RateLimitConfig
  ): { limited: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const key = identifier;
    const existing = this.store.get(key);

    // Clean up expired entries
    if (existing && existing.resetTime < now) {
      this.store.delete(key);
    }

    const current = this.store.get(key);

    if (!current) {
      // First request
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        limited: false,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    if (current.count >= config.maxRequests) {
      return {
        limited: true,
        resetTime: current.resetTime,
        remaining: 0,
      };
    }

    // Increment count
    current.count++;
    this.store.set(key, current);

    return {
      limited: false,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

// Input Validation and Sanitization
export class InputValidator {
  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate and sanitize invoice number
   */
  static sanitizeInvoiceNumber(invoiceNo: string): string {
    return invoiceNo.replace(/[^a-zA-Z0-9-_]/g, "").substring(0, 50);
  }

  /**
   * Validate monetary amount
   */
  static isValidAmount(amount: number): boolean {
    return (
      typeof amount === "number" &&
      !isNaN(amount) &&
      isFinite(amount) &&
      amount >= 0 &&
      amount <= 999999999.99
    );
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    return this.sanitizeHtml(input.trim()).substring(0, maxLength);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*[=<>]/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
}

// Security Headers
export class SecurityHeaders {
  /**
   * Get security headers for responses
   */
  static getHeaders(): Record<string, string> {
    return {
      // Prevent XSS attacks
      "X-XSS-Protection": "1; mode=block",
      
      // Prevent MIME type sniffing
      "X-Content-Type-Options": "nosniff",
      
      // Prevent clickjacking
      "X-Frame-Options": "DENY",
      
      // Enforce HTTPS
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      
      // Content Security Policy
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
      ].join("; "),
      
      // Referrer Policy
      "Referrer-Policy": "strict-origin-when-cross-origin",
      
      // Permissions Policy
      "Permissions-Policy": [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
      ].join(", "),
    };
  }
}

// Password Security
export class PasswordSecurity {
  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push("Password contains common patterns and is not secure");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}