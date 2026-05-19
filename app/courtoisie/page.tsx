'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CourtoisePage() {
  const [vehicules, setVehicules] = useState<any[]>([])
  const [prets, setPrets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVehicule, setShowAddVehicule] = useState(false)
  const [showAddPret, setShowAddPret] = useState(false)
  const [selectedVehicule, setSelectedVehicule] = useState<any>(null)
  const [dossiers, setDossiers] = useState<any[]>([])
  const [newVehicule, setNewVehicule] = useState({ immatriculation: '', marque: '', modele: '', couleur: '', annee: '', km_actuel: '' })
  const [newPret, setNewPret] = useState({ vehicule_id: '', dossier_id: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', km_depart: '', carburant_depart: '3/4', notes: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: v } = await supabase.from('vehicules_courtoisie').select('*').eq('actif', true).order('immatriculation')
      setVehicules(v || [])
      const { data: p } = await supabase.from('prets_courtoisie').select('*, vehicules_courtoisie(*), dossiers(*, clients(*))').order('date_debut', { ascending: false })
      setPrets(p || [])
      const { data: d } = await supabase.from('dossiers').select('*, clients(*)').not('statut', 'eq', 'facture').order('created_at', { ascending: false })
      setDossiers(d || [])
      setLoading(false)
    }
    load()
  }, [])

  async function addVehicule() {
    if (!newVehicule.immatriculation || !newVehicule.marque || !newVehicule.modele) return
    const { data } = await supabase.from('vehicules_courtoisie').insert({
      immatriculation: newVehicule.immatriculation.toUpperCase(),
      marque: newVehicule.marque, modele: newVehicule.modele,
      couleur: newVehicule.couleur, annee: parseInt(newVehicule.annee) || null,
      km_actuel: parseInt(newVehicule.km_actuel) || 0
    }).select().single()
    if (data) { setVehicules([...vehicules, data]); setNewVehicule({ immatriculation: '', marque: '', modele: '', couleur: '', annee: '', km_actuel: '' }); setShowAddVehicule(false) }
  }

  async function addPret() {
    if (!newPret.vehicule_id || !newPret.date_fin_prevue) return
    const dossier = dossiers.find(d => d.id === newPret.dossier_id)
    const { data } = await supabase.from('prets_courtoisie').insert({
      vehicule_id: newPret.vehicule_id,
      dossier_id: newPret.dossier_id || null,
      client_id: dossier?.client_id || null,
      date_debut: newPret.date_debut,
      date_fin_prevue: newPret.date_fin_prevue,
      km_depart: parseInt(newPret.km_depart) || 0,
      carburant_depart: newPret.carburant_depart,
      notes: newPret.notes,
      statut: 'en_cours'
    }).select('*, vehicules_courtoisie(*), dossiers(*, clients(*))').single()
    if (data) { setPrets([data, ...prets]); setShowAddPret(false); setNewPret({ vehicule_id: '', dossier_id: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', km_depart: '', carburant_depart: '3/4', notes: '' }) }
  }

  async function enregistrerRetour(pret: any) {
    const km = prompt('Kilometrage au retour ?')
    const carburant = prompt('Niveau carburant ? (vide/1/4/1/2/3/4/plein)')
    if (!km) return
    await supabase.from('prets_courtoisie').update({
      statut: 'rendu', date_retour: new Date().toISOString().split('T')[0],
      km_retour: parseInt(km), carburant_retour: carburant || '3/4'
    }).eq('id', pret.id)
    await supabase.from('vehicules_courtoisie').update({ km_actuel: parseInt(km) }).eq('id', pret.vehicule_id)
    setPrets(prets.map(p => p.id === pret.id ? { ...p, statut: 'rendu', date_retour: new Date().toISOString().split('T')[0] } : p))
    setVehicules(vehicules.map(v => v.id === pret.vehicule_id ? { ...v, km_actuel: parseInt(km) } : v))
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const pretsEnCours = prets.filter(p => p.statut === 'en_cours')
  const vehiculesDisponibles = vehicules.filter(v => !pretsEnCours.find(p => p.vehicule_id === v.id))
  const vehiculesPretes = vehicules.filter(v => pretsEnCours.find(p => p.vehicule_id === v.id))

  const today = new Date().toISOString().split('T')[0]
  const enRetard = pretsEnCours.filter(p => p.date_fin_prevue < today)

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', background: 'white' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Vehicules de courtoisie</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/courtoisie/planning')} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9', fontSize: 13 }}>Planning</button>
          <button onClick={() => router.push('/courtoisie/pret-direct')} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Nouveau pret</button>
          <button onClick={() => setShowAddVehicule(true)} style={{ background: 'white', color: '#2D3748', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Ajouter vehicule</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 1000, margin: '0 auto' }}>

        {enRetard.length > 0 && (
          <div style={{ background: '#FCEBEB', border: '2px solid #E24B4A', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#791F1F' }}>{enRetard.length} vehicule{enRetard.length > 1 ? 's' : ''} en retard de retour !</div>
              <div style={{ fontSize: 13, color: '#A32D2D' }}>{enRetard.map(p => p.vehicules_courtoisie?.immatriculation + ' — ' + (p.dossiers?.clients?.prenom || '') + ' ' + (p.dossiers?.clients?.nom || '')).join(', ')}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Total flotte</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D3748' }}>{vehicules.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Disponibles</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3B6D11' }}>{vehiculesDisponibles.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>En pret</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E07B2A' }}>{vehiculesPretes.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem', border: enRetard.length > 0 ? '2px solid #E24B4A' : '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>En retard</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: enRetard.length > 0 ? '#A32D2D' : '#888' }}>{enRetard.length}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3748', marginBottom: 10 }}>Flotte ({vehicules.length} vehicules)</div>
            {vehicules.map(v => {
              const pretActif = pretsEnCours.find(p => p.vehicule_id === v.id)
              const enRet = pretActif && pretActif.date_fin_prevue < today
              return (
                <div key={v.id} style={{ background: 'white', borderRadius: 10, padding: '1rem', border: enRet ? '2px solid #E24B4A' : pretActif ? '1px solid #E07B2A' : '1px solid #e8e2d9', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748' }}>{v.immatriculation}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{v.marque} {v.modele} {v.couleur ? '· ' + v.couleur : ''} {v.annee ? '· ' + v.annee : ''}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{v.km_actuel?.toLocaleString()} km</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: pretActif ? (enRet ? '#FCEBEB' : '#FAEEDA') : '#EAF3DE', color: pretActif ? (enRet ? '#791F1F' : '#854F0B') : '#27500A' }}>
                      {pretActif ? (enRet ? 'En retard' : 'En pret') : 'Disponible'}
                    </span>
                  </div>
                  {pretActif && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#f8f6f3', borderRadius: 6, fontSize: 12, color: '#2D3748' }}>
                      {pretActif.dossiers?.clients?.prenom} {pretActif.dossiers?.clients?.nom} · Retour prevu le {new Date(pretActif.date_fin_prevue).toLocaleDateString('fr-FR')}
                      <button onClick={() => enregistrerRetour(pretActif)} style={{ marginLeft: 10, fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #3B6D11', background: 'white', cursor: 'pointer', color: '#3B6D11' }}>Retour</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3748', marginBottom: 10 }}>Prets en cours ({pretsEnCours.length})</div>
            {pretsEnCours.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 10, padding: '2rem', textAlign: 'center' as const, color: '#888', border: '1px solid #e8e2d9' }}>Aucun pret en cours</div>
            ) : pretsEnCours.map(p => {
              const enRet = p.date_fin_prevue < today
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '1rem', border: enRet ? '2px solid #E24B4A' : '1px solid #e8e2d9', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2D3748' }}>{p.vehicules_courtoisie?.immatriculation} — {p.vehicules_courtoisie?.marque} {p.vehicules_courtoisie?.modele}</div>
                    {enRet && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FCEBEB', color: '#791F1F', fontWeight: 600 }}>En retard</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Client : <strong style={{ color: '#2D3748' }}>{p.dossiers?.clients?.prenom} {p.dossiers?.clients?.nom}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    Du {new Date(p.date_debut).toLocaleDateString('fr-FR')} au {new Date(p.date_fin_prevue).toLocaleDateString('fr-FR')}
                  </div>
                  {p.notes && <div style={{ fontSize: 12, color: '#E07B2A', marginTop: 4 }}>{p.notes}</div>}
                  <button onClick={() => enregistrerRetour(p)} style={{ marginTop: 8, fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid #3B6D11', background: 'white', cursor: 'pointer', color: '#3B6D11', fontWeight: 600 }}>Enregistrer le retour</button>
                </div>
              )
            })}
          </div>
        </div>

        {showAddVehicule && (
          <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 480 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', marginBottom: 16 }}>Ajouter un vehicule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Immatriculation</label><input style={inputStyle} value={newVehicule.immatriculation} onChange={e => setNewVehicule({ ...newVehicule, immatriculation: e.target.value })} placeholder="AB-123-CD" /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Marque</label><input style={inputStyle} value={newVehicule.marque} onChange={e => setNewVehicule({ ...newVehicule, marque: e.target.value })} placeholder="Renault" /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Modele</label><input style={inputStyle} value={newVehicule.modele} onChange={e => setNewVehicule({ ...newVehicule, modele: e.target.value })} placeholder="Clio" /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Couleur</label><input style={inputStyle} value={newVehicule.couleur} onChange={e => setNewVehicule({ ...newVehicule, couleur: e.target.value })} placeholder="Blanc" /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Annee</label><input style={inputStyle} type="number" value={newVehicule.annee} onChange={e => setNewVehicule({ ...newVehicule, annee: e.target.value })} placeholder="2022" /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Kilometrage actuel</label><input style={inputStyle} type="number" value={newVehicule.km_actuel} onChange={e => setNewVehicule({ ...newVehicule, km_actuel: e.target.value })} placeholder="25000" /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAddVehicule(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>Annuler</button>
                <button onClick={addVehicule} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {showAddPret && (
          <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 520 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2D3748', marginBottom: 16 }}>Nouveau pret de vehicule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Vehicule disponible</label>
                  <select style={inputStyle} value={newPret.vehicule_id} onChange={e => setNewPret({ ...newPret, vehicule_id: e.target.value })}>
                    <option value="">-- Choisir un vehicule --</option>
                    {vehiculesDisponibles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Dossier client (optionnel)</label>
                  <select style={inputStyle} value={newPret.dossier_id} onChange={e => setNewPret({ ...newPret, dossier_id: e.target.value })}>
                    <option value="">-- Lier a un dossier --</option>
                    {dossiers.map(d => <option key={d.id} value={d.id}>{d.immatriculation} — {d.clients?.prenom} {d.clients?.nom}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Date de debut</label><input style={inputStyle} type="date" value={newPret.date_debut} onChange={e => setNewPret({ ...newPret, date_debut: e.target.value })} /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Retour prevu</label><input style={inputStyle} type="date" value={newPret.date_fin_prevue} onChange={e => setNewPret({ ...newPret, date_fin_prevue: e.target.value })} /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Kilometrage depart</label><input style={inputStyle} type="number" value={newPret.km_depart} onChange={e => setNewPret({ ...newPret, km_depart: e.target.value })} /></div>
                <div><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Carburant depart</label>
                  <select style={inputStyle} value={newPret.carburant_depart} onChange={e => setNewPret({ ...newPret, carburant_depart: e.target.value })}>
                    <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Notes</label><input style={inputStyle} value={newPret.notes} onChange={e => setNewPret({ ...newPret, notes: e.target.value })} placeholder="Notes optionnelles..." /></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAddPret(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>Annuler</button>
                <button onClick={addPret} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Confirmer le pret</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
