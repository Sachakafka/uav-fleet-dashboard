-- Allow all authenticated users to view change_logs (full audit trail visible to your team).
-- Replaces "editors and admins only" so every change is recordable and queryable.

DROP POLICY IF EXISTS "Change logs are viewable by editors and admins" ON change_logs;
DROP POLICY IF EXISTS "Authenticated users can view change logs" ON change_logs;

CREATE POLICY "Authenticated users can view change logs" ON change_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT policy unchanged: authenticated users can already insert (from 11_create_change_logs.sql).
