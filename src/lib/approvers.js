/**
 * Marketing vehicle booking approvers (Batch 5).
 * Only these users can approve/reject pending Marketing bookings.
 */

export const APPROVER_EMAILS = [
    'izabela@deltaquad.com',
    'a.chang@deltaquad.com',
    'events@deltaquad.com'
]

/**
 * @param {string} [email] - User email (e.g. from auth user)
 * @returns {boolean}
 */
export function isApprover(email) {
    if (!email || typeof email !== 'string') return false
    return APPROVER_EMAILS.includes(email.trim().toLowerCase())
}
