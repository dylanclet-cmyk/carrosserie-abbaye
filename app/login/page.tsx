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
        .login-wrap { min-height: 100vh; display: flex; font-family: system-ui, -apple-system, sans-serif; }
        .login-left { width: 45%; background: #C8723A; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; }
        .login-right { width: 55%; background: #FAF7F2; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .login-form { width: 100%; max-width: 360px; }
        .login-input { width: 100%; padding: 11px 14px; border-radius: 8px; border: 1px solid #EDE5D8; font-size: 14px; color: #1A1A1A; background: #FFFFFF; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .login-input:focus { border-color: #C8723A; }
        .login-btn { width: 100%; padding: 13px; border-radius: 8px; background: #C8723A; color: #FFF; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
        .login-btn:hover { background: #B86530; }
        .login-btn:disabled { background: #E8C8A0; cursor: not-allowed; }
        .quick-btn { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #EDE5D8; background: #FFFFFF; cursor: pointer; font-size: 13px; color: #1A1A1A; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; transition: border-color 0.15s; }
        .quick-btn:hover { border-color: #C8723A; }
        @media (max-width: 640px) {
          .login-wrap { flex-direction: column; }
          .login-left { width: 100%; padding: 2rem 1.5rem; min-height: auto; }
          .login-left img { height: 60px !important; }
          .login-right { width: 100%; padding: 1.5rem; align-items: flex-start; }
          .login-form { max-width: 100%; }
        }
      `}</style>

      <div className="login-wrap">
        {/* Gauche orange */}
        <div className="login-left">
          <img src="/logo.png" alt="Logo" style={{ height: 160, objectFit: 'contain', marginBottom: 28 }} />
          <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 2, marginBottom: 20 }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.9 }}>
            Gestion de l'atelier<br />
            États des lieux · Suivi des heures<br />
            Facturation · Archives
          </div>
        </div>

        {/* Droite formulaire */}
        <div className="login-right">
          <div className="login-form">
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1A1A1A', margin: '0 0 6px' }}>Connexion</h1>
            <p style={{ fontSize: 13, color: '#999', margin: '0 0 28px' }}>Connectez-vous à votre espace atelier</p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Email</label>
                <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" required />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Mot de passe</label>
                <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && (
                <div style={{ background: '#FFF0F0', border: '1px solid #F09595', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#A32D2D', marginBottom: 14 }}>
                  {error}
                </div>
              )}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div style={{ marginTop: 24, padding: '14px 16px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #EDE5D8' }}>
              <p style={{ fontSize: 11, color: '#BBB', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Accès rapide</p>
              <button className="quick-btn" onClick={() => { setEmail('chef@carrosserie-abbaye.fr'); setPassword('') }}>
                <span style={{ fontSize: 10, background: '#C8723A', color: '#FFF', padding: '2px 8px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>Chef</span>
                chef@carrosserie-abbaye.fr
              </button>
              <button className="quick-btn" style={{ marginBottom: 0 }} onClick={() => { setEmail('loic@carrosserie-abbaye.fr'); setPassword('') }}>
                <span style={{ fontSize: 10, background: '#1C2A2F', color: '#FFF', padding: '2px 8px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>Tech</span>
                loic@carrosserie-abbaye.fr
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}