import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError } from '@/lib/errors';

/**
 * Generate next sequential document number for quotes or invoices
 * @param kind - Document type ('quote' or 'invoice')
 * @returns Generated document number with prefix (e.g., 'QT-001' or 'INV-001')
 * @throws AppError if number generation fails
 */
export async function nextDocumentNumber(kind: 'quote' | 'invoice') {
  const supabase = getServiceSupabase();
  const defaultPrefix = kind === 'quote' ? 'QT-' : 'INV-';
  const { data, error } = await supabase.rpc('next_document_number', {
    p_kind: kind,
    p_default_prefix: defaultPrefix,
  });

  if (error || typeof data !== 'string') {
    throw new AppError(`Failed to generate document number: ${error?.message ?? 'Unknown error'}`, 'NUMBERING_ERROR', 500);
  }

  return data;
}
