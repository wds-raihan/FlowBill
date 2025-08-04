# Invoice Generator - Deployment Guide

This guide covers deploying the Invoice Generator application to various environments including local development, staging, and production.

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- MongoDB instance
- Email service (SMTP)
- Domain name (for production)
- SSL certificates (for production)

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Application
NODE_ENV=production
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb://username:password@host:port/database

# Authentication Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Optional: Monitoring
GRAFANA_PASSWORD=your-grafana-password
```

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone and prepare the repository:**
```bash
git clone <your-repo-url>
cd invoice-generator
cp .env.example .env.local
# Edit .env.local with your configuration
```

2. **Build and start services:**
```bash
# Development
docker-compose up -d

# Production with monitoring
docker-compose --profile production --profile monitoring up -d
```

3. **Verify deployment:**
```bash
# Check health
curl http://localhost:3000/api/health

# Check logs
docker-compose logs -f app
```

### Option 2: Manual Deployment

1. **Install dependencies:**
```bash
npm install
```

2. **Build the application:**
```bash
npm run build
```

3. **Start the application:**
```bash
npm start
```

### Option 3: Vercel Deployment

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy to Vercel:**
```bash
vercel --prod
```

3. **Configure environment variables in Vercel dashboard**

### Option 4: AWS/Azure/GCP

#### AWS ECS Deployment

1. **Build and push Docker image:**
```bash
# Build image
docker build -t invoice-generator .

# Tag for ECR
docker tag invoice-generator:latest <account-id>.dkr.ecr.<region>.amazonaws.com/invoice-generator:latest

# Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/invoice-generator:latest
```

2. **Create ECS task definition and service**

3. **Configure Application Load Balancer**

4. **Set up RDS for MongoDB or use DocumentDB**

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificates:**
```bash
# Using Let's Encrypt
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

2. **Configure Nginx (if using reverse proxy):**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Headers

The application automatically includes security headers via middleware:
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting

Built-in rate limiting is configured for:
- Authentication: 5 requests per 15 minutes
- Email sending: 10 requests per 15 minutes
- API endpoints: 100 requests per minute

## 📊 Monitoring and Logging

### Health Checks

- **Basic health check:** `GET /api/health`
- **Detailed health check:** `POST /api/health`

### Monitoring Stack (Optional)

If using the monitoring profile:
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/password from env)

### Application Logs

```bash
# View application logs
docker-compose logs -f app

# View all service logs
docker-compose logs -f
```

### Performance Monitoring

The application includes built-in performance monitoring:
- Core Web Vitals tracking
- API response time monitoring
- Memory usage tracking
- Cache hit/miss ratios

## 🔧 Database Setup

### MongoDB Configuration

1. **Create database and user:**
```javascript
// Connect to MongoDB
use invoice_generator

// Create application user
db.createUser({
  user: "invoice_app",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "invoice_generator" }
  ]
})
```

2. **Create indexes for performance:**
```javascript
// User indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ orgId: 1 })

// Invoice indexes
db.invoices.createIndex({ orgId: 1, invoiceNo: 1 }, { unique: true })
db.invoices.createIndex({ orgId: 1, status: 1 })
db.invoices.createIndex({ orgId: 1, dueDate: 1 })
db.invoices.createIndex({ customerId: 1, status: 1 })

// Customer indexes
db.customers.createIndex({ orgId: 1, email: 1 }, { unique: true })
db.customers.createIndex({ orgId: 1, isActive: 1 })
```

## 🚀 Performance Optimization

### Production Optimizations

1. **Enable output file tracing in next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
}
```

2. **Configure caching:**
- Static assets: 1 year cache
- API responses: Appropriate cache headers
- Database queries: In-memory caching

3. **Image optimization:**
- Use Next.js Image component
- Configure image domains in next.config.js
- Implement lazy loading

### CDN Configuration

For production, configure a CDN for static assets:

```javascript
// next.config.js
const nextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://cdn.yourdomain.com' : '',
  images: {
    domains: ['cdn.yourdomain.com'],
  },
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Build Docker image
        run: docker build -t invoice-generator .
      
      - name: Deploy to production
        run: |
          # Your deployment script here
```

## 🛠️ Troubleshooting

### Common Issues

1. **Database connection issues:**
```bash
# Check MongoDB connectivity
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

2. **Memory issues:**
```bash
# Check memory usage
docker stats
```

3. **SSL certificate issues:**
```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm start
```

### Performance Issues

1. **Check Core Web Vitals:** Use browser dev tools
2. **Monitor API response times:** Check `/api/health` endpoint
3. **Database performance:** Monitor slow queries
4. **Memory leaks:** Use Node.js profiling tools

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load balancer configuration**
2. **Session store (Redis)**
3. **Database clustering**
4. **CDN for static assets**

### Vertical Scaling

1. **Increase container resources**
2. **Database optimization**
3. **Caching strategies**

## 🔐 Backup and Recovery

### Database Backups

```bash
# Create backup
docker-compose exec mongo mongodump --out /backup

# Restore backup
docker-compose exec mongo mongorestore /backup
```

### Application Backups

1. **Code repository:** Git
2. **Environment configuration:** Secure storage
3. **User uploads:** Cloud storage backup
4. **Database:** Regular automated backups

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Check health endpoints
5. Review security configurations

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Update dependencies:** Monthly security updates
2. **Database maintenance:** Index optimization, cleanup
3. **Log rotation:** Prevent disk space issues
4. **SSL certificate renewal:** Automated with Let's Encrypt
5. **Performance monitoring:** Regular performance audits

### Update Process

1. **Test in staging environment**
2. **Create database backup**
3. **Deploy with zero-downtime strategy**
4. **Verify health checks**
5. **Monitor for issues**

---

This deployment guide ensures your Invoice Generator application is production-ready with proper security, monitoring, and scalability considerations.