# Plan: Quality & Observability Improvements

## Plan Description
Enhance production observability with comprehensive error monitoring, structured logging, performance tracking, and automated health checks. Implement proactive issue detection before users report problems.

## User Story
As a developer/business owner
I want comprehensive visibility into production errors, performance issues, and system health
So that I can proactively fix issues before they impact users and understand usage patterns

## Problem Statement
Current observability gaps:

1. **Limited Error Tracking**
   - Basic console logging insufficient for production debugging
   - No error aggregation or alerting
   - Client-side errors not captured
   - No error trend analysis

2. **No Performance Monitoring**
   - Slow API responses not tracked
   - 3D rendering performance unknown
   - Database query performance not measured
   - No alerts for degraded performance

## Solution Statement

### Error Monitoring
- Integrate Sentry for error tracking and alerting
- Capture client-side and server-side errors
- Add error context (user ID, session, request data)
- Set up error rate alerts
- Track error trends over time

### Performance Monitoring
- Add response time tracking to all API routes
- Monitor 3D rendering frame rates
- Track database query duration
- Set up performance budgets and alerts
- Log slow operations (>1s threshold)

### Structured Logging Enhancement
- Enhance existing logger with performance metrics
- Add request/response correlation IDs
- Implement log levels (debug, info, warn, error)
- Add business event logging (order created, payment completed)
- Export logs to external service (optional: LogDrain, Papertrail)

### Health Checks
- Add `/api/health` endpoint for uptime monitoring
- Check database connectivity
- Check external API availability (Stripe, Australia Post)
- Monitor disk space and memory
- Automated daily health check reports

## Pattern Analysis

From codebase exploration:

1. **Existing Logger** (`/src/lib/logger.ts`)
   - Basic structured JSON logging already implemented
   - Uses console.log/error with scope and context
   - Pattern: `logger.error({ scope: 'service.action', message: '...', error })`

2. **Error Handling** (`/src/lib/errors/app-error.ts`)
   - AppError hierarchy with status codes
   - ValidationError, NotFoundError, UnauthorizedError subclasses
   - Used throughout service layer

3. **API Architecture** (`/src/app/api/*/route.ts`)
   - Response envelope pattern: `{ success, data, error }`
   - Try/catch blocks around service calls
   - Consistent error serialization

4. **Performance Considerations**
   - 3D rendering uses React Three Fiber (no perf tracking)
   - Database queries via Supabase (no duration logging)
   - API routes have no response time measurement

## Dependencies

### External Dependencies
- `@sentry/nextjs` - Error monitoring and performance tracking
- `pino` (optional) - High-performance structured logging (upgrade from console)
- `@vercel/analytics` (optional) - If deployed on Vercel

### Environment Variables
```bash
SENTRY_DSN=https://...
SENTRY_ORG=3dprintsydney
SENTRY_PROJECT=client-portal
SENTRY_ENVIRONMENT=production # or staging, development
```

## Relevant Files

**To Update:**
- `/src/lib/logger.ts` - Enhance with performance tracking, correlation IDs
- `/src/lib/errors/app-error.ts` - Add Sentry integration
- `/src/app/api/*/route.ts` - Add response time logging (via middleware)
- `/src/components/3d/ModelViewer.tsx` - Add FPS monitoring
- `/src/server/services/*.ts` - Add performance logging to slow operations

**New Files:**
- `/src/lib/monitoring/sentry.ts` - Sentry client setup
- `/src/lib/monitoring/performance.ts` - Performance tracking utilities
- `/src/middleware.ts` - API response time logging middleware
- `/src/app/api/health/route.ts` - Health check endpoint
- `/src/hooks/use-performance-monitor.ts` - Client-side performance monitoring
- `/instrumentation.ts` - Next.js instrumentation for Sentry

## Acceptance Criteria

### Error Monitoring
- [ ] Sentry capturing client-side errors
- [ ] Sentry capturing server-side errors
- [ ] Errors include user context (ID, email)
- [ ] Errors include request context (URL, headers, body)
- [ ] Email alerts for critical errors
- [ ] Error dashboard shows trends

### Performance Monitoring
- [ ] API response times logged for all routes
- [ ] Slow operations (>1s) flagged and logged
- [ ] 3D rendering FPS tracked (warn if <30fps)
- [ ] Database query durations logged
- [ ] Performance regression alerts

