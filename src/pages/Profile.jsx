import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

function emailLocalPart(email) {
    if (!email || !email.includes('@')) return email || ''
    return email.slice(0, email.indexOf('@'))
}

export default function Profile() {
    const { user, role, displayName, updateDisplayName } = useAuth()
    const [userName, setUserName] = useState('')
    const [editUserName, setEditUserName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const defaultName = displayName ?? emailLocalPart(user?.email) ?? ''

    useEffect(() => {
        setUserName(defaultName)
        setEditUserName(defaultName)
    }, [defaultName])

    const handleSave = async () => {
        setError(null)
        setSaving(true)
        try {
            await updateDisplayName(editUserName.trim() || null)
            setUserName(editUserName.trim() || defaultName)
        } catch (e) {
            setError(e?.message ?? 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setEditUserName(userName)
        setError(null)
    }

    const displayUserName = userName || defaultName || 'User'

    return (
        <div className="dashboard-container">
            <Header title="User Profile" />

            <div className="dashboard-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="vehicle-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', background: '#2196F3',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold'
                        }}>
                            {(displayUserName || user?.email)?.[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ margin: 0 }}>{displayUserName}</h2>
                            <span className={`status-badge ${role === 'admin' ? 'mission' : 'available'}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                                {role === 'admin' ? 'Admin' : 'User'}
                            </span>
                        </div>
                    </div>

                    <div style={{ paddingTop: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#888' }}>Account Details</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ color: '#666', fontSize: '0.9rem' }}>User Name</label>
                                <input
                                    type="text"
                                    value={editUserName}
                                    onChange={(e) => setEditUserName(e.target.value)}
                                    placeholder="Nickname"
                                    className="profile-input"
                                />
                                {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>}
                            </div>
                            <div>
                                <label style={{ color: '#666', fontSize: '0.9rem' }}>Email Address</label>
                                <p style={{ margin: '0.2rem 0' }}>{user?.email}</p>
                            </div>
                            <div>
                                <label style={{ color: '#666', fontSize: '0.9rem' }}>Last Sign In</label>
                                <p style={{ margin: '0.2rem 0', color: '#888' }}>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</p>
                            </div>
                        </div>
                        <div className="profile-actions profile-actions-bottom">
                            <button type="button" onClick={handleCancel} className="profile-btn-cancel">
                                Cancel
                            </button>
                            <button type="button" onClick={handleSave} disabled={saving} className="profile-btn-save">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
