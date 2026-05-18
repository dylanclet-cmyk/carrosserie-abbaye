'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [salarie, setSalarie] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      const query = supabase.from('dossiers').select('*, clients(*), salaries(*)').order('created_at', { ascending: false })
      if (sal?.role === 'technicien') { query.eq('salarie_id', sal.id) }
      const { data: dos } = await query
      setDossiers(dos || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const statusLabel: any = {
    en_attente_signature: { label: 'En attente signature', color: '#854F0B', bg: '#FAEEDA' },
    en_cours: { label: 'En cours', color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { label: 'Pret a restituer', color: '#27500A', bg: '#EAF3DE' },
    termine: { label: 'Termine', color: '#444441', bg: '#F1EFE8' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#888' }}>
      Chargement...
    </div>
  )

  const enCours = dossiers.filter(d => d.statut !== 'termine').length
  const termines = dossiers.filter(d => d.statut === 'termine').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.png" alt="Carrosserie de l'Abbaye" style={{ height: 44, objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#e8e2d9' }}>{salarie ? salarie.prenom + ' ' + salarie.nom : user?.email}</span>
          {salarie?.role === 'chef_atelier' && (
            <span style={{ fontSize: 11, background: '#E07B2A', color: 'white', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Chef atelier</span>
          )}
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Dossiers en cours</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E07B2A' }}>{enCours}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Termines</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D3748' }}>{termines}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Total dossiers</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D3748' }}>{dossiers.length}</div>
          </div>
        </div>

        {salarie?.role === 'chef_atelier' && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Nouveau dossier</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dossiers.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#888', border: '1px solid #e8e2d9' }}>Aucun dossier pour le moment</div>
          ) : dossiers.map(d => {
            const s = statusLabel[d.statut] || statusLabel.en_cours
            return (
              <div key={d.id} style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e8e2d9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#E07B2A', flexShrink: 0 }}>
                    {d.clients?.nom?.[0]}{d.clients?.prenom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748' }}>
                      {d.immatriculation} <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>-- {d.marque} {d.modele}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {d.clients?.prenom} {d.clients?.nom} - Entree le {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                  <button onClick={() => router.push('/dossier/' + d.id)} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '2px solid #E07B2A', background: 'white', cursor: 'pointer', color: '#E07B2A', fontWeight: 600 }}>Voir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}