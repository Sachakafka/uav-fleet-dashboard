import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FilterFunnelIcon from './FilterFunnelIcon'
import './FilterModal.css'

const DEPARTMENTS = ['R&D', 'Training', 'Marketing']

export default function FilterModal({ onClose, onApplyFilter, initialSelectedVehicles = [] }) {
    const [expandedDepartments, setExpandedDepartments] = useState(new Set())
    const [vehiclesByDepartment, setVehiclesByDepartment] = useState({})
    const [selectedVehicleIds, setSelectedVehicleIds] = useState(new Set(initialSelectedVehicles))
    const [loading, setLoading] = useState(true)

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
            console.error('Error fetching vehicles for filter:', err)
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

    const selectAllInDepartment = (dept) => {
        const vehicles = vehiclesByDepartment[dept] || []
        setSelectedVehicleIds(prev => {
            const newSet = new Set(prev)
            vehicles.forEach(v => newSet.add(v.id))
            return newSet
        })
    }

    const deselectAllInDepartment = (dept) => {
        const vehicles = vehiclesByDepartment[dept] || []
        const vehicleIds = new Set(vehicles.map(v => v.id))
        setSelectedVehicleIds(prev => {
            const newSet = new Set(prev)
            vehicleIds.forEach(id => newSet.delete(id))
            return newSet
        })
    }

    const handleApply = () => {
        onApplyFilter(selectedVehicleIds.size > 0 ? Array.from(selectedVehicleIds) : null)
        onClose()
    }

    const handleClearAll = () => {
        setSelectedVehicleIds(new Set())
    }

    const handleModalClick = (e) => {
        e.stopPropagation()
    }

    const getDepartmentSelectedCount = (dept) => {
        const vehicles = vehiclesByDepartment[dept] || []
        return vehicles.filter(v => selectedVehicleIds.has(v.id)).length
    }

    return (
        <div className="filter-modal-overlay" onClick={onClose}>
            <div className="filter-modal-container" onClick={handleModalClick}>
                {/* Header */}
                <div className="filter-modal-header">
                    <FilterFunnelIcon size={24} color="currentColor" className="filter-modal-icon" />
                    <h2>Filter Vehicles</h2>
                    <button onClick={onClose} className="filter-modal-close">×</button>
                </div>

                {/* Body */}
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
                                const allSelected = vehicles.length > 0 && selectedCount === vehicles.length

                                return (
                                    <div key={dept} className="filter-department-section">
                                        {/* Department Header */}
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
                                            {vehicles.length > 0 && (
                                                <button
                                                    className="filter-select-all-btn"
                                                    onClick={() => allSelected ? deselectAllInDepartment(dept) : selectAllInDepartment(dept)}
                                                >
                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Vehicles List */}
                                        {isExpanded && (
                                            <div className="filter-vehicles-list">
                                                {vehicles.length === 0 ? (
                                                    <div className="filter-no-vehicles">
                                                        No vehicles in this department
                                                    </div>
                                                ) : (
                                                    vehicles.map(vehicle => (
                                                        <label
                                                            key={vehicle.id}
                                                            className="filter-vehicle-item"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedVehicleIds.has(vehicle.id)}
                                                                onChange={() => toggleVehicle(vehicle.id)}
                                                            />
                                                            <span className="filter-vehicle-name">
                                                                {vehicle.name}
                                                            </span>
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

                {/* Footer */}
                <div className="filter-modal-footer">
                    <div className="filter-footer-info">
                        {selectedVehicleIds.size > 0 ? (
                            <span>{selectedVehicleIds.size} vehicle{selectedVehicleIds.size !== 1 ? 's' : ''} selected</span>
                        ) : (
                            <span>All vehicles (no filter)</span>
                        )}
                    </div>
                    <div className="filter-footer-actions">
                        <button className="filter-btn-clear" onClick={handleClearAll}>
                            Clear All
                        </button>
                        <button className="filter-btn-apply" onClick={handleApply}>
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
