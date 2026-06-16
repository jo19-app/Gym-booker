'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login fehlgeschlagen'); return }
      router.push('/dashboard')
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(167,139,250,0.12), transparent)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Gym Booker</h1>
          <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 6 }}>
            Peoples Fitness Bad Homburg
          </p>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '28px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--muted2)', marginBottom: 6 }}>
                Gym Email
              </label>
              <input type="email" placeholder="deine@email.de" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--muted2)', marginBottom: 6 }}>
                Gym Passwort
              </label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13,
              }}>{error}</div>
            )}
            <button onClick={submit} disabled={loading || !email || !password} style={{
              background: 'var(--accent)', border: 'none', borderRadius: 8,
              color: '#0f0a1e', fontWeight: 700, fontSize: 15, padding: '12px',
              opacity: (loading || !email || !password) ? 0.5 : 1,
            }}>
              {loading ? '…' : 'Einloggen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}