### Health Checks
- [ ] `/api/health` endpoint returns 200 if healthy
- [ ] Health check validates database connection
- [ ] Health check validates external API connectivity
- [ ] Automated uptime monitoring configured
- [ ] Daily health reports sent

### Logging Enhancement
- [ ] All logs include correlation ID
- [ ] Log levels enforced (debug disabled in prod)
- [ ] Business events logged (orders, payments)
- [ ] Logs exportable to external service

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Test monitoring in staging before production
- Check Acceptance Criteria - all items are REQUIRED
- If blocked, document and continue other steps

### 1. Install and Configure Sentry

```bash
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Update `.env.local.example`:**
```bash
# Error Monitoring
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_ENVIRONMENT=production
```

**Create `/instrumentation.ts`** (Next.js 15 instrumentation):
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry
    await import('./sentry.edge.config');
  }
}
```

**Create `/sentry.server.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 1.0, // Adjust for production (0.1 = 10% of transactions)
  debug: false,

  // Capture user context
  beforeSend(event, hint) {
    // Add custom context
    return event;
  },

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});
```

**Create `/sentry.client.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 1.0,

  // Capture user context
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
});
```

### 2. Add Sentry User Context

**Create `/src/lib/monitoring/sentry.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

export function setSentryUser(user: { id: string; email: string; role: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}
```

**Update authentication flows to set user:**
- `/src/app/(client)/layout.tsx` - Call `setSentryUser()` after auth check
- `/src/app/(admin)/layout.tsx` - Call `setSentryUser()` for admin users
- Logout: Call `clearSentryUser()`

### 3. Enhance Logger with Performance Tracking

**Update `/src/lib/logger.ts`:**
```typescript
import { v4 as uuidv4 } from 'uuid';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  scope: string;
  message: string;
  level?: LogLevel;
  correlationId?: string;
  duration?: number; // milliseconds
  error?: unknown;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private shouldLog(level: LogLevel): boolean {
    if (level === 'debug' && !this.isDevelopment) return false;
    return true;
  }

  private formatLog(context: LogContext): string {
    const timestamp = new Date().toISOString();
    const { scope, message, level = 'info', correlationId, duration, error, ...rest } = context;

    const logEntry = {
      timestamp,
      level,
      scope,
      message,
      correlationId,
      duration,
      ...rest,
    };

    if (error) {
      logEntry.error = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    }

    return JSON.stringify(logEntry);
  }

  debug(context: Omit<LogContext, 'level'>) {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatLog({ ...context, level: 'debug' }));
  }

  info(context: Omit<LogContext, 'level'>) {
    if (!this.shouldLog('info')) return;
    console.log(this.formatLog({ ...context, level: 'info' }));
  }

  warn(context: Omit<LogContext, 'level'>) {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatLog({ ...context, level: 'warn' }));
  }

  error(context: Omit<LogContext, 'level'>) {
    if (!this.shouldLog('error')) return;
    console.error(this.formatLog({ ...context, level: 'error' }));

    // Also send to Sentry
    if (context.error instanceof Error) {
      import('@/lib/monitoring/sentry').then(({ captureException }) => {
        captureException(context.error as Error, context);
      });
    }
  }

  // Generate correlation ID for request tracking
  generateCorrelationId(): string {
    return uuidv4();
  }
}

export const logger = new Logger();

// Performance tracking utility
export class PerformanceTracker {
  private startTime: number;
  private scope: string;
  private correlationId: string;

  constructor(scope: string, correlationId?: string) {
    this.scope = scope;
    this.correlationId = correlationId || logger.generateCorrelationId();
    this.startTime = Date.now();
  }

  end(message: string, context?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;

    if (duration > 1000) {
      // Slow operation warning
      logger.warn({
        scope: this.scope,
        message: `SLOW: ${message}`,
        duration,
        correlationId: this.correlationId,
        ...context,
      });
    } else {
      logger.info({
        scope: this.scope,
        message,
        duration,
        correlationId: this.correlationId,
        ...context,
      });
    }

    return duration;
  }
}
```

### 4. Add API Response Time Middleware

**Create `/src/middleware.ts`:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  // Clone response to add timing headers
  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // Log after response (using edge runtime)
  const duration = Date.now() - startTime;

  if (duration > 1000) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      scope: 'api.response-time',
      message: 'SLOW API response',
      correlationId,
      duration,
      method: request.method,
      url: request.url,
    }));
  }

  return response;
}

