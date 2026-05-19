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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const enCours = dossiers.filter(d => !['pret_restituer', 'termine', 'facture'].includes(d.statut))
  const aFacturer = dossiers.filter(d => d.statut === 'pret_restituer')
  const archives = dossiers.filter(d => ['termine', 'facture'].includes(d.statut))
  const dossiersAffiches = onglet === 'en_cours' ? enCours : onglet === 'a_facturer' ? aFacturer : archives
  const annee = new Date().getFullYear()

  const statusLabel: any = {
    en_attente_signature: { label: 'En attente signature', color: '#854F0B', bg: '#FAEEDA' },
    en_cours: { label: 'En cours', color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { label: 'Pret a restituer', color: '#27500A', bg: '#EAF3DE' },
    termine: { label: 'Termine', color: '#444441', bg: '#F1EFE8' },
    facture: { label: 'Facture', color: '#3C3489', bg: '#EEEDFE' },
  }

  const btnOrange = { background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#e8e2d9' }}>{salarie ? salarie.prenom + ' ' + salarie.nom : user?.email}</span>
          {salarie?.role === 'chef_atelier' && <span style={{ fontSize: 11, background: '#E07B2A', color: 'white', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Chef atelier</span>}
          <button onClick={handleLogout} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>

        {/* Compteur maladie technicien */}
        {salarie?.role === 'technicien' && (
          <div style={{ background: joursMaladie >= 10 ? '#FCEBEB' : joursMaladie >= 5 ? '#FDF0E6' : 'white', borderRadius: 12, padding: '1rem 1.5rem', border: joursMaladie >= 10 ? '2px solid #E24B4A' : joursMaladie >= 5 ? '2px solid #E07B2A' : '1px solid #e8e2d9', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Jours d arret maladie en {annee}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: joursMaladie >= 10 ? '#A32D2D' : joursMaladie >= 5 ? '#854F0B' : '#2D3748' }}>{joursMaladie}</span>
                <span style={{ fontSize: 16, color: '#888' }}>jour{joursMaladie > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div>
              {joursMaladie === 0 && <span style={{ fontSize: 28 }}>🏆</span>}
              {joursMaladie > 0 && joursMaladie < 5 && <span style={{ fontSize: 28 }}>👍</span>}
              {joursMaladie >= 5 && joursMaladie < 10 && <span style={{ fontSize: 24 }}>⚠️</span>}
              {joursMaladie >= 10 && <span style={{ fontSize: 24 }}>🔴</span>}
            </div>
          </div>
        )}

        {/* Gros bouton planning chef */}
        {salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/planning')} style={{ background: '#2D3748', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #3a4a5c' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#E07B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📅</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Planning de l atelier</div>
                <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>Calendrier des vehicules et dates de sortie</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#E07B2A', fontWeight: 600 }}>
              {enCours.length + aFacturer.length} vehicule{(enCours.length + aFacturer.length) > 1 ? 's' : ''} en atelier →
            </div>
          </div>
        )}

        {/* Compteurs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div onClick={() => setOnglet('en_cours')} style={{ background: onglet === 'en_cours' ? '#2D3748' : 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9', cursor: 'pointer' }}>
            <div style={{ fontSize: 12, color: onglet === 'en_cours' ? '#e8e2d9' : '#888', marginBottom: 6 }}>Dossiers en cours</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E07B2A' }}>{enCours.length}</div>
          </div>
          <div onClick={() => setOnglet('a_facturer')} style={{ background: onglet === 'a_facturer' ? '#2D3748' : 'white', borderRadius: 12, padding: '1rem', border: aFacturer.length > 0 ? '2px solid #E07B2A' : '1px solid #e8e2d9', cursor: 'pointer', position: 'relative' as const }}>
            <div style={{ fontSize: 12, color: onglet === 'a_facturer' ? '#e8e2d9' : '#888', marginBottom: 6 }}>A facturer</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: aFacturer.length > 0 ? '#E07B2A' : '#888' }}>{aFacturer.length}</div>
            {aFacturer.length > 0 && <div style={{ position: 'absolute' as const, top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: '#E07B2A' }} />}
          </div>
          <div onClick={() => setOnglet('archives')} style={{ background: onglet === 'archives' ? '#2D3748' : 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9', cursor: 'pointer' }}>
            <div style={{ fontSize: 12, color: onglet === 'archives' ? '#e8e2d9' : '#888', marginBottom: 6 }}>Archives</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: onglet === 'archives' ? 'white' : '#2D3748' }}>{archives.length}</div>
          </div>
        </div>

        {/* Boutons actions — tous orange */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
          {salarie?.role === 'chef_atelier' && onglet === 'en_cours' && (
            <button onClick={() => router.push('/nouveau-dossier')} style={btnOrange}>+ Nouveau dossier</button>
          )}
          {salarie?.role === 'chef_atelier' && (
            <button onClick={() => router.push('/courtoisie')} style={btnOrange}>Vehicules courtoisie</button>
          )}
          {salarie?.role === 'chef_atelier' && (
            <button onClick={() => router.push('/salaries')} style={btnOrange}>Equipe & Messagerie</button>
          )}
          <button onClick={() => router.push('/conges')} style={{ ...btnOrange, position: 'relative' as const, display: 'flex', alignItems: 'center', gap: 8 }}>
            {salarie?.role === 'chef_atelier' ? 'Gestion absences' : 'Gestion absences'}
            {congesEnAttente > 0 && <span style={{ background: 'white', color: '#E07B2A', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{congesEnAttente}</span>}
            {notifCount > 0 && <span style={{ background: 'white', color: '#E07B2A', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{notifCount}</span>}
          </button>
          {salarie?.role === 'technicien' && (
            <button onClick={() => router.push('/salaries')} style={btnOrange}>Equipe & Messagerie</button>
          )}
          <button onClick={() => router.push('/passage-rapide')} style={{ ...btnOrange, background: '#3B6D11' }}>⚡ Passage rapide</button>
        </div>

        {/* Alertes */}
        {congesEnAttente > 0 && salarie?.role === 'chef_atelier' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 16, fontSize: 13, color: '#854F0B', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span>🗓</span> <strong>{congesEnAttente} demande{congesEnAttente > 1 ? 's' : ''} de conge en attente</strong> — cliquez pour traiter
          </div>
        )}
        {notifCount > 0 && salarie?.role === 'technicien' && (
          <div onClick={() => router.push('/conges')} style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 16, fontSize: 13, color: '#27500A', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span>🔔</span> <strong>{notifCount} notification{notifCount > 1 ? 's' : ''} non lue{notifCount > 1 ? 's' : ''}</strong>
          </div>
        )}
        {onglet === 'a_facturer' && aFacturer.length > 0 && (
          <div style={{ background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 16, fontSize: 13, color: '#854F0B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠</span> {aFacturer.length} vehicule{aFacturer.length > 1 ? 's' : ''} pret{aFacturer.length > 1 ? 's' : ''} a restituer
          </div>
        )}

        {/* Liste dossiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dossiersAffiches.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#888', border: '1px solid #e8e2d9' }}>
              {onglet === 'en_cours' ? 'Aucun dossier en cours' : onglet === 'a_facturer' ? 'Aucun dossier a facturer' : 'Aucun dossier archive'}
            </div>
          ) : dossiersAffiches.map(d => {
            const s = statusLabel[d.statut] || statusLabel.en_cours
            return (
              <div key={d.id} style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', border: d.statut === 'pret_restituer' ? '2px solid #E07B2A' : '1px solid #e8e2d9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#E07B2A', flexShrink: 0 }}>
                    {d.clients?.nom?.[0]}{d.clients?.prenom?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748' }}>{d.immatriculation} <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>-- {d.marque} {d.modele}</span></div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {d.clients?.prenom} {d.clients?.nom} — Entree le {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                      {d.salaries && <span style={{ marginLeft: 8, color: '#E07B2A' }}>· {d.salaries.prenom} {d.salaries.nom}</span>}
                    </div>
                    {d.date_sortie_prevue && (
                      <div style={{ fontSize: 12, color: new Date(d.date_sortie_prevue) < new Date() ? '#A32D2D' : '#3B6D11', marginTop: 2 }}>
                        Sortie prevue : {new Date(d.date_sortie_prevue).toLocaleDateString('fr-FR')}
                        {new Date(d.date_sortie_prevue) < new Date() && ' — EN RETARD'}
                      </div>
                    )}
                    {d.notes && <div style={{ marginTop: 6, padding: '6px 10px', background: '#FDF0E6', borderRadius: 6, fontSize: 12, color: '#854F0B', border: '1px solid #E07B2A' }}>Note : {d.notes}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' as const }}>{s.label}</span>
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