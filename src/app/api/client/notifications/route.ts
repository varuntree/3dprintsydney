import { NextRequest } from 'next/server';
import { requireClientWithId } from '@/server/auth/api-helpers';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { okAuth, handleErrorAuth, failAuth } from '@/server/api/respond';
import { AppError } from '@/lib/errors';

/**
 * GET /api/client/notifications
 * Fetch current client's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('clients')
      .select('notify_on_job_status')
      .eq('id', user.clientId)
      .single();

    if (error || !data) {
      throw new AppError(`Failed to load preferences: ${error?.message ?? 'Not found'}`, 'DATABASE_ERROR', 500);
    }

    return okAuth(request, {
      notifyOnJobStatus: data.notify_on_job_status ?? false,
    });
  } catch (error) {
    return handleErrorAuth(request, error, 'client.notifications.get');
  }
}

/**
 * PATCH /api/client/notifications
 * Update current client's notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const body = await request.json();
    const { notifyOnJobStatus } = body;

    if (typeof notifyOnJobStatus !== 'boolean') {
      return failAuth(request, 'VALIDATION_ERROR', 'notifyOnJobStatus must be a boolean', 400);
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

    return okAuth(request, {
      notifyOnJobStatus: data.notify_on_job_status ?? false,
    });
  } catch (error) {
    return handleErrorAuth(request, error, 'client.notifications.patch');
  }
}
