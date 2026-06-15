'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const body: Record<string, string> = { action: mode, email, password }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      router.push('/dashboard')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(167,139,250,0.12), transparent)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Gym Booker</h1>
          <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 6 }}>
            Automatic class booking · Peoples Fitness Bad Homburg
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '28px 28px',
        }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', fontSize: 14, fontWeight: 500,
                background: mode === m ? 'var(--surface3)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--muted)',
                transition: 'all 0.15s',
              }}>
                {m === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--muted2)', marginBottom: 6 }}>
                MySports / Peoples Fitness email
              </label>
              <input
                type="email"
                placeholder="you@example.de"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--muted2)', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                Your gym credentials are used only to book classes on your behalf.
                They are stored securely and never shared.
              </p>
            )}

            <button
              onClick={submit}
              disabled={loading || !email || !password}
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 8,
                color: '#0f0a1e',
                fontWeight: 700,
                fontSize: 15,
                padding: '12px',
                marginTop: 4,
                opacity: (loading || !email || !password) ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
