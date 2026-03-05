import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CalendarGridSkeleton } from './LoadingSkeleton'
import FilterModal from './FilterModal'
import FilterFunnelIcon from './FilterFunnelIcon'
import BookingModal from './BookingModal'
import './CalendarOverviewModal.css'

export default function CalendarOverviewModal({ onClose }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [viewMode, setViewMode] = useState('monthly') // 'weekly' | 'monthly', default monthly
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [editingBooking, setEditingBooking] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [allVehicles, setAllVehicles] = useState([])
    const [selectedVehicleIds, setSelectedVehicleIds] = useState([])
    const [showFilterModal, setShowFilterModal] = useState(false)

    // Week range for weekly view (Monday–Sunday, ISO)
    const getWeekStart = (d) => {
        const date = new Date(d)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const out = new Date(date)
        out.setDate(diff)
        return out
    }
    const weekStart = getWeekStart(new Date(currentMonth))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Monday = 0, Sunday = 6 (ISO-style; first day of week = Monday)
    const { daysInMonth, startOffsetMonday, year, month } = (() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const getDaySundayBased = firstDay.getDay()
        const startOffsetMonday = (getDaySundayBased + 6) % 7
        return {
            daysInMonth: lastDay.getDate(),
            startOffsetMonday,
            year,
            month
        }
    })()

    useEffect(() => {
        let cancelled = false
        async function fetchVehicles() {
            try {
                const { data, error } = await supabase
                    .from('vehicles')
                    .select('id, name')
                    .is('deleted_at', null)
                    .order('name', { ascending: true })
                if (cancelled) return
                if (!error && data) {
                    setAllVehicles(data)
                }
            } catch (_) {
                setAllVehicles([])
            }
        }
        fetchVehicles()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        const onBookingListChanged = () => setRefreshTrigger((c) => c + 1)
        window.addEventListener('booking-list-changed', onBookingListChanged)
        return () => window.removeEventListener('booking-list-changed', onBookingListChanged)
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        const rangeStart = viewMode === 'weekly'
            ? new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0).toISOString()
            : new Date(year, month, 1).toISOString()
        const rangeEnd = viewMode === 'weekly'
            ? new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59).toISOString()
            : new Date(year, month, daysInMonth, 23, 59, 59).toISOString()
        async function fetchBookings() {
            try {
                let query = supabase
                    .from('bookings')
                    .select('id, start_time, end_time, project_name, pilot_name, requester, location, duration, description, risk_level, vehicle_id, status, vehicles(name)')
                    .is('deleted_at', null)
                    .neq('status', 'rejected')
                    .lte('start_time', rangeEnd)
                    .gte('end_time', rangeStart)
                    .order('start_time', { ascending: true })

                // Apply vehicle filter if any vehicles are selected
                if (selectedVehicleIds.length > 0) {
                    query = query.in('vehicle_id', selectedVehicleIds)
                }

                const { data, error } = await query

                if (cancelled) return
                if (error) {
                    setBookings([])
                    setLoading(false)
                    return
                }
                const mapped = (data || []).map((b) => {
                    const v = b?.vehicles
                    const vehicleName = (typeof v === 'object' && v != null && v?.name) ? String(v.name) : (v != null ? String(v) : 'Vehicle')
                    const startDate = b?.start_time?.slice?.(0, 10) ?? ''
                    const endDate = b?.end_time?.slice?.(0, 10) ?? ''
                    return {
                        id: b?.id,
                        vehicle: vehicleName,
                        vehicle_id: b?.vehicle_id,
                        project: b?.project_name ?? '',
                        pilot: b?.pilot_name ?? '',
                        requester: b?.requester ?? '',
                        location: b?.location ?? '',
                        duration: b?.duration ?? '',
                        description: b?.description ?? '',
                        risk_level: b?.risk_level ?? '',
                        start_date: startDate,
                        end_date: endDate,
                        status: b?.status ?? 'confirmed'
                    }
                }).filter((b) => b.id != null && b.start_date && b.end_date)
                setBookings(mapped)
            } catch (_) {
                setBookings([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchBookings()
        return () => { cancelled = true }
    }, [year, month, daysInMonth, viewMode, weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), selectedVehicleIds, refreshTrigger])

    const getBookingsForDate = (day) => {
        if (day < 1 || day > daysInMonth) return []
        let dateStr
        try {
            dateStr = new Date(year, month, day).toISOString().split('T')[0]
        } catch (_) {
            return []
        }
        return bookings.filter((booking) => {
            const start = booking?.start_date ?? ''
            const end = booking?.end_date ?? ''
            return start && end && dateStr >= start && dateStr <= end
        })
    }

    const getBookingsForDateStr = (dateStr) => {
        return bookings.filter((booking) => {
            const start = booking?.start_date ?? ''
            const end = booking?.end_date ?? ''
            return start && end && dateStr >= start && dateStr <= end
        })
    }
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const weekLabel = viewMode === 'weekly'
        ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : monthName

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const goToPrevWeek = () => {
        const d = new Date(currentMonth)
        d.setDate(d.getDate() - 7)
        setCurrentMonth(d)
    }

    const goToNextWeek = () => {
        const d = new Date(currentMonth)
        d.setDate(d.getDate() + 7)
        setCurrentMonth(d)
    }

    const goToToday = () => {
        setCurrentMonth(new Date())
    }

    const handleModalClick = (e) => {
        e.stopPropagation()
    }

    const today = new Date()
    const isToday = (day) => {
        return day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
    }

    const isTodayDate = (d) => {
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
    }

    return (
        <div className="calendar-overview-overlay" onClick={() => onClose?.()}>
            <div className="calendar-overview-container" onClick={handleModalClick}>
                {/* Header */}
                <div className="calendar-overview-header">
                    <div className="calendar-overview-icon">📅</div>
                    <div style={{ flex: 1 }}></div>
                    
                    {/* Filter Button */}
                    <button 
                        type="button" 
                        onClick={() => setShowFilterModal(true)}
                        className="calendar-filter-btn"
                        title="Filter vehicles"
                        style={{
                            background: selectedVehicleIds.length > 0 ? '#3b82f6' : '#334155',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = selectedVehicleIds.length > 0 ? '#2563eb' : '#475569'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = selectedVehicleIds.length > 0 ? '#3b82f6' : '#334155'
                        }}
                    >
                        <FilterFunnelIcon size={16} color="#fff" /> Filter
                        {selectedVehicleIds.length > 0 && (
                            <span style={{
                                background: '#1e40af',
                                borderRadius: '10px',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                {selectedVehicleIds.length}
                            </span>
                        )}
                    </button>

                    <button 
                        type="button" 
                        onClick={() => setViewMode(viewMode === 'weekly' ? 'monthly' : 'weekly')}
                        className="calendar-view-toggle-btn"
                        title={`Switch to ${viewMode === 'weekly' ? 'monthly' : 'weekly'} view`}
                    >
                        {viewMode === 'weekly' ? 'Weekly' : 'Monthly'}
                    </button>
                    <button type="button" onClick={onClose} className="calendar-overview-close" aria-label="Close">×</button>
                </div>

                {/* Calendar Controls: Today, Prev/Next */}
                <div className="calendar-overview-controls">
                    <button type="button" onClick={goToToday}>Today</button>
                    <button type="button" onClick={viewMode === 'weekly' ? goToPrevWeek : goToPrevMonth}>‹ Previous</button>
                    <span className="calendar-month-title">{weekLabel}</span>
                    <button type="button" onClick={viewMode === 'weekly' ? goToNextWeek : goToNextMonth}>Next ›</button>
                </div>

                {/* Calendar Grid: weekly (7 days) or monthly (6 rows) */}
                <div className="calendar-overview-grid-wrap">
                {loading ? (
                    <CalendarGridSkeleton />
                ) : viewMode === 'weekly' ? (
                    <div className="calendar-overview-grid calendar-overview-grid-weekly fade-in">
                        <div className="calendar-day-header">Mon</div>
                        <div className="calendar-day-header">Tue</div>
                        <div className="calendar-day-header">Wed</div>
                        <div className="calendar-day-header">Thu</div>
                        <div className="calendar-day-header">Fri</div>
                        <div className="calendar-day-header">Sat</div>
                        <div className="calendar-day-header">Sun</div>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                            const d = new Date(weekStart)
                            d.setDate(d.getDate() + dayOffset)
                            const dateStr = d.toISOString().split('T')[0]
                            const dayBookings = getBookingsForDateStr(dateStr)
                            const hasBookings = dayBookings.length > 0
                            return (
                                <div
                                    key={dateStr}
                                    className={`calendar-day-cell ${isTodayDate(d) ? 'today' : ''} ${hasBookings ? 'has-bookings' : ''}`}
                                >
                                    <div className="calendar-day-number">{d.getDate()}</div>
                                    {hasBookings && (
                                        <>
                                            <div className="calendar-day-bookings">
                                                {dayBookings.map((booking, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="calendar-booking-chip"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedBooking(booking)
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        title={`${booking.vehicle} — ${booking.project || '—'} (Click for details)`}
                                                    >
                                                        <span className="booking-chip-line">
                                                            <span className="booking-vehicle">{booking.vehicle}</span>
                                                            <span className="booking-chip-sep"> · </span>
                                                            <span className="booking-project">{booking.project || '—'}</span>
                                                            {booking.status === 'pending_approval' && (
                                                                <>
                                                                    <span className="booking-chip-sep"> · </span>
                                                                    <span className="booking-pending-badge">Pending approval</span>
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {dayBookings.length > 2 && (
                                                <span className="calendar-day-more">+{dayBookings.length - 2}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="calendar-overview-grid fade-in">
                        <div className="calendar-day-header">Mon</div>
                        <div className="calendar-day-header">Tue</div>
                        <div className="calendar-day-header">Wed</div>
                        <div className="calendar-day-header">Thu</div>
                        <div className="calendar-day-header">Fri</div>
                        <div className="calendar-day-header">Sat</div>
                        <div className="calendar-day-header">Sun</div>
                        {Array.from({ length: 6 * 7 }).map((_, cellIndex) => {
                            const dayNum = cellIndex - startOffsetMonday + 1
                            const isEmpty = dayNum < 1 || dayNum > daysInMonth
                            if (isEmpty) {
                                return <div key={`e-${cellIndex}`} className="calendar-day-cell empty" />
                            }
                            const dayBookings = getBookingsForDate(dayNum)
                            const hasBookings = dayBookings.length > 0
                            return (
                                <div
                                    key={dayNum}
                                    className={`calendar-day-cell ${isToday(dayNum) ? 'today' : ''} ${hasBookings ? 'has-bookings' : ''}`}
                                >
                                    <div className="calendar-day-number">{dayNum}</div>
                                    {hasBookings && (
                                        <>
                                            <div className="calendar-day-bookings">
                                                {dayBookings.map((booking, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="calendar-booking-chip"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedBooking(booking)
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        title={`${booking.vehicle} — ${booking.project || '—'} (Click for details)`}
                                                    >
                                                        <span className="booking-chip-line">
                                                            <span className="booking-vehicle">{booking.vehicle}</span>
                                                            <span className="booking-chip-sep"> · </span>
                                                            <span className="booking-project">{booking.project || '—'}</span>
                                                            {booking.status === 'pending_approval' && (
                                                                <>
                                                                    <span className="booking-chip-sep"> · </span>
                                                                    <span className="booking-pending-badge">Pending approval</span>
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {dayBookings.length > 2 && (
                                                <span className="calendar-day-more">+{dayBookings.length - 2}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                </div>

                {/* Legend */}
                <div className="calendar-overview-legend">
                    <div className="legend-item">
                        <div className="legend-color today-marker"></div>
                        <span>Today</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color booking-marker"></div>
                        <span>Has Bookings</span>
                    </div>
                </div>
            </div>

            {/* Booking Details Popup */}
            {selectedBooking && (
                <div
                    className="booking-details-overlay"
                    onClick={() => setSelectedBooking(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}
                >
                    <div 
                        className="booking-details-card"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1e293b',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            border: '1px solid #334155'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>📋 Booking Details</h3>
                            <button 
                                onClick={() => setSelectedBooking(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    padding: 0,
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Vehicle</div>
                                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>{selectedBooking?.vehicle ?? '—'}</div>
                            </div>
                            {selectedBooking?.status === 'pending_approval' && (
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Status</div>
                                    <div style={{ color: '#f59e0b', fontWeight: '600' }}>Pending approval</div>
                                </div>
                            )}
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Project</div>
                                <div style={{ color: '#fff' }}>{selectedBooking?.project || '—'}</div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Start Date</div>
                                    <div style={{ color: '#fff' }}>{selectedBooking?.start_date ?? '—'}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>End Date</div>
                                    <div style={{ color: '#fff' }}>{selectedBooking?.end_date ?? '—'}</div>
                                </div>
                            </div>
                            
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Pilot</div>
                                <div style={{ color: '#fff' }}>{selectedBooking?.pilot || '—'}</div>
                            </div>
                            
                            <div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Requester</div>
                                <div style={{ color: '#fff' }}>{selectedBooking?.requester || '—'}</div>
                            </div>
                            
                            {selectedBooking?.location && (
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Location</div>
                                    <div style={{ color: '#fff' }}>{selectedBooking.location}</div>
                                </div>
                            )}
                            
                            {selectedBooking?.duration && (
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Duration</div>
                                    <div style={{ color: '#fff' }}>{selectedBooking.duration}</div>
                                </div>
                            )}
                            
                            {selectedBooking?.risk_level && (
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Risk Level</div>
                                    <div style={{ color: '#fff' }}>{selectedBooking.risk_level}</div>
                                </div>
                            )}
                            
                            {selectedBooking && (selectedBooking.description) && (
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Description</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem', fontStyle: 'italic' }}>{selectedBooking.description}</div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingBooking(selectedBooking)
                                    setSelectedBooking(null)
                                }}
                                style={{
                                    background: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBooking(null)}
                                style={{
                                    background: '#475569',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <FilterModal
                    onClose={() => setShowFilterModal(false)}
                    onApplyFilter={(vehicleIds) => {
                        setSelectedVehicleIds(vehicleIds || [])
                        setShowFilterModal(false)
                    }}
                    initialSelectedVehicles={selectedVehicleIds}
                />
            )}

            {editingBooking && (
                <BookingModal
                    vehicle={{
                        id: editingBooking.vehicle_id,
                        name: editingBooking.vehicle ?? 'Vehicle'
                    }}
                    existingBooking={{
                        ...editingBooking,
                        start_time: editingBooking.start_date ? editingBooking.start_date + 'T00:00:00Z' : null,
                        end_time: editingBooking.end_date ? editingBooking.end_date + 'T23:59:59Z' : null,
                        project_name: editingBooking.project,
                        pilot_name: editingBooking.pilot
                    }}
                    onClose={() => setEditingBooking(null)}
                    onSave={() => {
                        setEditingBooking(null)
                        setRefreshTrigger((c) => c + 1)
                    }}
                />
            )}
        </div>
    )
}
