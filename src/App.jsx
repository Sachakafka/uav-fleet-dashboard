import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import Profile from './pages/Profile'
import MyBookings from './pages/MyBookings'
import Notifications from './pages/Notifications'
import './App.css'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="loading-screen">Initialize Fleet Systems...</div>

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && role !== 'admin') {
    // User tried to access admin page but is not admin
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />

        <Route path="/notifications" element={
          <PrivateRoute>
            <Notifications />
          </PrivateRoute>
        } />

        <Route path="/my-bookings" element={
          <PrivateRoute>
            <MyBookings />
          </PrivateRoute>
        } />

        <Route path="/admin" element={
          <PrivateRoute adminOnly={true}>
            <AdminPanel />
          </PrivateRoute>
        } />

        {/* Catch all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  
  // Show loading while checking auth state
  if (loading) return <div className="loading-screen">Initialize Fleet Systems...</div>
  
  // If user is logged in, redirect to dashboard
  if (user) return <Navigate to="/" replace />
  
  // Otherwise show login page
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
