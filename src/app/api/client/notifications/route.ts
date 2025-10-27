import { NextRequest } from 'next/server';
import { requireClientWithId } from '@/server/auth/api-helpers';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { ok, handleError, fail } from '@/server/api/respond';
import { AppError } from '@/lib/errors';

/**
 * GET /api/client/notifications
 * Fetch current client's notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('clients')
      .select('notify_on_job_status')
      .eq('id', user.clientId)
      .single();

    if (error || !data) {
      throw new AppError(`Failed to load preferences: ${error?.message ?? 'Not found'}`, 'DATABASE_ERROR', 500);
    }

    return ok({
      notifyOnJobStatus: data.notify_on_job_status ?? false,
    });
  } catch (error) {
    return handleError(error, 'client.notifications.get');
  }
}

/**
 * PATCH /api/client/notifications
 * Update current client's notification preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const body = await req.json();
    const { notifyOnJobStatus } = body;

    if (typeof notifyOnJobStatus !== 'boolean') {
      return fail('VALIDATION_ERROR', 'notifyOnJobStatus must be a boolean', 400);
    }

    const supabase = getServiceSupabase();

    // Update notification preference
    const { data, error } = await supabase
      .from('clients')
      .update({
        notify_on_job_status: notifyOnJobStatus,
      })
      .eq('id', user.clientId)
      .select('id, name, notify_on_job_status')
      .single();

    if (error || !data) {
      throw new AppError(`Failed to update preferences: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      client_id: user.clientId,
      action: 'NOTIFICATION_PREF_UPDATED',
      message: `Notification preferences updated by ${data.name}`,
      metadata: { notifyOnJobStatus },
    });

    return ok({
      notifyOnJobStatus: data.notify_on_job_status ?? false,
    });
  } catch (error) {
    return handleError(error, 'client.notifications.patch');
  }
}
