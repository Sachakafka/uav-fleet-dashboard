-- Rename bookings columns for clearer semantics (align UI labels with schema).
-- Run after 17_approvers_bookings_select_all.sql (or any existing bookings RLS).
-- who_ordered -> requester, notes -> description

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'who_ordered'
  ) THEN
    ALTER TABLE bookings RENAME COLUMN who_ordered TO requester;
    RAISE NOTICE 'Renamed bookings.who_ordered to requester';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE bookings RENAME COLUMN notes TO description;
    RAISE NOTICE 'Renamed bookings.notes to description';
  END IF;
END $$;

SELECT '18_bookings_rename_columns: requester and description columns ready.' AS status;
