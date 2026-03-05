/**
 * Vehicle timeline: merge change_logs (vehicle) and reservation events (bookings + approval_requests)
 * into one list sorted by time descending for the unified History modal.
 */

import { supabase } from './supabase'
import { getChangeHistory } from './changeLogger'

const TIMELINE_LIMIT = 100

/**
 * Fetch bookings for a vehicle with their approval_requests (for resolved_at / resolved_by).
 * RLS may hide approval_requests from non-approvers; that's ok.
 */
async function getBookingsWithApprovals(vehicleId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      project_name,
      start_time,
      end_time,
      status,
      requester,
      user_id,
      approval_requests (
        id,
        resolved_at,
        resolved_by,
        status
      )
    `)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('getBookingsWithApprovals:', error)
    return []
  }
  return data || []
}

/**
 * Fetch display names for user IDs (resolved_by, etc.)
 */
async function getProfilesForIds(userIds) {
  if (!userIds || userIds.length === 0) return {}
  const uniq = [...new Set(userIds)]
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', uniq)
  if (error) {
    console.error('getProfilesForIds:', error)
    return {}
  }
  const map = {}
  for (const p of data || []) {
    map[p.id] = p.display_name || p.email || p.id
  }
  return map
}

/**
 * Build a single timeline array: change events + reservation events, sorted by created_at desc.
 * - kind: 'change' -> icon ✏️ (one icon for create/update/delete)
 * - kind: 'reservation' -> icon 📅 (created / approved / rejected)
 *
 * @param {string} vehicleId - vehicle UUID
 * @returns {Promise<Array>} Unified timeline entries
 */
export async function getVehicleTimeline(vehicleId) {
  const [changeEntries, bookings] = await Promise.all([
    getChangeHistory('vehicle', vehicleId, TIMELINE_LIMIT),
    getBookingsWithApprovals(vehicleId)
  ])

  const changeItems = (changeEntries || []).map((entry) => ({
    kind: 'change',
    id: entry.id,
    created_at: entry.created_at,
    user_display_name: entry.user_display_name,
    user_email: entry.user_email,
    action_type: entry.action_type,
    changed_fields: entry.changed_fields,
    notes: entry.notes,
    before_snapshot: entry.before_snapshot,
    after_snapshot: entry.after_snapshot
  }))

  const resolvedByIds = []
  const reservationItems = []

  for (const b of bookings) {
    reservationItems.push({
      kind: 'reservation',
      id: `booking-created-${b.id}`,
      created_at: b.created_at,
      subType: 'created',
      bookingId: b.id,
      project_name: b.project_name,
      start_time: b.start_time,
      end_time: b.end_time,
      requester: b.requester,
      status: b.status,
      user_id: b.user_id
    })

    const arList = Array.isArray(b.approval_requests) ? b.approval_requests : (b.approval_requests ? [b.approval_requests] : [])
    for (const ar of arList) {
      if (ar && ar.resolved_at) {
        resolvedByIds.push(ar.resolved_by)
        reservationItems.push({
          kind: 'reservation',
          id: `ar-${ar.id}`,
          created_at: ar.resolved_at,
          subType: ar.status === 'approved' ? 'approved' : 'rejected',
          bookingId: b.id,
          project_name: b.project_name,
          start_time: b.start_time,
          end_time: b.end_time,
          resolved_by: ar.resolved_by,
          status: ar.status
        })
      }
    }
  }

  const profiles = await getProfilesForIds(resolvedByIds)
  for (const item of reservationItems) {
    if (item.resolved_by && profiles[item.resolved_by]) {
      item.resolved_by_display = profiles[item.resolved_by]
    }
  }

  const merged = [...changeItems, ...reservationItems].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  return merged
}
