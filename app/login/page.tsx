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
    <>
      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          font-family: system-ui, sans-serif;
        }
        .login-left {
          width: 50%;
          background: #2D3748;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        .login-right {
          width: 50%;
          background: #f8f6f3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        .login-form-wrap {
          width: 100%;
          max-width: 380px;
        }
        .login-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid #e8e2d9;
          font-size: 15px;
          color: #2D3748;
          background: white;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 4px;
        }
        .login-input:focus { border-color: #E07B2A; }
        .login-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          background: #E07B2A;
          color: white;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }
        .login-btn:disabled { background: #f0c090; cursor: not-allowed; }
        .quick-btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e8e2d9;
          background: #f8f6f3;
          cursor: pointer;
          font-size: 13px;
          color: #2D3748;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          margin-bottom: 8px;
        }

        @media (max-width: 640px) {
          .login-container {
            flex-direction: column;
          }
          .login-left {
            width: 100%;
            padding: 2rem 1.5rem;
            min-height: auto;
          }
          .login-left img {
            height: 70px !important;
          }
          .login-right {
            width: 100%;
            padding: 1.5rem;
            align-items: flex-start;
          }
          .login-form-wrap {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="login-container">
        <div className="login-left">
          <img src="/logo.png" alt="Logo" style={{ height: 120, objectFit: 'contain', marginBottom: 24 }} />
          <div style={{ width: 50, height: 3, background: '#E07B2A', borderRadius: 2, marginBottom: 16 }} />
          <div style={{ fontSize: 14, color: '#a0aec0', textAlign: 'center', lineHeight: 1.8 }}>
            Gestion de l atelier<br />
            États des lieux · Suivi des heures<br />
            Facturation · Archives
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-wrap">
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2D3748', marginBottom: 6 }}>Connexion</h1>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 28 }}>Connectez-vous a votre espace atelier</p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
                <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6, fontWeight: 500 }}>Mot de passe</label>
                <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div style={{ marginTop: 24, padding: '16px', background: 'white', borderRadius: 10, border: '1px solid #e8e2d9' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Acces rapide</div>
              <button className="quick-btn" onClick={() => { setEmail('chef@carrosserie-abbaye.fr'); setPassword('') }}>
                <span style={{ fontSize: 10, background: '#E07B2A', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>Chef</span>
                chef@carrosserie-abbaye.fr
              </button>
              <button className="quick-btn" style={{ marginBottom: 0 }} onClick={() => { setEmail('loic@carrosserie-abbaye.fr'); setPassword('') }}>
                <span style={{ fontSize: 10, background: '#2D3748', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>Tech</span>
                loic@carrosserie-abbaye.fr
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}