'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f5f5f4',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '2rem',
        width: '100%', maxWidth: 380, border: '1px solid #e5e5e5'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: '#185FA5',
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 12
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
              <rect x="9" y="11" width="14" height="10" rx="2"/>
              <circle cx="12" cy="19" r="1"/><circle cx="20" cy="19" r="1"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>
            Carrosserie de l'Abbaye
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            Connectez-vous à votre espace
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.fr" required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #ddd', fontSize: 14, outline: 'none',
                boxSizing: 'border-box' as const
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>
              Mot de passe
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #ddd', fontSize: 14, outline: 'none',
                boxSizing: 'border-box' as const
              }}
            />
          </div>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: '#b91c1c', marginBottom: 14
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', borderRadius: 8,
            background: loading ? '#93c5fd' : '#185FA5',
            color: 'white', border: 'none', fontSize: 14,
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
} 
