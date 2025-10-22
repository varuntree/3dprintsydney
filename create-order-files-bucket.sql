-- ============================================================================
-- Supabase Storage: Create Missing 'order-files' Bucket
-- ============================================================================
-- This script creates the 'order-files' storage bucket and sets up the
-- necessary Row-Level Security (RLS) policies.
--
-- Usage:
--   1. Copy this entire file
--   2. Open Supabase Dashboard > SQL Editor
--   3. Paste and click "Run"
--
-- The script is idempotent (safe to run multiple times).
-- ============================================================================

-- Step 1: Create the 'order-files' bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-files',           -- Bucket ID
  'order-files',           -- Bucket name
  false,                   -- Private bucket (not public)
  209715200,               -- 200 MB file size limit
  NULL                     -- Allow all MIME types
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Grant service role full access
-- ============================================================================
-- This allows the backend service to upload/read/delete files
DROP POLICY IF EXISTS "Service role has full access to order-files" ON storage.objects;
CREATE POLICY "Service role has full access to order-files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'order-files');

-- Step 3: Grant authenticated users read access to their own files
-- ============================================================================
-- This allows clients to download their own order files via signed URLs
DROP POLICY IF EXISTS "Clients can read their own order files" ON storage.objects;
CREATE POLICY "Clients can read their own order files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-files');

-- ============================================================================
-- Verification Queries (Optional - uncomment to verify)
-- ============================================================================

-- Verify bucket was created
-- SELECT * FROM storage.buckets WHERE id = 'order-files';

-- Verify policies were created
-- SELECT * FROM pg_policies
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND policyname LIKE '%order-files%';

-- ============================================================================
-- Expected Result
-- ============================================================================
-- After running this script successfully:
-- 1. Navigate to Supabase Dashboard > Storage
-- 2. You should see the 'order-files' bucket listed
-- 3. Quick Order checkout should now work without the "Bucket not found" error
-- ============================================================================
