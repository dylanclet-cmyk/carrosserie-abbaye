'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUser(user)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', fontFamily: 'system-ui, sans-serif' }}>
      {/* Barre du haut */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e5e5e5',
        padding: '0 2rem', height: 56, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#185FA5',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
              <rect x="9" y="11" width="14" height="10" rx="2"/>
              <circle cx="12" cy="19" r="1"/><circle cx="20" cy="19" r="1"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>
            Carrosserie de l'Abbaye
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888' }}>{user.email}</span>
          <button onClick={handleLogout} style={{
            fontSize: 13, padding: '6px 12px', borderRadius: 8,
            border: '1px solid #ddd', background: 'white',
            cursor: 'pointer', color: '#555'
          }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Dossiers en cours', value: '7', color: '#185FA5' },
            { label: 'Terminés ce mois', value: '14', color: '#3B6D11' },
            { label: 'Véhicules courtoisie', value: '3/4', color: '#854F0B' },
            { label: 'Retours attendus', value: '2', color: '#A32D2D' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: '1rem',
              border: '1px solid #e5e5e5'
            }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Message de bienvenue */}
        <div style={{
          background: 'white', borderRadius: 12, padding: '1.5rem',
          border: '1px solid #e5e5e5', textAlign: 'center'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 8 }}>
            Tableau de bord en construction
          </div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            La connexion fonctionne ! On va maintenant construire le tableau de bord complet.
          </div>
          <div style={{
            display: 'inline-block', background: '#EAF3DE', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, color: '#27500A', fontWeight: 500
          }}>
            Connecté en tant que : {user.email}
          </div>
        </div>
      </div>
    </div>
  )
}