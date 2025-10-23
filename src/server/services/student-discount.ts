import { AppError, NotFoundError } from '@/lib/errors';
import { resolveStudentDiscount, STUDENT_DISCOUNT_RATE } from '@/lib/student-discount';
import type { DiscountType } from '@/lib/calculations';
import { getServiceSupabase } from '@/server/supabase/service-client';

type ClientDiscount = {
  eligible: boolean;
  rate: number;
};

export async function getClientStudentDiscount(clientId: number): Promise<ClientDiscount> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('email')
    .eq('id', clientId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load client email: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Client', clientId);
  }
  const discount = resolveStudentDiscount(data.email ?? '');
  return discount;
}

export function coerceStudentDiscount(discount: ClientDiscount): {
  discountType: DiscountType;
  discountValue: number;
} {
  if (discount.eligible && discount.rate > 0) {
    return { discountType: 'PERCENT', discountValue: discount.rate };
  }
  return { discountType: 'NONE', discountValue: 0 };
}

export function isStudentDiscountLocked(discount: ClientDiscount): boolean {
  return discount.eligible && discount.rate === STUDENT_DISCOUNT_RATE;
}
