import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Feature flag: Set to true to enable email/password authentication (no Google Cloud Console needed; suitable for internal testing)
const ENABLE_EMAIL_AUTH = true  // Enabled: sign in with email+password without Google OAuth
// Show email form when running E2E with test credentials (playwright sets VITE_E2E_EMAIL_AUTH)
const SHOW_EMAIL_AUTH_FOR_E2E = import.meta.env.VITE_E2E_EMAIL_AUTH === 'true' || import.meta.env.VITE_E2E_EMAIL_AUTH === '1'

export default function Login() {
    const { signIn, signUp, signInWithGoogle, user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState('')
    const [robotChecked, setRobotChecked] = useState(false)

    // If user is already logged in (OAuth callback succeeded), redirect to dashboard
    useEffect(() => {
        if (user) {
            console.log('User logged in, redirecting to dashboard')
            navigate('/', { replace: true })
        }
    }, [user, navigate])

    // E2E: auto-check robot so tests can submit the email form without clicking captcha
    useEffect(() => {
        if (SHOW_EMAIL_AUTH_FOR_E2E) setRobotChecked(true)
    }, [SHOW_EMAIL_AUTH_FOR_E2E])

    // Password validation logic
    const validatePassword = (pass) => {
        if (pass.length < 12) return "Password must be at least 12 characters."
        if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter."
        if (!/[a-z]/.test(pass)) return "Password must contain a lowercase letter."
        if (!/[0-9]/.test(pass)) return "Password must contain a number."
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!robotChecked) {
            setMessage('Please verify you are not a robot.')
            return
        }

        setLoading(true)
        setMessage('')

        try {
            if (isSignUp) {
                const passError = validatePassword(password)
                if (passError) throw new Error(passError)
                await signUp(email, password)
                setMessage('Registration successful! Check email.')
            } else {
                await signIn(email, password)
                navigate('/')
            }
        } catch (error) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Logo or Title Area */}
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', color: '#fff' }}>
                        Sign In
                    </h1>
                    <p style={{ color: '#aaa', fontSize: '0.95rem' }}>
                        UAV Fleet Command
                    </p>
                </div>

                {/* Google OAuth - Primary Method */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'white',
                            color: '#333',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f8f8f8'
                            e.target.style.borderColor = '#d0d0d0'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'white'
                            e.target.style.borderColor = '#e0e0e0'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                        </svg>
                        Sign in with Google
                    </button>

                    {/* Alternative login method (placeholder for future) */}
                    <button
                        type="button"
                        disabled
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'transparent',
                            color: '#64748b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            cursor: 'not-allowed',
                            opacity: 0.6,
                            marginTop: '0.5rem'
                        }}
                    >
                        Try another way
                    </button>
                </div>

                {/* Email/Password Form (Hidden - Feature Flag; shown for E2E when VITE_E2E_EMAIL_AUTH is set) */}
                {(ENABLE_EMAIL_AUTH || SHOW_EMAIL_AUTH_FOR_E2E) && (
                    <>
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #333', textAlign: 'center' }}>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                or use email/password
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div className="input-group">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    aria-label="Email"
                                    data-testid="login-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div className="input-group">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    aria-label="Password"
                                    data-testid="login-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div onClick={() => setRobotChecked(!robotChecked)} style={styles.captchaParams}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '24px', height: '24px',
                                        border: '2px solid #c1c1c1', borderRadius: '2px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'white', cursor: 'pointer'
                                    }}>
                                        {robotChecked && <span style={{ color: 'green', fontWeight: 'bold' }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: '#333' }}>I'm not a robot</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/RecaptchaLogo.svg/1024px-RecaptchaLogo.svg.png" alt="" style={{ width: '20px', opacity: 0.5 }} />
                                    <span style={{ fontSize: '0.6rem', color: '#999' }}>reCAPTCHA</span>
                                </div>
                            </div>

                            {message && <div style={styles.error}>{message}</div>}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
                                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    {isSignUp ? 'Sign In instead' : 'Create account'}
                                </button>

                                <button type="submit" style={styles.button} disabled={loading} data-testid="login-submit">
                                    {loading ? '...' : (isSignUp ? 'Sign Up' : 'Next')}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

const styles = {
    input: {
        width: '100%',
        padding: '13px 15px',
        fontSize: '1rem',
        borderRadius: '4px',
        border: '1px solid #555',
        background: '#121212',
        color: 'white',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    button: {
        padding: '10px 24px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '0.95rem'
    },
    captchaParams: {
        background: '#f9f9f9',
        border: '1px solid #d3d3d3',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
        maxWidth: '300px'
    },
    error: {
        color: '#ff4444',
        fontSize: '0.9rem',
        textAlign: 'left'
    }
}
