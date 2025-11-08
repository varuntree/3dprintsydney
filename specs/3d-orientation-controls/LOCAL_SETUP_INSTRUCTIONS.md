# Local Setup & Migration Checklist

1. **Start the Supabase local stack** (skips if you already have PostgreSQL reachable on 127.0.0.1:54322):
   ```bash
   npx supabase start
   ```
   This ensures the Supabase CLI spins up Postgres + Studio on the default ports used by `supabase migration up`.

2. **Apply the pending migration** (adds `orientation_data` columns + index):
   ```bash
   npx supabase migration up
   ```
   If you only want to run the new file, pass `--name 202511071230_add_orientation_storage`.

3. **Verify the schema** from psql (password defaults to `postgres` unless you changed it):
   ```bash
   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d tmp_files" | grep orientation_data
   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d order_files" | grep orientation_data
   ```
   Both commands should show a `jsonb` column named `orientation_data`.

4. **Restart Next.js dev server** so the new store/API code reloads:
   ```bash
   npm run dev
   ```
   Keep the Supabase stack running while developing to avoid connection-refused errors when the APIs touch the DB.

5. **(Optional) Reset tmp files** if you previously baked orientations into geometry. Delete stale records or re-upload parts to take advantage of the quaternion-based flow.
