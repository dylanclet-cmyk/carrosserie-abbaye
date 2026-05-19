'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PassageRapide() {
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedData, setSavedData] = useState<any>(null)
  const [form, setForm] = useState({
    client_nom: '',
    client_prenom: '',
    client_telephone: '',
    immatriculation: '',
    marque: '',
    modele: '',
    description: '',
    duree_minutes: '30',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
    }
    load()
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.client_nom || !form.immatriculation || !form.description) {
      alert('Veuillez remplir au minimum le nom client, l immatriculation et la description des travaux.')
      return
    }
    setLoading(true)

    // Créer client
    const { data: client } = await supabase.from('clients').insert({
      nom: form.client_nom,
      prenom: form.client_prenom,
      telephone: form.client_telephone,
    }).select().single()

    // Créer dossier passage rapide
    const numero = 'PR-' + Date.now().toString().slice(-6)
    const { data: dossier } = await supabase.from('dossiers').insert({
      numero_dossier: numero,
      immatriculation: form.immatriculation.toUpperCase(),
      marque: form.marque,
      modele: form.modele,
      couleur: '',
      km_entree: 0,
      carburant_entree: '3/4',
      date_entree: new Date().toISOString().split('T')[0],
      client_id: client?.id,
      salarie_id: salarie?.id,
      statut: 'pret_restituer',
      notes: form.description,
      heures_estimees: parseFloat(form.duree_minutes) / 60,
    }).select().single()

    // Enregistrer les heures
    if (dossier) {
      await supabase.from('heures').insert({
        dossier_id: dossier.id,
        salarie_id: salarie?.id,
        date_travail: new Date().toISOString().split('T')[0],
        type_travail: 'autre',
        duree_heures: parseFloat(form.duree_minutes) / 60,
      })

      // Ajouter le travail dans travaux_details
      await supabase.from('travaux_details').insert({
        dossier_id: dossier.id,
        libelle: form.description,
        fait: true,
        ordre: 0,
      })
    }

    setSavedData({ dossier, client })
    setSaved(true)
    setLoading(false)
  }

  function reset() {
    setForm({ client_nom: '', client_prenom: '', client_telephone: '', immatriculation: '', marque: '', modele: '', description: '', duree_minutes: '30' })
    setSaved(false)
    setSavedData(null)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e8e2d9', fontSize: 14, color: '#2D3748', background: 'white' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 5, fontWeight: 600 }

  const dureeOptions = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '45', label: '45 min' },
    { value: '60', label: '1h' },
    { value: '90', label: '1h30' },
    { value: '120', label: '2h' },
    { value: '180', label: '3h' },
    { value: '240', label: '4h' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Passage rapide atelier</span>
        {salarie && <span style={{ fontSize: 12, color: '#a0aec0' }}>— {salarie.prenom} {salarie.nom}</span>}
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 640, margin: '0 auto' }}>

        {saved && savedData ? (
          <div>
            <div style={{ background: '#EAF3DE', border: '2px solid #3B6D11', borderRadius: 16, padding: '2rem', textAlign: 'center' as const, marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#27500A', marginBottom: 8 }}>Passage enregistre !</div>
              <div style={{ fontSize: 14, color: '#3B6D11', marginBottom: 4 }}>
                {form.client_prenom} {form.client_nom} — {form.immatriculation.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{form.description}</div>
              <div style={{ fontSize: 13, color: '#555' }}>Duree : {form.duree_minutes} min</div>
              <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 8, fontWeight: 600 }}>
                Dossier N° {savedData.dossier?.numero_dossier} — Statut : Pret a facturer
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reset} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '2px solid #E07B2A', background: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#E07B2A' }}>
                + Nouveau passage
              </button>
              <button onClick={() => router.push('/dossier/' + savedData.dossier?.id)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#2D3748', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'white' }}>
                Voir le dossier
              </button>
              <button onClick={() => router.push('/avis?dossier=' + savedData.dossier?.id)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#E07B2A', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'white' }}>
                ⭐ Laisser un avis
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 20, fontSize: 13, color: '#854F0B', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              Passage rapide — le dossier sera directement marque <strong>Pret a facturer</strong>
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Client</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input style={inputStyle} value={form.client_nom} onChange={e => set('client_nom', e.target.value)} placeholder="Bernard" autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Prenom</label>
                  <input style={inputStyle} value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} placeholder="Pierre" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Telephone</label>
                  <input style={inputStyle} value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} placeholder="06 12 34 56 78" />
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Vehicule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Immatriculation *</label>
                  <input style={{ ...inputStyle, textTransform: 'uppercase' as const, fontWeight: 700, fontSize: 16 }} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)} placeholder="AB-123-CD" />
                </div>
                <div>
                  <label style={labelStyle}>Marque</label>
                  <input style={inputStyle} value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Renault" />
                </div>
                <div>
                  <label style={labelStyle}>Modele</label>
                  <input style={inputStyle} value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Clio" />
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Travaux effectues</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description des travaux *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Ex : Remplacement ampoule feu arriere gauche, gonflage pneus, verification niveau huile..."
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' as const, fontFamily: 'system-ui' }} />
              </div>
              <div>
                <label style={labelStyle}>Temps passe</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {dureeOptions.map(opt => (
                    <button key={opt.value} onClick={() => set('duree_minutes', opt.value)} style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid ' + (form.duree_minutes === opt.value ? '#E07B2A' : '#e8e2d9'), background: form.duree_minutes === opt.value ? '#E07B2A' : 'white', color: form.duree_minutes === opt.value ? 'white' : '#2D3748', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '18px', borderRadius: 14, border: 'none', background: loading ? '#ccc' : '#3B6D11', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? 'Enregistrement...' : (
                <>
                  <span style={{ fontSize: 22 }}>✓</span>
                  Valider le passage — {dureeOptions.find(d => d.value === form.duree_minutes)?.label}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}