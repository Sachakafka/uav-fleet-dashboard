import Header from '../components/Header'
import NotificationsPanel from '../components/NotificationsPanel'
import { useAuth } from '../contexts/AuthContext'
import { isApprover } from '../lib/approvers'

export default function Notifications() {
    const { user } = useAuth()
    const approver = isApprover(user?.email)

    return (
        <div className="dashboard-container">
            <Header title="Notifications" />

            <div className="dashboard-content" style={{ maxWidth: '720px', margin: '0 auto' }}>
                {approver ? (
                    <NotificationsPanel />
                ) : (
                    <div className="vehicle-card" style={{ padding: '2rem' }}>
                        <p style={{ color: '#888', margin: 0 }}>
                            You don&apos;t have any pending approval notifications.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
