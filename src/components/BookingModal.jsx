import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { handleError } from '../lib/errorHandler'
import { PILOT_OPTIONS, getDepartmentFromName } from '../lib/constants'
import db from '../lib/database'
import { logChange } from '../lib/changeLogger'
import { InlineSpinner } from './LoadingSkeleton'
import './BookingModal.css'

const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High']

function emailLocalPart(email) {
    if (!email || !email.includes('@')) return email || ''
    return email.slice(0, email.indexOf('@'))
}

export default function BookingModal({ vehicle, existingBooking = null, onClose, onSave }) {
    const { user, displayName } = useAuth()
    const { showSuccess, showError } = useToast()
    const userName = displayName ?? emailLocalPart(user?.email) ?? 'Current User'
    const [selectedDates, setSelectedDates] = useState([])
    const [whoOrderedMode, setWhoOrderedMode] = useState('me') // 'me' | 'others'
    const [whoOrderedCustom, setWhoOrderedCustom] = useState('')
    const [formData, setFormData] = useState({
        pilot: '',
        project: '',
        risk_level: '',
        location: '',
        duration: '',
        description: '',
        requester: userName
    })
    const [loading, setLoading] = useState(false)
    const [conflictWarning, setConflictWarning] = useState(null)
    const [conflictingBookings, setConflictingBookings] = useState([])
    const [showOverrideDialog, setShowOverrideDialog] = useState(false)
    const [overrideConfirmed, setOverrideConfirmed] = useState(false)
    const [checkingConflicts, setCheckingConflicts] = useState(false)

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [existingBookings, setExistingBookings] = useState([])
    const [bookingTooltip, setBookingTooltip] = useState(null) // { day, project, requester, location }
    
    // Validation state
    const [validationErrors, setValidationErrors] = useState({})

    // Pre-fill when editing an existing booking
    useEffect(() => {
        if (!existingBooking || !vehicle) return
        const start = existingBooking.start_time ?? existingBooking.start_date
        const end = existingBooking.end_time ?? existingBooking.end_date
        if (!start || !end) return
        const startStr = typeof start === 'string' && start.length >= 10 ? start.slice(0, 10) : new Date(start).toISOString().slice(0, 10)
        const endStr = typeof end === 'string' && end.length >= 10 ? end.slice(0, 10) : new Date(end).toISOString().slice(0, 10)
        const dates = []
        const d = new Date(startStr + 'T00:00:00Z')
        const endDate = new Date(endStr + 'T23:59:59Z')
        while (d <= endDate) {
            dates.push(d.toISOString().slice(0, 10))
            d.setUTCDate(d.getUTCDate() + 1)
        }
        setSelectedDates(dates)
        setFormData({
            pilot: existingBooking.pilot_name ?? existingBooking.pilot ?? '',
            project: existingBooking.project_name ?? existingBooking.project ?? '',
            risk_level: existingBooking.risk_level ?? '',
            location: existingBooking.location ?? '',
            duration: existingBooking.duration ?? '',
            description: existingBooking.description ?? '',
            requester: existingBooking.requester ?? userName
        })
        const who = existingBooking.requester ?? ''
        if (who === userName || who === '' || !who) {
            setWhoOrderedMode('me')
            setWhoOrderedCustom('')
        } else {
            setWhoOrderedMode('others')
            setWhoOrderedCustom(who)
        }
        setCurrentMonth(new Date(startStr + 'T12:00:00Z'))
    }, [existingBooking?.id, vehicle?.id, userName])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
        
        // Clear validation error for this field
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }
    
    // Real-time validation
    const validateForm = () => {
        const errors = {}
        
        if (selectedDates.length === 0) {
            errors.dates = 'Please select at least one date'
        }
        
        if (isMarketingVehicle && selectedDates.some(d => isDateLockedForDateStr(d))) {
            errors.dates = 'One or more selected dates are already reserved (Marketing vehicle). Please choose different dates.'
        }
        
        if (!formData.project || formData.project.trim() === '') {
            errors.project = 'Project name is required'
        }
        
        if (!formData.description || formData.description.trim() === '') {
            errors.description = 'Description is required'
        }
        
        // Requester is required
        const requesterFinal = whoOrderedMode === 'others' ? whoOrderedCustom : userName
        if (!requesterFinal || requesterFinal.trim() === '') {
            errors.requester = 'Requester is required'
        }
        
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const requesterValue = whoOrderedMode === 'others' ? whoOrderedCustom : userName

    const [bookingListRefreshTrigger, setBookingListRefreshTrigger] = useState(0)

    // Fetch existing bookings for this vehicle to show in calendar
    useEffect(() => {
        if (!vehicle?.id) return
        async function fetchExistingBookings() {
            const year = currentMonth.getFullYear()
            const month = currentMonth.getMonth()
            const monthStart = new Date(year, month, 1).toISOString()
            const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
            
            const { data, error } = await supabase
                .from('bookings')
                .select('id, start_time, end_time, project_name, requester, location, status')
                .eq('vehicle_id', vehicle.id)
                .is('deleted_at', null)
                .neq('status', 'rejected')
                .lte('start_time', monthEnd)
                .gte('end_time', monthStart)
            
            if (!error && data) {
                const bookings = data.map(b => ({
                    id: b.id,
                    start_date: b.start_time?.slice(0, 10) ?? '',
                    end_date: b.end_time?.slice(0, 10) ?? '',
                    project: b.project_name ?? '',
                    requester: b.requester ?? '',
                    location: b.location ?? '',
                    status: b.status ?? 'confirmed'
                }))
                setExistingBookings(bookings)
            }
        }
        fetchExistingBookings()
    }, [vehicle?.id, currentMonth, bookingListRefreshTrigger])

    // Refetch calendar bookings when a booking is cancelled elsewhere (e.g. My Bookings)
    useEffect(() => {
        const onBookingListChanged = () => setBookingListRefreshTrigger((c) => c + 1)
        window.addEventListener('booking-list-changed', onBookingListChanged)
        return () => window.removeEventListener('booking-list-changed', onBookingListChanged)
    }, [])

    // Enhanced conflict detection: check for ALL conflicting bookings when dates change
    useEffect(() => {
        if (selectedDates.length === 0) {
            setConflictWarning(null)
            setConflictingBookings([])
            setCheckingConflicts(false)
            return
        }
        
        setCheckingConflicts(true)
        const start_time = new Date(selectedDates[0] + 'T00:00:00Z').toISOString()
        const end_time = new Date(selectedDates[selectedDates.length - 1] + 'T23:59:59Z').toISOString()
        
        db.getAllConflictingBookings(vehicle.id, start_time, end_time, existingBooking?.id ?? null)
            .then(conflicts => {
                if (conflicts && conflicts.length > 0) {
                    setConflictWarning({ count: conflicts.length })
                    setConflictingBookings(conflicts)
                } else {
                    setConflictWarning(null)
                    setConflictingBookings([])
                }
            })
            .catch(() => {
                setConflictWarning(null)
                setConflictingBookings([])
            })
            .finally(() => {
                setCheckingConflicts(false)
            })
    }, [vehicle.id, selectedDates.join(','), existingBooking?.id])

    // Calendar functions
    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        // Convert Sunday=0 to Monday=0: (getDay() + 6) % 7
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7

        return { daysInMonth, startingDayOfWeek, year, month }
    }

    const handleDateClick = (day) => {
        if (isDateLocked(day)) return
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        const dateStr = clickedDate.toISOString().split('T')[0]

        setSelectedDates(prev => {
            if (prev.includes(dateStr)) {
                return prev.filter(d => d !== dateStr)
            } else {
                return [...prev, dateStr].sort()
            }
        })
    }

    const isDateSelected = (day) => {
        const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            .toISOString().split('T')[0]
        return selectedDates.includes(dateStr)
    }

    const getBookingForDate = (day) => {
        const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            .toISOString().split('T')[0]
        return existingBookings.find(booking => 
            dateStr >= booking.start_date && dateStr <= booking.end_date
        )
    }

    const isMarketingVehicle = (vehicle.department === 'Marketing') ||
        (getDepartmentFromName(vehicle?.name || '') === 'Marketing')

    /** For Marketing vehicles: dates already reserved by another booking are locked (no click, no reserve). */
    const isDateLocked = (day) => {
        if (!isMarketingVehicle) return false
        const booking = getBookingForDate(day)
        if (!booking) return false
        if (existingBooking && booking.id === existingBooking.id) return false
        return true
    }

    const isDateLockedForDateStr = (dateStr) => {
        if (!isMarketingVehicle) return false
        return existingBookings.some(
            b => dateStr >= b.start_date && dateStr <= b.end_date &&
                (!existingBooking || b.id !== existingBooking.id)
        )
    }

    const formatDateDisplay = (dateStr) => {
        const date = new Date(dateStr)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${month}/${day}`
    }

    const formatDateTimeFull = (isoString) => {
        const date = new Date(isoString)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const year = date.getFullYear()
        return `${month}/${day}/${year}`
    }

    const calculateOverlapDays = (conflict) => {
        const conflictStart = new Date(conflict.start_time)
        const conflictEnd = new Date(conflict.end_time)
        const selectedStart = new Date(selectedDates[0] + 'T00:00:00Z')
        const selectedEnd = new Date(selectedDates[selectedDates.length - 1] + 'T23:59:59Z')
        
        const overlapStart = new Date(Math.max(conflictStart.getTime(), selectedStart.getTime()))
        const overlapEnd = new Date(Math.min(conflictEnd.getTime(), selectedEnd.getTime()))
        
        const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return days
    }

    const handleOverrideConfirm = () => {
        setShowOverrideDialog(false)
        setOverrideConfirmed(true)
        // Trigger form submission after state update
        setTimeout(() => {
            document.getElementById('booking-form').requestSubmit()
        }, 0)
    }

    const handleOverrideCancel = () => {
        setShowOverrideDialog(false)
    }
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC to close modal
            if (e.key === 'Escape' && !showOverrideDialog) {
                onClose()
            }
            // ESC to close override dialog
            if (e.key === 'Escape' && showOverrideDialog) {
                handleOverrideCancel()
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showOverrideDialog])
    
    // Focus management - focus first input on mount
    useEffect(() => {
        const firstInput = document.querySelector('.booking-form-section select[name="pilot"]')
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate form
        if (!validateForm()) {
            showError('Please fill in all required fields')
            return
        }

        const isMarketingVehicle = (vehicle.department === 'Marketing') ||
            (getDepartmentFromName(vehicle?.name || '') === 'Marketing')

        // Marketing vehicles: do not allow double-booking; no override dialog
        if (isMarketingVehicle && conflictingBookings.length > 0 && !overrideConfirmed) {
            showError('This vehicle (Marketing) cannot be double-booked. Please select different dates.')
            return
        }

        // If there are conflicts and user hasn't confirmed override, show dialog (non-Marketing only)
        if (conflictingBookings.length > 0 && !overrideConfirmed) {
            setShowOverrideDialog(true)
            return
        }

        setLoading(true)

        try {
            const startDate = selectedDates[0]
            const endDate = selectedDates[selectedDates.length - 1]
            const start_time = new Date(startDate + 'T00:00:00Z').toISOString()
            const end_time = new Date(endDate + 'T23:59:59Z').toISOString()

            // Fetch current vehicle hardware config for snapshot
            const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('hw_config')
                .eq('id', vehicle.id)
                .single()

            const whoOrderedFinal = requesterValue || userName || user?.email || null
            const isMarketingVehicleSubmit = (vehicle.department === 'Marketing') ||
                (getDepartmentFromName(vehicle?.name || '') === 'Marketing')
            const needsApproval = !existingBooking && isMarketingVehicleSubmit

            const bookingData = {
                vehicle_id: vehicle.id,
                user_id: user.id,
                start_time,
                end_time,
                pilot_name: formData.pilot,
                project_name: formData.project || null,
                risk_level: formData.risk_level || null,
                location: formData.location || null,
                duration: formData.duration || null,
                description: formData.description || null,
                requester: whoOrderedFinal,
                                status: needsApproval ? 'pending_approval' : 'confirmed',
                snapshotted_hw_config: vehicleData?.hw_config || null
            }

            if (existingBooking) {
                const updates = {
                    start_time,
                    end_time,
                    pilot_name: formData.pilot || null,
                    project_name: formData.project || null,
                    risk_level: formData.risk_level || null,
                    location: formData.location || null,
                    duration: formData.duration || null,
                    description: formData.description || null,
                    requester: whoOrderedFinal,
                    snapshotted_hw_config: vehicleData?.hw_config || null
                }
                const updated = await db.updateBooking(existingBooking.id, updates)
                await supabase.from('activities').insert({
                    vehicle_id: vehicle.id,
                    user_id: user.id,
                    action_type: 'booking',
                    content: `Updated booking: ${formData.project || '—'} (${startDate} to ${endDate})`
                })
                await logChange({
                    entityType: 'booking',
                    entityId: existingBooking.id,
                    entityName: formData.project || `Booking for ${vehicle.name}`,
                    actionType: 'update',
                    beforeData: existingBooking,
                    afterData: updated,
                    userId: user.id,
                    userEmail: user.email,
                    displayName: displayName || user.email,
                    notes: `Updated booking ${vehicle.name} from ${startDate} to ${endDate}`
                })
                showSuccess(`Booking updated successfully for ${vehicle.name}!`)
                onClose()
                if (onSave) onSave()
                return
            }

            const { data: newBooking, error } = await supabase
                .from('bookings')
                .insert(bookingData)
                .select()
                .single()

            if (error) throw error

            if (needsApproval) {
                const { data: approvalRequest, error: arError } = await supabase
                    .from('approval_requests')
                    .insert({
                        booking_id: newBooking.id,
                        requested_by: user.id,
                        status: 'pending'
                    })
                    .select()
                    .single()
                if (arError) throw arError
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({ approval_request_id: approvalRequest.id })
                if (notifError) throw notifError
            }

            const { error: actError } = await supabase.from('activities').insert({
                vehicle_id: vehicle.id,
                user_id: user.id,
                action_type: 'booking',
                content: `Booked ${vehicle.name} for ${formData.pilot} (${selectedDates[0]} to ${selectedDates[selectedDates.length - 1]})`
            })
            if (actError) throw actError

            // Log the booking creation to change_logs table
            await logChange({
                entityType: 'booking',
                entityId: newBooking.id,
                entityName: formData.project || `Booking for ${vehicle.name}`,
                actionType: 'create',
                beforeData: null,
                afterData: newBooking,
                userId: user.id,
                userEmail: user.email,
                displayName: displayName || user.email,
                notes: `Booked ${vehicle.name} from ${startDate} to ${endDate}`
            })

            showSuccess(needsApproval
                ? `Booking submitted for approval for ${vehicle.name}. An approver will confirm it shortly.`
                : `Booking created successfully for ${vehicle.name}!`)
            onClose()
            if (onSave) onSave()
        } catch (err) {
            const errorDetails = await handleError(err, 'BookingModal.save', {
                userId: user.id,
                userEmail: user.email,
                displayName: displayName || user.email
            })
            const msg = errorDetails.message
            showError(
                import.meta.env?.DEV && err?.message
                    ? `${msg} — ${err.message}`
                    : msg
            )
        } finally {
            setLoading(false)
        }
    }

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const handleModalClick = (e) => {
        e.stopPropagation()
    }

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    return (
        <div className="booking-modal-overlay" onClick={onClose}>
            <div className="booking-modal-container" onClick={handleModalClick}>
                {/* Header */}
<div className="booking-modal-header">
                    <div className="booking-modal-icon">📅</div>
                    <div>
                        <h2>{existingBooking ? 'Edit Reservation' : 'Reserve Vehicle'}</h2>
                        <p className="booking-modal-subtitle">{existingBooking ? 'Editing' : 'Reserving'}: {vehicle.name}</p>
                    </div>
                    <button onClick={onClose} className="booking-modal-close">×</button>
                </div>

                <div className="booking-modal-body">
                    {/* Left: Calendar */}
                    <div className="booking-calendar-section">
                        <div className="calendar-header">
                            <button type="button" onClick={goToPrevMonth}>‹</button>
                            <span>{monthName}</span>
                            <button type="button" onClick={goToNextMonth}>›</button>
                        </div>
                        <div className="calendar-grid">
                            <div className="calendar-day-header">Mon</div>
                            <div className="calendar-day-header">Tue</div>
                            <div className="calendar-day-header">Wed</div>
                            <div className="calendar-day-header">Thu</div>
                            <div className="calendar-day-header">Fri</div>
                            <div className="calendar-day-header">Sat</div>
                            <div className="calendar-day-header">Sun</div>

                            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                <div key={`empty-${i}`} className="calendar-day-empty" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const booking = getBookingForDate(day)
                                const hasBooking = !!booking
                                const locked = isDateLocked(day)
                                return (
                                    <div
                                        key={day}
                                        className={`calendar-day ${isDateSelected(day) ? 'selected' : ''} ${hasBooking ? 'has-booking' : ''} ${locked ? 'locked' : ''}`}
                                        onClick={() => handleDateClick(day)}
                                        onMouseEnter={() => hasBooking && setBookingTooltip({
                                            day,
                                            project: booking.project,
                                            requester: booking.requester,
                                            location: booking.location,
                                            locked
                                        })}
                                        onMouseLeave={() => setBookingTooltip(null)}
                                    >
                                        <div>{day}</div>
                                        {hasBooking && (
                                            <div style={{ 
                                                fontSize: '0.65rem', 
                                                color: booking.status === 'pending_approval' ? '#94a3b8' : '#f59e0b', 
                                                marginTop: '2px',
                                                fontWeight: '600',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {locked ? 'Reserved' : (booking.status === 'pending_approval' ? 'Pending' : (booking.project?.slice(0, 8) ?? ''))}
                                            </div>
                                        )}
                                        {bookingTooltip?.day === day && (
                                            <div className="booking-day-tooltip" role="tooltip">
                                                {locked && (
                                                    <div className="booking-day-tooltip-row">
                                                        <span className="booking-day-tooltip-label">Marketing</span>
                                                        <span className="booking-day-tooltip-value" style={{ color: '#f1f5f9', fontWeight: '600' }}>Date reserved — not available</span>
                                                    </div>
                                                )}
                                                {booking.status === 'pending_approval' && !locked && (
                                                    <div className="booking-day-tooltip-row">
                                                        <span className="booking-day-tooltip-label">Status</span>
                                                        <span className="booking-day-tooltip-value" style={{ color: '#f1f5f9', fontWeight: '600' }}>Pending approval</span>
                                                    </div>
                                                )}
                                                <div className="booking-day-tooltip-row">
                                                    <span className="booking-day-tooltip-label">Project</span>
                                                    <span className="booking-day-tooltip-value">{booking.project || '—'}</span>
                                                </div>
                                                <div className="booking-day-tooltip-row">
                                                    <span className="booking-day-tooltip-label">Requester</span>
                                                    <span className="booking-day-tooltip-value">{booking.requester || '—'}</span>
                                                </div>
                                                <div className="booking-day-tooltip-row">
                                                    <span className="booking-day-tooltip-label">Location</span>
                                                    <span className="booking-day-tooltip-value">{booking.location || '—'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <form id="booking-form" onSubmit={handleSubmit} className="booking-form-section">
                        <div className="booking-form-group">
                            <label>Dates (Including Vehicle Transportation) *</label>
                            <div className={`selected-dates-display ${validationErrors.dates ? 'error' : ''}`}>
                                {selectedDates.length > 0
                                    ? selectedDates.map(d => formatDateDisplay(d)).join(', ')
                                    : null}
                            </div>
                            {validationErrors.dates && (
                                <span className="validation-error">{validationErrors.dates}</span>
                            )}
                        </div>

                        <div className="booking-form-group">
                            <label>Requester *</label>
                            <select
                                value={whoOrderedMode}
                                onChange={(e) => {
                                    const mode = e.target.value
                                    setWhoOrderedMode(mode)
                                    if (mode === 'me') setWhoOrderedCustom('')
                                    // Clear validation error when changing mode
                                    if (validationErrors.requester) {
                                        setValidationErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors.requester
                                            return newErrors
                                        })
                                    }
                                }}
                                className={validationErrors.requester ? 'error' : ''}
                            >
                                <option value="me">{userName}</option>
                                <option value="others">Others</option>
                            </select>
                            {whoOrderedMode === 'others' && (
                                <input
                                    type="text"
                                    value={whoOrderedCustom}
                                    onChange={(e) => {
                                        setWhoOrderedCustom(e.target.value)
                                        // Clear validation error when typing
                                        if (validationErrors.requester) {
                                            setValidationErrors(prev => {
                                                const newErrors = { ...prev }
                                                delete newErrors.requester
                                                return newErrors
                                            })
                                        }
                                    }}
                                    placeholder=""
                                    required
                                    className={`booking-requester-custom ${validationErrors.requester ? 'error' : ''}`}
                                />
                            )}
                            {validationErrors.requester && (
                                <span className="validation-error">{validationErrors.requester}</span>
                            )}
                        </div>

                        <div className="booking-form-group">
                            <label>Pilot</label>
                            <select 
                                name="pilot" 
                                value={formData.pilot} 
                                onChange={handleChange}
                            >
                                <option value="">Select a pilot</option>
                                {PILOT_OPTIONS.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="booking-form-group booking-form-group-project">
                            <label>Project *</label>
                            <input
                                type="text"
                                name="project"
                                value={formData.project}
                                onChange={handleChange}
                                placeholder=""
                                required
                                className={`booking-input-project ${validationErrors.project ? 'error' : ''}`}
                                aria-invalid={!!validationErrors.project}
                                aria-describedby={validationErrors.project ? 'project-error' : undefined}
                            />
                            {validationErrors.project && (
                                <span id="project-error" className="validation-error">{validationErrors.project}</span>
                            )}
                        </div>

                        <div className="booking-form-group booking-form-group-description">
                            <label>Description *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                placeholder=""
                                required
                                className={`booking-input-description ${validationErrors.description ? 'error' : ''}`}
                                aria-invalid={!!validationErrors.description}
                                aria-describedby={validationErrors.description ? 'description-error' : undefined}
                            />
                            {validationErrors.description && (
                                <span id="description-error" className="validation-error">{validationErrors.description}</span>
                            )}
                        </div>

                        <div className="booking-form-group">
                            <label>Risk Level</label>
                            <select name="risk_level" value={formData.risk_level} onChange={handleChange}>
                                <option value="">Select level</option>
                                {RISK_LEVEL_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div className="booking-form-group">
                            <label>Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder=""
                            />
                        </div>

                        <div className="booking-form-group">
                            <label>Duration</label>
                            <input
                                type="text"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                placeholder=""
                            />
                        </div>

                        {/* Conflict Check Loading */}
                        {checkingConflicts && (
                            <div className="booking-conflict-checking">
                                <InlineSpinner />
                                <span>Checking for conflicts...</span>
                            </div>
                        )}

                        {/* Enhanced Conflict Warning */}
                        {!checkingConflicts && conflictWarning && conflictingBookings.length > 0 && (
                            <div className="booking-conflict-enhanced" role="alert">
                                <div className="conflict-header">
                                    <div className="conflict-icon">⚠️</div>
                                    <div>
                                        <div className="conflict-title">
                                            Booking Conflict Detected
                                        </div>
                                        <div className="conflict-subtitle">
                                            {conflictingBookings.length} conflicting {conflictingBookings.length === 1 ? 'booking' : 'bookings'} found
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="conflict-list">
                                    {conflictingBookings.map((conflict, idx) => (
                                        <div key={conflict.id} className="conflict-item">
                                            <div className="conflict-item-header">
                                                <span className="conflict-badge">Conflict {idx + 1}</span>
                                                <span className="conflict-overlap">
                                                    {calculateOverlapDays(conflict)} day{calculateOverlapDays(conflict) > 1 ? 's' : ''} overlap
                                                </span>
                                            </div>
                                            
                                            <div className="conflict-details">
                                                <div className="conflict-detail-row">
                                                    <span className="conflict-label">📋 Project:</span>
                                                    <span className="conflict-value">{conflict.project_name || 'Unnamed Project'}</span>
                                                </div>
                                                <div className="conflict-detail-row">
                                                    <span className="conflict-label">👤 Pilot:</span>
                                                    <span className="conflict-value">{conflict.pilot_name || 'Not specified'}</span>
                                                </div>
                                                <div className="conflict-detail-row">
                                                    <span className="conflict-label">📅 Dates:</span>
                                                    <span className="conflict-value">
                                                        {formatDateTimeFull(conflict.start_time)} - {formatDateTimeFull(conflict.end_time)}
                                                    </span>
                                                </div>
                                                {conflict.requester && (
                                                    <div className="conflict-detail-row">
                                                        <span className="conflict-label">🎯 Requester:</span>
                                                        <span className="conflict-value">{conflict.requester}</span>
                                                    </div>
                                                )}
                                                {conflict.location && (
                                                    <div className="conflict-detail-row">
                                                        <span className="conflict-label">📍 Location:</span>
                                                        <span className="conflict-value">{conflict.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="conflict-footer">
                                    <span className="conflict-footer-icon">💡</span>
                                    <span className="conflict-footer-text">
                                        Please coordinate with the booking owner before proceeding, or select different dates.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="booking-modal-actions">
                            <button type="button" className="booking-btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="booking-btn-confirm" disabled={loading || checkingConflicts}>
                                {loading ? (
                                    <>
                                        <InlineSpinner />
                                        {existingBooking ? 'Updating...' : 'Reserving...'}
                                    </>
                                ) : (
                                    existingBooking ? '✓ Update Reservation' : '✓ Confirm Reservation'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Override Confirmation Dialog */}
                {showOverrideDialog && (
                    <div className="override-dialog-overlay" onClick={handleOverrideCancel}>
                        <div className="override-dialog" onClick={(e) => e.stopPropagation()}>
                            <div className="override-dialog-header">
                                <div className="override-dialog-icon">⚠️</div>
                                <h3>Confirm Booking Override</h3>
                            </div>
                            
                            <div className="override-dialog-body">
                                <p className="override-warning">
                                    You are about to create a booking that conflicts with {conflictingBookings.length} existing {conflictingBookings.length === 1 ? 'booking' : 'bookings'}.
                                </p>
                                
                                <div className="override-conflict-summary">
                                    <strong>Conflicting bookings:</strong>
                                    <ul>
                                        {conflictingBookings.map((conflict, idx) => (
                                            <li key={conflict.id}>
                                                <strong>{conflict.project_name || 'Unnamed Project'}</strong>
                                                <br />
                                                <span className="override-conflict-detail">
                                                    {formatDateTimeFull(conflict.start_time)} - {formatDateTimeFull(conflict.end_time)}
                                                    {conflict.requester && ` • Requester: ${conflict.requester}`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <p className="override-question">
                                    Have you coordinated with the booking owner(s)?
                                </p>
                            </div>
                            
                            <div className="override-dialog-actions">
                                <button 
                                    type="button" 
                                    className="override-btn-cancel"
                                    onClick={handleOverrideCancel}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="override-btn-confirm"
                                    onClick={handleOverrideConfirm}
                                >
                                    Yes, Create Booking Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
