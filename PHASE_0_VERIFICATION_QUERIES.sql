-- ==========================================
-- Phase 0 verification queries
-- Run these in Supabase SQL Editor to confirm migration success
-- ==========================================

-- ===== Verify 1: vehicles table structure =====
-- Expected: has deleted_at, no risk_level
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;

-- ===== Verify 2: bookings table structure =====
-- Expected: has both risk_level and deleted_at
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- ===== Verify 3: change_logs table exists =====
-- Expected: returns 1
SELECT COUNT(*) as change_logs_exists
FROM information_schema.tables 
WHERE table_name = 'change_logs';

-- ===== Verify 4: change_logs table structure =====
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'change_logs'
ORDER BY ordinal_position;

-- ===== Verify 5: indexes created =====
-- Expected: at least 3 indexes (excluding primary key)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'change_logs'
ORDER BY indexname;

-- ===== Verify 6: RLS policies =====
-- Expected: vehicles, bookings, change_logs all have policies
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('vehicles', 'bookings', 'change_logs')
ORDER BY tablename, policyname;

-- ===== Verify 7: active vehicle count =====
-- Expected: N vehicles (deleted_at IS NULL)
SELECT COUNT(*) as active_vehicles
FROM vehicles
WHERE deleted_at IS NULL;

-- ===== Verify 8: soft-deleted rows =====
-- Expected: 0 (no deleted rows)
SELECT 
  'vehicles' as table_name,
  COUNT(*) as deleted_count
FROM vehicles
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 
  'bookings' as table_name,
  COUNT(*) as deleted_count
FROM bookings
WHERE deleted_at IS NOT NULL;

-- ===== Verify 9: test change_logs insert =====
-- Inserts one test row
INSERT INTO change_logs (
  user_email,
  user_display_name,
  entity_type,
  entity_id,
  entity_name,
  action_type,
  notes
) VALUES (
  'verification@test.com',
  'Verification Test',
  'vehicle',
  gen_random_uuid(),
  'Test Vehicle',
  'create',
  'Phase 0 verification test - safe to delete'
);

-- ===== Verify 10: query the test row =====
SELECT 
  id,
  created_at,
  user_email,
  entity_type,
  action_type,
  notes
FROM change_logs
WHERE notes = 'Phase 0 verification test - safe to delete'
ORDER BY created_at DESC
LIMIT 1;

-- ===== Clean up test row =====
DELETE FROM change_logs
WHERE notes = 'Phase 0 verification test - safe to delete';

-- ==========================================
-- If all queries run successfully, Phase 0 migration is complete.
-- ==========================================
