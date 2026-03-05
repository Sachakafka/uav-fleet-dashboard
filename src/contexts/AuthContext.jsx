
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState('viewer')
    const [department, setDepartment] = useState('R&D')
    const [displayName, setDisplayName] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        
        // Check active session and handle OAuth callback
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return
            
            if (error) {
                console.error('Auth session error:', error)
                // Clear hash to prevent infinite loop on error
                if (window.location.hash && window.location.hash.includes('error')) {
                    console.log('Clearing error auth hash')
                    window.history.replaceState(null, '', window.location.pathname)
                }
                setLoading(false)
                return
            }
            
            console.log('Initial session check:', !!session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return
            
            console.log('Auth event:', event, 'Session:', !!session)
            
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                setUser(null)
                setRole('viewer')
                setDepartment('R&D')
                setDisplayName(null)
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setUser(session?.user ?? null)
                if (session?.user) {
                    fetchProfile(session.user.id)
                    // Clear the hash after successful sign in to prevent re-processing
                    if (window.location.hash) {
                        window.history.replaceState(null, '', window.location.pathname)
                    }
                }
            } else if (event === 'INITIAL_SESSION') {
                // This event is handled by getSession above
                // Don't set loading to false here to avoid race condition
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, display_name, email, department')
                .eq('id', userId)
                .single()

            if (data) {
                setRole(data.role || 'viewer')
                setDepartment(data.department || 'R&D')
                setDisplayName(data.display_name ?? null)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        } finally {
            setLoading(false)
        }
    }

    // Admin whitelist override
    const finalRole = (user?.email && ['a.chang@deltaquad.com', 'chris@deltaquad.com'].includes(user.email))
        ? 'admin'
        : role

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    const signInWithGoogle = async () => {
        // Build redirect URL: must match Supabase Redirect URLs exactly
        // Local: http://localhost:5174/uav-fleet-dashboard/
        // Vercel: https://uav-fleet-dashboard.vercel.app/
        const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || ''
        const origin = window.location.origin.replace(/\/+$/, '')
        const redirectUrl = origin + (basePath ? `/${basePath.replace(/^\/+/, '')}/` : '/')
        
        console.log('Initiating Google OAuth with redirect:', redirectUrl)
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: false
            }
        })
        if (error) {
            console.error('Error signing in with Google:', error)
            throw error
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setRole('viewer')
        setDisplayName(null)
    }

    const updateDisplayName = async (newDisplayName) => {
        if (!user?.id) return
        const { error } = await supabase
            .from('profiles')
            .update({ display_name: newDisplayName || null })
            .eq('id', user.id)
        if (error) throw error
        setDisplayName(newDisplayName || null)
    }

    return (
        <AuthContext.Provider value={{ user, role: finalRole, department, displayName, loading, signUp, signIn, signInWithGoogle, signOut, updateDisplayName }}>
            {children}
        </AuthContext.Provider>
    )
}
