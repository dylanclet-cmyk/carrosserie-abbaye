'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PlanningPage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moisActuel, setMoisActuel] = useState(new Date())
  const [onglet, setOnglet] = useState<'vehicules' | 'equipe'>('vehicules')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: dos } = await supabase.from('dossiers').select('*, clients(*), salaries(*)').not('statut', 'eq', 'facture').order('date_entree')
      setDossiers(dos || [])
      const { data: sals } = await supabase.from('salaries').select('*').eq('actif', true).eq('role', 'technicien')
      setSalaries(sals || [])
      setLoading(false)
    }
    load()
  }, [])

  const annee = moisActuel.getFullYear()
  const mois = moisActuel.getMonth()
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const nomsMois = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
  const today = new Date()
  const colors = ['#E07B2A', '#185FA5', '#3B6D11', '#854F0B', '#3C3489', '#A32D2D', '#0C7C7C']

  const statusColors: any = {
    en_attente_signature: { label: 'En attente', color: '#854F0B', bg: '#FAEEDA' },
    en_cours: { label: 'En cours', color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { label: 'Pret restituer', color: '#27500A', bg: '#EAF3DE' },
    termine: { label: 'Termine', color: '#444', bg: '#F1EFE8' },
  }

  const dossiersFiltres = dossiers.filter(d => {
    if (filtreStatut !== 'tous' && d.statut !== filtreStatut) return false
    const debut = new Date(d.date_entree)
    const fin = d.date_sortie_prevue ? new Date(d.date_sortie_prevue) : new Date(annee, mois + 1, 0)
    const debutMois = new Date(annee, mois, 1)
    const finMois = new Date(annee, mois + 1, 0)
    return debut <= finMois && fin >= debutMois
  })

  async function updateDateSortie(dossierId: string, date: string) {
    await supabase.from('dossiers').update({ date_sortie_prevue: date || null }).eq('id', dossierId)
    setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, date_sortie_prevue: date || null } : d))
  }

  function getDossiersDuJour(salarieId: string, jour: number) {
    const date = new Date(annee, mois, jour)
    return dossiers.filter(d => {
      if (d.salarie_id !== salarieId) return false
      const debut = new Date(d.date_entree)
      const fin = d.date_sortie_prevue ? new Date(d.date_sortie_prevue) : null
      if (!fin) return date >= debut
      return date >= debut && date <= fin
    })
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Planning atelier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setOnglet('vehicules')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'vehicules' ? '#E07B2A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🚗 Vehicules</button>
          <button onClick={() => setOnglet('equipe')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'equipe' ? '#E07B2A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>👥 Equipe</button>
          <button onClick={() => setMoisActuel(new Date(annee, mois - 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>←</button>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600, minWidth: 150, textAlign: 'center' as const }}>{nomsMois[mois]} {annee}</span>
          <button onClick={() => setMoisActuel(new Date(annee, mois + 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: 'white', fontSize: 14 }}>→</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {['en_attente_signature', 'en_cours', 'pret_restituer', 'termine'].map(s => {
            const count = dossiers.filter(d => d.statut === s).length
            const sc = statusColors[s]
            return (
              <div key={s} onClick={() => setFiltreStatut(filtreStatut === s ? 'tous' : s)} style={{ background: 'white', borderRadius: 10, padding: '0.75rem 1rem', border: filtreStatut === s ? '2px solid #E07B2A' : '1px solid #e8e2d9', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{sc?.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2D3748' }}>{count}</div>
              </div>
            )
          })}
        </div>

        {/* ONGLET VEHICULES */}
        {onglet === 'vehicules' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 20, overflowX: 'auto' as const }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Calendrier des vehicules</div>
              <div style={{ minWidth: 900 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#888', padding: '4px 8px', fontWeight: 600 }}>Dossier</div>
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
                {dossiersFiltres.length === 0 ? (
                  <div style={{ textAlign: 'center' as const, padding: '2rem', color: '#888', fontSize: 13 }}>Aucun dossier ce mois</div>
                ) : dossiersFiltres.map((d, di) => {
                  const color = colors[di % colors.length]
                  const sc = statusColors[d.statut]
                  return (
                    <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '200px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 3 }}>
                      <div onClick={() => router.push('/dossier/' + d.id)} style={{ padding: '6px 8px', background: 'white', borderRadius: 6, cursor: 'pointer', borderLeft: '3px solid ' + color }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#2D3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.immatriculation}</div>
                        <div style={{ fontSize: 10, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.clients?.prenom} {d.clients?.nom}</div>
                        {d.salaries && <div style={{ fontSize: 9, color: '#E07B2A' }}>{d.salaries.prenom}</div>}
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: sc?.bg, color: sc?.color }}>{sc?.label}</span>
                      </div>
                      {Array.from({ length: nbJours }, (_, i) => {
                        const date = new Date(annee, mois, i + 1)
                        const debut = new Date(d.date_entree)
                        const fin = d.date_sortie_prevue ? new Date(d.date_sortie_prevue) : null
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        const isToday = date.toDateString() === today.toDateString()
                        const isInRange = date >= debut && (fin ? date <= fin : true)
                        const isDebut = debut.toDateString() === date.toDateString()
                        const isFin = fin && fin.toDateString() === date.toDateString()
                        const isDepassee = fin && date > fin && !['facture', 'termine'].includes(d.statut)
                        return (
                          <div key={i} style={{ height: 36, borderRadius: 3, background: isInRange ? (isDepassee ? '#FCEBEB' : color + '25') : isWeekend ? '#f8f6f3' : isToday ? '#FDF0E6' : 'white', border: isToday && !isInRange ? '1px solid #E07B2A' : '1px solid #f0ede8', borderLeft: isDebut ? ('3px solid ' + color) : undefined, borderRight: isFin ? ('3px solid ' + color) : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}>
                            {isDebut && <span style={{ fontSize: 8, color, fontWeight: 700, position: 'absolute' as const, left: 3 }}>E</span>}
                            {isFin && <span style={{ fontSize: 8, color, fontWeight: 700, position: 'absolute' as const, right: 3 }}>S</span>}
                            {isDepassee && isInRange && <span style={{ fontSize: 8, color: '#A32D2D' }}>!</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gestion dates de sortie */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Gestion des dates de sortie prevues</div>
              {dossiers.filter(d => !['facture', 'termine'].includes(d.statut)).map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3748' }}>{d.immatriculation} — {d.marque} {d.modele}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{d.clients?.prenom} {d.clients?.nom} · Entree le {new Date(d.date_entree).toLocaleDateString('fr-FR')}</div>
                    {d.salaries && <div style={{ fontSize: 11, color: '#E07B2A' }}>{d.salaries.prenom} {d.salaries.nom}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Sortie prevue :</span>
                    <input type="date" value={d.date_sortie_prevue || ''} onChange={e => updateDateSortie(d.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', background: 'white' }} />
                    {d.date_sortie_prevue && new Date(d.date_sortie_prevue) < today && d.statut !== 'pret_restituer' && (
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D', fontWeight: 600 }}>En retard</span>
                    )}
                    {d.date_sortie_prevue && new Date(d.date_sortie_prevue) >= today && (
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>
                        Dans {Math.ceil((new Date(d.date_sortie_prevue).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} j
                      </span>
                    )}
                  </div>
                  <button onClick={() => router.push('/dossier/' + d.id)} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid #E07B2A', background: 'white', cursor: 'pointer', fontSize: 12, color: '#E07B2A', fontWeight: 600 }}>Voir</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ONGLET EQUIPE */}
        {onglet === 'equipe' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 20, overflowX: 'auto' as const }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Planning de l equipe</div>
              <div style={{ minWidth: 900 }}>
                {/* Header jours */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#888', padding: '4px 8px', fontWeight: 600 }}>Technicien</div>
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

                {salaries.length === 0 ? (
                  <div style={{ textAlign: 'center' as const, padding: '2rem', color: '#888', fontSize: 13 }}>Aucun technicien</div>
                ) : salaries.map((sal, si) => {
                  const color = colors[si % colors.length]
                  const dossierssal = dossiers.filter(d => d.salarie_id === sal.id && !['facture', 'termine'].includes(d.statut))
                  return (
                    <div key={sal.id} style={{ marginBottom: 12 }}>
                      {/* Ligne technicien */}
                      <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 2 }}>
                        <div style={{ padding: '8px', background: color + '15', borderRadius: 6, borderLeft: '3px solid ' + color }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748' }}>{sal.prenom} {sal.nom}</div>
                          <div style={{ fontSize: 10, color: '#888' }}>{dossierssal.length} dossier{dossierssal.length > 1 ? 's' : ''}</div>
                        </div>
                        {Array.from({ length: nbJours }, (_, i) => {
                          const date = new Date(annee, mois, i + 1)
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          const isToday = date.toDateString() === today.toDateString()
                          const dossiersJour = getDossiersDuJour(sal.id, i + 1)
                          const nbDossiers = dossiersJour.length
                          return (
                            <div key={i} title={dossiersJour.map(d => d.immatriculation).join(', ')} style={{ height: 40, borderRadius: 3, background: isWeekend ? '#f8f6f3' : nbDossiers > 0 ? color + '30' : isToday ? '#FDF0E6' : 'white', border: isToday ? '1px solid #E07B2A' : '1px solid #f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {nbDossiers > 0 && <span style={{ fontSize: 10, color, fontWeight: 700 }}>{nbDossiers}</span>}
                            </div>
                          )
                        })}
                      </div>

                      {/* Sous-lignes par dossier */}
                      {dossierssal.map(d => {
                        const dcolor = colors[dossiers.indexOf(d) % colors.length]
                        return (
                          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '160px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 1 }}>
                            <div onClick={() => router.push('/dossier/' + d.id)} style={{ padding: '4px 8px', background: 'white', borderRadius: 4, cursor: 'pointer', borderLeft: '2px solid ' + dcolor, marginLeft: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: '#2D3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.immatriculation}</div>
                              <div style={{ fontSize: 9, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.clients?.prenom} {d.clients?.nom}</div>
                            </div>
                            {Array.from({ length: nbJours }, (_, i) => {
                              const date = new Date(annee, mois, i + 1)
                              const debut = new Date(d.date_entree)
                              const fin = d.date_sortie_prevue ? new Date(d.date_sortie_prevue) : null
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6
                              const isInRange = date >= debut && (fin ? date <= fin : true)
                              const isDebut = debut.toDateString() === date.toDateString()
                              const isFin = fin && fin.toDateString() === date.toDateString()
                              return (
                                <div key={i} style={{ height: 28, borderRadius: 2, background: isWeekend ? '#f8f6f3' : isInRange ? dcolor + '20' : 'white', border: '1px solid #f5f5f5', borderLeft: isDebut ? ('2px solid ' + dcolor) : undefined, borderRight: isFin ? ('2px solid ' + dcolor) : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {isDebut && <span style={{ fontSize: 7, color: dcolor, fontWeight: 700 }}>E</span>}
                                  {isFin && <span style={{ fontSize: 7, color: dcolor, fontWeight: 700 }}>S</span>}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Résumé par technicien */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {salaries.map((sal, si) => {
                const color = colors[si % colors.length]
                const dossierssal = dossiers.filter(d => d.salarie_id === sal.id && !['facture', 'termine'].includes(d.statut))
                const enRetard = dossierssal.filter(d => d.date_sortie_prevue && new Date(d.date_sortie_prevue) < today)
                return (
                  <div key={sal.id} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: enRetard.length > 0 ? '2px solid #E24B4A' : '1px solid #e8e2d9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>
                        {sal.prenom?.[0]}{sal.nom?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748' }}>{sal.prenom} {sal.nom}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{dossierssal.length} dossier{dossierssal.length > 1 ? 's' : ''} en cours</div>
                      </div>
                      {enRetard.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D', fontWeight: 600 }}>{enRetard.length} en retard</span>}
                    </div>
                    {dossierssal.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#888', textAlign: 'center' as const, padding: '0.5rem' }}>Aucun dossier assigne</div>
                    ) : dossierssal.map(d => (
                      <div key={d.id} onClick={() => router.push('/dossier/' + d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8f6f3', borderRadius: 6, marginBottom: 4, cursor: 'pointer' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#2D3748' }}>{d.immatriculation} — {d.marque} {d.modele}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{d.clients?.prenom} {d.clients?.nom}</div>
                          {d.date_sortie_prevue && (
                            <div style={{ fontSize: 10, color: new Date(d.date_sortie_prevue) < today ? '#A32D2D' : '#3B6D11', fontWeight: 600 }}>
                              Sortie : {new Date(d.date_sortie_prevue).toLocaleDateString('fr-FR')}
                              {new Date(d.date_sortie_prevue) < today ? ' ⚠ EN RETARD' : ''}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: statusColors[d.statut]?.bg, color: statusColors[d.statut]?.color }}>{statusColors[d.statut]?.label}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Legende */}
        <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#E07B2A25', borderLeft: '3px solid #E07B2A', borderRadius: 2 }} />En atelier (E=entree S=sortie)</span>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FCEBEB', borderRadius: 2 }} />Date depassee</span>
          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 16, height: 12, background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 2 }} />Aujourd hui</span>
        </div>
      </div>
    </div>
  )
}
