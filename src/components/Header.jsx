import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import CalendarOverviewModal from './CalendarOverviewModal'
import FilterModal from './FilterModal'
import DeleteVehicleModal from './DeleteVehicleModal'
import FilterFunnelIcon from './FilterFunnelIcon'
import logoSrc from '../assets/logo.png'
import { isApprover } from '../lib/approvers'
import db from '../lib/database'

export default function Header({ title, onFilterChange, selectedVehicleIds = [] }) {
    const { user, role, signOut } = useAuth()
    const [showMenu, setShowMenu] = useState(false)
    const [showCalendarModal, setShowCalendarModal] = useState(false)
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [showDeleteVehicleModal, setShowDeleteVehicleModal] = useState(false)
    const [pendingNotificationCount, setPendingNotificationCount] = useState(0)
    const menuRef = useRef(null)
    const navigate = useNavigate()

    const approver = isApprover(user?.email)

    useEffect(() => {
        if (!approver) return
        let cancelled = false
        const fetch = () =>
            db.getPendingApprovalNotifications()
                .then((list) => { if (!cancelled) setPendingNotificationCount(list.length) })
                .catch(() => { if (!cancelled) setPendingNotificationCount(0) })
        fetch()
        return () => { cancelled = true }
    }, [approver])

    useEffect(() => {
        if (approver && showMenu) {
            db.getPendingApprovalNotifications()
                .then((list) => setPendingNotificationCount(list.length))
                .catch(() => {})
        }
    }, [approver, showMenu])

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const handleProfileClick = () => {
        navigate('/profile')
        setShowMenu(false)
    }

    const handleAdminClick = () => {
        if (role === 'admin') {
            navigate('/admin')
            setShowMenu(false)
        }
    }

    const handleAddVehicle = () => {
        const evt = new CustomEvent('open-add-vehicle-modal')
        window.dispatchEvent(evt)
    }

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const initial = user?.email ? user.email[0].toUpperCase() : '?'

    return (
        <header className="dashboard-header">
            <div className="title-section" onClick={() => navigate('/')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={logoSrc} alt="DQ" style={{ height: '2rem', width: 'auto', display: 'block' }} />
                    <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                        DQ VEHICLE DASHBOARD
                    </h1>
                </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                {/* Filter button */}
                <button
                    type="button"
                    className="icon-btn-header icon-btn-header-with-label"
                    aria-label="Filter"
                    title="Filter Vehicles"
                    data-testid="filter-trigger"
                    onClick={() => setShowFilterModal(true)}
                >
                    <FilterFunnelIcon size={18} color="currentColor" />
                    <span className="filter-btn-label">Filter</span>
                </button>

                {/* Schedule button — visible text + test id for E2E and a11y */}
                <button
                    type="button"
                    className="icon-btn-header icon-btn-header-with-label"
                    aria-label="Schedule"
                    title="Schedule"
                    data-testid="schedule-trigger"
                    onClick={() => setShowCalendarModal(true)}
                >
                    <span aria-hidden="true">📅</span>
                    <span className="calendar-btn-label">Schedule</span>
                </button>

                {/* Add Vehicle Button (Ref match) */}
                {role === 'admin' && (
                    <button className="btn-add-vehicle-header" onClick={handleAddVehicle}>
                        + ADD VEHICLE
                    </button>
                )}

                {/* Profile Section */}
                <div className="user-info" ref={menuRef}>
                    <div
                        className="profile-trigger"
                        onClick={() => setShowMenu(!showMenu)}
                        title={user?.email}
                    >
                        {initial}
                    </div>

                    {showMenu && (
                        <div className="profile-menu">
                            <div className="profile-menu-header">
                                <span className="user-email">{user?.email}</span>
                            </div>
                            <button className="profile-menu-item" onClick={handleProfileClick}>👤 Profile Page</button>
                            <button
                                className={`profile-menu-item ${pendingNotificationCount > 0 ? 'profile-menu-item-notifications-pending' : ''}`}
                                onClick={() => { navigate('/notifications'); setShowMenu(false); }}
                            >
                                🔔 Notifications
                                {pendingNotificationCount > 0 && (
                                    <span className="profile-menu-item-badge" aria-label={`${pendingNotificationCount} pending`}>
                                        ({pendingNotificationCount})
                                    </span>
                                )}
                            </button>
                            <button className="profile-menu-item" onClick={() => { navigate('/my-bookings'); setShowMenu(false); }}>
                                📋 My Bookings
                            </button>
                            {role === 'admin' && (
                                <button
                                    className="profile-menu-item"
                                    onClick={() => { setShowDeleteVehicleModal(true); setShowMenu(false); }}
                                >
                                    🗑 Delete Vehicle
                                </button>
                            )}
                            <button
                                className={`profile-menu-item ${role === 'admin' ? '' : 'disabled'}`}
                                onClick={handleAdminClick}
                                style={{ opacity: role === 'admin' ? 1 : 0.5, cursor: role === 'admin' ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between' }}
                            >
                                <span>{role === 'admin' ? '⚡ Admin' : '👤 User'}</span>
                                {role === 'admin' && <span>➜</span>}
                            </button>
                            <button className="profile-menu-item danger" onClick={handleLogout}>Sign Out</button>
                        </div>
                    )}
                </div>
            </div>

            {showCalendarModal && (
                <CalendarOverviewModal onClose={() => setShowCalendarModal(false)} />
            )}

            {showFilterModal && (
                <FilterModal
                    onClose={() => setShowFilterModal(false)}
                    onApplyFilter={onFilterChange}
                    initialSelectedVehicles={selectedVehicleIds}
                />
            )}

            {showDeleteVehicleModal && (
                <DeleteVehicleModal onClose={() => setShowDeleteVehicleModal(false)} />
            )}
        </header>
    )
}