export const config = {
  matcher: '/api/:path*', // Only run on API routes
};
```

### 5. Add Performance Tracking to Services

**Example: Update `/src/server/services/jobs.ts`:**
```typescript
import { PerformanceTracker, logger } from '@/lib/logger';

export async function getJobById(id: string): Promise<Job> {
  const perf = new PerformanceTracker('jobs.getById');

  try {
    const job = await db.from('jobs').select('*').eq('id', id).single();

    perf.end('Job fetched successfully', { jobId: id });

    return job;
  } catch (error) {
    logger.error({
      scope: 'jobs.getById',
      message: 'Failed to fetch job',
      error,
      jobId: id,
    });
    throw error;
  }
}
```

**Apply pattern to all service methods:**
- `/src/server/services/clients.ts`
- `/src/server/services/invoices.ts`
- `/src/server/services/quick-order.ts`
- `/src/server/services/calculator.ts`

### 6. Add Client-Side Performance Monitoring

**Create `/src/hooks/use-performance-monitor.ts`:**
```typescript
import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
}

export function usePerformanceMonitor(
  componentName: string,
  onMetrics?: (metrics: PerformanceMetrics) => void
) {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    let animationId: number;

    const measureFPS = () => {
      frameCountRef.current++;

      const now = Date.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        // Calculate FPS over last second
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);

        if (fps < 30) {
          console.warn(`[Performance] ${componentName} low FPS: ${fps}`);
        }

        if (onMetrics) {
          onMetrics({ fps, renderTime: elapsed / frameCountRef.current });
        }

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [componentName, onMetrics]);
}
```

**Update `/src/components/3d/ModelViewer.tsx`:**
```typescript
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

export function ModelViewer({ url }: ModelViewerProps) {
  // Monitor rendering performance
  usePerformanceMonitor('ModelViewer', (metrics) => {
    if (metrics.fps < 30) {
      logger.warn({
        scope: '3d.performance',
        message: 'Low FPS detected in 3D viewer',
        fps: metrics.fps,
      });
    }
  });

  // ... rest of component
}
```

### 7. Create Health Check Endpoint

**Create `/src/app/api/health/route.ts`:**
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/server/integrations/stripe';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    stripe: { status: string; error?: string };
    auspost: { status: string; error?: string };
  };
}

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const timestamp = new Date().toISOString();
  const checks: HealthCheck['checks'] = {
    database: { status: 'unknown' },
    stripe: { status: 'unknown' },
    auspost: { status: 'unknown' },
  };

  // Check database
  try {
    const dbStart = Date.now();
    const supabase = createClient();
    await supabase.from('clients').select('id').limit(1).single();
    const dbLatency = Date.now() - dbStart;

    checks.database = { status: 'healthy', latency: dbLatency };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: String(error) };
  }

  // Check Stripe
  try {
    const stripe = getStripeClient();
    await stripe.balance.retrieve(); // Simple API call
    checks.stripe = { status: 'healthy' };
  } catch (error) {
    checks.stripe = { status: 'unhealthy', error: String(error) };
  }

  // Check Australia Post (if configured)
  try {
    const apiKey = process.env.AUSPOST_API_KEY;
    if (apiKey) {
      // Simple ping or rate fetch
      checks.auspost = { status: 'healthy' };
    } else {
      checks.auspost = { status: 'not_configured' };
    }
  } catch (error) {
    checks.auspost = { status: 'unhealthy', error: String(error) };
  }

  // Determine overall status
  const hasUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');

  const status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

  const response: HealthCheck = {
    status,
    timestamp,
    checks,
  };

  return NextResponse.json(response, {
    status: status === 'healthy' ? 200 : 503,
  });
}
```

### 8. Add Business Event Logging

**Create `/src/lib/monitoring/events.ts`:**
```typescript
import { logger } from '@/lib/logger';

export const businessEvents = {
  orderCreated: (orderId: string, clientId: string, total: number) => {
    logger.info({
      scope: 'business.order.created',
      message: 'New order created',
      orderId,
      clientId,
      total,
    });
  },

  paymentCompleted: (invoiceId: string, amount: number, method: string) => {
    logger.info({
      scope: 'business.payment.completed',
      message: 'Payment completed',
      invoiceId,
      amount,
      method,
    });
  },

  jobCompleted: (jobId: string, duration: number) => {
    logger.info({
      scope: 'business.job.completed',
      message: 'Job completed',
      jobId,
      duration,
    });
  },

  clientRegistered: (clientId: string, email: string) => {
    logger.info({
      scope: 'business.client.registered',
      message: 'New client registered',
      clientId,
      email,
    });
  },
};
```

