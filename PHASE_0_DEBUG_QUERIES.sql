-- ==========================================
-- Phase 0 debug queries
-- Use these to diagnose why vehicles are not visible
-- ==========================================

-- ===== 1. Check if vehicles table has data (bypass RLS) =====
-- Run in Supabase Dashboard with service_role
SELECT 
  id,
  name,
  status,
  department,
  deleted_at,
  created_at
FROM vehicles
ORDER BY created_at DESC;

-- ===== 2. Check current user =====
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- ===== 3. Check current user's profile =====
SELECT 
  id,
  email,
  role,
  department
FROM profiles
WHERE id = auth.uid();

-- ===== 4. Check vehicles RLS policies =====
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY policyname;

-- ===== 5. Count all vehicles (ignoring deleted_at) =====
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_vehicles,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_vehicles
FROM vehicles;

-- ===== 6. Count vehicles by department =====
SELECT 
  department,
  COUNT(*) as vehicle_count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count
FROM vehicles
GROUP BY department
ORDER BY department;

-- ==========================================
-- Possible fixes
-- ==========================================

-- If the current user has no department, run:
/*
UPDATE profiles 
SET department = 'R&D'
WHERE id = auth.uid();
*/

-- If vehicles table is empty, re-insert seed data or create vehicles manually.
