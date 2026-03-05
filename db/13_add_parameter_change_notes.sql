--==========================================
-- Add parameter_change_notes column to vehicles
-- Batch 3: Forms and Fields
--==========================================

-- Add parameter_change_notes column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS parameter_change_notes text;

-- Add index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_vehicles_parameter_change_notes ON vehicles(parameter_change_notes) WHERE parameter_change_notes IS NOT NULL;

-- Success confirmation
SELECT 'parameter_change_notes column added successfully!' as status;
