'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ZONES = [
  { id: 'aile_av_g', label: 'Aile avant gauche', x: 120, y: 80 },
  { id: 'aile_av_d', label: 'Aile avant droite', x: 120, y: 200 },
  { id: 'capot', label: 'Capot', x: 80, y: 140 },
  { id: 'pare_choc_av', label: 'Pare-chocs avant', x: 40, y: 140 },
  { id: 'porte_av_g', label: 'Porte avant gauche', x: 220, y: 80 },
  { id: 'porte_av_d', label: 'Porte avant droite', x: 220, y: 200 },
  { id: 'porte_ar_g', label: 'Porte arriere gauche', x: 320, y: 80 },
  { id: 'porte_ar_d', label: 'Porte arriere droite', x: 320, y: 200 },
  { id: 'aile_ar_g', label: 'Aile arriere gauche', x: 420, y: 80 },
  { id: 'aile_ar_d', label: 'Aile arriere droite', x: 420, y: 200 },
  { id: 'coffre', label: 'Coffre', x: 480, y: 140 },
  { id: 'toit', label: 'Toit', x: 270, y: 140 },
]

export default function PretDirectPage() {
  const [vehicules, setVehicules] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prets, setPrets] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [etape, setEtape] = useState<'infos' | 'etat_lieux'>('infos')
  const [searchClient, setSearchClient] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')
  const [dommages, setDommages] = useState<any>({})
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [photos, setPhotos] = useState<{ url: string, nom: string, zone?: string }[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [form, setForm] = useState({
    client_nom: '', client_prenom: '', client_telephone: '',
    vehicule_id: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin_prevue: '',
    km_depart: '',
    carburant_depart: '3/4',
    notes: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      // Charger tous les véhicules actifs
      const { data: v } = await supabase.from('vehicules_courtoisie').select('*').eq('actif', true)
      setVehicules(v || [])
      // Charger TOUS les prêts en cours (pas les rendus) pour vérif chevauchement
      const { data: tousLesPrets } = await supabase.from('prets_courtoisie').select('vehicule_id, date_debut, date_fin_prevue, date_retour, statut').eq('statut', 'en_cours')
      setPrets(tousLesPrets || [])
      const { data: c } = await supabase.from('clients').select('*').order('nom')
      setClients(c || [])
      setLoading(false)
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

  function toggleDommage(zoneId: string, gravite: string) {
    setDommages((prev: any) => {
      const current = prev[zoneId]
      if (current?.gravite === gravite) { const next = { ...prev }; delete next[zoneId]; return next }
      return { ...prev, [zoneId]: { gravite, description: current?.description || '' } }
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, zone?: string) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhoto(true)
    const newPhotos = [...photos]
    for (const file of Array.from(files)) {
      const path = 'courtoisie/' + Date.now() + '_' + file.name
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
        newPhotos.push({ url: urlData.publicUrl, nom: file.name, zone })
      }
    }
    setPhotos(newPhotos)
    setUploadingPhoto(false)
    e.target.value = ''
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true)
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2; ctx.strokeStyle = '#2D3748'; ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke()
    setHasSig(true)
  }
  function startDrawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault(); setDrawing(true)
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    ctx.beginPath(); ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
  }
  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!drawing) return
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    ctx.lineWidth = 2; ctx.strokeStyle = '#2D3748'; ctx.lineCap = 'round'
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top); ctx.stroke()
    setHasSig(true)
  }

  async function handleSave() {
    if (!form.vehicule_id || !form.date_fin_prevue) {
      alert('Veuillez choisir un vehicule et une date de retour')
      return
    }
    if (!form.client_nom && !selectedClient) {
      alert('Veuillez renseigner le client')
      return
    }
    setSaving(true)

    // Créer ou récupérer client
    let clientId = selectedClient?.id
    if (!clientId) {
      const { data: client } = await supabase.from('clients').insert({
        nom: form.client_nom, prenom: form.client_prenom, telephone: form.client_telephone,
      }).select().single()
      clientId = client?.id
    }

    // Créer le prêt
    const { data: pret } = await supabase.from('prets_courtoisie').insert({
      vehicule_id: form.vehicule_id,
      dossier_id: null,
      client_id: clientId,
      date_debut: form.date_debut,
      date_fin_prevue: form.date_fin_prevue,
      km_depart: parseInt(form.km_depart) || 0,
      carburant_depart: form.carburant_depart,
      notes: form.notes,
      statut: 'en_cours'
    }).select().single()

    // Créer état des lieux de départ
    if (pret) {
      const signature = hasSig ? sigCanvas.current!.toDataURL() : null
      const dommagesArray = Object.entries(dommages).map(([zone, v]: any) => ({ zone, gravite: v.gravite, description: v.description }))
      await supabase.from('etats_lieux_courtoisie').insert({
        pret_id: pret.id,
        type: 'depart',
        km_releve: parseInt(form.km_depart) || 0,
        carburant: form.carburant_depart,
        dommages: dommagesArray,
        signature_client: signature,
        photos: photos,
      })
    }

    setSaving(false)
    setSaved(true)
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e8e2d9', fontSize: 14, color: '#2D3748', background: 'white' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 4, fontWeight: 600 }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  if (saved) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '90%', textAlign: 'center' as const }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#27500A', marginBottom: 8 }}>Pret enregistre !</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>L etat des lieux de depart a ete sauvegarde.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/courtoisie')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #E07B2A', background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#E07B2A' }}>Retour courtoisie</button>
            <button onClick={() => router.push('/')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#E07B2A', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'white' }}>Tableau de bord</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Nouveau pret direct</span>
        </div>
        {/* Etapes */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: etape === 'infos' ? '#E07B2A' : '#3B6D11', color: 'white', fontSize: 12, fontWeight: 600 }}>
            {etape === 'etat_lieux' ? '✓' : '1'} Infos pret
          </div>
          <div style={{ color: '#888', fontSize: 14 }}>→</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: etape === 'etat_lieux' ? '#E07B2A' : '#4a5568', color: 'white', fontSize: 12, fontWeight: 600 }}>
            2 Etat des lieux
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 800, margin: '0 auto' }}>

        {etape === 'infos' && (
          <>
            {/* Client */}
            <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Client</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setClientMode('search'); setSelectedClient(null); setSearchClient('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'search' ? '#E07B2A' : '#e8e2d9'), background: clientMode === 'search' ? '#E07B2A' : 'white', color: clientMode === 'search' ? 'white' : '#2D3748', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔍 Client existant</button>
                <button onClick={() => { setClientMode('new'); setSelectedClient(null); setSearchClient('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (clientMode === 'new' ? '#E07B2A' : '#e8e2d9'), background: clientMode === 'new' ? '#E07B2A' : 'white', color: clientMode === 'new' ? 'white' : '#2D3748', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Nouveau client</button>
              </div>
              {clientMode === 'search' && (
                <div style={{ position: 'relative' as const, marginBottom: 12 }}>
                  <input value={searchClient} onChange={e => { setSearchClient(e.target.value); setShowDropdown(true); setSelectedClient(null) }} onFocus={() => setShowDropdown(true)} placeholder="Rechercher par nom, prenom ou telephone..." style={{ ...inputStyle, paddingLeft: 36 }} />
                  <span style={{ position: 'absolute' as const, left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#888' }}>🔍</span>
                  {showDropdown && searchClient && filteredClients.length > 0 && (
                    <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e8e2d9', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100 }}>
                      {filteredClients.map(c => (
                        <div key={c.id} onClick={() => selectClient(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FDF0E6')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E07B2A' }}>{c.prenom?.[0]}{c.nom?.[0]}</div>
                          <div><div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{c.prenom} {c.nom}</div><div style={{ fontSize: 11, color: '#888' }}>{c.telephone}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedClient && (
                <div style={{ padding: '10px 14px', background: '#EAF3DE', borderRadius: 8, border: '1px solid #97C459', fontSize: 13, color: '#27500A', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

            {/* Véhicule */}
            <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Vehicule de courtoisie</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Vehicule disponible *</label>
                  <select style={inputStyle} value={form.vehicule_id} onChange={e => set('vehicule_id', e.target.value)}>
                    <option value="">-- Choisir un vehicule --</option>
                    {vehicules.map(v => {
                      const isOccupe = form.date_debut && form.date_fin_prevue && prets.some((p: any) => {
                        if (p.vehicule_id !== v.id) return false
                        // Utiliser date_retour réelle si disponible, sinon date_fin_prevue
                        const finReelle = p.date_retour ? new Date(p.date_retour) : new Date(p.date_fin_prevue)
                        return new Date(p.date_debut) <= new Date(form.date_fin_prevue) && finReelle >= new Date(form.date_debut)
                      })
                      return <option key={v.id} value={v.id} disabled={isOccupe}>{isOccupe ? '🔴 ' : '✓ '}{v.immatriculation} — {v.marque} {v.modele} {v.couleur ? '(' + v.couleur + ')' : ''}{isOccupe ? ' — INDISPONIBLE' : ''}</option>
                    })}
                  </select>
                  {!form.date_debut || !form.date_fin_prevue ? <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Choisissez d abord les dates pour voir la disponibilite</div> : null}
                </div>
                <div><label style={labelStyle}>Date de depart *</label><input style={inputStyle} type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} /></div>
                <div><label style={labelStyle}>Date de retour prevue *</label><input style={inputStyle} type="date" value={form.date_fin_prevue} onChange={e => set('date_fin_prevue', e.target.value)} /></div>
                <div><label style={labelStyle}>Kilometrage depart</label><input style={inputStyle} type="number" value={form.km_depart} onChange={e => set('km_depart', e.target.value)} placeholder="12500" /></div>
                <div>
                  <label style={labelStyle}>Carburant depart</label>
                  <select style={inputStyle} value={form.carburant_depart} onChange={e => set('carburant_depart', e.target.value)}>
                    <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Notes (optionnel)</label><input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex : Remis en main propre, contrat signe..." /></div>
              </div>
            </div>

            <button onClick={() => setEtape('etat_lieux')} disabled={!form.vehicule_id || !form.date_fin_prevue} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: !form.vehicule_id || !form.date_fin_prevue ? '#ccc' : '#E07B2A', color: 'white', cursor: !form.vehicule_id || !form.date_fin_prevue ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}>
              Suivant — Etat des lieux →
            </button>
          </>
        )}

        {etape === 'etat_lieux' && (
          <>
            {/* Schema véhicule */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Etat des lieux depart — cliquez sur une zone</div>
              <svg viewBox="0 0 600 280" style={{ width: '100%', display: 'block', background: '#f8f6f3', borderRadius: 8, marginBottom: 12 }}>
                <rect x="60" y="100" width="480" height="80" rx="10" fill="#D3D1C7" />
                <rect x="120" y="70" width="280" height="80" rx="8" fill="#B4B2A9" />
                <rect x="60" y="170" width="480" height="18" rx="4" fill="#B4B2A9" />
                <ellipse cx="140" cy="200" rx="30" ry="16" fill="#888780" /><ellipse cx="140" cy="200" rx="18" ry="10" fill="#5F5E5A" />
                <ellipse cx="460" cy="200" rx="30" ry="16" fill="#888780" /><ellipse cx="460" cy="200" rx="18" ry="10" fill="#5F5E5A" />
                <text x="300" y="22" textAnchor="middle" fontSize="12" fill="#888">AVANT</text>
                <text x="300" y="268" textAnchor="middle" fontSize="12" fill="#888">ARRIERE</text>
                <text x="30" y="145" textAnchor="middle" fontSize="11" fill="#888">G</text>
                <text x="570" y="145" textAnchor="middle" fontSize="11" fill="#888">D</text>
                {ZONES.map(z => {
                  const dmg = dommages[z.id]
                  const color = dmg ? (dmg.gravite === 'grave' ? '#E24B4A' : '#EF9F27') : '#E07B2A'
                  const isSelected = selectedZone === z.id
                  return (
                    <g key={z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)} style={{ cursor: 'pointer' }}>
                      <circle cx={z.x} cy={z.y} r={isSelected ? 14 : 10} fill={dmg ? color : 'rgba(224,123,42,0.15)'} stroke={color} strokeWidth={isSelected ? 2.5 : 1} />
                      {dmg && <text x={z.x} y={z.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{dmg.gravite === 'grave' ? '!' : '~'}</text>}
                    </g>
                  )
                })}
              </svg>

              {selectedZone && (
                <div style={{ background: '#FDF0E6', borderRadius: 10, padding: '1rem', border: '1px solid #E07B2A', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748', marginBottom: 10 }}>{ZONES.find(z => z.id === selectedZone)?.label}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
                    <button onClick={() => toggleDommage(selectedZone, 'leger')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'leger' ? '#EF9F27' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'leger' ? '#FAEEDA' : 'white', color: '#854F0B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Leger</button>
                    <button onClick={() => toggleDommage(selectedZone, 'grave')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'grave' ? '#E24B4A' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'grave' ? '#FCEBEB' : 'white', color: '#791F1F', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Grave</button>
                    {dommages[selectedZone] && <button onClick={() => { const n = { ...dommages }; delete n[selectedZone]; setDommages(n) }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', color: '#888', cursor: 'pointer', fontSize: 13 }}>Effacer</button>}
                    <label style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', color: '#2D3748', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      📷 Photo
                      <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e, selectedZone)} style={{ display: 'none' }} multiple />
                    </label>
                  </div>
                  {dommages[selectedZone] && <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} placeholder="Description..." value={dommages[selectedZone]?.description || ''} onChange={e => setDommages((p: any) => ({ ...p, [selectedZone]: { ...p[selectedZone], description: e.target.value } }))} />}
                </div>
              )}
            </div>

            {/* Photos */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Photos du vehicule</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px solid #E07B2A', background: '#FDF0E6', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#E07B2A' }}>
                  📷 Prendre une photo
                  <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e)} style={{ display: 'none' }} multiple />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2D3748' }}>
                  🖼 Importer
                  <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e)} style={{ display: 'none' }} multiple />
                </label>
                {uploadingPhoto && <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>Upload...</span>}
              </div>
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {photos.map((p, i) => (
                    <div key={i} style={{ position: 'relative' as const, borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
                      <img src={p.url} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Signature client</div>
              <canvas ref={sigCanvas} width={800} height={150}
                style={{ border: '1.5px dashed #e8e2d9', borderRadius: 8, width: '100%', cursor: 'crosshair', background: '#fafafa', display: 'block', touchAction: 'none' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
                onTouchStart={startDrawTouch} onTouchMove={drawTouch} onTouchEnd={() => setDrawing(false)}
              />
              <button onClick={() => { sigCanvas.current!.getContext('2d')!.clearRect(0, 0, 800, 150); setHasSig(false) }} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', color: '#888' }}>Effacer</button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setEtape('infos')} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>← Retour</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: saving ? '#ccc' : '#3B6D11', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}>
                {saving ? 'Enregistrement...' : '✓ Valider le pret et l etat des lieux'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}