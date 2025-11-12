import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    logger.info({
      scope: 'email.webhook',
      data: {
        type: body.type,
        emailId: body.data?.email_id,
        created: body.created_at,
      },
    });

    // Handle different webhook event types
    switch (body.type) {
      case 'email.delivered':
        logger.info({
          scope: 'email.webhook.delivered',
          data: {
            emailId: body.data?.email_id,
            to: body.data?.to,
          },
        });
        break;

      case 'email.bounced':
        logger.warn({
          scope: 'email.webhook.bounced',
          data: {
            emailId: body.data?.email_id,
            to: body.data?.to,
            reason: body.data?.bounce_type,
          },
        });
        break;

      case 'email.complained':
        logger.warn({
          scope: 'email.webhook.complained',
          data: {
            emailId: body.data?.email_id,
            to: body.data?.to,
          },
        });
        break;

      case 'email.opened':
        logger.info({
          scope: 'email.webhook.opened',
          data: {
            emailId: body.data?.email_id,
            to: body.data?.to,
          },
        });
        break;

      case 'email.clicked':
        logger.info({
          scope: 'email.webhook.clicked',
          data: {
            emailId: body.data?.email_id,
            to: body.data?.to,
            link: body.data?.link,
          },
        });
        break;

      default:
        logger.info({
          scope: 'email.webhook.unknown',
          data: {
            type: body.type,
          },
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({
      scope: 'email.webhook',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
