--==========================================
-- Allow approvers to SELECT all non-deleted bookings (for Dashboard next-booking & calendar).
-- Fixes: Vehicles like "R&D Airborn" show "No active bookings" even when they have many
-- reserved bookings, because approvers could see all vehicles (16) but only bookings
-- that have an approval_request. R&D/confirmed bookings have no approval_request.
-- Run after 16_approvers_bookings_rls.sql
--==========================================

-- Approvers can SELECT any non-deleted booking (so next-booking preview and calendar show correctly for all vehicles they see)
DROP POLICY IF EXISTS "bookings_select_approvers_all" ON bookings;
CREATE POLICY "bookings_select_approvers_all"
  ON bookings FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

SELECT '17_approvers_bookings_select_all: approvers can select all non-deleted bookings for dashboard/calendar.' AS status;
