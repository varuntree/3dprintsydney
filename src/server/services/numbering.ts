import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError } from '@/lib/errors';

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
