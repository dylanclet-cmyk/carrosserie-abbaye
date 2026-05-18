'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NouveauDossier() {
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [vehicules, setVehicules] = useState<any[]>([])
  const [prets, setPrets] = useState<any[]>([])
  const [form, setForm] = useState({
    immatriculation: '',
    marque: '',
    modele: '',
    couleur: '',
    km_entree: '',
    carburant_entree: '3/4',
    date_entree: new Date().toISOString().split('T')[0],
    devis_montant: '',
    heures_estimees: '',
    client_nom: '',
    client_prenom: '',
    client_telephone: '',
    client_email: '',
    client_assurance: '',
    client_num_police: '',
    vehicule_courtoisie_id: '',
    courtoisie_date_debut: new Date().toISOString().split('T')[0],
    courtoisie_date_retour: '',
    courtoisie_km_depart: '',
    courtoisie_carburant: '3/4',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      if (sal?.role !== 'chef_atelier') { router.push('/'); return }
      setSalarie(sal)
      const { data: v } = await supabase.from('vehicules_courtoisie').select('*').eq('actif', true).order('immatriculation')
      setVehicules(v || [])
      const { data: p } = await supabase.from('prets_courtoisie').select('*').eq('statut', 'en_cours')
      setPrets(p || [])
    }
    load()
  }, [])

  function getDisponibilite(vehiculeId: string): { dispo: boolean, message: string } {
    if (!form.courtoisie_date_debut || !form.courtoisie_date_retour) {
      return { dispo: true, message: 'Choisissez des dates pour verifier la disponibilite' }
    }
    const debut = new Date(form.courtoisie_date_debut)
    const fin = new Date(form.courtoisie_date_retour)
    const conflit = prets.find(p => {
      if (p.vehicule_id !== vehiculeId) return false
      const pretDebut = new Date(p.date_debut)
      const pretFin = new Date(p.date_fin_prevue)
      return debut <= pretFin && fin >= pretDebut
    })
    if (conflit) {
      return { dispo: false, message: 'Indisponible du ' + new Date(conflit.date_debut).toLocaleDateString('fr-FR') + ' au ' + new Date(conflit.date_fin_prevue).toLocaleDateString('fr-FR') }
    }
    return { dispo: true, message: 'Disponible pour ces dates' }
  }

  async function handleSubmit() {
    if (form.vehicule_courtoisie_id) {
      const dispo = getDisponibilite(form.vehicule_courtoisie_id)
      if (!dispo.dispo) {
        alert('Ce vehicule nest pas disponible sur les dates selectionnees !')
        return
      }
    }
    setLoading(true)
    const { data: client } = await supabase.from('clients').insert({
      nom: form.client_nom, prenom: form.client_prenom,
      telephone: form.client_telephone, email: form.client_email,
      assurance: form.client_assurance, num_police: form.client_num_police,
    }).select().single()

    const numero = '2026-' + String(Math.floor(Math.random() * 900) + 100)
    const { data: dossier } = await supabase.from('dossiers').insert({
      numero_dossier: numero,
      immatriculation: form.immatriculation.toUpperCase(),
      marque: form.marque, modele: form.modele, couleur: form.couleur,
      km_entree: parseInt(form.km_entree) || 0,
      carburant_entree: form.carburant_entree,
      date_entree: form.date_entree,
      devis_montant: parseFloat(form.devis_montant) || 0,
      heures_estimees: parseFloat(form.heures_estimees) || 0,
      client_id: client?.id,
      salarie_id: salarie?.id,
      statut: 'en_attente_signature',
    }).select().single()

    if (form.vehicule_courtoisie_id && form.courtoisie_date_retour && dossier) {
      await supabase.from('prets_courtoisie').insert({
        vehicule_id: form.vehicule_courtoisie_id,
        dossier_id: dossier.id,
        client_id: client?.id,
        date_debut: form.courtoisie_date_debut,
        date_fin_prevue: form.courtoisie_date_retour,
        km_depart: parseInt(form.courtoisie_km_depart) || 0,
        carburant_depart: form.courtoisie_carburant,
        statut: 'en_cours'
      })
    }

    setLoading(false)
    if (dossier) router.push('/dossier/' + dossier.id)
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 14, color: '#2D3748', background: 'white' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 4 }
  const selectedVehicule = vehicules.find(v => v.id === form.vehicule_courtoisie_id)
  const selectedDispo = selectedVehicule ? getDisponibilite(selectedVehicule.id) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2D3748', marginBottom: 24 }}>Nouveau dossier</h1>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Informations client</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={form.client_nom} onChange={e => set('client_nom', e.target.value)} placeholder="Bernard" /></div>
            <div><label style={labelStyle}>Prenom</label><input style={inputStyle} value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} placeholder="Pierre" /></div>
            <div><label style={labelStyle}>Telephone</label><input style={inputStyle} value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} placeholder="06 12 34 56 78" /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@exemple.fr" /></div>
            <div><label style={labelStyle}>Assurance</label><input style={inputStyle} value={form.client_assurance} onChange={e => set('client_assurance', e.target.value)} placeholder="MAIF" /></div>
            <div><label style={labelStyle}>N police</label><input style={inputStyle} value={form.client_num_police} onChange={e => set('client_num_police', e.target.value)} placeholder="88421" /></div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Vehicule client</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Immatriculation</label><input style={inputStyle} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)} placeholder="AB-123-CD" /></div>
            <div><label style={labelStyle}>Marque</label><input style={inputStyle} value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Citroen" /></div>
            <div><label style={labelStyle}>Modele</label><input style={inputStyle} value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="C3" /></div>
            <div><label style={labelStyle}>Couleur</label><input style={inputStyle} value={form.couleur} onChange={e => set('couleur', e.target.value)} placeholder="Rouge" /></div>
            <div><label style={labelStyle}>Kilometrage entree</label><input style={inputStyle} type="number" value={form.km_entree} onChange={e => set('km_entree', e.target.value)} placeholder="47230" /></div>
            <div><label style={labelStyle}>Carburant entree</label>
              <select style={inputStyle} value={form.carburant_entree} onChange={e => set('carburant_entree', e.target.value)}>
                <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
              </select>
            </div>
            <div><label style={labelStyle}>Date entree</label><input style={inputStyle} type="date" value={form.date_entree} onChange={e => set('date_entree', e.target.value)} /></div>
            <div><label style={labelStyle}>Devis (€)</label><input style={inputStyle} type="number" value={form.devis_montant} onChange={e => set('devis_montant', e.target.value)} placeholder="950" /></div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Temps estime</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input style={{ ...inputStyle, maxWidth: 160, fontSize: 18, fontWeight: 700, textAlign: 'center' as const }} type="number" min="0.5" step="0.5" value={form.heures_estimees} onChange={e => set('heures_estimees', e.target.value)} placeholder="8" />
            <span style={{ fontSize: 16, color: '#2D3748', fontWeight: 500 }}>heures estimees</span>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Vehicule de courtoisie</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Choisissez d abord les dates puis selectionnez un vehicule — la disponibilite sera verifiee automatiquement</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label style={labelStyle}>Date de debut du pret</label><input style={inputStyle} type="date" value={form.courtoisie_date_debut} onChange={e => set('courtoisie_date_debut', e.target.value)} /></div>
            <div><label style={labelStyle}>Date de retour prevue</label><input style={inputStyle} type="date" value={form.courtoisie_date_retour} onChange={e => set('courtoisie_date_retour', e.target.value)} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Choisir un vehicule</label>
            <select style={inputStyle} value={form.vehicule_courtoisie_id} onChange={e => set('vehicule_courtoisie_id', e.target.value)}>
              <option value="">-- Pas de vehicule de courtoisie --</option>
              {vehicules.map(v => {
                const dispo = getDisponibilite(v.id)
                return <option key={v.id} value={v.id} disabled={!dispo.dispo}>
                  {dispo.dispo ? '✓' : '✗'} {v.immatriculation} — {v.marque} {v.modele} {v.couleur ? '(' + v.couleur + ')' : ''} — {dispo.dispo ? 'Disponible' : 'Indisponible'}
                </option>
              })}
            </select>
          </div>

          {form.vehicule_courtoisie_id && selectedDispo && (
            <div style={{ padding: '10px 14px', background: selectedDispo.dispo ? '#EAF3DE' : '#FCEBEB', borderRadius: 8, border: '1px solid ' + (selectedDispo.dispo ? '#97C459' : '#E24B4A'), fontSize: 13, color: selectedDispo.dispo ? '#27500A' : '#791F1F', marginBottom: 12 }}>
              {selectedDispo.dispo ? '✓ ' : '✗ '}{selectedDispo.message}
            </div>
          )}

          {form.vehicule_courtoisie_id && selectedDispo?.dispo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {selectedVehicule && (
                <div style={{ gridColumn: 'span 2', padding: '10px 14px', background: '#f8f6f3', borderRadius: 8, fontSize: 13, color: '#2D3748' }}>
                  <strong>{selectedVehicule.immatriculation}</strong> — {selectedVehicule.marque} {selectedVehicule.modele} — {selectedVehicule.km_actuel?.toLocaleString()} km actuels
                </div>
              )}
              <div><label style={labelStyle}>Kilometrage depart</label><input style={inputStyle} type="number" value={form.courtoisie_km_depart} onChange={e => set('courtoisie_km_depart', e.target.value)} placeholder={selectedVehicule?.km_actuel?.toString() || ''} /></div>
              <div><label style={labelStyle}>Carburant depart</label>
                <select style={inputStyle} value={form.courtoisie_carburant} onChange={e => set('courtoisie_carburant', e.target.value)}>
                  <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {loading ? 'Creation...' : 'Creer le dossier'}
          </button>
        </div>
      </div>
    </div>
  )
}