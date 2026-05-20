'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CongesPage() {
  const [salarie, setSalarie] = useState<any>(null)
  const [conges, setConges] = useState<any[]>([])
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newConge, setNewConge] = useState({ salarie_id: '', date_debut: '', date_fin: '', type: 'conge', motif: '' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      if (sal?.role === 'chef_atelier') {
        const { data: sals } = await supabase.from('salaries').select('*').eq('actif', true)
        setSalaries(sals || [])
        setNewConge(n => ({ ...n, salarie_id: sal.id }))
        const { data: c } = await supabase.from('conges').select('*, salaries(*)').order('created_at', { ascending: false })
        setConges(c || [])
      } else {
        const { data: c } = await supabase.from('conges').select('*').eq('salarie_id', sal.id).order('created_at', { ascending: false })
        setConges(c || [])
        // Marquer les notifications comme lues
        await supabase.from('notifications').update({ lu: true }).eq('salarie_id', sal.id).eq('lu', false)
      }
      setLoading(false)
    }
    load()
  }, [])

  function nbJours(debut: string, fin: string) {
    if (!debut || !fin) return 0
    const d1 = new Date(debut)
    const d2 = new Date(fin)
    let count = 0
    const current = new Date(d1)
    while (current <= d2) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) count++
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  async function submitConge() {
    if (!newConge.date_debut || !newConge.date_fin) return
    setSaving(true)
    const jours = nbJours(newConge.date_debut, newConge.date_fin)
    const targetSalarieId = salarie.role === 'chef_atelier' ? newConge.salarie_id : salarie.id
    const isChef = salarie.role === 'chef_atelier'
    const { data } = await supabase.from('conges').insert({
      salarie_id: targetSalarieId,
      date_debut: newConge.date_debut,
      date_fin: newConge.date_fin,
      type: newConge.type,
      motif: newConge.motif,
      statut: isChef ? 'accepte' : 'en_attente',
      nb_jours: jours,
      commentaire_chef: isChef ? 'Saisi par le chef d atelier' : null
    }).select('*, salaries(*)').single()
    if (data) {
      setConges([data, ...conges])
      // Si chef pose un congé pour un technicien, envoyer une notif
      if (isChef && targetSalarieId !== salarie.id) {
        const typeLabels: any = { conge: 'Conge paye', rtt: 'RTT', maladie: 'Arret maladie', autre: 'Autre' }
        await supabase.from('notifications').insert({
          salarie_id: targetSalarieId,
          type: 'conge_pose',
          message: 'Le chef a pose un ' + (typeLabels[newConge.type] || newConge.type) + ' du ' + new Date(newConge.date_debut).toLocaleDateString('fr-FR') + ' au ' + new Date(newConge.date_fin).toLocaleDateString('fr-FR'),
          lien: '/conges'
        })
      }
    }
    setNewConge({ salarie_id: salarie.id, date_debut: '', date_fin: '', type: 'conge', motif: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function updateStatut(id: string, statut: string, commentaire?: string) {
    await supabase.from('conges').update({ statut, commentaire_chef: commentaire || null }).eq('id', id)
    setConges(conges.map(c => c.id === id ? { ...c, statut, commentaire_chef: commentaire || null } : c))
    // Envoyer une notification au salarié
    const conge = conges.find(c => c.id === id)
    if (conge) {
      const typeLabels: any = { conge: 'Conge paye', rtt: 'RTT', maladie: 'Arret maladie', autre: 'Autre' }
      const statutMsg = statut === 'accepte' ? '✓ acceptee' : '✗ refusee'
      await supabase.from('notifications').insert({
        salarie_id: conge.salarie_id,
        type: 'conge_' + statut,
        message: 'Votre demande de ' + (typeLabels[conge.type] || conge.type) + ' du ' + new Date(conge.date_debut).toLocaleDateString('fr-FR') + ' au ' + new Date(conge.date_fin).toLocaleDateString('fr-FR') + ' a ete ' + statutMsg + (commentaire ? ' — ' + commentaire : ''),
        lien: '/conges'
      })
    }
  }

  async function deleteConge(id: string) {
    await supabase.from('conges').delete().eq('id', id)
    setConges(conges.filter(c => c.id !== id))
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const enAttente = conges.filter(c => c.statut === 'en_attente')
  const acceptes = conges.filter(c => c.statut === 'accepte')
  const refuses = conges.filter(c => c.statut === 'refuse')

  const typeLabels: any = { conge: 'Conge paye', rtt: 'RTT', maladie: 'Arret maladie', autre: 'Autre' }
  const statutColors: any = {
    en_attente: { label: 'En attente', color: '#7A3E10', bg: '#FFF0E6' },
    accepte: { label: 'Accepte', color: '#2A6B3A', bg: '#EBF5EE' },
    refuse: { label: 'Refuse', color: '#791F1F', bg: '#FCEBEB' },
    modifie: { label: 'Modifie', color: '#3C3489', bg: '#EEEDFE' },
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 13, color: '#1C2A2F', background: '#FFFFFF' }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>{salarie?.role === 'chef_atelier' ? 'Gestion des conges' : 'Mes conges'}</span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: '#C8723A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {salarie?.role === 'chef_atelier' ? '+ Poser un conge' : '+ Demander un conge'}
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 920, margin: '0 auto' }}>
        {salarie?.role === 'chef_atelier' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: enAttente.length > 0 ? '2px solid #C8723A' : '1px solid #EDE5D8', position: 'relative' as const }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>En attente</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: enAttente.length > 0 ? '#C8723A' : '#888' }}>{enAttente.length}</div>
              {enAttente.length > 0 && <div style={{ position: 'absolute' as const, top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: '#C8723A' }} />}
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: '1px solid #EDE5D8' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Acceptes</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2A6B3A' }}>{acceptes.length}</div>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: '1px solid #EDE5D8' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Refuses</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#888' }}>{refuses.length}</div>
            </div>
          </div>
        )}

        {enAttente.length > 0 && salarie?.role === 'chef_atelier' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2A2F', marginBottom: 12 }}>⚠ Demandes en attente</div>
            {enAttente.map(c => <DemandeConge key={c.id} conge={c} isChef={true} typeLabels={typeLabels} statutColors={statutColors} onUpdate={updateStatut} onDelete={deleteConge} />)}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2A2F', marginBottom: 12 }}>{salarie?.role === 'chef_atelier' ? 'Tous les conges' : 'Mes demandes'}</div>
          {conges.filter(c => salarie?.role === 'chef_atelier' ? c.statut !== 'en_attente' : true).length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '2rem', textAlign: 'center' as const, color: '#888', border: '1px solid #EDE5D8' }}>Aucune demande de conge</div>
          ) : conges.filter(c => salarie?.role === 'chef_atelier' ? c.statut !== 'en_attente' : true).map(c => (
            <DemandeConge key={c.id} conge={c} isChef={salarie?.role === 'chef_atelier'} typeLabels={typeLabels} statutColors={statutColors} onUpdate={updateStatut} onDelete={deleteConge} />
          ))}
        </div>

        {salarie?.role === 'chef_atelier' && (
          <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '1.25rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16 }}>Planning des conges acceptes</div>
            <PlanningConges conges={acceptes} salaries={salaries} />
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 480 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C2A2F', marginBottom: 16 }}>{salarie?.role === 'chef_atelier' ? 'Poser un conge / arret' : 'Demander un conge'}</div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {salarie?.role === 'chef_atelier' && (
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Salarie concerne</label>
                  <select style={inputStyle} value={newConge.salarie_id} onChange={e => setNewConge({ ...newConge, salarie_id: e.target.value })}>
                    {salaries.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom} {s.id === salarie.id ? '(moi)' : '— ' + (s.role === 'chef_atelier' ? 'Chef' : 'Technicien')}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Type</label>
                <select style={inputStyle} value={newConge.type} onChange={e => setNewConge({ ...newConge, type: e.target.value })}>
                  <option value="conge">Conge paye</option>
                  <option value="rtt">RTT</option>
                  <option value="maladie">Arret maladie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Date de debut</label><input style={inputStyle} type="date" value={newConge.date_debut} onChange={e => setNewConge({ ...newConge, date_debut: e.target.value })} /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Date de fin</label><input style={inputStyle} type="date" value={newConge.date_fin} onChange={e => setNewConge({ ...newConge, date_fin: e.target.value })} /></div>
              </div>
              {newConge.date_debut && newConge.date_fin && (
                <div style={{ padding: '8px 12px', background: '#EBF5EE', borderRadius: 8, fontSize: 13, color: '#2A6B3A', fontWeight: 600 }}>
                  {nbJours(newConge.date_debut, newConge.date_fin)} jour(s) ouvrable(s)
                </div>
              )}
              {salarie?.role === 'chef_atelier' && <div style={{ padding: '8px 12px', background: '#EBF5EE', borderRadius: 8, fontSize: 12, color: '#2A6B3A' }}>En tant que chef, le conge sera automatiquement accepte.</div>}
              <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Motif (optionnel)</label><input style={inputStyle} value={newConge.motif} onChange={e => setNewConge({ ...newConge, motif: e.target.value })} placeholder="Ex : Vacances, arret medical..." /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1C2A2F' }}>Annuler</button>
              <button onClick={submitConge} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C8723A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving ? 'Enregistrement...' : salarie?.role === 'chef_atelier' ? 'Valider' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DemandeConge({ conge, isChef, typeLabels, statutColors, onUpdate, onDelete }: any) {
  const [showActions, setShowActions] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const sc = statutColors[conge.statut] || statutColors.en_attente
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: conge.statut === 'en_attente' ? '2px solid #C8723A' : '1px solid #EDE5D8', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          {isChef && conge.salaries && <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2A2F', marginBottom: 4 }}>{conge.salaries.prenom} {conge.salaries.nom}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#FAF7F2', color: '#1C2A2F' }}>{typeLabels[conge.type]}</span>
            <span style={{ fontSize: 13, color: '#1C2A2F', fontWeight: 600 }}>{new Date(conge.date_debut).toLocaleDateString('fr-FR')} → {new Date(conge.date_fin).toLocaleDateString('fr-FR')}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{conge.nb_jours} jour{conge.nb_jours > 1 ? 's' : ''}</span>
          </div>
          {conge.motif && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Motif : {conge.motif}</div>}
          {conge.commentaire_chef && <div style={{ fontSize: 12, padding: '6px 10px', background: '#FAF7F2', borderRadius: 6, color: '#555', marginTop: 4 }}>Note : {conge.commentaire_chef}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' as const }}>{sc.label}</span>
          {isChef && conge.statut === 'en_attente' && <button onClick={() => setShowActions(!showActions)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#1C2A2F' }}>{showActions ? 'Fermer' : 'Traiter'}</button>}
          {isChef && <button onClick={() => onDelete(conge.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#888' }}>Supprimer</button>}
          {!isChef && conge.statut === 'en_attente' && <button onClick={() => onDelete(conge.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#888' }}>Annuler</button>}
        </div>
      </div>
      {showActions && (
        <div style={{ marginTop: 12, padding: '12px', background: '#FAF7F2', borderRadius: 8 }}>
          <input value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Commentaire pour le salarie (optionnel)..." style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 13, color: '#1C2A2F', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onUpdate(conge.id, 'accepte', commentaire); setShowActions(false) }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#2A6B3A', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✓ Accepter</button>
            <button onClick={() => { onUpdate(conge.id, 'refuse', commentaire); setShowActions(false) }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#A32D2D', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✗ Refuser</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanningConges({ conges, salaries }: any) {
  const [moisActuel, setMoisActuel] = useState(new Date())
  const annee = moisActuel.getFullYear()
  const mois = moisActuel.getMonth()
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const nomsMois = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
  const today = new Date()
  const colors = ['#C8723A', '#185FA5', '#2A6B3A', '#7A3E10', '#3C3489']
  function getCongeForDay(salarieId: string, jour: number) {
    const date = new Date(annee, mois, jour)
    return conges.find((c: any) => { const d = new Date(c.date_debut); const f = new Date(c.date_fin); return c.salarie_id === salarieId && date >= d && date <= f }) || null
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMoisActuel(new Date(annee, mois - 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14 }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C2A2F', minWidth: 140, textAlign: 'center' as const }}>{nomsMois[mois]} {annee}</span>
        <button onClick={() => setMoisActuel(new Date(annee, mois + 1, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14 }}>→</button>
      </div>
      <div style={{ overflowX: 'auto' as const }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 2 }}>
            <div style={{ fontSize: 11, color: '#888', padding: '4px' }}>Salarie</div>
            {Array.from({ length: nbJours }, (_, i) => {
              const date = new Date(annee, mois, i + 1)
              const isToday = date.toDateString() === today.toDateString()
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              return <div key={i} style={{ fontSize: 9, textAlign: 'center' as const, color: isToday ? '#C8723A' : isWeekend ? '#ccc' : '#888', fontWeight: isToday ? 700 : 400, padding: '4px 0' }}>{i + 1}</div>
            })}
          </div>
          {salaries.map((sal: any, si: number) => (
            <div key={sal.id} style={{ display: 'grid', gridTemplateColumns: '120px repeat(' + nbJours + ', 1fr)', gap: 1, marginBottom: 2 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1C2A2F', padding: '6px 4px', background: '#FFFFFF', borderRadius: 4 }}>{sal.prenom} {sal.nom}</div>
              {Array.from({ length: nbJours }, (_, i) => {
                const conge = getCongeForDay(sal.id, i + 1)
                const date = new Date(annee, mois, i + 1)
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isToday = date.toDateString() === today.toDateString()
                const isDebut = conge ? new Date(conge.date_debut).toDateString() === date.toDateString() : false
                const color = colors[si % colors.length]
                return (
                  <div key={i} style={{ height: 28, borderRadius: 3, background: isWeekend ? '#f5f3f0' : conge ? color + '33' : isToday ? '#FFF0E6' : 'white', border: isToday ? '1px solid #C8723A' : '1px solid #f0ede8', borderLeft: conge && isDebut ? ('3px solid ' + color) : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conge && isDebut && <span style={{ fontSize: 8, color, fontWeight: 700 }}>C</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}