'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

function OrdreReparation({ dossierId, dossier, onUpdate }: { dossierId: string, dossier: any, onUpdate: (d: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Veuillez selectionner un fichier PDF'); return }
    setUploading(true)
    const path = dossierId + '/' + Date.now() + '_' + file.name
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (error) { console.error(error); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('dossiers').update({ ordre_reparation_url: urlData.publicUrl, ordre_reparation_nom: file.name }).eq('id', dossierId)
    onUpdate({ ...dossier, ordre_reparation_url: urlData.publicUrl, ordre_reparation_nom: file.name })
    setUploading(false)
  }
  async function handleDelete() {
    if (!confirm('Supprimer ce document ?')) return
    await supabase.from('dossiers').update({ ordre_reparation_url: null, ordre_reparation_nom: null }).eq('id', dossierId)
    onUpdate({ ...dossier, ordre_reparation_url: null, ordre_reparation_nom: null })
  }
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Ordre de reparation expert</div>
      {dossier.ordre_reparation_url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>📄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{dossier.ordre_reparation_nom}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>PDF importe</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={dossier.ordre_reparation_url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 8, border: '2px solid #E07B2A', background: 'white', cursor: 'pointer', fontSize: 13, color: '#E07B2A', fontWeight: 600, textDecoration: 'none' }}>Ouvrir PDF</a>
            <button onClick={handleDelete} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#888' }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1.5rem', border: '1.5px dashed #e8e2d9', borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer', background: '#f8f6f3' }}>
          <span style={{ fontSize: 32 }}>📄</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748' }}>{uploading ? 'Import en cours...' : 'Importer le rapport expert (PDF)'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Cliquez pour selectionner un fichier PDF</div>
          <input type="file" accept="application/pdf" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      )}
    </div>
  )
}

function EtatsLieux({ dossierId, router }: { dossierId: string, router: any }) {
  const [etats, setEtats] = useState<any[]>([])
  const supabase = createClient()
  useEffect(() => {
    supabase.from('etats_lieux').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false }).then(({ data }) => setEtats(data || []))
  }, [])
  if (etats.length === 0) return null
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Etats des lieux vehicule client</div>
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

