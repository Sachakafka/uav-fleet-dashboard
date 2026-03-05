--==========================================
-- Allow approvers to SELECT/UPDATE bookings linked to approval_requests
-- Fixes: "Failed to load notifications" and approve/reject errors when
-- approver's department doesn't match the vehicle's department.
-- Run after 15_approval_and_notifications.sql
--==========================================

-- Approvers can SELECT any booking that has an approval_request (so notification list loads)
DROP POLICY IF EXISTS "bookings_select_approvers_via_approval_request" ON bookings;
CREATE POLICY "bookings_select_approvers_via_approval_request"
  ON bookings FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM approval_requests ar
      WHERE ar.booking_id = bookings.id
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
      )
    )
  );

-- Approvers can UPDATE bookings that have a pending approval_request (so approve/reject works)
DROP POLICY IF EXISTS "bookings_update_approvers_via_approval_request" ON bookings;
CREATE POLICY "bookings_update_approvers_via_approval_request"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests ar
      WHERE ar.booking_id = bookings.id
      AND ar.status = 'pending'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
      )
    )
  );

-- Approvers can SELECT vehicles (for notification list). Use a non-recursive policy: approvers by email
-- can select all vehicles. A policy that referenced bookings would cause infinite recursion because
-- bookings SELECT policies join vehicles, so evaluating vehicles → bookings → vehicles.
DROP POLICY IF EXISTS "vehicles_select_approvers_via_approval_request" ON vehicles;
CREATE POLICY "vehicles_select_approvers_via_approval_request"
  ON vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

SELECT '16_approvers_bookings_rls: approvers can select/update bookings and select vehicles via approval_requests.' AS status;
