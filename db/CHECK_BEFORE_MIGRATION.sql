--==========================================
-- Safety check: verify vehicles table columns
-- This SQL is read-only and does not modify any data.
-- Safe to run in Supabase SQL Editor.
--==========================================

-- 1. List all columns of the vehicles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;

-- 2. Check whether parameter_change_notes column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'vehicles' 
            AND column_name = 'parameter_change_notes'
        ) 
        THEN '✅ parameter_change_notes column exists'
        ELSE '❌ parameter_change_notes column missing (run migration to add it)'
    END as status;

-- 3. Sample existing vehicles (first 5 rows)
SELECT 
    id,
    name,
    status,
    department,
    created_at
FROM vehicles
ORDER BY created_at DESC
LIMIT 5;
