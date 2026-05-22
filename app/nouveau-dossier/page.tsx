'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NouveauDossier() {
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [vehiculesDisponibles, setVehiculesDisponibles] = useState<any[]>([])
  const [pretsActifs, setPretsActifs] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [searchClient, setSearchClient] = useState('')
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [form, setForm] = useState({
    immatriculation: '',
    marque: '',
    modele: '',
    couleur: '',
    km_entree: '',
    carburant_entree: '3/4',
    date_entree: new Date().toISOString().split('T')[0],
    date_sortie_prevue: '',
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
      if (sal?.role !== 'chef_atelier' && sal?.role !== 'gerant') { router.push('/'); return }
      setSalarie(sal)
      const { data: v } = await supabase.from('vehicules_courtoisie').select('*').eq('actif', true)
      setVehiculesDisponibles(v || [])
      const { data: pretsActifs } = await supabase.from('prets_courtoisie').select('vehicule_id, date_debut, date_fin_prevue, date_retour, statut').eq('statut', 'en_cours')
      setPretsActifs(pretsActifs || [])
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
    setForm(f => ({
      ...f,
      client_nom: client.nom,
      client_prenom: client.prenom,
      client_telephone: client.telephone || '',
      client_email: client.email || '',
      client_assurance: client.assurance || '',
      client_num_police: client.num_police || '',
    }))
  }

  function getDisponibilite(vehiculeId: string): { dispo: boolean, message: string } {
    if (!form.courtoisie_date_debut || !form.courtoisie_date_retour) return { dispo: true, message: 'Choisissez des dates' }
    return { dispo: true, message: 'Disponible' }
  }

  async function handleSubmit() {
    if (!form.client_nom || !form.immatriculation) {
      alert('Veuillez remplir le nom client et l immatriculation')
      return
    }
    setLoading(true)

    let clientId = selectedClient?.id

    if (!clientId) {
      const { data: client } = await supabase.from('clients').insert({
        nom: form.client_nom, prenom: form.client_prenom,
        telephone: form.client_telephone, email: form.client_email,
        assurance: form.client_assurance, num_police: form.client_num_police,
      }).select().single()
      clientId = client?.id
    }

    const numero = '2026-' + String(Math.floor(Math.random() * 900) + 100)
    const { data: dossier } = await supabase.from('dossiers').insert({
      numero_dossier: numero,
      immatriculation: form.immatriculation.toUpperCase(),
      marque: form.marque, modele: form.modele, couleur: form.couleur,
      km_entree: parseInt(form.km_entree) || 0,
      carburant_entree: form.carburant_entree,
      date_entree: form.date_entree,
      date_sortie_prevue: form.date_sortie_prevue || null,
      devis_montant: parseFloat(form.devis_montant) || 0,
      heures_estimees: parseFloat(form.heures_estimees) || 0,
      client_id: clientId,
      salarie_id: salarie?.id,
      statut: 'en_attente_signature',
    }).select().single()

    if (form.vehicule_courtoisie_id && form.courtoisie_date_retour && dossier) {
      await supabase.from('prets_courtoisie').insert({
        vehicule_id: form.vehicule_courtoisie_id,
        dossier_id: dossier.id,
        client_id: clientId,
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
  const selectedVehicule = vehiculesDisponibles.find(v => v.id === form.vehicule_courtoisie_id)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Nouveau dossier</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 800, margin: '0 auto' }}>

        {/* Section client */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Client</div>

          {/* Toggle search/new */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => { setClientMode('search'); setSelectedClient(null); setSearchClient('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'search' ? '#E07B2A' : '#e8e2d9'), background: clientMode === 'search' ? '#E07B2A' : 'white', color: clientMode === 'search' ? 'white' : '#2D3748', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🔍 Chercher client existant
            </button>
            <button onClick={() => { setClientMode('new'); setSelectedClient(null); setSearchClient(''); setForm(f => ({ ...f, client_nom: '', client_prenom: '', client_telephone: '', client_email: '', client_assurance: '', client_num_police: '' })) }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'new' ? '#E07B2A' : '#e8e2d9'), background: clientMode === 'new' ? '#E07B2A' : 'white', color: clientMode === 'new' ? 'white' : '#2D3748', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Nouveau client
            </button>
          </div>

          {clientMode === 'search' && (
            <div style={{ position: 'relative' as const, marginBottom: 12 }}>
              <input
                value={searchClient}
                onChange={e => { setSearchClient(e.target.value); setShowDropdown(true); setSelectedClient(null) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Rechercher par nom, prenom ou telephone..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
              <span style={{ position: 'absolute' as const, left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#888' }}>🔍</span>

              {showDropdown && searchClient && filteredClients.length > 0 && (
                <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e8e2d9', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 280, overflowY: 'auto' as const }}>
                  {filteredClients.map(c => (
                    <div key={c.id} onClick={() => selectClient(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FDF0E6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E07B2A', flexShrink: 0 }}>
                        {c.prenom?.[0]}{c.nom?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{c.prenom} {c.nom}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{c.telephone}{c.email ? ' · ' + c.email : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showDropdown && searchClient && filteredClients.length === 0 && (
                <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e8e2d9', borderRadius: 10, padding: '1rem', textAlign: 'center' as const, color: '#888', fontSize: 13, zIndex: 100 }}>
                  Aucun client trouvé —
                  <button onClick={() => { setClientMode('new'); setShowDropdown(false); setForm(f => ({ ...f, client_prenom: searchClient.split(' ')[0] || '', client_nom: searchClient.split(' ')[1] || '' })) }} style={{ background: 'none', border: 'none', color: '#E07B2A', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    créer un nouveau client
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedClient && (
            <div style={{ padding: '10px 14px', background: '#EAF3DE', borderRadius: 8, border: '1px solid #97C459', fontSize: 13, color: '#27500A', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong>✓ {selectedClient.prenom} {selectedClient.nom}</strong>
                {selectedClient.telephone && <span style={{ marginLeft: 8, color: '#555' }}>{selectedClient.telephone}</span>}
                {selectedClient.assurance && <span style={{ marginLeft: 8, color: '#555' }}>· {selectedClient.assurance}</span>}
              </div>
              <button onClick={() => { setSelectedClient(null); setSearchClient(''); setForm(f => ({ ...f, client_nom: '', client_prenom: '', client_telephone: '', client_email: '', client_assurance: '', client_num_police: '' })) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 16 }}>×</button>
            </div>
          )}

          {(clientMode === 'new' || (clientMode === 'search' && !selectedClient)) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Nom {clientMode === 'new' ? '*' : ''}</label><input style={inputStyle} value={form.client_nom} onChange={e => set('client_nom', e.target.value)} placeholder="Bernard" /></div>
              <div><label style={labelStyle}>Prenom</label><input style={inputStyle} value={form.client_prenom} onChange={e => set('client_prenom', e.target.value)} placeholder="Pierre" /></div>
              <div><label style={labelStyle}>Telephone</label><input style={inputStyle} value={form.client_telephone} onChange={e => set('client_telephone', e.target.value)} placeholder="06 12 34 56 78" /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@exemple.fr" /></div>
              <div><label style={labelStyle}>Assurance</label><input style={inputStyle} value={form.client_assurance} onChange={e => set('client_assurance', e.target.value)} placeholder="MAIF" /></div>
              <div><label style={labelStyle}>N police</label><input style={inputStyle} value={form.client_num_police} onChange={e => set('client_num_police', e.target.value)} placeholder="88421" /></div>
            </div>
          )}
        </div>

        {/* Vehicule */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Vehicule client</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Immatriculation *</label><input style={{ ...inputStyle, textTransform: 'uppercase' as const, fontWeight: 700 }} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)} placeholder="AB-123-CD" /></div>
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
            <div><label style={labelStyle}>Date sortie prevue</label><input style={inputStyle} type="date" value={form.date_sortie_prevue} onChange={e => set('date_sortie_prevue', e.target.value)} /></div>
            <div><label style={labelStyle}>Devis (€)</label><input style={inputStyle} type="number" value={form.devis_montant} onChange={e => set('devis_montant', e.target.value)} placeholder="950" /></div>
            <div><label style={labelStyle}>Heures estimees</label><input style={inputStyle} type="number" min="0.5" step="0.5" value={form.heures_estimees} onChange={e => set('heures_estimees', e.target.value)} placeholder="8" /></div>
          </div>
        </div>

        {/* Vehicule courtoisie */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Vehicule de courtoisie</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Date debut pret</label><input style={inputStyle} type="date" value={form.courtoisie_date_debut} onChange={e => set('courtoisie_date_debut', e.target.value)} /></div>
            <div><label style={labelStyle}>Date retour prevue</label><input style={inputStyle} type="date" value={form.courtoisie_date_retour} onChange={e => set('courtoisie_date_retour', e.target.value)} /></div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Vehicule disponible</label>
              <select style={inputStyle} value={form.vehicule_courtoisie_id} onChange={e => set('vehicule_courtoisie_id', e.target.value)}>
                <option value="">-- Pas de vehicule de courtoisie --</option>
                {vehiculesDisponibles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele} {v.couleur ? '(' + v.couleur + ')' : ''}</option>)}
              </select>
            </div>
            {form.vehicule_courtoisie_id && selectedVehicule && (
              <>
                <div><label style={labelStyle}>Kilometrage depart</label><input style={inputStyle} type="number" value={form.courtoisie_km_depart} onChange={e => set('courtoisie_km_depart', e.target.value)} placeholder={selectedVehicule?.km_actuel?.toString()} /></div>
                <div><label style={labelStyle}>Carburant depart</label>
                  <select style={inputStyle} value={form.courtoisie_carburant} onChange={e => set('courtoisie_carburant', e.target.value)}>
                    <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
                  </select>
                </div>
              </>
            )}
          </div>
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