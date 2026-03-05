import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isApprover } from '../lib/approvers'
import db from '../lib/database'
import { useToast } from './Toast'
import BookingModal from './BookingModal'

function formatDate(startIso, endIso) {
    if (!startIso || !endIso) return '—'
    const s = new Date(startIso)
    const e = new Date(endIso)
    return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`
}

export default function NotificationsPanel() {
    const { user } = useAuth()
    const { showError } = useToast()
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingItem, setEditingItem] = useState(null)

    const approver = isApprover(user?.email)

    const fetchList = async () => {
        if (!approver) return
        setLoading(true)
        try {
            const data = await db.getApprovalNotifications()
            setList(data)
        } catch (err) {
            console.error('Fetch notifications:', err)
            showError('Failed to load notifications')
            setList([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchList()
    }, [approver])

    const handleApprove = async (item) => {
        try {
            await db.resolveApprovalRequest(
                item.approval_requests.id,
                'approved',
                item.id,
                user.id
            )
            await fetchList()
        } catch (err) {
            console.error('Approve failed:', err)
            showError('Failed to approve booking')
        }
    }

    const handleReject = async (item) => {
        try {
            await db.resolveApprovalRequest(
                item.approval_requests.id,
                'rejected',
                item.id,
                user.id
            )
            await fetchList()
        } catch (err) {
            console.error('Reject failed:', err)
            showError('Failed to reject booking')
        }
    }

    const handleEdit = (item) => {
        setEditingItem(item)
    }

    const handleCloseEdit = () => {
        setEditingItem(null)
    }

    const handleSaveEdit = async () => {
        if (!editingItem) return
        try {
            await db.resolveApprovalRequest(
                editingItem.approval_requests.id,
                'approved',
                editingItem.id,
                user.id
            )
            setEditingItem(null)
            await fetchList()
        } catch (err) {
            console.error('Resolve after edit failed:', err)
            showError('Failed to confirm booking')
        }
    }

    if (!approver) return null

    return (
        <div className="notifications-page">
            {loading ? (
                <div className="notifications-page-loading">Loading…</div>
            ) : list.length === 0 ? (
                <div className="notifications-page-empty">No notifications</div>
            ) : (
                <ul className="notifications-page-list">
                    {list.map((item) => {
                        const ar = item.approval_requests
                        const status = ar?.status ?? 'pending'
                        const isPending = status === 'pending'
                        const isApproved = status === 'approved'
                        const isRejected = status === 'rejected'
                        const booking = ar?.bookings
                        const vehicleName = booking?.vehicles?.name ?? '—'
                        const requester = booking?.requester ?? '—'
                        const projectName = booking?.project_name ?? '—'
                        const dateStr = formatDate(booking?.start_time, booking?.end_time)
                        const pilot = booking?.pilot_name ?? '—'

                        return (
                            <li key={item.id} className="notifications-page-card">
                                <div className="notifications-page-card-body">
                                    <div className="notifications-page-card-row notifications-page-card-title">
                                        <span className="notifications-page-project">{projectName}</span>
                                        <span className="notifications-page-status">
                                            {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                                        </span>
                                    </div>
                                    <div className="notifications-page-card-row">
                                        <span className="notifications-page-label">Requester</span>
                                        <span className="notifications-page-value">{requester}</span>
                                    </div>
                                    <div className="notifications-page-card-row">
                                        <span className="notifications-page-label">Vehicle</span>
                                        <span className="notifications-page-value">{vehicleName}</span>
                                    </div>
                                    <div className="notifications-page-card-row">
                                        <span className="notifications-page-label">Reserved dates</span>
                                        <span className="notifications-page-value">{dateStr}</span>
                                    </div>
                                    <div className="notifications-page-card-row">
                                        <span className="notifications-page-label">Pilot</span>
                                        <span className="notifications-page-value">{pilot}</span>
                                    </div>
                                </div>
                                <div className="notifications-page-card-actions">
                                    {isPending && (
                                        <>
                                            <button
                                                type="button"
                                                className="notifications-page-btn notifications-page-btn-approve"
                                                onClick={() => handleApprove(item)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                className="notifications-page-btn notifications-page-btn-reject"
                                                onClick={() => handleReject(item)}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                type="button"
                                                className="notifications-page-btn notifications-page-btn-edit"
                                                onClick={() => handleEdit(item)}
                                            >
                                                Edit
                                            </button>
                                        </>
                                    )}
                                    {isApproved && (
                                        <button
                                            type="button"
                                            className="notifications-page-btn notifications-page-btn-approve notifications-page-btn-disabled"
                                            disabled
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {isRejected && (
                                        <button
                                            type="button"
                                            className="notifications-page-btn notifications-page-btn-reject notifications-page-btn-disabled"
                                            disabled
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {editingItem && (() => {
                const booking = editingItem.approval_requests?.bookings
                const vehicle = {
                    id: booking?.vehicle_id,
                    name: booking?.vehicles?.name ?? 'Vehicle'
                }
                return (
                    <BookingModal
                        vehicle={vehicle}
                        existingBooking={booking}
                        onClose={handleCloseEdit}
                        onSave={handleSaveEdit}
                    />
                )
            })()}
        </div>
    )
}
