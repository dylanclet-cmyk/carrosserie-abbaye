'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

function EtatsLieux({ dossierId, router }: { dossierId: string, router: any }) {
  const [etats, setEtats] = useState<any[]>([])
  const supabase = createClient()
  useEffect(() => {
    supabase.from('etats_lieux').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false }).then(({ data }) => setEtats(data || []))
  }, [])
  if (etats.length === 0) return null
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Etats des lieux</div>
      {etats.map(e => (
        <div key={e.id} onClick={() => router.push('/etat-des-lieux/detail?id=' + e.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: e.type === 'entree' ? '#E6F1FB' : '#EAF3DE', color: e.type === 'entree' ? '#0C447C' : '#27500A' }}>{e.type === 'entree' ? 'Entree' : 'Sortie'}</span>
          <span style={{ fontSize: 13, color: '#2D3748', flex: 1 }}>{e.dommages?.length || 0} dommage{e.dommages?.length > 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('fr-FR')}</span>
          {e.signature_client && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>Signe</span>}
          <span style={{ fontSize: 12, color: '#E07B2A' }}>Voir →</span>
        </div>
      ))}
    </div>
  )
}

function ProgressionHeures({ totalHeures, heuresEstimees }: { totalHeures: number, heuresEstimees: number }) {
  if (!heuresEstimees || heuresEstimees === 0) return null
  const pct = Math.min(Math.round(totalHeures / heuresEstimees * 100), 100)
  const depasse = totalHeures > heuresEstimees
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: depasse ? '2px solid #E24B4A' : '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Progression du chantier</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div><span style={{ fontSize: 28, fontWeight: 700, color: depasse ? '#E24B4A' : '#2D3748' }}>{totalHeures}h</span><span style={{ fontSize: 16, color: '#888', marginLeft: 4 }}>/ {heuresEstimees}h estimees</span></div>
        <span style={{ fontSize: 20, fontWeight: 700, color: depasse ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#3B6D11' }}>{pct}%</span>
      </div>
      <div style={{ height: 12, background: '#f0ede8', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: pct + '%', background: depasse ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#3B6D11', borderRadius: 6 }} />
      </div>
      {depasse ? <div style={{ fontSize: 13, color: '#E24B4A', fontWeight: 600 }}>Depassement de {Math.round((totalHeures - heuresEstimees) * 10) / 10}h !</div>
        : <div style={{ fontSize: 13, color: '#888' }}>Il reste <strong style={{ color: '#2D3748' }}>{Math.round((heuresEstimees - totalHeures) * 10) / 10}h</strong> disponibles</div>}
    </div>
  )
}

function TravauxDetails({ dossierId }: { dossierId: string }) {
  const [travaux, setTravaux] = useState<any[]>([])
  const [newTravail, setNewTravail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('travaux_details').select('*').eq('dossier_id', dossierId).order('ordre').then(({ data }) => setTravaux(data || []))
  }, [])

  async function addTravail() {
    if (!newTravail.trim()) return
    const { data } = await supabase.from('travaux_details').insert({ dossier_id: dossierId, libelle: newTravail, ordre: travaux.length }).select().single()
    if (data) { setTravaux([...travaux, data]); setNewTravail('') }
  }

  async function toggleTravail(t: any) {
    await supabase.from('travaux_details').update({ fait: !t.fait }).eq('id', t.id)
    setTravaux(travaux.map(x => x.id === t.id ? { ...x, fait: !x.fait } : x))
  }

  async function deleteTravail(id: string) {
    await supabase.from('travaux_details').delete().eq('id', id)
    setTravaux(travaux.filter(t => t.id !== id))
  }

  const fait = travaux.filter(t => t.fait).length
  const total = travaux.length

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Travaux a realiser</div>
        {total > 0 && <span style={{ fontSize: 12, color: fait === total ? '#27500A' : '#888' }}>{fait}/{total} termines</span>}
      </div>
      {total > 0 && (
        <div style={{ height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: (fait / total * 100) + '%', background: fait === total ? '#3B6D11' : '#E07B2A', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      )}
      {travaux.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
          <input type="checkbox" checked={t.fait} onChange={() => toggleTravail(t)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E07B2A' }} />
          <span style={{ fontSize: 13, color: t.fait ? '#888' : '#2D3748', textDecoration: t.fait ? 'line-through' : 'none', flex: 1 }}>{t.libelle}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: t.fait ? '#EAF3DE' : '#FAEEDA', color: t.fait ? '#27500A' : '#854F0B' }}>{t.fait ? 'Fait' : 'A faire'}</span>
          <button onClick={() => deleteTravail(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={newTravail} onChange={e => setNewTravail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTravail()}
          placeholder="Ex : Debosselage aile avant, Peinture capot..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
        <button onClick={addTravail} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Ajouter</button>
      </div>
    </div>
  )
}

function SuiviPieces({ dossierId }: { dossierId: string }) {
  const [pieces, setPieces] = useState<any[]>([])
  const [newPiece, setNewPiece] = useState({ libelle: '', reference: '', quantite: 1 })
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('pieces').select('*').eq('dossier_id', dossierId).order('created_at').then(({ data }) => setPieces(data || []))
  }, [])

  async function addPiece() {
    if (!newPiece.libelle.trim()) return
    const { data } = await supabase.from('pieces').insert({ dossier_id: dossierId, libelle: newPiece.libelle, reference: newPiece.reference, quantite: newPiece.quantite, statut: 'a_commander' }).select().single()
    if (data) { setPieces([...pieces, data]); setNewPiece({ libelle: '', reference: '', quantite: 1 }); setShowForm(false) }
  }

  async function updateStatut(id: string, statut: string) {
    const updates: any = { statut }
    if (statut === 'commandee') updates.date_commande = new Date().toISOString().split('T')[0]
    if (statut === 'recue') updates.date_reception = new Date().toISOString().split('T')[0]
    await supabase.from('pieces').update(updates).eq('id', id)
    setPieces(pieces.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  async function deletePiece(id: string) {
    await supabase.from('pieces').delete().eq('id', id)
    setPieces(pieces.filter(p => p.id !== id))
  }

  const statutColors: any = {
    a_commander: { label: 'A commander', color: '#A32D2D', bg: '#FCEBEB' },
    commandee: { label: 'Commandee', color: '#854F0B', bg: '#FAEEDA' },
    recue: { label: 'Recue', color: '#27500A', bg: '#EAF3DE' },
  }

  const aCommander = pieces.filter(p => p.statut === 'a_commander').length
  const commandees = pieces.filter(p => p.statut === 'commandee').length
  const recues = pieces.filter(p => p.statut === 'recue').length

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Suivi des pieces</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {aCommander > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D', fontWeight: 600 }}>{aCommander} a commander</span>}
          {commandees > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FAEEDA', color: '#854F0B', fontWeight: 600 }}>{commandees} en attente</span>}
          {recues > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>{recues} recues</span>}
        </div>
      </div>

      {pieces.length === 0 && !showForm && (
        <div style={{ textAlign: 'center' as const, color: '#888', fontSize: 13, padding: '1rem' }}>Aucune piece pour ce dossier</div>
      )}

      {pieces.map(p => {
        const sc = statutColors[p.statut]
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{p.libelle}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {p.reference && <span>Ref : {p.reference} · </span>}
                Qte : {p.quantite}
                {p.date_commande && <span> · Commande le {new Date(p.date_commande).toLocaleDateString('fr-FR')}</span>}
                {p.date_reception && <span> · Recu le {new Date(p.date_reception).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{sc.label}</span>
              {p.statut === 'a_commander' && (
                <button onClick={() => updateStatut(p.id, 'commandee')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #E07B2A', background: 'white', cursor: 'pointer', color: '#E07B2A', fontWeight: 600 }}>Marquer commandee</button>
              )}
              {p.statut === 'commandee' && (
                <button onClick={() => updateStatut(p.id, 'recue')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #3B6D11', background: 'white', cursor: 'pointer', color: '#3B6D11', fontWeight: 600 }}>Marquer recue</button>
              )}
              <button onClick={() => deletePiece(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 4px' }}>×</button>
            </div>
          </div>
        )
      })}

      {showForm && (
        <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '12px', marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Designation de la piece</div>
              <input value={newPiece.libelle} onChange={e => setNewPiece({ ...newPiece, libelle: e.target.value })}
                placeholder="Ex : Aile avant gauche, Feu arriere..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Reference</div>
              <input value={newPiece.reference} onChange={e => setNewPiece({ ...newPiece, reference: e.target.value })}
                placeholder="REF-123"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Qte</div>
              <input type="number" min="1" value={newPiece.quantite} onChange={e => setNewPiece({ ...newPiece, quantite: Number(e.target.value) })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#888' }}>Annuler</button>
            <button onClick={addPiece} style={{ flex: 1, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Ajouter la piece</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px dashed #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#888', marginTop: 4 }}>
          + Ajouter une piece
        </button>
      )}
    </div>
  )
}

export default function DossierPage() {
  const [dossier, setDossier] = useState<any>(null)
  const [heures, setHeures] = useState<any[]>([])
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newHeure, setNewHeure] = useState({ date: new Date().toISOString().split('T')[0], type_travail: 'debosselage', duree_heures: 2 })
  const [showTerminer, setShowTerminer] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [terminating, setTerminating] = useState(false)
  const [terminated, setTerminated] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      const { data: dos } = await supabase.from('dossiers').select('*, clients(*), salaries(*)').eq('id', params.id).single()
      setDossier(dos)
      if (dos?.notes) setCommentaire(dos.notes)
      const { data: h } = await supabase.from('heures').select('*, salaries(*)').eq('dossier_id', params.id).order('date_travail', { ascending: false })
      setHeures(h || [])
      if (sal?.role === 'chef_atelier') {
        const { data: sals } = await supabase.from('salaries').select('*').eq('actif', true).eq('role', 'technicien')
        setSalaries(sals || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function addHeure() {
    const { data } = await supabase.from('heures').insert({
      dossier_id: params.id, salarie_id: salarie.id,
      date_travail: newHeure.date, type_travail: newHeure.type_travail, duree_heures: newHeure.duree_heures
    }).select('*, salaries(*)').single()
    if (data) setHeures([data, ...heures])
  }

  async function updateStatut(statut: string) {
    await supabase.from('dossiers').update({ statut }).eq('id', params.id)
    setDossier({ ...dossier, statut })
  }

  async function assignerTechnicien(salarie_id: string) {
    await supabase.from('dossiers').update({ salarie_id }).eq('id', params.id)
    const sal = salaries.find(s => s.id === salarie_id)
    setDossier({ ...dossier, salarie_id, salaries: sal })
  }

  async function terminerChantier() {
    setTerminating(true)
    await supabase.from('dossiers').update({ statut: 'pret_restituer', notes: commentaire }).eq('id', params.id)
    setDossier({ ...dossier, statut: 'pret_restituer', notes: commentaire })
    setTerminating(false); setTerminated(true); setShowTerminer(false)
  }

  async function facturer() {
    await supabase.from('dossiers').update({ statut: 'facture' }).eq('id', params.id)
    setDossier({ ...dossier, statut: 'facture' })
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

  const totalHeures = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
  const heuresEstimees = Number(dossier.heures_estimees) || 0
  const estTermine = ['pret_restituer', 'termine', 'facture'].includes(dossier.statut)

  const typeLabels: any = {
    debosselage: 'Debosselage', peinture: 'Peinture',
    remplacement_piece: 'Remplacement piece', finition: 'Finition',
    controle_qualite: 'Controle qualite', autre: 'Autre'
  }

  const statusOptions = [
    { value: 'en_attente_signature', label: 'En attente signature' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'pret_restituer', label: 'Pret a restituer' },
    { value: 'termine', label: 'Termine' },
    { value: 'facture', label: 'Facture' },
  ]

  const statusColors: any = {
    en_attente_signature: { color: '#854F0B', bg: '#FAEEDA' },
    en_cours: { color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { color: '#27500A', bg: '#EAF3DE' },
    termine: { color: '#444441', bg: '#F1EFE8' },
    facture: { color: '#3C3489', bg: '#EEEDFE' },
  }
  const sc = statusColors[dossier.statut] || statusColors.en_cours

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'white' }}>{dossier.immatriculation} — {dossier.marque} {dossier.modele}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{statusOptions.find(s => s.value === dossier.statut)?.label}</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>

        {terminated && (
          <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16, color: '#27500A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✓</span> Chantier termine ! Le chef a ete prevenu.
          </div>
        )}

        {dossier.notes && (
          <div style={{ background: '#FDF0E6', border: '2px solid #E07B2A', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>Note du technicien {dossier.salaries ? '— ' + dossier.salaries.prenom + ' ' + dossier.salaries.nom : ''}</div>
            <div style={{ fontSize: 14, color: '#2D3748' }}>{dossier.notes}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Client</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748', marginBottom: 4 }}>{dossier.clients?.prenom} {dossier.clients?.nom}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>{dossier.clients?.telephone}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{dossier.clients?.assurance}</div>
            <div style={{ fontSize: 13, color: '#555' }}>Entree : <strong>{new Date(dossier.date_entree).toLocaleDateString('fr-FR')}</strong></div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Kilometrage : <strong>{dossier.km_entree?.toLocaleString()} km</strong></div>
            {salarie?.role === 'chef_atelier' && (
              <>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Statut</div>
                  <select onChange={e => updateStatut(e.target.value)} value={dossier.statut} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Technicien assigne</div>
                  <select onChange={e => assignerTechnicien(e.target.value)} value={dossier.salarie_id || ''} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                    <option value="">-- Choisir un technicien --</option>
                    {salaries.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Infos chantier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures saisies</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#2D3748' }}>{totalHeures} h</div>
              </div>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures estimees</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#E07B2A' }}>{heuresEstimees > 0 ? heuresEstimees + ' h' : '—'}</div>
              </div>
              {dossier.salaries && (
                <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Technicien assigne</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748' }}>{dossier.salaries.prenom} {dossier.salaries.nom}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ProgressionHeures totalHeures={totalHeures} heuresEstimees={heuresEstimees} />

        <TravauxDetails dossierId={params.id as string} />

        <SuiviPieces dossierId={params.id as string} />

        {!estTermine && salarie?.role === 'technicien' && !showTerminer && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setShowTerminer(true)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #3B6D11', background: '#EAF3DE', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ✓ Terminer le chantier et prevenir le chef
            </button>
          </div>
        )}

        {showTerminer && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '2px solid #3B6D11', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#27500A', marginBottom: 12 }}>Terminer le chantier</div>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
              placeholder="Note pour le chef..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', minHeight: 80, resize: 'vertical' as const, fontFamily: 'system-ui' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowTerminer(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748' }}>Annuler</button>
              <button onClick={terminerChantier} disabled={terminating} style={{ flex: 1, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3B6D11', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {terminating ? 'En cours...' : '✓ Confirmer'}
              </button>
            </div>
          </div>
        )}

        {dossier.statut === 'pret_restituer' && salarie?.role === 'chef_atelier' && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={facturer} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #3C3489', background: '#EEEDFE', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Marquer comme facture — archiver le dossier
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=entree')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #E07B2A', background: '#E07B2A', cursor: 'pointer', fontSize: 13, color: 'white', fontWeight: 700 }}>Etat des lieux entree</button>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=sortie')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #2D3748', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748', fontWeight: 600 }}>Etat des lieux sortie</button>
          <button onClick={() => router.push('/dossier/' + params.id + '/pdf')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #3C3489', background: 'white', cursor: 'pointer', fontSize: 13, color: '#3C3489', fontWeight: 600 }}>Exporter PDF</button>
        </div>

        <EtatsLieux dossierId={params.id as string} router={router} />

        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Saisie des heures</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, marginBottom: 12, alignItems: 'end' }}>
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Date</div>
              <input type="date" value={newHeure.date} onChange={e => setNewHeure({ ...newHeure, date: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} /></div>
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Type</div>
              <select value={newHeure.type_travail} onChange={e => setNewHeure({ ...newHeure, type_travail: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
              </select></div>
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Heures</div>
              <input type="number" min="0.5" max="12" step="0.5" value={newHeure.duree_heures} onChange={e => setNewHeure({ ...newHeure, duree_heures: Number(e.target.value) })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} /></div>
            <button onClick={addHeure} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 20 }}>+ Ajouter</button>
          </div>
          {heures.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: '1rem' }}>Aucune heure saisie</div>
          ) : heures.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#888', minWidth: 80 }}>{new Date(h.date_travail).toLocaleDateString('fr-FR')}</span>
              <span style={{ fontSize: 13, color: '#2D3748', flex: 1 }}>{typeLabels[h.type_travail] || h.type_travail}</span>
              <span style={{ fontSize: 13, color: '#555' }}>{h.salaries?.prenom} {h.salaries?.nom}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748', minWidth: 40 }}>{h.duree_heures} h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}