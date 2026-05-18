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

      const { data: sal } = await supabase
        .from('salaries')
        .select('*')
        .eq('email', user.email)
        .single()
      setSalarie(sal)

      const query = supabase
        .from('dossiers')
        .select('*, clients(*), salaries(*)')
        .order('created_at', { ascending: false })

      if (sal?.role === 'technicien') {
        query.eq('salarie_id', sal.id)
      }

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
    pret_restituer: { label: 'Prêt à restituer', color: '#27500A', bg: '#EAF3DE' },
    termine: { label: 'Terminé', color: '#444441', bg: '#F1EFE8' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#888' }}>
      Chargement...
    </div>
  )

  const enCours = dossiers.filter(d => d.statut !== 'termine').length
  const termines = dossiers.filter(d => d.statut === 'termine').length

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', fontFamily: 'system-ui, sans-serif' }}>
      {/* Barre du haut */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e5e5', padding: '0 2rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
              <rect x="9" y="11" width="14" height="10" rx="2"/>
              <circle cx="12" cy="19" r="1"/><circle cx="20" cy="19" r="1"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>Carrosserie de l'Abbaye</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            {salarie ? `${salarie.prenom} ${salarie.nom}` : user?.email}
          </span>
          {salarie?.role === 'chef_atelier' && (
            <span style={{ fontSize: 11, background: '#EEEDFE', color: '#3C3489', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Chef d'atelier</span>
          )}
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#555' }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Dossiers en cours</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#185FA5' }}>{enCours}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Terminés</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#3B6D11' }}>{termines}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Total dossiers</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#111' }}>{dossiers.length}</div>
          </div>
        </div>

        {/* Bouton nouveau dossier (chef seulement) */}
        {salarie?.role === 'chef_atelier' && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: '#185FA5', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              + Nouveau dossier
            </button>
          </div>
        )}

        {/* Liste des dossiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dossiers.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#888', border: '1px solid #e5e5e5' }}>
              Aucun dossier pour le moment
            </div>
          ) : dossiers.map(d => {
            const s = statusLabel[d.statut] || statusLabel.en_cours
            return (
              <div key={d.id} style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#0C447C', flexShrink: 0 }}>
                    {d.clients?.nom?.[0]}{d.clients?.prenom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
                      {d.immatriculation} <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>— {d.marque} {d.modele}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {d.clients?.prenom} {d.clients?.nom} · Entrée le {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                   <button onClick={() => router.push(`/dossier/${d.id}`)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', color: '#555' }}>Voir</button
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
