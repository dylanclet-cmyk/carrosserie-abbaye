'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PassageRapide() {
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedData, setSavedData] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')
  const [form, setForm] = useState({
    client_nom: '', client_prenom: '', client_telephone: '',
    immatriculation: '', marque: '', modele: '',
    description: '', duree_minutes: '30',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      const { data: c } = await supabase.from('clients').select('*').order('nom')
      setClients(c || [])
    }
    load()
  }, [])

  const filteredClients = clients.filter(c => {
    const q = searchClient.toLowerCase()
    return c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.telephone?.includes(q)
  }).slice(0, 6)

  function selectClient(client: any) {
    setSelectedClient(client)
    setSearchClient(client.prenom + ' ' + client.nom)
    setShowDropdown(false)
    setForm(f => ({ ...f, client_nom: client.nom, client_prenom: client.prenom, client_telephone: client.telephone || '' }))
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.client_nom || !form.immatriculation || !form.description) {
      alert('Veuillez remplir au minimum le nom client, l immatriculation et la description des travaux.')
      return
    }
    setLoading(true)

    let clientId = selectedClient?.id
    if (!clientId) {
      const { data: client } = await supabase.from('clients').insert({
        nom: form.client_nom, prenom: form.client_prenom, telephone: form.client_telephone,
      }).select().single()
      clientId = client?.id
    }

    const numero = 'PR-' + Date.now().toString().slice(-6)
    const { data: dossier } = await supabase.from('dossiers').insert({
      numero_dossier: numero,
      immatriculation: form.immatriculation.toUpperCase(),
      marque: form.marque, modele: form.modele, couleur: '',
      km_entree: 0, carburant_entree: '3/4',
      date_entree: new Date().toISOString().split('T')[0],
      client_id: clientId,
      salarie_id: salarie?.id,
      statut: 'pret_restituer',
      notes: form.description,
      heures_estimees: parseFloat(form.duree_minutes) / 60,
    }).select().single()

    if (dossier) {
      await supabase.from('heures').insert({
        dossier_id: dossier.id, salarie_id: salarie?.id,
        date_travail: new Date().toISOString().split('T')[0],
        type_travail: 'autre', duree_heures: parseFloat(form.duree_minutes) / 60,
      })
      await supabase.from('travaux_details').insert({
        dossier_id: dossier.id, libelle: form.description, fait: true, ordre: 0,
      })
    }

    setSavedData({ dossier })
    setSaved(true)
    setLoading(false)
  }

  function reset() {
    setForm({ client_nom: '', client_prenom: '', client_telephone: '', immatriculation: '', marque: '', modele: '', description: '', duree_minutes: '30' })
    setSelectedClient(null); setSearchClient(''); setClientMode('search')
    setSaved(false); setSavedData(null)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1C2A2F', background: '#FFFFFF' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 5, fontWeight: 600 }

  const dureeOptions = [
    { value: '15', label: '15 min' }, { value: '30', label: '30 min' },
    { value: '45', label: '45 min' }, { value: '60', label: '1h' },
    { value: '90', label: '1h30' }, { value: '120', label: '2h' },
    { value: '180', label: '3h' }, { value: '240', label: '4h' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
        <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Passage rapide atelier</span>
        {salarie && <span style={{ fontSize: 12, color: '#a0aec0' }}>— {salarie.prenom} {salarie.nom}</span>}
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 660, margin: '0 auto' }}>

        {saved && savedData ? (
          <div>
            <div style={{ background: '#EBF5EE', border: '2px solid #2A6B3A', borderRadius: 16, padding: '2rem', textAlign: 'center' as const, marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2A6B3A', marginBottom: 8 }}>Passage enregistre !</div>
              <div style={{ fontSize: 14, color: '#2A6B3A', marginBottom: 4 }}>{form.client_prenom} {form.client_nom} — {form.immatriculation.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{form.description}</div>
              <div style={{ fontSize: 13, color: '#555' }}>Duree : {form.duree_minutes} min</div>
              <div style={{ fontSize: 12, color: '#2A6B3A', marginTop: 8, fontWeight: 600 }}>Dossier N° {savedData.dossier?.numero_dossier} — Statut : Pret a facturer</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reset} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '2px solid #C8723A', background: '#FFFFFF', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#C8723A' }}>+ Nouveau passage</button>
              <button onClick={() => router.push('/avis?dossier=' + savedData.dossier?.id)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#C8723A', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'white' }}>⭐ Laisser un avis</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: '#FFF0E6', border: '1px solid #C8723A', borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 20, fontSize: 13, color: '#7A3E10', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              Passage rapide — le dossier sera directement marque <strong>Pret a facturer</strong>
            </div>

            {/* Section client */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '1.5rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16 }}>Client</div>

              {/* Toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setClientMode('search'); setSelectedClient(null); setSearchClient('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'search' ? '#C8723A' : '#EDE5D8'), background: clientMode === 'search' ? '#C8723A' : 'white', color: clientMode === 'search' ? 'white' : '#1C2A2F', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  🔍 Client existant
                </button>
                <button onClick={() => { setClientMode('new'); setSelectedClient(null); setSearchClient(''); setForm(f => ({ ...f, client_nom: '', client_prenom: '', client_telephone: '' })) }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'new' ? '#C8723A' : '#EDE5D8'), background: clientMode === 'new' ? '#C8723A' : 'white', color: clientMode === 'new' ? 'white' : '#1C2A2F', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  + Nouveau client
                </button>
              </div>

              {clientMode === 'search' && (
                <div style={{ position: 'relative' as const, marginBottom: 12 }}>
                  <input value={searchClient} onChange={e => { setSearchClient(e.target.value); setShowDropdown(true); setSelectedClient(null) }} onFocus={() => setShowDropdown(true)}
                    placeholder="Rechercher par nom, prenom ou telephone..."
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                  <span style={{ position: 'absolute' as const, left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#888' }}>🔍</span>
                  {showDropdown && searchClient && filteredClients.length > 0 && (
                    <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #EDE5D8', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100 }}>
                      {filteredClients.map(c => (
                        <div key={c.id} onClick={() => selectClient(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FFF0E6')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#C8723A' }}>
                            {c.prenom?.[0]}{c.nom?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2A2F' }}>{c.prenom} {c.nom}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{c.telephone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedClient && (
                <div style={{ padding: '10px 14px', background: '#EBF5EE', borderRadius: 8, border: '1px solid #97C459', fontSize: 13, color: '#2A6B3A', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong>✓ {selectedClient.prenom} {selectedClient.nom} — {selectedClient.telephone}</strong>
                  <button onClick={() => { setSelectedClient(null); setSearchClient('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }}>×</button>
                </div>
              )}

              {(clientMode === 'new' || (clientMode === 'search' && !selectedClient)) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={form.client_nom} onChange={e => set('client_nom', e.target.value)} placeholder="Bernard" /></div>
                  <div><label style={labelStyle}>Prenom</label><input style={inputStyle} value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} placeholder="Pierre" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Telephone</label><input style={inputStyle} value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} placeholder="06 12 34 56 78" /></div>
                </div>
              )}
            </div>

            {/* Section vehicule */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '1.5rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16 }}>Vehicule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Immatriculation *</label><input style={{ ...inputStyle, textTransform: 'uppercase' as const, fontWeight: 700, fontSize: 16 }} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)} placeholder="AB-123-CD" /></div>
                <div><label style={labelStyle}>Marque</label><input style={inputStyle} value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Renault" /></div>
                <div><label style={labelStyle}>Modele</label><input style={inputStyle} value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Clio" /></div>
              </div>
            </div>

            {/* Section travaux */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '1.5rem', border: '1px solid #EDE5D8', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 16 }}>Travaux effectues</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description des travaux *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Ex : Remplacement ampoule feu arriere gauche, gonflage pneus..."
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' as const, fontFamily: 'system-ui' }} />
              </div>
              <div>
                <label style={labelStyle}>Temps passe</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {dureeOptions.map(opt => (
                    <button key={opt.value} onClick={() => set('duree_minutes', opt.value)} style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid ' + (form.duree_minutes === opt.value ? '#C8723A' : '#EDE5D8'), background: form.duree_minutes === opt.value ? '#C8723A' : 'white', color: form.duree_minutes === opt.value ? 'white' : '#1C2A2F', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '18px', borderRadius: 14, border: 'none', background: loading ? '#ccc' : '#2A6B3A', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? 'Enregistrement...' : (<>✓ Valider le passage — {dureeOptions.find(d => d.value === form.duree_minutes)?.label}</>)}
            </button>
          </>
        )}
      </div>
    </div>
  )
}