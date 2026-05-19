'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CourtoisPlanningPage() {
  const [vehicules, setVehicules] = useState<any[]>([])
  const [prets, setPrets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moisActuel, setMoisActuel] = useState(new Date())
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: v } = await supabase.from('vehicules_courtoisie').select('*').eq('actif', true).order('immatriculation')
      setVehicules(v || [])
      const { data: p } = await supabase.from('prets_courtoisie').select('*, vehicules_courtoisie(*), dossiers(*, clients(*))').order('date_debut')
      setPrets(p || [])
      setLoading(false)
    }
    load()
  }, [])

  const annee = moisActuel.getFullYear()
  const mois = moisActuel.getMonth()
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const nomsMois = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
  const today = new Date()
  const colors = ['#E07B2A', '#185FA5', '#3B6D11', '#854F0B', '#3C3489', '#A32D2D']

  function getPretsForDay(vehiculeId: string, jour: number) {
    const date = new Date(annee, mois, jour)
    return prets.filter(p => {
      if (p.vehicule_id !== vehiculeId) return false
      const debut = new Date(p.date_debut)
      const fin = p.date_retour ? new Date(p.date_retour) : new Date(p.date_fin_prevue)
      return date >= debut && date <= fin
    })
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/courtoisie')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Courtoisie</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Planning vehicules courtoisie</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMoisActuel(new Date(annee, mois - 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>←</button>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600, minWidth: 150, textAlign: 'center' as const }}>{nomsMois[mois]} {annee}</span>
          <button onClick={() => setMoisActuel(new Date(annee, mois + 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>→</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Vehicules dans la flotte</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D3748' }}>{vehicules.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Prets ce mois</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E07B2A' }}>{prets.filter(p => { const d = new Date(p.date_debut); return d.getMonth() === mois && d.getFullYear() === annee }).length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>En cours aujourd hui</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3B6D11' }}>{prets.filter(p => p.statut === 'en_cours').length}</div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', overflowX: 'auto' as const, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Disponibilite des vehicules</div>
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#888', padding: '4px 8px', fontWeight: 600 }}>Vehicule</div>
              {Array.from({ length: nbJours }, (_, i) => {
                const date = new Date(annee, mois, i + 1)
                const isToday = date.toDateString() === today.toDateString()
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                return (
                  <div key={i} style={{ fontSize: 10, textAlign: 'center' as const, padding: '4px 2px', color: isToday ? '#E07B2A' : isWeekend ? '#ccc' : '#888', fontWeight: isToday ? 700 : 400, background: isToday ? '#FDF0E6' : isWeekend ? '#f8f6f3' : 'white', borderRadius: 3 }}>
                    <div>{i + 1}</div>
                    <div style={{ fontSize: 8 }}>{'LMMJVSD'[date.getDay()]}</div>
                  </div>
                )
              })}
            </div>

            {vehicules.map((v, vi) => {
              const color = colors[vi % colors.length]
              return (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '180px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 4 }}>
                  <div style={{ padding: '8px 10px', background: 'white', borderRadius: 6, borderLeft: '3px solid ' + color }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748' }}>{v.immatriculation}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{v.marque} {v.modele} {v.couleur ? '· ' + v.couleur : ''}</div>
                  </div>
                  {Array.from({ length: nbJours }, (_, i) => {
                    const date = new Date(annee, mois, i + 1)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    const isToday = date.toDateString() === today.toDateString()
                    const pretsJour = getPretsForDay(v.id, i + 1)
                    const isOccupe = pretsJour.length > 0
                    const pret = pretsJour[0]
                    const isDebut = pret && new Date(pret.date_debut).toDateString() === date.toDateString()
                    const finDate = pret ? (pret.date_retour ? new Date(pret.date_retour) : new Date(pret.date_fin_prevue)) : null
                    const isFin = pret && finDate && finDate.toDateString() === date.toDateString()
                    const isEnRetard = pret && pret.statut === 'en_cours' && new Date(pret.date_fin_prevue) < today
                    return (
                      <div key={i} title={pret ? (pret.dossiers?.clients?.prenom + ' ' + pret.dossiers?.clients?.nom) : 'Disponible'}
                        style={{ height: 44, borderRadius: 3, background: isWeekend ? '#f5f3f0' : isOccupe ? (isEnRetard ? '#FCEBEB' : color + '30') : isToday ? '#FDF0E6' : '#EAF3DE', border: isToday ? '1px solid #E07B2A' : '1px solid #f0ede8', borderLeft: isDebut ? ('3px solid ' + color) : undefined, borderRight: isFin ? ('3px solid ' + color) : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}>
                        {isDebut && <span style={{ fontSize: 8, color, fontWeight: 700, background: color + '20', padding: '1px 4px', borderRadius: 3 }}>Départ</span>}
                        {isFin && !isDebut && <span style={{ fontSize: 8, color: '#27500A', fontWeight: 700, background: '#EAF3DE', padding: '1px 4px', borderRadius: 3 }}>Retour</span>}
                        {!isOccupe && !isWeekend && <span style={{ fontSize: 8, color: '#3B6D11', fontWeight: 600 }}>✓</span>}
                        {isEnRetard && isOccupe && <span style={{ fontSize: 9, color: '#A32D2D' }}>!</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#EAF3DE', borderRadius: 2 }} />Disponible</span>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#E07B2A30', borderRadius: 2 }} />En pret</span>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FCEBEB', borderRadius: 2 }} />En retard</span>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 2 }} />Aujourd hui</span>
        </div>

        {/* Liste des prêts du mois */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Historique des prets</div>
          {prets.filter(p => {
            const d = new Date(p.date_debut)
            return d.getMonth() === mois && d.getFullYear() === annee
          }).length === 0 ? (
            <div style={{ textAlign: 'center' as const, color: '#888', fontSize: 13, padding: '1rem' }}>Aucun pret ce mois</div>
          ) : prets.filter(p => {
            const d = new Date(p.date_debut)
            return d.getMonth() === mois && d.getFullYear() === annee
          }).map(p => {
            const enRetard = p.statut === 'en_cours' && new Date(p.date_fin_prevue) < today
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3748' }}>{p.vehicules_courtoisie?.immatriculation} — {p.vehicules_courtoisie?.marque} {p.vehicules_courtoisie?.modele}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{p.dossiers?.clients?.prenom} {p.dossiers?.clients?.nom} · Du {new Date(p.date_debut).toLocaleDateString('fr-FR')} au {new Date(p.date_fin_prevue).toLocaleDateString('fr-FR')}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: p.statut === 'rendu' ? '#EAF3DE' : enRetard ? '#FCEBEB' : '#FAEEDA', color: p.statut === 'rendu' ? '#27500A' : enRetard ? '#791F1F' : '#854F0B', fontWeight: 600 }}>
                  {p.statut === 'rendu' ? 'Rendu' : enRetard ? 'En retard' : 'En pret'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}