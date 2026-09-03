import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowBackground from '../components/GlowBackground'
import { setToken, setUser, isAuthenticated } from '../lib/auth'

function isEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

function isPhone(val: string) {
  return /^\+?\d[\d\s\-()]{7,}$/.test(val.trim())
}

type Mode = 'signin' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [authMode, setAuthMode] = useState<null | 'email' | 'phone'>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (isAuthenticated()) navigate('/home', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const handleIdentityChange = useCallback((val: string) => {
    setIdentity(val)
    setError('')
    if (isEmail(val)) setAuthMode('email')
    else if (isPhone(val)) setAuthMode('phone')
    else setAuthMode(null)
  }, [])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = identity.trim()
    if (!val) { setError('Please enter your email or phone number'); return }

    if (authMode === 'email') {
      if (!password) { setError('Please enter your password'); return }
      if (mode === 'signup') {
        if (password.length < 8) { setError('Password must be at least 8 characters'); return }
        if (password !== confirmPassword) { setError('Passwords do not match'); return }
      }

      setLoading(true)
      setError('')
      try {
        const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: val, password }),
        })
        console.log(res)
        const data = await res.json()
        if (!res.ok) { setError(data.detail || `Error ${res.status}`); return }
        setToken(data.token)
        if (data.user) setUser(data.user)
        navigate('/home', { replace: true })
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }

    } else if (authMode === 'phone') {
      if (!otpSent) {
        setOtpSent(true)
        setCountdown(60)
      } else {
        if (!otp || otp.length < 6) { setError('Please enter the 6-digit code'); return }
        setError('Phone sign-in is not yet supported. Please use email.')
      }
    } else {
      setError('Please enter a valid email or phone number')
    }
  }

  const buttonLabel = loading ? 'Please wait…'
    : mode === 'signup' ? 'Create Account'
      : authMode === 'email' ? 'Sign In'
        : authMode === 'phone' ? (otpSent ? 'Verify OTP' : 'Send OTP')
          : 'Continue'

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <GlowBackground variant="login" />

      <div className="relative z-10 w-[min(400px,calc(100%-40px))] bg-surface border border-border rounded-[20px] p-10 flex flex-col gap-7">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent rounded-[10px] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 12 16" xmlns="http://www.w3.org/2000/svg" className="w-3 h-4">
              <path d="M0 0l12 8-12 8z" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="text-xl font-black">Beamcast</span>
        </Link>

        <div>
          <h1 className="text-[28px] font-black m-0">{mode === 'signup' ? 'Create Account' : 'Sign In'}</h1>
          <p className="text-sm text-muted mt-2">
            {mode === 'signup' ? 'Start streaming in minutes' : 'Access your streaming dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black tracking-wider text-muted uppercase">
              {mode === 'signup' ? 'Email' : 'Email or Phone'}
            </label>
            <input
              type="text"
              value={identity}
              onChange={e => handleIdentityChange(e.target.value)}
              placeholder={mode === 'signup' ? 'user@example.com' : 'user@example.com or +1 555 000 0000'}
              autoComplete="username"
              className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-accent placeholder:text-muted transition-colors"
            />
          </div>

          {(authMode === 'email' || mode === 'signup') && (
            <div className="flex flex-col gap-2 mt-5">
              <label className="text-[11px] font-black tracking-wider text-muted uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-accent placeholder:text-muted transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted cursor-pointer text-base p-0"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {mode === 'signin' && (
                <a href="#" className="text-[13px] text-accent hover:underline">Forgot password?</a>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-[11px] font-black tracking-wider text-muted uppercase">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-accent placeholder:text-muted transition-colors"
              />
            </div>
          )}

          {authMode === 'phone' && otpSent && mode === 'signin' && (
            <div className="flex flex-col gap-2 mt-5">
              <label className="text-[11px] font-black tracking-wider text-muted uppercase">
                Enter 6-digit code
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-accent placeholder:text-muted transition-colors"
              />
              {countdown > 0 ? (
                <span className="text-xs text-muted">Resend code in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setCountdown(0) }}
                  className="text-xs text-accent bg-transparent border-none cursor-pointer p-0 text-left"
                >
                  Resend code
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs text-danger mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent border-none rounded-xl py-4 px-4 font-sans text-[15px] font-black text-white cursor-pointer hover:opacity-90 transition-opacity mt-5 disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="flex gap-1 justify-center text-[13px]">
          {mode === 'signin' ? (
            <>
              <span className="text-muted">Don't have an account?</span>
              <button onClick={() => switchMode('signup')} className="text-accent font-black hover:underline bg-transparent border-none cursor-pointer p-0">
                Sign Up
              </button>
            </>
          ) : (
            <>
              <span className="text-muted">Already have an account?</span>
              <button onClick={() => switchMode('signin')} className="text-accent font-black hover:underline bg-transparent border-none cursor-pointer p-0">
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