**Integrate into service methods:**
- Call `businessEvents.orderCreated()` in `/src/server/services/quick-order.ts`
- Call `businessEvents.paymentCompleted()` in payment webhook handler
- Call `businessEvents.jobCompleted()` when job status set to COMPLETED
- Call `businessEvents.clientRegistered()` on client signup

### 9. Configure Sentry Alerts

**In Sentry Dashboard:**
1. Go to Alerts → Create Alert Rule
2. Create alert for:
   - **Critical Errors**: Error count > 10 in 5 minutes
   - **Payment Failures**: Payment-related errors
   - **3D Preview Crashes**: WebGL context loss errors
   - **Slow API**: Response time > 3s for any route
3. Configure notification channels (Email, Slack)

### 10. Set Up Uptime Monitoring

**Option A: Use Sentry Crons**
```typescript
// In a scheduled task or cron job
import * as Sentry from '@sentry/nextjs';

const checkId = Sentry.captureCheckIn({
  monitorSlug: 'health-check',
  status: 'in_progress',
});

try {
  const response = await fetch('https://yourdomain.com/api/health');
  const data = await response.json();

  Sentry.captureCheckIn({
    checkInId: checkId,
    monitorSlug: 'health-check',
    status: data.status === 'healthy' ? 'ok' : 'error',
  });
} catch (error) {
  Sentry.captureCheckIn({
    checkInId: checkId,
    monitorSlug: 'health-check',
    status: 'error',
  });
}
```

**Option B: Use External Service**
- UptimeRobot (free tier)
- Pingdom
- Uptime.com

Configure to ping `/api/health` every 5 minutes, alert if non-200 response.

### 11. Run Validation Commands

```bash
# Build check
npm run build
# EXPECTED: No errors, Sentry sourcemaps uploaded

# Type check
npx tsc --noEmit
# EXPECTED: No type errors

# Test Sentry error capture
npm run dev
# Trigger test error in browser
# EXPECTED: Error appears in Sentry dashboard within 1 minute

# Test health endpoint
curl http://localhost:3000/api/health
# EXPECTED: 200 OK, JSON with status: "healthy"

# Test performance logging
# Create order, check logs
# EXPECTED: Logs show duration for each operation
# EXPECTED: Warnings for operations >1s

# Test FPS monitoring
# Load 3D model, rotate rapidly
# EXPECTED: FPS logged, warnings if <30fps
```

### 12. Production Deployment Checklist

```bash
# Set environment variables
SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_ENVIRONMENT=production

# Build with Sentry integration
npm run build
# EXPECTED: Sentry CLI uploads sourcemaps

# Deploy
# EXPECTED: Sentry creates new release

# Verify monitoring
# 1. Check Sentry dashboard for incoming events
# 2. Check health endpoint: curl https://yourdomain.com/api/health
# 3. Trigger test error, verify alert received
# 4. Review performance data in Sentry

# Set up daily health reports (optional)
# Create cron job to email health check results
```

## Testing Strategy

### Unit Tests
- Test `PerformanceTracker.end()` logs duration correctly
- Test `logger.error()` sends to Sentry
- Test health check handles database failures gracefully

### Integration Tests
- Trigger error in API route, verify Sentry capture
- Load 3D model, verify FPS monitoring works
- Call slow endpoint, verify performance warning logged

### Manual Testing
- Create order → Check logs for business event
- Cause error → Check Sentry dashboard within 1 minute
- Load `/api/health` → Verify all checks pass
- Simulate slow operation → Verify warning logged

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Sentry integrated and capturing errors
- [ ] Performance tracking on all API routes
- [ ] FPS monitoring on 3D viewer
- [ ] Health check endpoint working
- [ ] Business events logged
- [ ] Alerts configured in Sentry
- [ ] Uptime monitoring configured
- [ ] All validation commands pass
- [ ] Production deployment checklist complete

# Implementation log: specs/fixes/quality-observability/quality-observability_implementation.log
