import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { handleError } from '../lib/errorHandler'
import VehicleCard from '../components/VehicleCard'
import BookingModal from '../components/BookingModal'
import EditVehicleModal from '../components/EditVehicleModal'
import ActivityLogModal from '../components/ActivityLog'
import ChangeHistoryModal from '../components/ChangeHistoryModal'
import { DashboardSkeleton } from '../components/LoadingSkeleton'

import Header from '../components/Header'

export default function Dashboard() {
    const { user, role } = useAuth()
    const { showError, showSuccess } = useToast()
    const [vehicles, setVehicles] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [selectedVehicleIds, setSelectedVehicleIds] = useState(null) // null = show all, array = filtered

    // Modal States
    const [bookingVehicle, setBookingVehicle] = useState(null)
    const [editingVehicle, setEditingVehicle] = useState(null) // null = closed, {} = new, obj = edit
    const [historyVehicle, setHistoryVehicle] = useState(null)
    const [changeHistoryVehicle, setChangeHistoryVehicle] = useState(null)

    useEffect(() => {
        fetchVehicles()
    }, [])

    // Refetch when bookings change (e.g. user cancelled in My Bookings) so calendars and next-booking stay in sync
    useEffect(() => {
        const onBookingListChanged = () => fetchVehicles()
        window.addEventListener('booking-list-changed', onBookingListChanged)
        return () => window.removeEventListener('booking-list-changed', onBookingListChanged)
    }, [])

    // Listen for "Add Vehicle" button click from Header
    useEffect(() => {
        const handleAddVehicle = () => {
            setEditingVehicle({}) // Open modal with empty vehicle (create mode)
        }
        window.addEventListener('open-add-vehicle-modal', handleAddVehicle)
        return () => window.removeEventListener('open-add-vehicle-modal', handleAddVehicle)
    }, [])

    // Refetch when vehicles are soft-deleted from Header "Delete Vehicle" flow
    useEffect(() => {
        const onVehicleDeleted = (e) => {
            const count = e.detail?.count ?? 1
            showSuccess(`${count} vehicle${count !== 1 ? 's' : ''} removed from the fleet.`)
            fetchVehicles()
        }
        const onVehicleDeleteError = (e) => {
            showError(e.detail?.message ?? 'Failed to delete vehicle(s).')
        }
        window.addEventListener('vehicle-deleted', onVehicleDeleted)
        window.addEventListener('vehicle-delete-error', onVehicleDeleteError)
        return () => {
            window.removeEventListener('vehicle-deleted', onVehicleDeleted)
            window.removeEventListener('vehicle-delete-error', onVehicleDeleteError)
        }
    }, [showSuccess, showError])

    const fetchVehicles = async () => {
        try {
            setLoading(true)
            setLoadError(null)
            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: false })

            if (vehiclesError) throw vehiclesError
            // Exclude soft-deleted vehicles so they are hidden from all users
            const raw = (vehiclesData || []).filter((v) => v.deleted_at == null)

            // Sort all vehicles alphabetically by name
            const sorted = [...raw].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

            if (sorted.length === 0) {
                setVehicles([])
                setLoading(false)
                return
            }

            // Fetch upcoming bookings for all vehicles
            const vehicleIds = sorted.map(v => v.id)
            const now = new Date().toISOString()
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select('id, vehicle_id, start_time, project_name, status')
                .in('vehicle_id', vehicleIds)
                .is('deleted_at', null)
                .neq('status', 'rejected')
                .gte('start_time', now)
                .order('start_time', { ascending: true })

            // Map next booking to each vehicle
            const nextByVehicle = {}
            for (const b of bookingsData || []) {
                if (nextByVehicle[b.vehicle_id] == null) {
                    const start = b.start_time ? new Date(b.start_time) : null
                    nextByVehicle[b.vehicle_id] = {
                        project: b.project_name ?? '',
                        date: start ? start.toLocaleDateString(undefined, { dateStyle: 'medium' }) : '',
                    }
                }
            }

            setVehicles(sorted.map(v => ({
                ...v,
                next_booking: nextByVehicle[v.id] || null,
            })))
        } catch (error) {
            console.error('Error fetching vehicles:', error)
            const errorDetails = await handleError(error, 'Dashboard.fetchVehicles', {
                userId: user?.id,
                userEmail: user?.email
            })
            const message = import.meta.env.DEV ? (error.message || errorDetails.message) : errorDetails.message
            showError(message)
            setLoadError(message)
            setVehicles([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        setSearchQuery(e.target.value)
    }

    const filteredVehicles = vehicles.filter(v => {
        // Apply search query filter
        const matchesSearch = v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.status?.toLowerCase().includes(searchQuery.toLowerCase())
        
        // Apply vehicle ID filter (null means show all)
        const matchesVehicleFilter = selectedVehicleIds === null || selectedVehicleIds.includes(v.id)
        
        return matchesSearch && matchesVehicleFilter
    })

    const handleFilterChange = (vehicleIds) => {
        setSelectedVehicleIds(vehicleIds)
    }

    return (
        <div className="dashboard-container">
            <Header 
                onFilterChange={handleFilterChange}
                selectedVehicleIds={selectedVehicleIds || []}
            />

            <div className="dashboard-content">
                {loading ? (
                    <DashboardSkeleton count={6} />
                ) : loadError ? (
                    <div className="dashboard-error-state" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                        <p style={{ marginBottom: '1rem' }}>Couldn&apos;t load vehicles. {loadError}</p>
                        <button type="button" className="btn-add-vehicle-header" onClick={() => fetchVehicles()}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="vehicle-grid fade-in">
                        {filteredVehicles.map(vehicle => (
                            <VehicleCard
                                key={vehicle.id}
                                vehicle={vehicle}
                                onEdit={setEditingVehicle}
                                onBook={setBookingVehicle}
                                onViewHistory={setChangeHistoryVehicle}
                            />
                        ))}
                        {filteredVehicles.length === 0 && (
                            <p style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>
                                No vehicles found matching "{searchQuery}"
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {bookingVehicle && (
                <BookingModal
                    vehicle={bookingVehicle}
                    onClose={() => setBookingVehicle(null)}
                    onSave={fetchVehicles}
                />
            )}

            {editingVehicle && (
                <EditVehicleModal
                    vehicle={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSave={fetchVehicles}
                />
            )}

            {historyVehicle && (
                <ActivityLogModal vehicle={historyVehicle} onClose={() => setHistoryVehicle(null)} />
            )}

            {changeHistoryVehicle && (
                <ChangeHistoryModal
                    entityType="vehicle"
                    entityId={changeHistoryVehicle.id}
                    entityName={changeHistoryVehicle.name}
                    onClose={() => setChangeHistoryVehicle(null)}
                />
            )}
        </div>
    )
}
