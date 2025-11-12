/**
 * Test Data Cleanup Script
 *
 * Removes all test data prefixed with TEST_ from local Supabase.
 * Run before each E2E test to ensure clean state.
 *
 * Usage: npx tsx test_fixtures/cleanup.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function cleanup() {
  console.log('🧹 Starting test data cleanup...\n')

  try {
    // Delete test clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .delete()
      .ilike('name', 'TEST%')
      .select()

    if (clientsError) throw clientsError
    console.log(`✅ Deleted ${clients?.length || 0} test clients`)

    // Delete test quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .delete()
      .ilike('quote_number', 'TEST-%')
      .select()

    if (quotesError) throw quotesError
    console.log(`✅ Deleted ${quotes?.length || 0} test quotes`)

    // Delete test invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .delete()
      .ilike('invoice_number', 'TEST-%')
      .select()

    if (invoicesError) throw invoicesError
    console.log(`✅ Deleted ${invoices?.length || 0} test invoices`)

    // Delete test jobs (cascades from invoices usually, but just in case)
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .delete()
      .ilike('notes', '%TEST%')
      .select()

    if (jobsError) throw jobsError
    console.log(`✅ Deleted ${jobs?.length || 0} test jobs`)

    // Delete test order files
    const { data: files, error: filesError } = await supabase
      .from('order_files')
      .delete()
      .ilike('filename', 'test_%')
      .select()

    if (filesError) throw filesError
    console.log(`✅ Deleted ${files?.length || 0} test files`)

    // Clean up storage buckets
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('order-files')
      .list('', { search: 'test_' })

    if (storageError) throw storageError

    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map(f => f.name)
      const { error: removeError } = await supabase
        .storage
        .from('order-files')
        .remove(filePaths)

      if (removeError) throw removeError
      console.log(`✅ Deleted ${filePaths.length} test files from storage`)
    }

    console.log('\n✨ Cleanup complete!')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

cleanup()
