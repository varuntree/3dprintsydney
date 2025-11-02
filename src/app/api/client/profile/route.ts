import { NextRequest } from 'next/server';
import { requireClientWithId } from '@/server/auth/api-helpers';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { okAuth, handleErrorAuth, failAuth } from '@/server/api/respond';
import { AppError } from '@/lib/errors';

/**
 * GET /api/client/profile
 * Fetch current client's profile data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, phone, company, position')
      .eq('id', user.clientId)
      .single();

    if (error || !data) {
      throw new AppError(`Failed to load profile: ${error?.message ?? 'Not found'}`, 'DATABASE_ERROR', 500);
    }

    return okAuth(req, data);
  } catch (error) {
    return handleErrorAuth(req, error, 'client.profile.get');
  }
}

/**
 * PATCH /api/client/profile
 * Update current client's profile data
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const body = await req.json();
    const { firstName, lastName, phone, company, position } = body;

    // Basic validation
    if (!firstName || !lastName || !phone) {
      return failAuth(req, 'VALIDATION_ERROR', 'First name, last name, and phone are required', 400);
    }

    const supabase = getServiceSupabase();

    // Update client profile
    const { data, error } = await supabase
      .from('clients')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        company: company?.trim() || null,
        position: position?.trim() || null,
        name: `${firstName.trim()} ${lastName.trim()}`, // Update combined name
      })
      .eq('id', user.clientId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(`Failed to update profile: ${error?.message ?? 'Unknown error'}`, 'DATABASE_ERROR', 500);
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      client_id: user.clientId,
      action: 'PROFILE_UPDATED',
      message: `Profile updated by ${data.name}`,
      metadata: { fields: ['first_name', 'last_name', 'phone', 'company', 'position'] },
    });

    return okAuth(req, data);
  } catch (error) {
    return handleErrorAuth(req, error, 'client.profile.patch');
  }
}
