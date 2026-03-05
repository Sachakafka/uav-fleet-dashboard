import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { handleError } from '../lib/errorHandler'
import { logChange } from '../lib/changeLogger'
import { normalizeConfig, hardwareConfigToText } from '../lib/hardwareConfig'
import HardwareConfigModal from './HardwareConfigModal'
import './EditVehicleModal.css'

const ALLOWED_STATUSES = ['Available', 'Maintenance']

function normalizeStatus(status) {
    if (!status) return 'Available'
    const s = status.trim()
    if (ALLOWED_STATUSES.includes(s)) return s
    if (s.toLowerCase().includes('mission') || s.toLowerCase().includes('ready')) return 'Available'
    return 'Available'
}

export default function EditVehicleModal({ vehicle, onClose, onSave }) {
    const { user, displayName } = useAuth()
    const { showSuccess, showError } = useToast()
    const isNew = !vehicle?.id

    const [formData, setFormData] = useState({
        name: vehicle?.name || '',
        status: normalizeStatus(vehicle?.status),
        department: vehicle?.department || 'R&D',
        hw_config: normalizeConfig(vehicle?.hw_config ?? null),
        sw_version: vehicle?.sw_version || '',
        parameter_change_notes: vehicle?.parameter_change_notes || '',
        notes: vehicle?.notes || ''
    })
    const [showHwConfigModal, setShowHwConfigModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        
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
        
        if (!formData.name || formData.name.trim() === '') {
            errors.name = 'Vehicle name is required'
        }
        
        if (!formData.status) {
            errors.status = 'Status is required'
        }
        
        if (!formData.department) {
            errors.department = 'Department is required'
        }
        
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Validate form
        if (!validateForm()) {
            showError('Please fill in all required fields')
            return
        }
        
        setLoading(true)

        try {
            // For updates, fetch current vehicle data for before snapshot
            let beforeData = null
            if (!isNew) {
                const { data: currentVehicle } = await supabase
                    .from('vehicles')
                    .select('*')
                    .eq('id', vehicle.id)
                    .single()
                beforeData = currentVehicle
            }

            // Phase 5: structured hw_config (object) stored as JSONB
            const hwConfigValue = formData.hw_config && typeof formData.hw_config === 'object'
                ? formData.hw_config
                : {}

            const payload = {
                name: formData.name,
                status: formData.status,
                department: formData.department,
                hw_config: hwConfigValue,
                sw_version: formData.sw_version,
                notes: formData.notes
            }
            
            // Only include parameter_change_notes if it has a value (optional field)
            // This allows the app to work even if the DB column doesn't exist yet
            if (formData.parameter_change_notes && formData.parameter_change_notes.trim() !== '') {
                payload.parameter_change_notes = formData.parameter_change_notes
            }
            
            if (!isNew) payload.id = vehicle.id

            const { data, error } = await supabase
                .from('vehicles')
                .upsert(payload)
                .select()
                .single()

            if (error) throw error

            await supabase.from('activities').insert({
                vehicle_id: data.id,
                user_id: user.id,
                action_type: 'status_change',
                content: isNew ? `Created vehicle ${data.name}` : `Updated vehicle details`
            })

            // Log the change to change_logs table
            await logChange({
                entityType: 'vehicle',
                entityId: data.id,
                entityName: data.name,
                actionType: isNew ? 'create' : 'update',
                beforeData: beforeData,
                afterData: data,
                userId: user.id,
                userEmail: user.email,
                displayName: displayName || user.email
            })

            showSuccess(isNew ? `Vehicle "${data.name}" created successfully!` : `Vehicle "${data.name}" updated successfully!`)
            onClose()
            if (onSave) onSave()
        } catch (err) {
            const errorDetails = await handleError(err, 'EditVehicleModal.save', {
                userId: user.id,
                userEmail: user.email,
                displayName: displayName || user.email
            })
            showError(errorDetails.message)
        } finally {
            setLoading(false)
        }
    }

    // Stop propagation to prevent closing when clicking inside modal
    const handleModalClick = (e) => {
        e.stopPropagation()
    }
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])
    
    // Focus management - focus first input on mount
    useEffect(() => {
        const firstInput = document.querySelector('.edit-modal-container input[name="name"]')
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100)
        }
    }, [])

    return (
        <div className="edit-modal-overlay" onClick={onClose}>
            <div className="edit-modal-container" onClick={handleModalClick}>
                {/* Header */}
                <div className="edit-modal-header">
                    <div className="edit-modal-icon">
                        {isNew ? '🚀' : '✏️'}
                    </div>
                    <div>
                        <h2>{isNew ? 'Add New Vehicle' : 'Edit Vehicle'}</h2>
                        <p className="edit-modal-subtitle">
                            {isNew ? 'Configure your new fleet unit' : `Editing: ${vehicle?.name}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="edit-modal-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="edit-modal-form">
                    {/* Vehicle Name */}
                    <div className="edit-form-group">
                        <label>Vehicle Name *</label>
                        <input
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. RD-117, Training-933"
                            className={validationErrors.name ? 'error' : ''}
                            aria-invalid={!!validationErrors.name}
                            aria-describedby={validationErrors.name ? 'name-error' : undefined}
                        />
                        {validationErrors.name && (
                            <span id="name-error" className="validation-error">{validationErrors.name}</span>
                        )}
                    </div>

                    {/* Department */}
                    <div className="edit-form-group">
                        <label>Department *</label>
                        <div className="edit-select-wrapper">
                            <select 
                                name="department" 
                                value={formData.department} 
                                onChange={handleChange}
                                required
                                className={validationErrors.department ? 'error' : ''}
                                aria-invalid={!!validationErrors.department}
                                aria-describedby={validationErrors.department ? 'department-error' : undefined}
                            >
                                <option value="R&D">R&D</option>
                                <option value="Training">Training</option>
                                <option value="Marketing">Marketing</option>
                            </select>
                        </div>
                        {validationErrors.department && (
                            <span id="department-error" className="validation-error">{validationErrors.department}</span>
                        )}
                    </div>

                    {/* Status */}
                    <div className="edit-form-group">
                        <label>Status</label>
                        <div className="edit-select-wrapper">
                            <select 
                                name="status" 
                                value={formData.status} 
                                onChange={handleChange}
                                className={validationErrors.status ? 'error' : ''}
                                aria-invalid={!!validationErrors.status}
                                aria-describedby={validationErrors.status ? 'status-error' : undefined}
                            >
                                <option value="Available">✓ Available</option>
                                <option value="Maintenance">⚠️ Maintenance</option>
                            </select>
                        </div>
                        {validationErrors.status && (
                            <span id="status-error" className="validation-error">{validationErrors.status}</span>
                        )}
                    </div>

                    {/* Hardware Config: structured modal + preview below */}
                    <div className="edit-form-group">
                        <label>Hardware Config</label>
                        <div className="edit-hw-config-row">
                            <button
                                type="button"
                                className="edit-hw-config-btn"
                                onClick={() => setShowHwConfigModal(true)}
                            >
                                ⚙️ Configure Hardware
                            </button>
                            {formData.hw_config && hardwareConfigToText(formData.hw_config) && (
                                <div className="edit-hw-config-preview" title={hardwareConfigToText(formData.hw_config)}>
                                    <span className="edit-hw-config-preview-label">Preview</span>
                                    <p className="edit-hw-config-preview-text">{hardwareConfigToText(formData.hw_config)}</p>
                                </div>
                            )}
                        </div>
                        {showHwConfigModal && (
                            <HardwareConfigModal
                                initialConfig={formData.hw_config}
                                onSave={(config) => {
                                    setFormData(prev => ({ ...prev, hw_config: config }))
                                    setShowHwConfigModal(false)
                                }}
                                onClose={() => setShowHwConfigModal(false)}
                            />
                        )}
                    </div>

                    {/* Software Version */}
                    <div className="edit-form-group">
                        <label>Software Version</label>
                        <input
                            name="sw_version"
                            value={formData.sw_version}
                            onChange={handleChange}
                            placeholder="e.g. v2.0.4"
                        />
                    </div>

                    {/* Parameter Change */}
                    <div className="edit-form-group">
                        <label>Parameter Change</label>
                        <textarea
                            name="parameter_change_notes"
                            value={formData.parameter_change_notes}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Document any parameter changes made to this vehicle..."
                        />
                    </div>

                    {/* Notes */}
                    <div className="edit-form-group">
                        <label>Operational Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Any additional notes about this vehicle..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="edit-modal-actions">
                        <button type="button" className="edit-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="edit-btn-save" disabled={loading}>
                            {loading ? (
                                <span>⏳ Saving...</span>
                            ) : (
                                <span>{isNew ? '🚀 Create Vehicle' : '💾 Save Changes'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