function VehiculeCourtoisie({ dossierId, router }: { dossierId: string, router: any }) {
  const [pret, setPret] = useState<any>(null)
  const [etatsCourtoisie, setEtatsCourtoisie] = useState<any[]>([])
  const supabase = createClient()
  useEffect(() => {
    supabase.from('prets_courtoisie').select('*, vehicules_courtoisie(*)').eq('dossier_id', dossierId).single().then(({ data }) => {
      if (data) {
        setPret(data)
        supabase.from('etats_lieux_courtoisie').select('*').eq('pret_id', data.id).order('created_at').then(({ data: e }) => setEtatsCourtoisie(e || []))
      }
    })
  }, [])
  if (!pret) return null
  const today = new Date().toISOString().split('T')[0]
  const enRetard = pret.statut === 'en_cours' && pret.date_fin_prevue < today
  const aEtatDepart = etatsCourtoisie.find(e => e.type === 'depart')
  const aEtatRetour = etatsCourtoisie.find(e => e.type === 'retour')
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: enRetard ? '2px solid #E24B4A' : '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Vehicule de courtoisie</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748' }}>{pret.vehicules_courtoisie?.immatriculation} — {pret.vehicules_courtoisie?.marque} {pret.vehicules_courtoisie?.modele}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Du {new Date(pret.date_debut).toLocaleDateString('fr-FR')} au {new Date(pret.date_fin_prevue).toLocaleDateString('fr-FR')}{pret.km_depart > 0 && <span> · {pret.km_depart?.toLocaleString()} km · {pret.carburant_depart}</span>}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: pret.statut === 'rendu' ? '#EAF3DE' : enRetard ? '#FCEBEB' : '#FAEEDA', color: pret.statut === 'rendu' ? '#27500A' : enRetard ? '#791F1F' : '#854F0B' }}>
          {pret.statut === 'rendu' ? 'Rendu' : enRetard ? 'En retard' : 'En pret'}
        </span>
      </div>
      {enRetard && <div style={{ padding: '8px 12px', background: '#FCEBEB', borderRadius: 8, fontSize: 13, color: '#791F1F', fontWeight: 600, marginBottom: 12 }}>Retour prevu le {new Date(pret.date_fin_prevue).toLocaleDateString('fr-FR')} — vehicule en retard !</div>}
      {etatsCourtoisie.map(e => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: e.type === 'depart' ? '#FAEEDA' : '#EAF3DE', color: e.type === 'depart' ? '#854F0B' : '#27500A' }}>{e.type === 'depart' ? 'Depart' : 'Retour'}</span>
          <span style={{ fontSize: 12, color: '#2D3748', flex: 1 }}>{e.dommages?.length || 0} dommage{e.dommages?.length > 1 ? 's' : ''} · {e.km_releve?.toLocaleString()} km · {e.carburant}</span>
          <span style={{ fontSize: 11, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('fr-FR')}</span>
          {e.signature_client && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>Signe</span>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 8 }}>
        {!aEtatDepart && <button onClick={() => router.push('/courtoisie/etat?pret=' + pret.id + '&type=depart')} style={{ padding: '8px 16px', borderRadius: 8, border: '2px solid #E07B2A', background: '#E07B2A', cursor: 'pointer', fontSize: 13, color: 'white', fontWeight: 700 }}>Etat des lieux depart</button>}
        {aEtatDepart && !aEtatRetour && pret.statut !== 'rendu' && <button onClick={() => router.push('/courtoisie/etat?pret=' + pret.id + '&type=retour')} style={{ padding: '12px 20px', borderRadius: 10, border: '2px solid #3B6D11', background: '#3B6D11', cursor: 'pointer', fontSize: 14, color: 'white', fontWeight: 700, width: '100%', marginTop: 8 }}>Etat des lieux retour</button>}
        {aEtatDepart && <span style={{ fontSize: 12, color: '#3B6D11', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Depart effectue</span>}
        {aEtatRetour && <span style={{ fontSize: 12, color: '#3B6D11', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Retour effectue</span>}
      </div>
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

function TravauxDetails({ dossierId, onStatsChange }: { dossierId: string, onStatsChange?: (fait: number, total: number) => void }) {
  const [travaux, setTravaux] = useState<any[]>([])
  const [newTravail, setNewTravail] = useState('')
  const supabase = createClient()
  useEffect(() => { supabase.from('travaux_details').select('*').eq('dossier_id', dossierId).order('ordre').then(({ data }) => { setTravaux(data || []); if (onStatsChange) onStatsChange((data || []).filter((t: any) => t.fait).length, (data || []).length) }) }, [])
  async function addTravail() {
    if (!newTravail.trim()) return
    const { data } = await supabase.from('travaux_details').insert({ dossier_id: dossierId, libelle: newTravail, ordre: travaux.length }).select().single()
    if (data) { const newList = [...travaux, data]; setTravaux(newList); setNewTravail(''); if (onStatsChange) onStatsChange(newList.filter(t => t.fait).length, newList.length) }
  }
  async function toggleTravail(t: any) {
    await supabase.from('travaux_details').update({ fait: !t.fait }).eq('id', t.id)
    const newList = travaux.map(x => x.id === t.id ? { ...x, fait: !x.fait } : x); setTravaux(newList); if (onStatsChange) onStatsChange(newList.filter(x => x.fait).length, newList.length)
  }
  async function deleteTravail(id: string) {
    await supabase.from('travaux_details').delete().eq('id', id)
    const newList = travaux.filter(t => t.id !== id); setTravaux(newList); if (onStatsChange) onStatsChange(newList.filter(t => t.fait).length, newList.length)
  }
  const fait = travaux.filter(t => t.fait).length
  const total = travaux.length
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Travaux a realiser</div>
        {total > 0 && <span style={{ fontSize: 12, color: fait === total ? '#27500A' : '#888' }}>{fait}/{total} termines</span>}
      </div>
      {total > 0 && <div style={{ height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}><div style={{ height: '100%', width: (fait / total * 100) + '%', background: fait === total ? '#3B6D11' : '#E07B2A', borderRadius: 3 }} /></div>}
      {travaux.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
          <input type="checkbox" checked={t.fait} onChange={() => toggleTravail(t)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E07B2A' }} />
          <span style={{ fontSize: 13, color: t.fait ? '#888' : '#2D3748', textDecoration: t.fait ? 'line-through' : 'none', flex: 1 }}>{t.libelle}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: t.fait ? '#EAF3DE' : '#FAEEDA', color: t.fait ? '#27500A' : '#854F0B' }}>{t.fait ? 'Fait' : 'A faire'}</span>
          <button onClick={() => deleteTravail(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={newTravail} onChange={e => setNewTravail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTravail()} placeholder="Ex : Debosselage aile avant..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
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
  useEffect(() => { supabase.from('pieces').select('*').eq('dossier_id', dossierId).order('created_at').then(({ data }) => setPieces(data || [])) }, [])
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
  const statutColors: any = { a_commander: { label: 'A commander', color: '#A32D2D', bg: '#FCEBEB' }, commandee: { label: 'Commandee', color: '#854F0B', bg: '#FAEEDA' }, recue: { label: 'Recue', color: '#27500A', bg: '#EAF3DE' } }
  const aCommander = pieces.filter(p => p.statut === 'a_commander').length
  const commandees = pieces.filter(p => p.statut === 'commandee').length
  const recues = pieces.filter(p => p.statut === 'recue').length
  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }
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
      {pieces.length === 0 && !showForm && <div style={{ textAlign: 'center' as const, color: '#888', fontSize: 13, padding: '1rem' }}>Aucune piece</div>}
      {pieces.map(p => {
        const sc = statutColors[p.statut]
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{p.libelle}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.reference && <span>Ref : {p.reference} · </span>}Qte : {p.quantite}{p.date_commande && <span> · Commande le {new Date(p.date_commande).toLocaleDateString('fr-FR')}</span>}{p.date_reception && <span> · Recu le {new Date(p.date_reception).toLocaleDateString('fr-FR')}</span>}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
              {p.statut === 'a_commander' && <button onClick={() => updateStatut(p.id, 'commandee')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #E07B2A', background: 'white', cursor: 'pointer', color: '#E07B2A', fontWeight: 600 }}>Marquer commandee</button>}
              {p.statut === 'commandee' && <button onClick={() => updateStatut(p.id, 'recue')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #3B6D11', background: 'white', cursor: 'pointer', color: '#3B6D11', fontWeight: 600 }}>Marquer recue</button>}
              <button onClick={() => deletePiece(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 4px' }}>×</button>
            </div>
          </div>
        )
      })}
      {showForm && (
        <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '12px', marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px', gap: 8, marginBottom: 8 }}>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Designation</div><input value={newPiece.libelle} onChange={e => setNewPiece({ ...newPiece, libelle: e.target.value })} placeholder="Ex : Aile avant gauche..." style={inputStyle} /></div>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Reference</div><input value={newPiece.reference} onChange={e => setNewPiece({ ...newPiece, reference: e.target.value })} placeholder="REF-123" style={inputStyle} /></div>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Qte</div><input type="number" min="1" value={newPiece.quantite} onChange={e => setNewPiece({ ...newPiece, quantite: Number(e.target.value) })} style={inputStyle} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#888' }}>Annuler</button>
            <button onClick={addPiece} style={{ flex: 1, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Ajouter</button>
          </div>
        </div>
      )}
      {!showForm && <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px dashed #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#888', marginTop: 4 }}>+ Ajouter une piece</button>}
    </div>
  )
}

export default function DossierPage() {
  const [dossier, setDossier] = useState<any>(null)
  const [heures, setHeures] = useState<any[]>([])
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [salariesenArret, setSalariesEnArret] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newHeure, setNewHeure] = useState({ date: new Date().toISOString().split('T')[0], type_travail: 'debosselage', duree_heures: 2 })
  const [showTerminer, setShowTerminer] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [terminating, setTerminating] = useState(false)
  const [terminated, setTerminated] = useState(false)
  const [travauxFait, setTravauxFait] = useState(0)
  const [travauxTotal, setTravauxTotal] = useState(0)
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
        // Vérifier qui est en arrêt aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        const { data: arrets } = await supabase.from('conges').select('salarie_id').eq('statut', 'accepte').eq('type', 'maladie').lte('date_debut', today).gte('date_fin', today)
        setSalariesEnArret((arrets || []).map((a: any) => a.salarie_id))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function addHeure() {
    const { data } = await supabase.from('heures').insert({ dossier_id: params.id, salarie_id: salarie.id, date_travail: newHeure.date, type_travail: newHeure.type_travail, duree_heures: newHeure.duree_heures }).select('*, salaries(*)').single()
    if (data) setHeures([data, ...heures])
  }
  async function updateStatut(statut: string) {
    await supabase.from('dossiers').update({ statut }).eq('id', params.id)
    setDossier({ ...dossier, statut })
  }
  async function assignerTechnicien(salarie_id: string) {
    if (!salarie_id) {
      await supabase.from('dossiers').update({ salarie_id: null }).eq('id', params.id)
      setDossier({ ...dossier, salarie_id: null, salaries: null })
      return
    }
    if (salariesenArret.includes(salarie_id)) {
      alert('Ce technicien est actuellement en arret maladie ! Choisissez un autre technicien.')
      return
    }
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
  router.push('/avis?dossier=' + params.id)
}
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

  const totalHeures = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
  const heuresEstimees = Number(dossier.heures_estimees) || 0
  const estTermine = ['pret_restituer', 'termine', 'facture'].includes(dossier.statut)
  const typeLabels: any = { debosselage: 'Debosselage', peinture: 'Peinture', remplacement_piece: 'Remplacement piece', finition: 'Finition', controle_qualite: 'Controle qualite', autre: 'Autre' }
  const statusOptions = [
    { value: 'en_attente_signature', label: 'En attente signature' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'pret_restituer', label: 'Pret a restituer' },
    { value: 'termine', label: 'Termine' },
    { value: 'facture', label: 'Facture' },
  ]
  const statusColors: any = { en_attente_signature: { color: '#854F0B', bg: '#FAEEDA' }, en_cours: { color: '#0C447C', bg: '#E6F1FB' }, pret_restituer: { color: '#27500A', bg: '#EAF3DE' }, termine: { color: '#444441', bg: '#F1EFE8' }, facture: { color: '#3C3489', bg: '#EEEDFE' } }
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
        {terminated && <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16, color: '#27500A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 20 }}>✓</span> Chantier termine !</div>}

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
                    {salaries.map(s => (
                      <option key={s.id} value={s.id} disabled={salariesenArret.includes(s.id)}>
                        {salariesenArret.includes(s.id) ? '🔴 ' : '✓ '}{s.prenom} {s.nom}{salariesenArret.includes(s.id) ? ' — EN ARRET MALADIE' : ''}
                      </option>
                    ))}
                  </select>
                  {salariesenArret.length > 0 && (
                    <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 4 }}>
                      🔴 {salariesenArret.length} technicien{salariesenArret.length > 1 ? 's' : ''} en arret maladie aujourd hui
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Infos chantier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures saisies</div><div style={{ fontSize: 22, fontWeight: 600, color: '#2D3748' }}>{totalHeures} h</div></div>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures estimees</div><div style={{ fontSize: 22, fontWeight: 600, color: '#E07B2A' }}>{heuresEstimees > 0 ? heuresEstimees + ' h' : '—'}</div></div>
              {dossier.salaries && (
                <div style={{ background: salariesenArret.includes(dossier.salarie_id) ? '#FCEBEB' : '#f8f6f3', borderRadius: 8, padding: '0.75rem', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Technicien assigne</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: salariesenArret.includes(dossier.salarie_id) ? '#A32D2D' : '#2D3748' }}>
                    {salariesenArret.includes(dossier.salarie_id) ? '🔴 ' : ''}{dossier.salaries.prenom} {dossier.salaries.nom}
                    {salariesenArret.includes(dossier.salarie_id) && <span style={{ fontSize: 11, marginLeft: 8, color: '#A32D2D' }}>EN ARRET</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <OrdreReparation dossierId={params.id as string} dossier={dossier} onUpdate={setDossier} />
        <ProgressionHeures totalHeures={totalHeures} heuresEstimees={heuresEstimees} />
        <VehiculeCourtoisie dossierId={params.id as string} router={router} />
        <TravauxDetails dossierId={params.id as string} onStatsChange={(fait, total) => { setTravauxFait(fait); setTravauxTotal(total) }} />
        <SuiviPieces dossierId={params.id as string} />

        {!estTermine && salarie?.role === 'technicien' && !showTerminer && (
          <div style={{ marginBottom: 16 }}>
            {travauxTotal > 0 && travauxFait < travauxTotal && (
              <div style={{ background: '#FAEEDA', border: '1px solid #E07B2A', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#854F0B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <strong>Attention :</strong> {travauxTotal - travauxFait} tache{travauxTotal - travauxFait > 1 ? 's' : ''} non effectuee{travauxTotal - travauxFait > 1 ? 's' : ''} sur {travauxTotal} — veuillez les cocher avant de terminer
              </div>
            )}
            <button onClick={() => { if (travauxTotal > 0 && travauxFait < travauxTotal) { alert('Attention ! ' + (travauxTotal - travauxFait) + ' tache(s) non effectuee(s). Veuillez cocher toutes les taches avant de terminer le chantier.'); return }; setShowTerminer(true) }} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #3B6D11', background: '#EAF3DE', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ✓ Terminer le chantier et prevenir le chef
            </button>
          </div>
        )}

        {showTerminer && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '2px solid #3B6D11', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#27500A', marginBottom: 12 }}>Terminer le chantier</div>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Note pour le chef..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', minHeight: 80, resize: 'vertical' as const, fontFamily: 'system-ui' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowTerminer(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748' }}>Annuler</button>
              <button onClick={terminerChantier} disabled={terminating} style={{ flex: 1, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3B6D11', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{terminating ? 'En cours...' : '✓ Confirmer'}</button>
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
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Date</div><input type="date" value={newHeure.date} onChange={e => setNewHeure({ ...newHeure, date: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} /></div>
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Type</div><select value={newHeure.type_travail} onChange={e => setNewHeure({ ...newHeure, type_travail: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}</select></div>
            <div><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Heures</div><input type="number" min="0.5" max="12" step="0.5" value={newHeure.duree_heures} onChange={e => setNewHeure({ ...newHeure, duree_heures: Number(e.target.value) })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} /></div>
            <button onClick={addHeure} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 20 }}>+ Ajouter</button>
          </div>
          {heures.length === 0 ? <div style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: '1rem' }}>Aucune heure saisie</div>
            : heures.map(h => (
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