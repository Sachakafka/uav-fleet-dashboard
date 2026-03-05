import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/database'
import './FilterModal.css'

const DEPARTMENTS = ['R&D', 'Training', 'Marketing']

export default function DeleteVehicleModal({ onClose }) {
    const [expandedDepartments, setExpandedDepartments] = useState(new Set())
    const [vehiclesByDepartment, setVehiclesByDepartment] = useState({})
    const [selectedVehicleIds, setSelectedVehicleIds] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchVehicles()
    }, [])

    const fetchVehicles = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('id, name, department')
                .is('deleted_at', null)
                .order('name', { ascending: true })

            if (error) throw error

            const grouped = {}
            DEPARTMENTS.forEach(dept => {
                grouped[dept] = []
            })

            ;(data || []).forEach(vehicle => {
                const dept = vehicle.department || 'R&D'
                if (grouped[dept]) {
                    grouped[dept].push(vehicle)
                }
            })

            setVehiclesByDepartment(grouped)
        } catch (err) {
            console.error('Error fetching vehicles for delete modal:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleDepartment = (dept) => {
        setExpandedDepartments(prev => {
            const newSet = new Set(prev)
            if (newSet.has(dept)) {
                newSet.delete(dept)
            } else {
                newSet.add(dept)
            }
            return newSet
        })
    }

    const toggleVehicle = (vehicleId) => {
        setSelectedVehicleIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(vehicleId)) {
                newSet.delete(vehicleId)
            } else {
                newSet.add(vehicleId)
            }
            return newSet
        })
    }

    const handleDeleteClick = () => {
        if (selectedVehicleIds.size === 0) return
        setShowConfirm(true)
    }

    const handleConfirmCancel = () => {
        setShowConfirm(false)
    }

    const handleConfirmDelete = async () => {
        const ids = Array.from(selectedVehicleIds)
        setDeleting(true)
        try {
            await Promise.all(ids.map(id => db.deleteVehicle(id)))
            window.dispatchEvent(new CustomEvent('vehicle-deleted', { detail: { count: ids.length } }))
            onClose()
        } catch (err) {
            console.error('Delete vehicle error:', err)
            window.dispatchEvent(new CustomEvent('vehicle-delete-error', { detail: { message: err?.message || 'Delete failed' } }))
        } finally {
            setDeleting(false)
        }
    }

    const handleModalClick = (e) => {
        e.stopPropagation()
    }

    const getDepartmentSelectedCount = (dept) => {
        const vehicles = vehiclesByDepartment[dept] || []
        return vehicles.filter(v => selectedVehicleIds.has(v.id)).length
    }

    return (
        <>
            <div className="filter-modal-overlay" onClick={onClose}>
                <div className="filter-modal-container" onClick={handleModalClick}>
                    <div className="filter-modal-header">
                        <span className="filter-modal-icon" aria-hidden>🗑</span>
                        <h2>Delete Vehicle</h2>
                        <button onClick={onClose} className="filter-modal-close" aria-label="Close">×</button>
                    </div>

                    <div className="filter-modal-body">
                        {loading ? (
                            <div className="filter-loading">
                                <div className="spinner"></div>
                                <p>Loading vehicles...</p>
                            </div>
                        ) : (
                            <div className="filter-departments-list">
                                {DEPARTMENTS.map(dept => {
                                    const isExpanded = expandedDepartments.has(dept)
                                    const vehicles = vehiclesByDepartment[dept] || []
                                    const selectedCount = getDepartmentSelectedCount(dept)

                                    return (
                                        <div key={dept} className="filter-department-section">
                                            <div className="filter-department-header">
                                                <button
                                                    className="filter-department-toggle"
                                                    onClick={() => toggleDepartment(dept)}
                                                >
                                                    <span className="filter-expand-icon">
                                                        {isExpanded ? '▼' : '▶'}
                                                    </span>
                                                    <span className="filter-department-name">{dept}</span>
                                                    <span className="filter-department-count">
                                                        {selectedCount > 0 && `${selectedCount}/`}{vehicles.length}
                                                    </span>
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="filter-vehicles-list">
                                                    {vehicles.length === 0 ? (
                                                        <div className="filter-no-vehicles">No vehicles in this department</div>
                                                    ) : (
                                                        vehicles.map(vehicle => (
                                                            <label key={vehicle.id} className="filter-vehicle-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedVehicleIds.has(vehicle.id)}
                                                                    onChange={() => toggleVehicle(vehicle.id)}
                                                                />
                                                                <span className="filter-vehicle-name">{vehicle.name}</span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="filter-modal-footer">
                        <div className="filter-footer-info">
                            {selectedVehicleIds.size > 0 ? (
                                <span>{selectedVehicleIds.size} vehicle{selectedVehicleIds.size !== 1 ? 's' : ''} selected</span>
                            ) : (
                                <span>Select vehicles to delete (soft delete)</span>
                            )}
                        </div>
                        <div className="filter-footer-actions">
                            <button type="button" className="filter-btn-clear" onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="filter-btn-apply delete-vehicle-submit"
                                onClick={handleDeleteClick}
                                disabled={selectedVehicleIds.size === 0}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <div className="filter-modal-overlay confirm-delete-overlay" style={{ zIndex: 10000 }} onClick={handleConfirmCancel}>
                    <div className="filter-modal-container confirm-delete-box" onClick={handleModalClick}>
                        <div className="filter-modal-header">
                            <h2>Confirm delete?</h2>
                            <button onClick={handleConfirmCancel} className="filter-modal-close" aria-label="Close">×</button>
                        </div>
                        <div className="filter-modal-footer">
                            <div className="filter-footer-actions" style={{ width: '100%' }}>
                                <button type="button" className="filter-btn-clear" onClick={handleConfirmCancel} disabled={deleting}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="filter-btn-apply delete-vehicle-confirm-btn"
                                    onClick={handleConfirmDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
