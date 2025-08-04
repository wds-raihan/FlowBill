MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice_gen
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM=your-email@example.com

# Invoice Generator - Environment Variables Template

# Copy this file to .env.local and fill in your values

# =============================================================================

# APPLICATION CONFIGURATION

# =============================================================================

NODE_ENV=development
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000

# =============================================================================

# DATABASE CONFIGURATION

# =============================================================================

# MongoDB connection string

# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database

# For local MongoDB: mongodb://localhost:27017/invoice_generator

MONGODB_URI=mongodb://localhost:27017/invoice_generator

# =============================================================================

# AUTHENTICATION PROVIDERS

# =============================================================================

# Google OAuth (optional)

# Get from: https://console.developers.google.com/

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)

# Get from: https://github.com/settings/applications/new

GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# =============================================================================

# EMAIL CONFIGURATION

# =============================================================================

# SMTP settings for sending emails

EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# =============================================================================

# OPTIONAL SERVICES

# =============================================================================

# Redis for caching (optional)

REDIS_URL=redis://localhost:6379

# Sentry for error monitoring (optional)

SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Google Analytics (optional)

ANALYTICS_ID=G-XXXXXXXXXX

# =============================================================================

# FEATURE FLAGS

# =============================================================================

ENABLE_ANALYTICS=false
ENABLE_ERROR_REPORTING=false
ENABLE_PERFORMANCE_MONITORING=false

# =============================================================================

# SECURITY & RATE LIMITING

# =============================================================================

RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100

# CORS configuration (comma-separated)

CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Trusted hosts (comma-separated)

TRUSTED_HOSTS=localhost,yourdomain.com

# =============================================================================

# FILE UPLOAD CONFIGURATION

# =============================================================================

MAX_FILE_SIZE_MB=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# =============================================================================

# VERCEL-SPECIFIC CONFIGURATION

# =============================================================================

# These are automatically set by Vercel, but you can override them

# VERCEL_URL=your-app.vercel.app

# VERCEL_ENV=production
