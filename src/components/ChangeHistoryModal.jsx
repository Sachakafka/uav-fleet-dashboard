import { useState, useEffect } from 'react'
import { getChangeHistory, formatChangedFields, getFieldLabel, groupChangeHistoryByDayAndUser } from '../lib/changeLogger'
import { getVehicleTimeline } from '../lib/vehicleTimeline'
import { hwConfigDiffLines } from '../lib/hardwareConfig'
import './ChangeHistoryModal.css'

const ICON_CHANGE = '✏️'
const ICON_RESERVATION = '📅'
const INITIAL_VISIBLE = 3

export default function ChangeHistoryModal({ entityType, entityId, entityName, onClose }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedEntries, setExpandedEntries] = useState(new Set())
    const [showAll, setShowAll] = useState(false)

    const isVehicleTimeline = entityType === 'vehicle'

    useEffect(() => {
        loadHistory()
    }, [entityType, entityId])

    const loadHistory = async () => {
        setLoading(true)
        setExpandedEntries(new Set())
        setShowAll(false)
        try {
            if (isVehicleTimeline) {
                const data = await getVehicleTimeline(entityId)
                setHistory(data || [])
            } else {
                const data = await getChangeHistory(entityType, entityId)
                const grouped = groupChangeHistoryByDayAndUser(data)
                setHistory(grouped)
            }
        } catch (err) {
            console.error('Error loading history:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpanded = (entryId) => {
        setExpandedEntries(prev => {
            const newSet = new Set(prev)
            if (newSet.has(entryId)) {
                newSet.delete(entryId)
            } else {
                newSet.add(entryId)
            }
            return newSet
        })
    }

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDateRange = (start, end) => {
        if (!start || !end) return ''
        const s = new Date(start)
        const e = new Date(end)
        return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' – ' +
            e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const displayHistory = history
    const visible = showAll ? displayHistory : displayHistory.slice(0, INITIAL_VISIBLE)
    const hasMore = displayHistory.length > INITIAL_VISIBLE

    const renderValue = (value, fieldName = '') => {
        if (value === null || value === undefined || value === '') {
            return <em className="change-field-value" style={{ fontStyle: 'italic' }}>(empty)</em>
        }
        if (typeof value === 'object') {
            if (fieldName === 'hw_config') {
                try {
                    const enabledModules = Object.keys(value).filter(k =>
                        value[k] && typeof value[k] === 'object' && value[k].enabled === true
                    )
                    const disabledModules = Object.keys(value).filter(k =>
                        value[k] && typeof value[k] === 'object' && value[k].enabled === false
                    )
                    return <span className="change-field-value">
                        {enabledModules.length} enabled, {disabledModules.length} disabled
                    </span>
                } catch (e) {
                    return <span className="change-field-value" style={{ fontStyle: 'italic' }}>[Config]</span>
                }
            }
            const jsonStr = JSON.stringify(value)
            if (jsonStr.length > 50) {
                return <span className="change-field-value" style={{ fontStyle: 'italic' }}>[Object]</span>
            }
            return <code className="change-field-value">{jsonStr}</code>
        }
        if (typeof value === 'boolean') return value ? 'Yes' : 'No'
        return String(value)
    }

    const renderChangeSummary = (entry) => {
        const user = entry.user_display_name || entry.user_email || 'Someone'
        switch (entry.action_type) {
            case 'create':
                return `${user} created the vehicle`
            case 'delete':
                return `${user} deleted the vehicle`
            case 'update':
            default:
                return `${user} edited the vehicle`
        }
    }

    const renderReservationSummary = (entry) => {
        if (entry.subType === 'created') {
            const project = entry.project_name || 'Reservation'
            const range = formatDateRange(entry.start_time, entry.end_time)
            return `Reservation created for ${project}${range ? ` (${range})` : ''}`
        }
        if (entry.subType === 'approved') {
            const by = entry.resolved_by_display ? ` by ${entry.resolved_by_display}` : ''
            return `Reservation approved${by}`
        }
        if (entry.subType === 'rejected') {
            const by = entry.resolved_by_display ? ` by ${entry.resolved_by_display}` : ''
            return `Reservation rejected${by}`
        }
        return 'Reservation'
    }

    const handleModalClick = (e) => {
        e.stopPropagation()
    }

    return (
        <div className="change-history-overlay" onClick={onClose}>
            <div className="change-history-container" onClick={handleModalClick}>
                <div className="change-history-header">
                    <div className="change-history-icon">📜</div>
                    <div>
                        <h2>History</h2>
                        <p className="change-history-subtitle">{entityName}</p>
                    </div>
                    <button onClick={onClose} className="change-history-close">×</button>
                </div>

                <div className="change-history-body">
                    {loading ? (
                        <div className="change-history-loading">
                            <div className="spinner"></div>
                            <p>Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="change-history-empty">
                            <p>No history available</p>
                            <small>{isVehicleTimeline ? 'Changes and reservations will appear here.' : 'Changes will appear here once edits are made.'}</small>
                        </div>
                    ) : (
                        <div className="change-history-timeline">
                            {visible.map((entry, index) => {
                                const isExpanded = expandedEntries.has(entry.id)
                                const isChange = isVehicleTimeline ? entry.kind === 'change' : true
                                const isReservation = isVehicleTimeline && entry.kind === 'reservation'

                                if (isReservation) {
                                    const hasDetails = entry.subType === 'created' || entry.project_name || entry.start_time
                                    return (
                                        <div key={entry.id} className="timeline-entry">
                                            {index < visible.length - 1 && <div className="timeline-connector"></div>}
                                            <div
                                                className="timeline-dot timeline-dot--reservation"
                                            >
                                                {ICON_RESERVATION}
                                            </div>
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <div className="timeline-header-left">
                                                        <span className="timeline-action timeline-action--reservation">
                                                            {renderReservationSummary(entry)}
                                                        </span>
                                                    </div>
                                                    <span className="timeline-timestamp">{formatTimestamp(entry.created_at)}</span>
                                                </div>
                                                {hasDetails && (
                                                    <>
                                                        <div className="timeline-changes-summary">
                                                            <button
                                                                className="timeline-expand-btn"
                                                                onClick={() => toggleExpanded(entry.id)}
                                                            >
                                                                {isExpanded ? '▼' : '▶'} Details
                                                            </button>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="timeline-changes-details">
                                                                {entry.project_name && (
                                                                    <div className="change-field">
                                                                        <div className="change-field-label">Project</div>
                                                                        <div className="change-field-value">{entry.project_name}</div>
                                                                    </div>
                                                                )}
                                                                {(entry.start_time || entry.end_time) && (
                                                                    <div className="change-field">
                                                                        <div className="change-field-label">Period</div>
                                                                        <div className="change-field-value">{formatDateRange(entry.start_time, entry.end_time)}</div>
                                                                    </div>
                                                                )}
                                                                {entry.requester && (
                                                                    <div className="change-field">
                                                                        <div className="change-field-label">Requester</div>
                                                                        <div className="change-field-value">{entry.requester}</div>
                                                                    </div>
                                                                )}
                                                                {entry.status && (
                                                                    <div className="change-field">
                                                                        <div className="change-field-label">Status</div>
                                                                        <div className="change-field-value">{entry.status}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                const changedFields = formatChangedFields(entry.changed_fields)
                                const hasChangeDetails = changedFields.length > 0 || entry.notes || entry.action_type === 'create'
                                return (
                                    <div key={entry.id} className="timeline-entry">
                                        {index < visible.length - 1 && <div className="timeline-connector"></div>}
                                        <div
                                            className="timeline-dot timeline-dot--change"
                                        >
                                            {ICON_CHANGE}
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-header">
                                                <div className="timeline-header-left">
                                                    <span
                                                        className="timeline-action timeline-action--change"
                                                    >
                                                        {isVehicleTimeline ? renderChangeSummary(entry) : (entry.action_type?.charAt(0).toUpperCase() + (entry.action_type || '').slice(1))}
                                                    </span>
                                                    {!isVehicleTimeline && (entry.user_display_name != null || entry.user_email != null) && (
                                                        <span className="timeline-user">
                                                            by {entry.user_display_name || entry.user_email}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="timeline-timestamp">
                                                    {formatTimestamp(entry.created_at)}
                                                    {entry._count > 1 && (
                                                        <span className="timeline-timestamp" style={{ marginLeft: 6, fontWeight: 500 }}>
                                                            ({entry._count} changes)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {entry.notes && (
                                                <div className="timeline-notes">{entry.notes}</div>
                                            )}

                                            {hasChangeDetails && (
                                                <>
                                                    <div className="timeline-changes-summary">
                                                        <button
                                                            className="timeline-expand-btn"
                                                            onClick={() => toggleExpanded(entry.id)}
                                                        >
                                                            {isExpanded ? '▼' : '▶'}
                                                            {changedFields.length > 0
                                                                ? `${changedFields.length} field${changedFields.length !== 1 ? 's' : ''} changed`
                                                                : entry.notes ? 'Notes' : 'Details'}
                                                        </button>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="timeline-changes-details">
                                                            {changedFields.length === 0 ? (
                                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                    {entry.action_type === 'create' ? 'Vehicle created.' : 'No field changes recorded.'}
                                                                    {entry.notes ? ` ${entry.notes}` : ''}
                                                                </div>
                                                            ) : (
                                                                changedFields.map(({ field, oldValue, newValue }) => (
                                                                    <div key={field} className="change-field">
                                                                        <div className="change-field-label">{getFieldLabel(field)}:</div>
                                                                        {field === 'hw_config' ? (
                                                                            <ul className="change-field-value" style={{
                                                                                margin: 0,
                                                                                paddingLeft: '1.25rem',
                                                                                listStyle: 'disc'
                                                                            }}>
                                                                                {hwConfigDiffLines(oldValue, newValue).map((line, i) => (
                                                                                    <li key={i}>{line}</li>
                                                                                ))}
                                                                            </ul>
                                                                        ) : (
                                                                <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                <span className="change-old-value">
                                                                                    {renderValue(oldValue, field)}
                                                                                </span>
                                                                                <span className="change-field-value">→</span>
                                                                                <span className="change-new-value">
                                                                                    {renderValue(newValue, field)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {!showAll && hasMore && (
                                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                    <button
                                        onClick={() => setShowAll(true)}
                                        className="show-more-btn"
                                    >
                                        Load more ({displayHistory.length - INITIAL_VISIBLE} more)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="change-history-footer">
                    <button className="change-history-btn-close" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
