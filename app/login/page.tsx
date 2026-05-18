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
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Panneau gauche — couleur */}
      <div style={{
        width: '50%',
        background: '#2D3748',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
      }}>
        <img src="/logo.png" alt="Carrosserie de l'Abbaye" style={{ width: '80%', maxWidth: 340, objectFit: 'contain', marginBottom: 40 }} />
        <div style={{ width: 60, height: 3, background: '#E07B2A', borderRadius: 2, marginBottom: 24 }} />
        <div style={{ fontSize: 15, color: '#a0aec0', textAlign: 'center' as const, lineHeight: 1.7 }}>
          Gestion de l atelier<br />
          États des lieux · Suivi des heures<br />
          Facturation · Archives
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div style={{
        width: '50%',
        background: '#f8f6f3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2D3748', marginBottom: 8 }}>Connexion</h1>
            <p style={{ fontSize: 14, color: '#888' }}>Connectez-vous a votre espace atelier</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid #e8e2d9', fontSize: 14, color: '#2D3748',
                  background: 'white', outline: 'none', boxSizing: 'border-box' as const,
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#E07B2A'}
                onBlur={e => e.target.style.borderColor = '#e8e2d9'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid #e8e2d9', fontSize: 14, color: '#2D3748',
                  background: 'white', outline: 'none', boxSizing: 'border-box' as const,
                }}
                onFocus={e => e.target.style.borderColor = '#E07B2A'}
                onBlur={e => e.target.style.borderColor = '#e8e2d9'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px', fontSize: 13,
                color: '#b91c1c', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10,
                background: loading ? '#f0c090' : '#E07B2A',
                color: 'white', border: 'none', fontSize: 15,
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s', letterSpacing: 0.3
              }}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 32, padding: '16px', background: 'white', borderRadius: 10, border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Acces rapide</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              <button onClick={() => { setEmail('chef@carrosserie-abbaye.fr'); setPassword('') }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', background: '#f8f6f3', cursor: 'pointer', fontSize: 13, color: '#2D3748', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, background: '#E07B2A', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Chef</span>
                chef@carrosserie-abbaye.fr
              </button>
              <button onClick={() => { setEmail('loic@carrosserie-abbaye.fr'); setPassword('') }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', background: '#f8f6f3', cursor: 'pointer', fontSize: 13, color: '#2D3748', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, background: '#2D3748', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Tech</span>
                loic@carrosserie-abbaye.fr
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}