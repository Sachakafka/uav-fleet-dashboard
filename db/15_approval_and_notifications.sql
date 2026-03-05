--==========================================
-- Batch 5: Iza approval and notifications
-- Reversible, backward-compatible migration.
-- Run on staging first.
--==========================================

-- ===== 1. Bookings status ==========================================
-- Ensure status column exists and set default; backfill existing rows.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status text;

-- Default for new rows (confirmed = no approval needed)
ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'confirmed';

-- Backfill: existing bookings become confirmed
UPDATE bookings
SET status = 'confirmed'
WHERE status IS NULL OR status = '';

-- Optional: constraint for valid statuses (comment out if you prefer free text)
-- ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
-- ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
--   CHECK (status IN ('confirmed', 'pending_approval', 'rejected'));

-- ===== 2. approval_requests ==========================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_booking_id
  ON approval_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at
  ON approval_requests(created_at DESC);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Approvers: izabela@deltaquad.com, a.chang@deltaquad.com, events@deltaquad.com (match profiles.email)
DROP POLICY IF EXISTS "approval_requests_select_approvers" ON approval_requests;
CREATE POLICY "approval_requests_select_approvers"
  ON approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

-- Editors (and booking creator) can insert when creating a pending booking
DROP POLICY IF EXISTS "approval_requests_insert_editors" ON approval_requests;
CREATE POLICY "approval_requests_insert_editors"
  ON approval_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('editor', 'admin')
    )
  );

-- Only approvers can update (approve/reject)
DROP POLICY IF EXISTS "approval_requests_update_approvers" ON approval_requests;
CREATE POLICY "approval_requests_update_approvers"
  ON approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

-- ===== 3. notifications ==========================================
-- One row per approval request; visible to all approvers until read.
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_approval_request_id
  ON notifications(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at
  ON notifications(read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Only approvers can see notifications
DROP POLICY IF EXISTS "notifications_select_approvers" ON notifications;
CREATE POLICY "notifications_select_approvers"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

-- Editors can insert when creating approval_request
DROP POLICY IF EXISTS "notifications_insert_editors" ON notifications;
CREATE POLICY "notifications_insert_editors"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('editor', 'admin')
    )
  );

-- Approvers can update (set read_at)
DROP POLICY IF EXISTS "notifications_update_approvers" ON notifications;
CREATE POLICY "notifications_update_approvers"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('izabela@deltaquad.com', 'a.chang@deltaquad.com', 'events@deltaquad.com')
    )
  );

-- ===== 4. Verify ==========================================
SELECT '15_approval_and_notifications: bookings.status backfilled, approval_requests and notifications created.' AS status;

-- ===== ROLLBACK (run manually if needed) ==========================================
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS approval_requests;
-- ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
-- (Optional: UPDATE bookings SET status = NULL WHERE status = 'rejected';)
