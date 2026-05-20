'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [salarie, setSalarie] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [congesEnAttente, setCongesEnAttente] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [joursMaladie, setJoursMaladie] = useState(0)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'en_cours' | 'a_facturer' | 'archives'>('en_cours')
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
      if (sal?.role === 'chef_atelier') {
        const { count } = await supabase.from('conges').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
        setCongesEnAttente(count || 0)
      } else {
        const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('salarie_id', sal.id).eq('lu', false)
        setNotifCount(count || 0)
        const annee = new Date().getFullYear()
        const { data: congesMaladie } = await supabase.from('conges').select('nb_jours').eq('salarie_id', sal.id).eq('type', 'maladie').eq('statut', 'accepte').gte('date_debut', annee + '-01-01')
        const total = (congesMaladie || []).reduce((a: number, c: any) => a + (c.nb_jours || 0), 0)
        setJoursMaladie(total)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2', fontFamily: 'system-ui' }}>
      <p style={{ color: '#C8723A', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  const enCours = dossiers.filter(d => !['pret_restituer', 'termine', 'facture'].includes(d.statut))
  const aFacturer = dossiers.filter(d => d.statut === 'pret_restituer')
  const archives = dossiers.filter(d => ['termine', 'facture'].includes(d.statut))
  const dossiersAffiches = onglet === 'en_cours' ? enCours : onglet === 'a_facturer' ? aFacturer : archives
  const annee = new Date().getFullYear()

  const statusLabel: any = {
    en_attente_signature: { label: 'En attente', color: '#8A5A2A', bg: '#FFF0E6' },
    en_cours: { label: 'En cours', color: '#8A5A2A', bg: '#FFF0E6' },
    pret_restituer: { label: 'Prêt restituer', color: '#2A6B3A', bg: '#EBF5EE' },
    termine: { label: 'Terminé', color: '#555', bg: '#F4F0EA' },
    facture: { label: 'Facturé', color: '#555', bg: '#F4F0EA' },
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '12px 6px', borderRadius: 10, cursor: 'pointer',
    border: '1px solid #EDE5D8', background: '#FFFFFF', minWidth: 0, flex: 1,
  }

  const actions = [
    ...(salarie?.role === 'chef_atelier' && onglet === 'en_cours' ? [{ label: 'Nouveau', path: '/nouveau-dossier', bg: '#C8723A', color: '#FFF', icon: 'M12 5v14M5 12h14' }] : []),
    { label: 'Rapide', path: '/passage-rapide', bg: '#F5DEC8', color: '#7A3E10', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
    { label: 'Clients', path: '/clients', bg: '#FFFFFF', color: '#C8723A', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    ...(salarie?.role === 'chef_atelier' ? [{ label: 'Courtoisie', path: '/courtoisie', bg: '#FFFFFF', color: '#C8723A', icon: 'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M13 21H6a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4h5M16 16l2 2 4-4' }] : []),
    { label: 'Equipe', path: '/salaries', bg: '#FFFFFF', color: '#C8723A', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { label: 'Absences', path: '/conges', bg: '#FFFFFF', color: '#C8723A', badge: congesEnAttente || notifCount || 0, icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { label: 'Avis', path: '/avis?mode=salarie', bg: '#FFFFFF', color: '#C8723A', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    ...(salarie?.role === 'chef_atelier' ? [{ label: 'Admin', path: '/admin', bg: '#F4F0EA', color: '#888', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .dcard { background:#FFFFFF; border-radius:10px; border:1px solid #EDE5D8; padding:14px 16px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
        .dcard:hover { border-color:#D4B898; }
        .voir { font-size:12px; padding:5px 14px; border-radius:6px; border:1px solid #C8723A; background:transparent; cursor:pointer; color:#C8723A; font-weight:500; }
        .voir:hover { background:#C8723A; color:#FFF; }
        .abtn:hover { border-color:#C8723A !important; background:#FFF8F3 !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#C8723A', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 38, objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{salarie?.prenom} {salarie?.nom}</span>
          {salarie?.role === 'chef_atelier' && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#FAF7F2', padding: '3px 10px', borderRadius: 20 }}>Chef atelier</span>}
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#FAF7F2', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

        {/* Compteur maladie */}
        {salarie?.role === 'technicien' && (
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 18px', border: '1px solid #EDE5D8', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, color: '#999', margin: '0 0 4px' }}>Jours d'arrêt maladie en {annee}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 500, color: joursMaladie >= 10 ? '#A32D2D' : '#1A1A1A' }}>{joursMaladie}</span>
                <span style={{ fontSize: 13, color: '#999' }}>jour{joursMaladie > 1 ? 's' : ''}</span>
              </div>
            </div>
            <span style={{ fontSize: 22 }}>{joursMaladie === 0 ? '🏆' : joursMaladie < 5 ? '👍' : '⚠️'}</span>
          </div>
        )}

        {/* Planning banner */}
        {salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/planning')} style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 16px', marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #EDE5D8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8723A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>Planning de l'atelier</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Calendrier et dates de sortie</p>
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#C8723A', fontWeight: 500 }}>{enCours.length + aFacturer.length} véhicules →</span>
          </div>
        )}

        {/* Stats onglets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'en_cours', label: 'En cours', count: enCours.length },
            { key: 'a_facturer', label: 'À facturer', count: aFacturer.length },
            { key: 'archives', label: 'Archives', count: archives.length },
          ].map(item => (
            <div key={item.key} onClick={() => setOnglet(item.key as any)}
              style={{ background: onglet === item.key ? '#C8723A' : '#FFFFFF', borderRadius: 10, padding: '12px 14px', border: item.key === 'a_facturer' && aFacturer.length > 0 && onglet !== item.key ? '1.5px solid #C8723A' : '1px solid #EDE5D8', cursor: 'pointer', position: 'relative' as const }}>
              <p style={{ fontSize: 11, color: onglet === item.key ? 'rgba(255,255,255,0.7)' : '#999', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: 24, fontWeight: 500, color: item.key === 'a_facturer' && aFacturer.length > 0 ? '#C8723A' : onglet === item.key ? '#FFFFFF' : '#1A1A1A', margin: 0 }}>{item.count}</p>
              {item.key === 'a_facturer' && aFacturer.length > 0 && <div style={{ position: 'absolute' as const, top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#C8723A' }} />}
            </div>
          ))}
        </div>

        {/* Boutons actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
          {actions.map((a, i) => (
            <button key={i} className="abtn" onClick={() => router.push(a.path)}
              style={{ ...btnBase, background: a.bg, border: `1px solid ${a.bg === '#FFFFFF' ? '#EDE5D8' : a.bg === '#F5DEC8' ? '#E8C8A0' : 'transparent'}`, position: 'relative' as const }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icon} />
              </svg>
              <span style={{ fontSize: 11, color: a.color, fontWeight: 500, whiteSpace: 'nowrap' as const }}>{a.label}</span>
              {(a as any).badge > 0 && <span style={{ position: 'absolute' as const, top: -4, right: -4, background: '#C8723A', color: '#FFF', fontSize: 9, padding: '2px 5px', borderRadius: 20 }}>{(a as any).badge}</span>}
            </button>
          ))}
        </div>

        {/* Alertes */}
        {congesEnAttente > 0 && salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#FFF8F3', border: '1px solid #E8C8A0', borderRadius: 10, padding: '10px 16px', marginBottom: 10, fontSize: 13, color: '#7A3E10', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            📋 <strong>{congesEnAttente} demande{congesEnAttente > 1 ? 's' : ''} de congé en attente</strong>
          </div>
        )}
        {notifCount > 0 && salarie?.role === 'technicien' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#EBF5EE', border: '1px solid #A8D8B8', borderRadius: 10, padding: '10px 16px', marginBottom: 10, fontSize: 13, color: '#2A6B3A', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            🔔 <strong>{notifCount} notification{notifCount > 1 ? 's' : ''} non lue{notifCount > 1 ? 's' : ''}</strong>
          </div>
        )}
        {onglet === 'a_facturer' && aFacturer.length > 0 && (
          <div style={{ background: '#FFF8F3', border: '1px solid #E8C8A0', borderRadius: 10, padding: '10px 16px', marginBottom: 10, fontSize: 13, color: '#7A3E10' }}>
            ⚠ {aFacturer.length} véhicule{aFacturer.length > 1 ? 's' : ''} prêt{aFacturer.length > 1 ? 's' : ''} à restituer
          </div>
        )}

        {/* Liste dossiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dossiersAffiches.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '2rem', textAlign: 'center' as const, color: '#999', border: '1px solid #EDE5D8', fontSize: 13 }}>
              {onglet === 'en_cours' ? 'Aucun dossier en cours' : onglet === 'a_facturer' ? 'Aucun dossier à facturer' : 'Aucun dossier archivé'}
            </div>
          ) : dossiersAffiches.map(d => {
            const s = statusLabel[d.statut] || statusLabel.en_cours
            return (
              <div key={d.id} className="dcard">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#C8723A', flexShrink: 0 }}>
                    {d.clients?.nom?.[0]}{d.clients?.prenom?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: '0 0 2px' }}>
                      {d.immatriculation} <span style={{ fontWeight: 400, color: '#999', fontSize: 13 }}>— {d.marque} {d.modele}</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#999', margin: '0 0 2px' }}>
                      {d.clients?.prenom} {d.clients?.nom} · {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                      {d.salaries && <span style={{ color: '#C8723A' }}> · {d.salaries.prenom} {d.salaries.nom}</span>}
                    </p>
                    {d.date_sortie_prevue && (
                      <p style={{ fontSize: 12, color: new Date(d.date_sortie_prevue) < new Date() ? '#A32D2D' : '#2A6B3A', margin: 0 }}>
                        Sortie : {new Date(d.date_sortie_prevue).toLocaleDateString('fr-FR')}
                        {new Date(d.date_sortie_prevue) < new Date() && ' — EN RETARD'}
                      </p>
                    )}
                    {d.notes && <div style={{ marginTop: 5, padding: '4px 10px', background: '#FFF8F3', borderRadius: 6, fontSize: 12, color: '#7A3E10', border: '1px solid #E8C8A0' }}>Note : {d.notes}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' as const }}>{s.label}</span>
                  <button className="voir" onClick={() => router.push('/dossier/' + d.id)}>Voir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}