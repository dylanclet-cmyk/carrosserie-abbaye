'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NouveauDossier() {
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(false)
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
    }
    load()
  }, [])

  async function handleSubmit() {
    setLoading(true)
    const { data: client } = await supabase.from('clients').insert({
      nom: form.client_nom,
      prenom: form.client_prenom,
      telephone: form.client_telephone,
      email: form.client_email,
      assurance: form.client_assurance,
      num_police: form.client_num_police,
    }).select().single()

    const numero = '2026-' + String(Math.floor(Math.random() * 900) + 100)

    const { data: dossier } = await supabase.from('dossiers').insert({
      numero_dossier: numero,
      immatriculation: form.immatriculation.toUpperCase(),
      marque: form.marque,
      modele: form.modele,
      couleur: form.couleur,
      km_entree: parseInt(form.km_entree) || 0,
      carburant_entree: form.carburant_entree,
      date_entree: form.date_entree,
      devis_montant: parseFloat(form.devis_montant) || 0,
      heures_estimees: parseFloat(form.heures_estimees) || 0,
      client_id: client?.id,
      salarie_id: salarie?.id,
      statut: 'en_attente_signature',
    }).select().single()

    setLoading(false)
    if (dossier) router.push('/dossier/' + dossier.id)
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 14, color: '#2D3748', background: 'white' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 4 }

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
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Vehicule</div>
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
            <div><label style={labelStyle}>Date d entree</label><input style={inputStyle} type="date" value={form.date_entree} onChange={e => set('date_entree', e.target.value)} /></div>
            <div><label style={labelStyle}>Devis (€) — optionnel</label><input style={inputStyle} type="number" value={form.devis_montant} onChange={e => set('devis_montant', e.target.value)} placeholder="950" /></div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Temps estime du chantier</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Entrez le nombre d heures prevu pour ce chantier. Le technicien verra sa progression en temps reel.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input style={{ ...inputStyle, maxWidth: 160, fontSize: 18, fontWeight: 700, textAlign: 'center' as const }} type="number" min="0.5" step="0.5" value={form.heures_estimees} onChange={e => set('heures_estimees', e.target.value)} placeholder="8" />
            <span style={{ fontSize: 16, color: '#2D3748', fontWeight: 500 }}>heures estimees</span>
          </div>
          {form.heures_estimees && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FDF0E6', borderRadius: 8, border: '1px solid #E07B2A', fontSize: 13, color: '#854F0B' }}>
              Le technicien aura {form.heures_estimees}h pour ce chantier. Une alerte s affichera s il depasse.
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
