# 3D Print Sydney Console - Deployment Guide

Complete deployment documentation for the 3D Print Sydney operations console. This guide covers setup, configuration, and maintenance for both development and production environments.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Steps](#installation-steps)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup & Migrations](#database-setup--migrations)
5. [Stripe Integration Setup](#stripe-integration-setup)
6. [PDF Generation Configuration](#pdf-generation-configuration)
7. [Development vs Production Setup](#development-vs-production-setup)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Maintenance Procedures](#maintenance-procedures)

## System Requirements

### Minimum Requirements

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB free disk space minimum
- **Network**: Internet connection for package installation and Stripe webhooks

### Production Requirements

- **Node.js**: Version 20 LTS (stable)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 10GB+ free disk space for files and PDFs
- **CPU**: 2+ cores recommended for PDF generation
- **Browser**: Modern browser with JavaScript enabled for administration

### Dependencies

The application uses the following key technologies:
- **Next.js 15.5.3**: React framework
- **Prisma 6.16.2**: Database ORM with SQLite
- **Puppeteer 24.21.0**: PDF generation
- **Stripe 18.5.0**: Payment processing
- **React 19.1.0**: UI framework

## Installation Steps

### Quick Start (Automated)

For rapid development setup, use the included automation script:

```bash
# Clone or extract the project
cd 3dprintsydney

# Run automated setup script
npm run up
```

This script performs:
- Dependencies installation
- Prisma client generation
- Database schema synchronization
- Directory creation
- Development server startup

### Manual Installation

For production or custom setups, follow these step-by-step instructions:

#### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Core framework dependencies
- UI components (Radix UI, Tailwind CSS)
- Database tools (Prisma)
- Payment processing (Stripe)
- PDF generation (Puppeteer)

#### 2. Create Required Directories

```bash
mkdir -p data/files data/pdfs
```

Directory structure:
- `data/files/`: Invoice and quote attachments
- `data/pdfs/`: Generated PDF documents
- `data/app.db`: SQLite database (created automatically)

#### 3. Generate Prisma Client

```bash
npm run prisma
# or
npx prisma generate
```

#### 4. Setup Database

```bash
# Initialize database schema
npm run db:push
# or
npx prisma db push

# Seed initial data (optional)
npm run db:seed
# or
npx tsx prisma/seed.ts
```

#### 5. Verify Installation

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Test build
npm run build
```

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="file:./data/app.db"

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Application URL
APP_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

### Environment Variable Details

#### DATABASE_URL
- **Development**: `"file:./data/app.db"`
- **Production**: `"file:/absolute/path/to/data/app.db"`
- **Format**: SQLite file path (relative or absolute)

#### STRIPE_SECRET_KEY
- **Development**: Use Stripe test keys (sk_test_...)
- **Production**: Use Stripe live keys (sk_live_...)
- **Required**: Only if enabling Stripe payments

#### STRIPE_PUBLISHABLE_KEY
- **Development**: Use Stripe test keys (pk_test_...)
- **Production**: Use Stripe live keys (pk_live_...)
- **Required**: Only if enabling Stripe payments

#### STRIPE_WEBHOOK_SECRET
- **Development**: Get from `stripe listen` command
- **Production**: Get from Stripe dashboard webhook configuration
- **Required**: Only if enabling automatic payment reconciliation

#### APP_URL
- **Development**: `"http://localhost:3000"`
- **Production**: Your actual domain (e.g., `"https://console.3dprintsydney.com"`)
- **Purpose**: Used for Stripe redirect URLs and email links

### Configuration Examples

#### Development Environment (.env)
```bash
DATABASE_URL="file:./data/app.db"
STRIPE_SECRET_KEY="sk_test_51..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

#### Production Environment (.env)
```bash
DATABASE_URL="file:/var/lib/3dprintsydney/data/app.db"
STRIPE_SECRET_KEY="sk_live_51..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="https://console.3dprintsydney.com"
NODE_ENV="production"
```

## Database Setup & Migrations

### Database Technology

The application uses **SQLite** with **Prisma ORM** for simplicity and portability.

### Schema Management

#### Initial Setup
```bash
# Generate Prisma client
npx prisma generate

# Apply schema to database
npx prisma db push

# Seed initial data
npx tsx prisma/seed.ts
```

#### Schema Updates
```bash
# After modifying prisma/schema.prisma
npx prisma db push

# Generate updated client
npx prisma generate
```

### Database Schema Overview

The database includes these main entities:

- **Settings**: Business configuration, numbering, taxes
- **Clients**: Customer information and contacts
- **Materials**: 3D printing materials and costs
- **ProductTemplates**: Reusable product configurations
- **Quotes**: Customer quotes with lifecycle management
- **Invoices**: Billing with payment tracking
- **Jobs**: Production queue and printer management
- **Printers**: 3D printer inventory and status
- **Payments**: Payment history and reconciliation
- **ActivityLog**: Audit trail for all operations

### Data Seeding

The seed script creates:
- Default business settings
- Sample payment terms
- Calculator configuration
- Number sequence initialization

```bash
# Run seeding
npm run db:seed
```

### Database Backup

```bash
# Create backup
cp data/app.db data/app.db.backup.$(date +%Y%m%d)

# Restore backup
cp data/app.db.backup.20240101 data/app.db
```

### Database Studio (Development)

```bash
# Open Prisma Studio
npm run db:studio
```

Access at http://localhost:5555 to browse and edit data.

## Stripe Integration Setup

### Overview

Stripe integration provides:
- Secure credit card payments
- Automatic payment reconciliation
- Invoice payment links
- Webhook notifications

### Development Setup

#### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Other platforms
# Download from https://stripe.com/docs/stripe-cli
```

#### 2. Login to Stripe
```bash
stripe login
```

#### 3. Get Test Keys
- Visit https://dashboard.stripe.com/test/apikeys
- Copy publishable and secret keys to `.env`

#### 4. Setup Webhook Forwarding
```bash
# Forward webhooks to local development
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`.

### Production Setup

#### 1. Configure Webhook Endpoint
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/stripe/webhook`
- Select events: `checkout.session.completed`
- Copy webhook secret to production `.env`

#### 2. Update Live Keys
- Get live keys from Stripe Dashboard
- Update `.env` with live keys
- Ensure `APP_URL` points to production domain

### Stripe Configuration Validation

```bash
# Test Stripe connectivity
npm run dev
# Visit http://localhost:3000/api/stripe/test
```

### Manual Payment Alternative

Stripe is optional. The system supports manual payments:
- Cash payments
- Bank transfers
- Check payments
- Other payment methods

## PDF Generation Configuration

### Technology Stack

- **Puppeteer**: Headless Chrome for PDF generation
- **HTML Templates**: Server-side rendered invoice/quote layouts
- **File Storage**: Local file system under `data/pdfs/`

### System Requirements for PDF Generation

#### Linux (Production)
```bash
# Install Chrome dependencies
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

#### macOS/Windows
No additional setup required - Puppeteer bundles Chrome.

### PDF Configuration

Puppeteer is configured with optimized settings:
- Headless mode
- Security sandboxing disabled for containers
- Enhanced rendering flags
- Memory optimization
- PDF-specific optimizations

### PDF Storage

PDFs are stored in `data/pdfs/` with organized naming:
- Quotes: `quote-{number}-{timestamp}.pdf`
- Invoices: `invoice-{number}-{timestamp}.pdf`

### Performance Optimization

For high-volume PDF generation:
- Increase Node.js memory: `node --max-old-space-size=4096`
- Use PM2 clustering for production
- Consider PDF generation queue for high loads

## Development vs Production Setup

### Development Environment

#### Features
- Hot module reloading
- Detailed error messages
- Prisma Studio access
- Source maps enabled
- Local file storage

#### Setup Commands
```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start development server
npm run dev

# Access at http://localhost:3000
```

#### Development Tools
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format:write

# Database studio
npm run db:studio

# Smoke test
node --import tsx scripts/smoke.ts
```

### Production Environment

#### Features
- Optimized builds
- Error logging
- Production database paths
- Security hardening
- Performance monitoring

#### Setup Commands
```bash
# Install production dependencies
npm ci --only=production

# Setup database
npm run db:push

# Build application
npm run build

# Start production server
npm start
```

#### Production Considerations

1. **Environment Variables**
   - Use absolute paths for DATABASE_URL
   - Set NODE_ENV=production
   - Use live Stripe keys
   - Configure proper APP_URL

2. **File Permissions**
   ```bash
   # Set proper permissions
   chmod 755 data/
   chmod 644 data/app.db
   chmod 755 data/files/ data/pdfs/
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start npm --name "3dprintsydney" -- start
   pm2 startup
   pm2 save
   ```

4. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name console.3dprintsydney.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Troubleshooting Guide

### Common Issues

#### 1. Node.js Version Mismatch
**Symptoms**: Build failures, dependency conflicts
**Solution**:
```bash
# Check version
node --version

# Install correct version (using nvm)
nvm install 20
nvm use 20
```

#### 2. Database Connection Issues
**Symptoms**: Prisma client errors, database not found
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
rm data/app.db
npx prisma db push
```

#### 3. PDF Generation Failures
**Symptoms**: Puppeteer launch errors, missing dependencies
**Solution (Linux)**:
```bash
# Install Chrome dependencies
sudo apt-get install -y chromium-browser

# Alternative: use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

#### 4. Stripe Webhook Issues
**Symptoms**: Payments not updating, webhook failures
**Solution**:
```bash
# Verify webhook endpoint
curl -X POST https://yourdomain.com/api/stripe/webhook

# Check webhook secret
stripe listen --print-secret
```

#### 5. File Permission Issues
**Symptoms**: Cannot write files, PDF generation fails
**Solution**:
```bash
# Fix permissions
sudo chown -R $USER:$USER data/
chmod -R 755 data/
```

#### 6. Port Already in Use
**Symptoms**: EADDRINUSE error on startup
**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run dev
```

### Debug Commands

```bash
# Detailed npm logging
npm run dev --loglevel verbose

# Node.js debugging
NODE_DEBUG=* npm run dev

# Prisma query logging
DEBUG="prisma:query" npm run dev

# Stripe webhook debugging
stripe listen --forward-to http://localhost:3000/api/stripe/webhook --print-secret
```

### Log Analysis

#### Application Logs
- Development: Console output
- Production: Check PM2 logs (`pm2 logs`)

#### Database Logs
- SQLite errors in application logs
- Use Prisma Studio for data inspection

#### Stripe Logs
- Stripe Dashboard → Webhooks → View events
- Local: Stripe CLI event forwarding logs

## Maintenance Procedures

### Regular Maintenance

#### Daily Tasks
- Monitor application logs
- Check disk space for `data/` directory
- Verify Stripe webhook connectivity

#### Weekly Tasks
- Database backup
- Clear old PDF files if needed
- Review system performance

#### Monthly Tasks
- Update dependencies
- Security audit
- Review and archive old data

### Backup Procedures

#### Database Backup
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp data/app.db "backups/app.db.$DATE"

# Keep only last 30 backups
find backups/ -name "app.db.*" -mtime +30 -delete
```

#### Full Data Backup
```bash
#!/bin/bash
# backup-full.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backups/3dprintsydney-$DATE.tar.gz" data/

# Upload to cloud storage (optional)
# aws s3 cp "backups/3dprintsydney-$DATE.tar.gz" s3://your-backup-bucket/
```

### Update Procedures

#### Application Updates
```bash
# 1. Stop application
pm2 stop 3dprintsydney

# 2. Backup data
./backup-full.sh

# 3. Update code
git pull origin main

# 4. Install dependencies
npm ci

# 5. Run migrations
npx prisma db push

# 6. Build application
npm run build

# 7. Restart application
pm2 restart 3dprintsydney
```

#### Dependency Updates
```bash
# Check for updates
npm outdated

# Update non-breaking changes
npm update

# Major version updates (careful!)
npm install package@latest

# Security updates
npm audit fix
```

### Performance Monitoring

#### Key Metrics
- Response times
- Memory usage
- Database size
- PDF generation time
- File storage usage

#### Monitoring Commands
```bash
# Check memory usage
ps aux | grep node

# Check disk usage
du -sh data/

# Check database size
ls -lh data/app.db

# Check PDF storage
du -sh data/pdfs/
```

### Security Maintenance

#### Regular Security Tasks
1. **Update Dependencies**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Review Access Logs**
   - Monitor unusual access patterns
   - Check for failed login attempts

3. **Backup Verification**
   - Test backup restoration
   - Verify backup integrity

4. **SSL Certificate Renewal** (if using HTTPS)
   ```bash
   # For Let's Encrypt
   certbot renew
   ```

### Disaster Recovery

#### Data Recovery Process
1. Stop the application
2. Restore from latest backup
3. Verify data integrity
4. Restart application
5. Test all functionality

#### Recovery Commands
```bash
# Stop application
pm2 stop 3dprintsydney

# Restore data
tar -xzf backups/3dprintsydney-YYYYMMDD_HHMMSS.tar.gz

# Verify database
npx prisma db push --accept-data-loss

# Restart application
pm2 restart 3dprintsydney
```

### Contact and Support

For deployment issues or questions:
1. Check this documentation first
2. Review application logs
3. Check GitHub issues (if applicable)
4. Contact system administrator

---

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start              # Start production server

# Database
npm run db:push        # Apply schema changes
npm run db:seed        # Seed initial data
npm run db:studio      # Open database browser

# Maintenance
npm run lint           # Check code quality
npm run typecheck      # Check TypeScript
npm audit             # Security audit
```

### File Locations
- **Database**: `data/app.db`
- **Attachments**: `data/files/{invoiceId}/`
- **PDFs**: `data/pdfs/`
- **Configuration**: `.env`
- **Logs**: PM2 logs or console output

### Important URLs
- **Application**: http://localhost:3000
- **Database Studio**: http://localhost:5555
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Webhook Test**: http://localhost:3000/api/stripe/test

This deployment guide should cover all aspects of setting up and maintaining the 3D Print Sydney console. Follow the procedures in order, and refer to the troubleshooting section if you encounter any issues.