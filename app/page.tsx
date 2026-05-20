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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #F0EBE3', borderTop: '3px solid #D4722A', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#999', fontSize: 13 }}>Chargement...</p>
      </div>
    </div>
  )

  const enCours = dossiers.filter(d => !['pret_restituer', 'termine', 'facture'].includes(d.statut))
  const aFacturer = dossiers.filter(d => d.statut === 'pret_restituer')
  const archives = dossiers.filter(d => ['termine', 'facture'].includes(d.statut))
  const dossiersAffiches = onglet === 'en_cours' ? enCours : onglet === 'a_facturer' ? aFacturer : archives
  const annee = new Date().getFullYear()

  const statusLabel: any = {
    en_attente_signature: { label: 'En attente', color: '#8A5A2A', bg: '#FFF0E6' },
    en_cours: { label: 'En cours', color: '#185FA5', bg: '#EBF3FC' },
    pret_restituer: { label: 'Prêt restituer', color: '#2A6B3A', bg: '#EBF5EE' },
    termine: { label: 'Terminé', color: '#555', bg: '#F4F0EA' },
    facture: { label: 'Facturé', color: '#533AB7', bg: '#EEEDFE' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        .nav-btn { background: transparent; border: 1px solid #E0D8CE; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: #8A7E72; cursor: pointer; }
        .nav-btn:hover { background: rgba(255,255,255,0.08); }
        .tab { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
        .tab-active { background: #1C2B30; color: #FFFFFF; }
        .tab-inactive { background: transparent; color: #888; }
        .tab-inactive:hover { background: #F9F6F2; color: #333; }
        .action-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 8px; border-radius: 10px; border: 1px solid #F0EBE3; background: #FFFFFF; cursor: pointer; transition: all 0.15s; min-width: 72px; }
        .action-btn:hover { border-color: #D4722A; background: #FFF8F3; }
        .action-btn-primary { background: #D4722A; border-color: #D4722A; }
        .action-btn-primary:hover { background: #BF6225; }
        .action-btn-green { background: #2A5C3A; border-color: #2A5C3A; }
        .action-btn-green:hover { background: #234D31; }
        .dossier-card { background: #FFFFFF; border-radius: 10px; border: 1px solid #F0EBE3; padding: 14px 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; transition: border-color 0.15s; }
        .dossier-card:hover { border-color: #D4C0A8; }
        .voir-btn { font-size: 12px; padding: 6px 14px; border-radius: 6px; border: 1px solid #D4722A; background: transparent; cursor: pointer; color: #D4722A; font-weight: 500; transition: all 0.15s; }
        .voir-btn:hover { background: #D4722A; color: #FFF; }
        @media (max-width: 640px) {
          .actions-wrap { gap: 6px !important; }
          .action-btn { min-width: 60px; padding: 10px 6px; }
          .action-btn span { font-size: 10px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #F0EBE3', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 36, objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#888' }}>{salarie?.prenom} {salarie?.nom}</span>
          {salarie?.role === 'chef_atelier' && <span style={{ fontSize: 11, background: '#FFF0E6', color: '#8A5A2A', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Chef atelier</span>}
          <button className="nav-btn" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

        {/* Compteur maladie technicien */}
        {salarie?.role === 'technicien' && (
          <div style={{ background: joursMaladie >= 10 ? '#FFF0F0' : joursMaladie >= 5 ? '#FFF8F3' : '#F9F6F2', borderRadius: 12, padding: '16px 20px', border: joursMaladie >= 10 ? '1px solid #F09595' : joursMaladie >= 5 ? '1px solid #F0C09A' : '1px solid #F0EBE3', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>Jours d'arrêt maladie en {annee}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 500, color: joursMaladie >= 10 ? '#A32D2D' : joursMaladie >= 5 ? '#8A5A2A' : '#1A1A1A' }}>{joursMaladie}</span>
                <span style={{ fontSize: 14, color: '#888' }}>jour{joursMaladie > 1 ? 's' : ''}</span>
              </div>
            </div>
            <span style={{ fontSize: 24 }}>
              {joursMaladie === 0 ? '🏆' : joursMaladie < 5 ? '👍' : joursMaladie < 10 ? '⚠️' : '🔴'}
            </span>
          </div>
        )}

        {/* Planning banner */}
        {salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/planning')} style={{ background: '#F9F6F2', borderRadius: 12, padding: '14px 18px', marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F0EBE3', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#D4C0A8')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#F0EBE3')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFFFFF', border: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>Planning de l'atelier</p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Calendrier des véhicules et dates de sortie</p>
              </div>
            </div>
            <span style={{ fontSize: 13, color: '#D4722A', fontWeight: 500 }}>{enCours.length + aFacturer.length} véhicules →</span>
          </div>
        )}

        {/* Onglets stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'en_cours', label: 'En cours', count: enCours.length },
            { key: 'a_facturer', label: 'À facturer', count: aFacturer.length },
            { key: 'archives', label: 'Archives', count: archives.length },
          ].map(item => (
            <div key={item.key} onClick={() => setOnglet(item.key as any)}
              style={{ background: onglet === item.key ? '#1C2B30' : '#F9F6F2', borderRadius: 10, padding: '14px 16px', border: item.key === 'a_facturer' && aFacturer.length > 0 && onglet !== item.key ? '1.5px solid #D4722A' : '1px solid #F0EBE3', cursor: 'pointer', position: 'relative' as const }}>
              <p style={{ fontSize: 12, color: onglet === item.key ? '#A0B0B5' : '#888', margin: '0 0 4px' }}>{item.label}</p>
              <p style={{ fontSize: 26, fontWeight: 500, color: item.key === 'a_facturer' && aFacturer.length > 0 ? '#D4722A' : onglet === item.key ? '#FFFFFF' : '#1A1A1A', margin: 0 }}>{item.count}</p>
              {item.key === 'a_facturer' && aFacturer.length > 0 && <div style={{ position: 'absolute' as const, top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#D4722A' }} />}
            </div>
          ))}
        </div>

        {/* Boutons actions */}
        <div className="actions-wrap" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 20 }}>
          {salarie?.role === 'chef_atelier' && onglet === 'en_cours' && (
            <button className="action-btn action-btn-primary" onClick={() => router.push('/nouveau-dossier')}>
              <span style={{ fontSize: 18, color: '#FFF' }}>+</span>
              <span style={{ fontSize: 11, color: '#FFF', fontWeight: 500 }}>Nouveau</span>
            </button>
          )}
          <button className="action-btn action-btn-green" onClick={() => router.push('/passage-rapide')}>
            <span style={{ fontSize: 16, color: '#A8D8B8' }}>⚡</span>
            <span style={{ fontSize: 11, color: '#A8D8B8', fontWeight: 500 }}>Rapide</span>
          </button>
          <button className="action-btn" onClick={() => router.push('/clients')}>
            <span style={{ fontSize: 16, color: '#D4722A' }}>👤</span>
            <span style={{ fontSize: 11, color: '#555' }}>Clients</span>
          </button>
          {salarie?.role === 'chef_atelier' && (
            <button className="action-btn" onClick={() => router.push('/courtoisie')}>
              <span style={{ fontSize: 16, color: '#D4722A' }}>🚗</span>
              <span style={{ fontSize: 11, color: '#555' }}>Courtoisie</span>
            </button>
          )}
          <button className="action-btn" onClick={() => router.push('/salaries')}>
            <span style={{ fontSize: 16, color: '#D4722A' }}>👥</span>
            <span style={{ fontSize: 11, color: '#555' }}>Équipe</span>
          </button>
          <button className="action-btn" onClick={() => router.push('/conges')} style={{ position: 'relative' as const }}>
            <span style={{ fontSize: 16, color: '#D4722A' }}>📅</span>
            <span style={{ fontSize: 11, color: '#555' }}>Absences</span>
            {(congesEnAttente > 0 || notifCount > 0) && <span style={{ position: 'absolute' as const, top: -4, right: -4, background: '#D4722A', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 20 }}>{congesEnAttente || notifCount}</span>}
          </button>
          <button className="action-btn" onClick={() => router.push('/avis?mode=salarie')}>
            <span style={{ fontSize: 16, color: '#D4722A' }}>⭐</span>
            <span style={{ fontSize: 11, color: '#555' }}>Avis</span>
          </button>
          {salarie?.role === 'chef_atelier' && (
            <button className="action-btn" onClick={() => router.push('/admin')} style={{ background: '#F4F0EA' }}>
              <span style={{ fontSize: 16, color: '#555' }}>⚙</span>
              <span style={{ fontSize: 11, color: '#555' }}>Admin</span>
            </button>
          )}
        </div>

        {/* Alertes */}
        {congesEnAttente > 0 && salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#FFF8F3', border: '1px solid #F0C09A', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#8A5A2A', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            🗓 <strong>{congesEnAttente} demande{congesEnAttente > 1 ? 's' : ''} de congé en attente</strong> — cliquez pour traiter
          </div>
        )}
        {notifCount > 0 && salarie?.role === 'technicien' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#EBF5EE', border: '1px solid #A8D8B8', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#2A6B3A', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            🔔 <strong>{notifCount} notification{notifCount > 1 ? 's' : ''} non lue{notifCount > 1 ? 's' : ''}</strong>
          </div>
        )}
        {onglet === 'a_facturer' && aFacturer.length > 0 && (
          <div style={{ background: '#FFF8F3', border: '1px solid #F0C09A', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#8A5A2A', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ {aFacturer.length} véhicule{aFacturer.length > 1 ? 's' : ''} prêt{aFacturer.length > 1 ? 's' : ''} à restituer
          </div>
        )}

        {/* Liste dossiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dossiersAffiches.length === 0 ? (
            <div style={{ background: '#F9F6F2', borderRadius: 10, padding: '2rem', textAlign: 'center' as const, color: '#888', border: '1px solid #F0EBE3', fontSize: 13 }}>
              {onglet === 'en_cours' ? 'Aucun dossier en cours' : onglet === 'a_facturer' ? 'Aucun dossier à facturer' : 'Aucun dossier archivé'}
            </div>
          ) : dossiersAffiches.map(d => {
            const s = statusLabel[d.statut] || statusLabel.en_cours
            const isUrgent = d.statut === 'pret_restituer'
            return (
              <div key={d.id} className="dossier-card" style={{ borderColor: isUrgent ? '#F0C09A' : '#F0EBE3' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#D4722A', flexShrink: 0 }}>
                    {d.clients?.nom?.[0]}{d.clients?.prenom?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', margin: '0 0 2px' }}>
                      {d.immatriculation} <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>— {d.marque} {d.modele}</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px' }}>
                      {d.clients?.prenom} {d.clients?.nom} · Entrée le {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                      {d.salaries && <span style={{ color: '#D4722A' }}> · {d.salaries.prenom} {d.salaries.nom}</span>}
                    </p>
                    {d.date_sortie_prevue && (
                      <p style={{ fontSize: 12, color: new Date(d.date_sortie_prevue) < new Date() ? '#A32D2D' : '#2A6B3A', margin: 0 }}>
                        Sortie prévue : {new Date(d.date_sortie_prevue).toLocaleDateString('fr-FR')}
                        {new Date(d.date_sortie_prevue) < new Date() && ' — EN RETARD'}
                      </p>
                    )}
                    {d.notes && <div style={{ marginTop: 6, padding: '5px 10px', background: '#FFF8F3', borderRadius: 6, fontSize: 12, color: '#8A5A2A', border: '1px solid #F0C09A' }}>Note : {d.notes}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' as const }}>{s.label}</span>
                  <button className="voir-btn" onClick={() => router.push('/dossier/' + d.id)}>Voir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}