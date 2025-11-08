# Resend Email Integration Research

## Executive Summary

Resend is a developer-focused transactional email service with excellent Next.js integration, React Email template support, and robust webhook system. Recommended for Next.js App Router with Server Actions pattern.

---

## 1. Integration Approach Recommendations

### Next.js App Router with Server Actions (Recommended)

**Benefits:**
- Server-only execution (secure API key handling)
- Native Next.js 14+ compatibility
- Simplest implementation pattern
- No need for separate API routes

**Implementation:**

```typescript
// app/actions/email.ts
'use server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(data: EmailData) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: data.to,
      subject: data.subject,
      react: EmailTemplate(data),
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Route Handler Pattern (Alternative)

For API-style endpoints or external integrations:

```typescript
// app/api/send-email/route.ts
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: body.to,
    subject: body.subject,
    react: EmailTemplate(body),
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

### Setup Steps

1. Install dependencies:
```bash
npm install resend @react-email/components
```

2. Configure environment:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

3. Add to .gitignore (verify it's there):
```
.env.local
.env
```

---

## 2. Template Strategy Recommendations

### React Email (Strongly Recommended)

**Advantages:**
- Component-based, reusable architecture
- Tailwind CSS support
- Live preview during development
- TypeScript support
- Modern DX, no table-based HTML
- Compatible with all major email clients (tested)

**Development Workflow:**

```typescript
// emails/welcome.tsx
import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Preview,
} from '@react-email/components';

interface WelcomeEmailProps {
  firstName: string;
  verificationUrl: string;
}

export function WelcomeEmail({ firstName, verificationUrl }: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Preview>Welcome to 3D Print Sydney - Verify your email</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome {firstName}!</Heading>
          <Text style={text}>
            Thanks for signing up. Click below to verify your email.
          </Text>
          <Button href={verificationUrl} style={button}>
            Verify Email
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { margin: '0 auto', padding: '20px' };
const h1 = { color: '#333', fontSize: '24px' };
const text = { color: '#555', fontSize: '16px' };
const button = {
  backgroundColor: '#5469d4',
  color: '#fff',
  padding: '12px 20px',
  borderRadius: '4px',
  textDecoration: 'none',
};
```

**Preview Setup:**

```bash
# Add to package.json scripts
"email:dev": "email dev"

# Run preview server
npm run email:dev
```

Preview server features:
- Live reload on changes
- Desktop/mobile toggle
- Send test emails via Resend
- Multiple templates in sidebar

### Component Organization

```
emails/
├── components/           # Reusable email components
│   ├── footer.tsx
│   ├── header.tsx
│   └── button.tsx
├── templates/           # Full email templates
│   ├── welcome.tsx
│   ├── invoice.tsx
│   ├── quote.tsx
│   ├── password-reset.tsx
│   └── order-confirmation.tsx
└── utils/               # Email utilities
    └── styles.ts        # Shared styles
```

### HTML Alternative (Not Recommended)

Only use for simple, one-off emails:

```typescript
const { data } = await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com',
  subject: 'Simple notification',
  html: '<strong>Your order is ready!</strong>',
});
```

**Limitations:**
- No type safety
- Difficult to maintain
- Manual table layouts
- No preview tooling
- Hard to test responsiveness

---

## 3. Security Considerations

### API Key Management

**Storage:**
- Use environment variables only (`RESEND_API_KEY`)
- Never hardcode in source files
- Never commit to version control
- Store in .env.local for development
- Use platform secrets for production (Vercel, etc.)

**Permissions:**
Resend offers two permission levels:
- **Full Access**: Create, delete, get, update any resource
- **Sending Access**: Only send emails (recommended for production)

**Best Practices:**
- Use separate keys per environment (dev/staging/prod)
- Use "Sending Access" for application keys
- Use "Full Access" only for admin/setup scripts
- Create multiple keys for different apps/services
- Monitor key usage via Resend dashboard
- Delete keys unused for 30+ days
- Never log API keys

**Key Rotation:**
```typescript
// Graceful key rotation pattern
const resend = new Resend(
  process.env.RESEND_API_KEY_NEW || process.env.RESEND_API_KEY
);
```

### Domain Verification

**Setup DNS records:**
1. Add records from Resend dashboard
2. Verify ownership before sending
3. Use custom domain (not @resend.dev in production)

**Benefits:**
- Better deliverability
- Professional sender addresses
- Required for open/click tracking
- Avoids spam filters

### Input Validation

```typescript
import { z } from 'zod';

const EmailSchema = z.object({
  to: z.string().email().or(z.array(z.string().email())),
  subject: z.string().min(1).max(255),
  // Validate all user inputs
});

export async function sendEmail(rawData: unknown) {
  const data = EmailSchema.parse(rawData); // Throws if invalid
  // ... send email
}
```

### Rate Limiting Protection

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 emails per hour per user
});

