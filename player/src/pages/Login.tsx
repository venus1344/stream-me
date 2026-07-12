import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowBackground from '../components/GlowBackground'

function isEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

function isPhone(val: string) {
  return /^\+?\d[\d\s\-()]{7,}$/.test(val.trim())
}

export default function Login() {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [authMode, setAuthMode] = useState<null | 'email' | 'phone'>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const handleIdentityChange = useCallback((val: string) => {
    setIdentity(val)
    setError('')
    if (isEmail(val)) {
      setAuthMode('email')
    } else if (isPhone(val)) {
      setAuthMode('phone')
    } else {
      setAuthMode(null)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = identity.trim()
    if (!val) { setError('Please enter your email or phone number'); return }

    if (authMode === 'email') {
      if (!password) { setError('Please enter your password'); return }
      sessionStorage.setItem('ome_auth', '1')
      navigate('/home')
    } else if (authMode === 'phone') {
      if (!otpSent) {
        setOtpSent(true)
        setCountdown(60)
      } else {
        if (!otp || otp.length < 6) { setError('Please enter the 6-digit code'); return }
        sessionStorage.setItem('ome_auth', '1')
        navigate('/home')
      }
    } else {
      setError('Please enter a valid email or phone number')
    }
  }

  const buttonText = authMode === 'email' ? 'Sign In'
    : authMode === 'phone' ? (otpSent ? 'Verify OTP' : 'Send OTP')
    : 'Continue'

  const dividerText = authMode === 'phone' ? 'or use email & password' : 'or use phone OTP'

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
          <span className="text-xl font-black">OME Player</span>
        </Link>

        <div>
          <h1 className="text-[28px] font-black m-0">Sign In</h1>
          <p className="text-sm text-muted mt-2">Access your streaming dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black tracking-wider text-muted uppercase">
              Email or Phone
            </label>
            <input
              type="text"
              value={identity}
              onChange={e => handleIdentityChange(e.target.value)}
              placeholder="user@example.com or +1 555 000 0000"
              autoComplete="username"
              className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-blue placeholder:text-[#4B5563] transition-colors"
            />
          </div>

          {authMode === 'email' && (
            <div className="flex flex-col gap-2 mt-5">
              <label className="text-[11px] font-black tracking-wider text-muted uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-blue placeholder:text-[#4B5563] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted cursor-pointer text-base p-0"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <a href="#" className="text-[13px] text-blue hover:underline">Forgot password?</a>
            </div>
          )}

          {authMode === 'phone' && otpSent && (
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
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-3.5 py-3 font-mono text-[13px] text-text outline-none focus:border-blue placeholder:text-[#4B5563] transition-colors"
              />
              {countdown > 0 ? (
                <span className="text-xs text-muted">Resend code in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setCountdown(0) }}
                  className="text-xs text-blue bg-transparent border-none cursor-pointer p-0 text-left"
                >
                  Resend code
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs text-[#ff7b7b] mt-2">{error}</p>}

          <button
            type="submit"
            className="w-full bg-accent border-none rounded-xl py-4 px-4 font-sans text-[15px] font-black text-white cursor-pointer hover:opacity-90 transition-opacity mt-5"
          >
            {buttonText}
          </button>
        </form>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted whitespace-nowrap">{dividerText}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-1 justify-center text-[13px]">
          <span className="text-muted">Don't have an account?</span>
          <Link to="/" className="text-blue font-black hover:underline">Start Free Trial</Link>
        </div>
      </div>
    </div>
  )
}
