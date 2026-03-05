import { useAuth } from '../contexts/AuthContext'
import { hardwareConfigToText, normalizeConfig } from '../lib/hardwareConfig'

const RISK_ICONS = {
    high: '⚠️',    // Warning Triangle
    middle: '🛡️',  // Shield
    low: '✅'      // Check Circle
}

const STATUS_Map = {
    'Available': 'bg-green-500',
    'Maintenance': 'bg-yellow-500'
}

export default function VehicleCard({ vehicle, onEdit, onBook, onViewHistory }) {
    const { role } = useAuth()
    const isEditor = role === 'editor' || role === 'admin'


    // Status mapping for colors/labels (only Available and Maintenance are valid; legacy "On-Mission" etc. display as Available)
    const getStatusStyle = (status) => {
        const s = status?.toLowerCase() || 'unknown'
        if (s.includes('available') || s.includes('ready')) return { className: 'status-ready', icon: '✓', label: 'Available' }
        if (s.includes('maintenance')) return { className: 'status-maintenance', icon: '⚠️', label: 'Maintenance' }
        if (s.includes('mission')) return { className: 'status-ready', icon: '✓', label: 'Available' }
        return { className: 'status-unknown', icon: '?', label: status }
    }

    const { className, icon, label } = getStatusStyle(vehicle.status)

    return (
        <div className="vehicle-card">
            {/* Header: Status & Edit */}
            <div className="card-top-row">
                <div className={`status-pill ${className}`}>
                    <span className="status-icon">{icon}</span>
                    <span className="status-label">{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button 
                        className="icon-btn-changelog" 
                        onClick={() => onViewHistory(vehicle)}
                        title="View history"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                            lineHeight: 1
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                            e.currentTarget.style.color = '#cbd5e1'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#94a3b8'
                        }}
                    >
                        📜
                    </button>
                                    {isEditor && (
                                        <button className="icon-btn-edit" onClick={() => onEdit(vehicle)} title="Edit Vehicle">
                                            ✎
                                        </button>
                                    )}
                </div>
            </div>

            {/* Identity Section */}
            <div className="card-identity">
                <div className="id-text">
                    <h2 className="unit-id">{vehicle.name}</h2>
                </div>
            </div>

            {/* Details */}
            <div className="card-main-info">
                <p className="vehicle-desc">
                    {vehicle.type}
                    <br />
                    Software Version: {vehicle.sw_version ?? 'No SW info'}
                    <br />
                    {vehicle.notes && <span style={{ opacity: 0.7 }}>{vehicle.notes}</span>}
                    {vehicle.hw_config && hardwareConfigToText(normalizeConfig(vehicle.hw_config)) && (
                        <>
                            <br />
                            <span className="vehicle-card-hw-preview" style={{ opacity: 0.85 }} title={hardwareConfigToText(normalizeConfig(vehicle.hw_config))}>
                                {hardwareConfigToText(normalizeConfig(vehicle.hw_config))}
                            </span>
                        </>
                    )}
                </p>
            </div>

            {/* Next booking */}
            <div className="booking-section">
                {vehicle.next_booking ? (
                    <div className="booking-active">
                        Next booking: {vehicle.next_booking.project || '—'} ({vehicle.next_booking.date || '—'})
                    </div>
                ) : (
                    <div className="booking-empty">No active bookings</div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="card-footer">
                <button className="btn-book-now" onClick={() => onBook(vehicle)}>
                    <span style={{ marginRight: '6px' }}>📝</span> RESERVE
                </button>
            </div>
        </div>
    )
}
