'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PlanningPage() {
  const [prets, setPrets] = useState<any[]>([])
  const [vehicules, setVehicules] = useState<any[]>([])
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
  const premierJour = new Date(annee, mois, 1)
  const dernierJour = new Date(annee, mois + 1, 0)
  const nbJours = dernierJour.getDate()
  const nomsMois = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
  const today = new Date()

  function pretsDuVehicule(vehiculeId: string) {
    return prets.filter(p => {
      const debut = new Date(p.date_debut)
      const fin = new Date(p.date_fin_prevue)
      const debutMois = new Date(annee, mois, 1)
      const finMois = new Date(annee, mois + 1, 0)
      return p.vehicule_id === vehiculeId && debut <= finMois && fin >= debutMois
    })
  }

  function getPretForDay(vehiculeId: string, jour: number) {
    const date = new Date(annee, mois, jour)
    return prets.find(p => {
      const debut = new Date(p.date_debut)
      const fin = p.date_retour ? new Date(p.date_retour) : new Date(p.date_fin_prevue)
      return p.vehicule_id === vehiculeId && date >= debut && date <= fin
    })
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const colors = ['#E07B2A', '#185FA5', '#3B6D11', '#854F0B', '#3C3489', '#A32D2D']

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/courtoisie')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Planning vehicules de courtoisie</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMoisActuel(new Date(annee, mois - 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>←</button>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600, minWidth: 140, textAlign: 'center' as const }}>{nomsMois[mois]} {annee}</span>
          <button onClick={() => setMoisActuel(new Date(annee, mois + 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>→</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', overflowX: 'auto' as const }}>
        <div style={{ minWidth: 800 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 2 }}>
            <div style={{ padding: '6px', fontSize: 12, color: '#888', fontWeight: 600 }}>Vehicule</div>
            {Array.from({ length: nbJours }, (_, i) => {
              const date = new Date(annee, mois, i + 1)
              const isToday = date.toDateString() === today.toDateString()
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <div key={i} style={{ padding: '4px 2px', fontSize: 10, textAlign: 'center' as const, color: isToday ? '#E07B2A' : isWeekend ? '#aaa' : '#555', fontWeight: isToday ? 700 : 400, background: isToday ? '#FDF0E6' : isWeekend ? '#f5f3f0' : 'white', borderRadius: 4 }}>
                  {i + 1}
                </div>
              )
            })}
          </div>

          {vehicules.map((v, vi) => (
            <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '140px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 2 }}>
              <div style={{ padding: '8px 6px', background: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#2D3748' }}>
                <div>{v.immatriculation}</div>
                <div style={{ color: '#888', fontWeight: 400 }}>{v.marque} {v.modele}</div>
              </div>
              {Array.from({ length: nbJours }, (_, i) => {
                const pret = getPretForDay(v.id, i + 1)
                const date = new Date(annee, mois, i + 1)
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isToday = date.toDateString() === today.toDateString()
                const pretIndex = pret ? prets.filter(p => p.vehicule_id === v.id).indexOf(pret) : -1
                const color = pret ? colors[pretIndex % colors.length] : null
                const isDebut = pret && new Date(pret.date_debut).toDateString() === date.toDateString()
                const enRetard = pret && pret.statut === 'en_cours' && pret.date_fin_prevue < new Date().toISOString().split('T')[0]
                return (
                  <div key={i} title={pret ? (pret.dossiers?.clients?.prenom + ' ' + pret.dossiers?.clients?.nom) : ''} style={{
                    height: 32, borderRadius: 3,
                    background: pret ? (enRetard ? '#FCEBEB' : color + '33') : isWeekend ? '#f5f3f0' : isToday ? '#FDF0E6' : 'white',
                    border: isToday ? '1px solid #E07B2A' : '1px solid #f0ede8',
                    borderLeft: pret && isDebut ? '3px solid ' + (enRetard ? '#E24B4A' : color) : undefined,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    cursor: pret ? 'pointer' : 'default'
                  }}>
                    {pret && isDebut && (
                      <span style={{ fontSize: 9, color: enRetard ? '#A32D2D' : color, fontWeight: 700, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
                        {pret.dossiers?.clients?.nom || ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>Legende</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#E07B2A33', border: '1px solid #E07B2A', borderRadius: 2 }} />En pret</span>
            <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FCEBEB', border: '1px solid #E24B4A', borderRadius: 2 }} />En retard</span>
            <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 2 }} />Aujourd hui</span>
            <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#f5f3f0', borderRadius: 2 }} />Weekend</span>
          </div>
        </div>
      </div>
    </div>
  )
}