export async function sendEmail(userId: string, data: EmailData) {
  const { success } = await ratelimit.limit(`email:${userId}`);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
  // ... send email
}
```

---

## 4. Error Handling and Retry Logic

### Resend Rate Limits

**Default:** 2 requests/second per customer
- Can be increased on request
- Applies to API calls, not email volume

**Pricing Tiers & Limits:**
- **Free**: 3,000 emails/month, 1-day log retention, 1 domain
- **Pro**: Higher volume, 3-day logs, unlimited domains
- **Scale**: 100k emails/month ($90), 7-day logs
- **Enterprise**: Custom limits, dedicated support

### Error Handling Pattern

```typescript
import { ResendError } from 'resend';

export async function sendEmailWithRetry(data: EmailData, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await resend.emails.send(data);
      return { success: true, data: result };
    } catch (error) {
      // Resend-specific errors
      if (error instanceof ResendError) {
        // Don't retry client errors (4xx)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          console.error('Client error, not retrying:', error.message);
          return { success: false, error: error.message };
        }
      }

      // Retry on server errors (5xx) or network issues
      if (attempt < retries - 1) {
        const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      // Final attempt failed
      return { success: false, error: error.message };
    }
  }
}
```

### Exponential Backoff Implementation

```typescript
async function exponentialBackoff(
  fn: () => Promise<any>,
  maxRetries = 5,
  baseDelay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const delay = Math.pow(2, i) * baseDelay + jitter;

      // Check for Retry-After header (if available)
      const retryAfter = error?.response?.headers?.['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

### Structured Error Logging

```typescript
export async function sendEmail(data: EmailData) {
  const startTime = Date.now();

  try {
    const result = await resend.emails.send(data);

    console.log({
      event: 'email_sent',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      emailId: result.data?.id,
      to: data.to,
      subject: data.subject,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error({
      event: 'email_failed',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: error.message,
      statusCode: error?.statusCode,
      to: data.to,
      subject: data.subject,
    });

    return { success: false, error: error.message };
  }
}
```

### Queue Pattern for Reliability

For critical emails, use a queue:

```typescript
// Using Inngest, BullMQ, or similar
import { inngest } from './inngest/client';

export const sendEmailJob = inngest.createFunction(
  {
    id: 'send-email',
    retries: 5,
  },
  { event: 'email/send' },
  async ({ event }) => {
    await resend.emails.send(event.data);
  }
);

// Trigger from your app
await inngest.send({
  name: 'email/send',
  data: emailData,
});
```

---

## 5. Testing Strategies

### Test Email Addresses

Resend provides special addresses for testing scenarios:

```typescript
// Test different scenarios without sending real emails
const TEST_EMAILS = {
  delivered: 'delivered@resend.dev',
  bounced: 'bounced@resend.dev',
  complained: 'complained@resend.dev',
};

// With labels for tracking
const testEmail = 'delivered+signup@resend.dev'; // Labels supported with +
```

**Test scenarios:**
- `delivered@resend.dev` - Successful delivery
- `bounced@resend.dev` - Simulates SMTP 550 5.1.1 "Unknown User"
- `complained@resend.dev` - Marks as spam

**Labeling system:**
- Append `+label` to track different flows
- Example: `delivered+password-reset@resend.dev`
- Useful for webhook testing and correlation

### Development Environment Setup

```typescript
// lib/email.ts
const getEmailRecipient = (to: string) => {
  if (process.env.NODE_ENV === 'development') {
    // Send all dev emails to test address
    return 'delivered@resend.dev';
  }
  return to;
};

export async function sendEmail(data: EmailData) {
  const result = await resend.emails.send({
    ...data,
    to: getEmailRecipient(data.to),
  });
  return result;
}
```

### React Email Preview Testing

```bash
# Run preview server
npm run email:dev
```

Features:
- Live reload
- Desktop/mobile preview toggle
- Send test emails directly
- Multiple templates in sidebar
- Powered by Resend for sending

### Integration Tests

```typescript
// __tests__/email.test.ts
import { sendWelcomeEmail } from '@/lib/email';

describe('Email sending', () => {
  it('should send welcome email successfully', async () => {
    const result = await sendWelcomeEmail({
      to: 'delivered@resend.dev',
      firstName: 'Test User',
      verificationUrl: 'https://example.com/verify',
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBeDefined();
  });

  it('should handle bounce scenario', async () => {
    const result = await sendWelcomeEmail({
      to: 'bounced@resend.dev',
      firstName: 'Test User',
      verificationUrl: 'https://example.com/verify',
    });

    // Email sends successfully, but bounces are tracked via webhooks
    expect(result.success).toBe(true);
  });
});
```

### Webhook Testing

Use webhook testing tools:

```bash
# Local webhook testing with svix
npx svix listen http://localhost:3000/api/webhooks/resend

# Or use ngrok
ngrok http 3000
```

Mock webhook events:

```typescript
// __tests__/webhooks.test.ts
import { POST } from '@/app/api/webhooks/resend/route';

describe('Resend webhooks', () => {
  it('should handle email.bounced event', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/resend', {
      method: 'POST',
      body: JSON.stringify({
        type: 'email.bounced',
        data: {
          email_id: 'test-123',
          to: 'user@example.com',
          bounced_at: new Date().toISOString(),
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

### Environment-Specific Configuration

```typescript
// config/email.ts
const emailConfig = {
  development: {
    from: 'dev@resend.dev',
    defaultRecipient: 'delivered@resend.dev',
    logLevel: 'debug',
  },
  staging: {
    from: 'staging@yourdomain.com',
    defaultRecipient: null, // Use actual recipients
    logLevel: 'info',
  },
  production: {
    from: 'noreply@yourdomain.com',
    defaultRecipient: null,
    logLevel: 'warn',
  },
};

export const config = emailConfig[process.env.NODE_ENV || 'development'];
```

---

## 6. Webhook Integration for Email Tracking

### Available Events

Resend webhooks provide real-time notifications:

- `email.sent` - API request succeeded, delivery attempted
- `email.delivered` - Successfully delivered to mail server
- `email.delivery_delayed` - Temporary delivery issue
- `email.bounced` - Permanently rejected (hard bounce)
- `email.complained` - Marked as spam
- `email.opened` - Email opened (requires tracking setup)
- `email.clicked` - Link clicked (requires tracking setup)

### Webhook Setup

```typescript
// app/api/webhooks/resend/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.json();
  const svixId = headers().get('svix-id');
  const svixTimestamp = headers().get('svix-timestamp');
  const svixSignature = headers().get('svix-signature');

  // Verify webhook signature (recommended)
  // Implement Svix signature verification here

  switch (body.type) {
    case 'email.delivered':
      await handleEmailDelivered(body.data);
      break;
    case 'email.bounced':
      await handleEmailBounced(body.data);
      break;
    case 'email.complained':
      await handleEmailComplained(body.data);
      break;
    case 'email.opened':
      await handleEmailOpened(body.data);
      break;
    case 'email.clicked':
      await handleEmailClicked(body.data);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleEmailBounced(data: any) {
  // Mark email as invalid in database
  await db.user.update({
    where: { email: data.to },
    data: { emailBounced: true, emailVerified: false },
  });
}

async function handleEmailComplained(data: any) {
  // Unsubscribe user from marketing emails
  await db.user.update({
    where: { email: data.to },
    data: { unsubscribed: true },
  });
}
```

### Retry Mechanism

Resend automatically retries failed webhooks:
- Expects 200 response
- Retry schedule over 10 hours if no 200 received
- Manual retry available in dashboard
- Monitor webhook delivery in Resend dashboard

### Open/Click Tracking Setup

Requires domain tracking configuration:

1. Enable tracking for your domain in Resend dashboard
2. Add tracking DNS records
3. Enable in email send request:

```typescript
const { data } = await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com',
  subject: 'Track this email',
  react: EmailTemplate({}),
  tags: [
    { name: 'category', value: 'marketing' },
    { name: 'user_id', value: '12345' },
  ],
});
```

---

## 7. Example Code Patterns

### Complete Email Service Module

```typescript
// lib/email/service.ts
import { Resend } from 'resend';
import { WelcomeEmail } from '@/emails/welcome';
import { InvoiceEmail } from '@/emails/invoice';
import { QuoteEmail } from '@/emails/quote';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

class EmailService {
  private from = 'noreply@3dprintsydney.com';

  async sendWelcomeEmail(to: string, data: { firstName: string; verificationUrl: string }): Promise<SendEmailResult> {
    return this.send({
      to,
      subject: 'Welcome to 3D Print Sydney',
      react: WelcomeEmail(data),
      tags: [{ name: 'type', value: 'welcome' }],
    });
  }

  async sendInvoice(to: string, data: { invoiceNumber: string; pdfUrl: string }): Promise<SendEmailResult> {
    return this.send({
      to,
      subject: `Invoice ${data.invoiceNumber} from 3D Print Sydney`,
      react: InvoiceEmail(data),
      attachments: [
        {
          filename: `invoice-${data.invoiceNumber}.pdf`,
          path: data.pdfUrl,
        },
      ],
      tags: [{ name: 'type', value: 'invoice' }],
    });
  }

  async sendQuote(to: string, data: { quoteNumber: string; items: any[] }): Promise<SendEmailResult> {
    return this.send({
      to,
      subject: `Quote ${data.quoteNumber} from 3D Print Sydney`,
      react: QuoteEmail(data),
      tags: [{ name: 'type', value: 'quote' }],
    });
  }

  private async send(options: any): Promise<SendEmailResult> {
    try {
      // Override recipient in development
      if (process.env.NODE_ENV === 'development') {
        options.to = 'delivered@resend.dev';
      }

      const result = await resend.emails.send({
        from: this.from,
        ...options,
      });

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();
```

### Server Action Usage

```typescript
// app/actions/auth.ts
'use server';
import { emailService } from '@/lib/email/service';

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;

  // Create user in database
  const user = await db.user.create({
    data: { email, name },
  });

  // Send welcome email
  const verificationUrl = `${process.env.APP_URL}/verify?token=${user.verificationToken}`;
  await emailService.sendWelcomeEmail(email, {
    firstName: name,
    verificationUrl,
  });

  return { success: true };
}
```

### Type-Safe Email Templates

```typescript
// emails/types.ts
export interface WelcomeEmailProps {
  firstName: string;
  verificationUrl: string;
}

export interface InvoiceEmailProps {
  invoiceNumber: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  dueDate: string;
  pdfUrl: string;
}

// emails/invoice.tsx
import { InvoiceEmailProps } from './types';

export function InvoiceEmail(props: InvoiceEmailProps) {
  const { invoiceNumber, customerName, items, total, dueDate } = props;

  return (
    <Html>
      <Preview>Invoice {invoiceNumber} - Due {dueDate}</Preview>
      <Body>
        <Container>
          <Heading>Invoice {invoiceNumber}</Heading>
          <Text>Dear {customerName},</Text>
          <Text>Please find your invoice details below:</Text>

          {/* Items table */}
          {items.map((item, i) => (
            <Text key={i}>
              {item.description} x{item.quantity} - ${item.price}
            </Text>
          ))}

          <Text style={{ fontWeight: 'bold' }}>
            Total: ${total}
          </Text>
          <Text>Due: {dueDate}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## 8. Migration Path

If migrating from another service:

1. **Parallel Run**: Send through both services initially
2. **Monitor**: Compare deliverability metrics
3. **Gradual Cutover**: Move email types incrementally
4. **DNS Updates**: Update SPF/DKIM records
5. **Template Migration**: Convert to React Email components
6. **Webhook Migration**: Update webhook endpoints
7. **Full Cutover**: Disable old service

---

## 9. Monitoring & Analytics

### Resend Dashboard Features

- Email logs (retention based on tier)
- API key usage tracking
- Webhook delivery status
- Bounce/complaint rates
- Open/click rates (if tracking enabled)

### Custom Analytics

```typescript
// Track email metrics in your database
interface EmailLog {
  id: string;
  resendId: string;
  to: string;
  subject: string;
  type: string;
  status: 'sent' | 'delivered' | 'bounced' | 'complained';
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}

// Update via webhooks
async function handleEmailDelivered(data: any) {
  await db.emailLog.update({
    where: { resendId: data.email_id },
    data: {
      status: 'delivered',
      deliveredAt: new Date(data.delivered_at),
    },
  });
}
```

---

## 10. Cost Optimization

### Free Tier Strategy

- 3,000 emails/month free
- Use for development and testing
- Good for MVP validation

### Efficient Usage

- Batch similar emails
- Use webhooks instead of polling
- Implement user preferences (opt-out)
- Remove bounced addresses promptly
- Use transactional emails only when necessary

### Dedicated IP ($30/month)

Consider if:
- Sending >500 emails/day
- Need better deliverability control
- Building sender reputation

---

## 11. Recommendations Summary

**DO:**
- ✅ Use Next.js Server Actions pattern
- ✅ Use React Email for templates
- ✅ Implement webhook handlers
- ✅ Use test email addresses in development
- ✅ Validate all inputs
- ✅ Implement exponential backoff retry
- ✅ Use separate API keys per environment
- ✅ Monitor bounce/complaint rates
- ✅ Set up domain verification
- ✅ Use TypeScript for type safety

**DON'T:**
- ❌ Hardcode API keys
- ❌ Use HTML strings (use React Email)
- ❌ Ignore webhook events
- ❌ Send to unverified emails
- ❌ Skip rate limiting protection
- ❌ Use @resend.dev in production
- ❌ Ignore bounces/complaints
- ❌ Send without error handling
- ❌ Skip test email validation
- ❌ Use "Full Access" keys for apps

---

## 12. Quick Start Checklist

- [ ] Install `resend` and `@react-email/components`
- [ ] Add `RESEND_API_KEY` to `.env.local`
- [ ] Create email service module
- [ ] Set up React Email preview (`npm run email:dev`)
- [ ] Create first email template
- [ ] Implement Server Action for sending
- [ ] Add webhook handler route
- [ ] Set up domain verification
- [ ] Test with `delivered@resend.dev`
- [ ] Configure error handling and retries
- [ ] Implement analytics tracking
- [ ] Set up monitoring alerts

---

## References

- [Resend Official Docs](https://resend.com/docs)
- [React Email Documentation](https://react.email)
- [Next.js Integration Guide](https://resend.com/nextjs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Webhook Events](https://resend.com/docs/dashboard/webhooks/introduction)
- [Rate Limits](https://resend.com/docs/api-reference/rate-limit)
