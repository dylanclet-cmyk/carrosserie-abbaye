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

const CTRL_INT = ['Proprete interieure', 'Tableau de bord', 'Sieges / sellerie', 'Tapis de sol', 'Coffre']
const CTRL_EQ = ['Roue de secours', 'Cric / cle de roue', 'Gilet / triangle', 'Documents de bord', '2e jeu de cles']

const PHOTOS_OBLIGATOIRES = [
  { id: 'avant', label: 'Avant', icon: '⬆️' },
  { id: 'arriere', label: 'Arrière', icon: '⬇️' },
  { id: 'cote_gauche', label: 'Côté gauche', icon: '◀️' },
  { id: 'cote_droit', label: 'Côté droit', icon: '▶️' },
  { id: 'interieur', label: 'Intérieur', icon: '🪑' },
]

export default function EtatDesLieux() {
  const [type, setType] = useState<'entree' | 'sortie'>('entree')
  const [dossierId, setDossierId] = useState<string | null>(null)
  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dommages, setDommages] = useState<any>({})
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [controleInt, setControleInt] = useState<any>({})
  const [controleEquip, setControleEquip] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photos, setPhotos] = useState<{ url: string, nom: string, zone?: string }[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('dossier')
    const t = params.get('type') as 'entree' | 'sortie'
    if (t) setType(t)
    if (id) setDossierId(id)
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (id) {
        const { data } = await supabase.from('dossiers').select('*, clients(*)').eq('id', id).single()
        if (data) setDossier(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, zone?: string) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhoto(zone || 'general')
    const newPhotos = [...photos]
    for (const file of Array.from(files)) {
      const path = dossierId + '/' + Date.now() + '_' + file.name
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
        // Remplacer si photo obligatoire déjà prise
        if (zone && PHOTOS_OBLIGATOIRES.find(p => p.id === zone)) {
          const idx = newPhotos.findIndex(p => p.zone === zone)
          if (idx >= 0) newPhotos[idx] = { url: urlData.publicUrl, nom: file.name, zone }
          else newPhotos.push({ url: urlData.publicUrl, nom: file.name, zone })
        } else {
          newPhotos.push({ url: urlData.publicUrl, nom: file.name, zone })
        }
      }
    }
    setPhotos(newPhotos)
    setUploadingPhoto(null)
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  function toggleDommage(zoneId: string, gravite: string) {
    setDommages((prev: any) => {
      const current = prev[zoneId]
      if (current?.gravite === gravite) { const next = { ...prev }; delete next[zoneId]; return next }
      return { ...prev, [zoneId]: { gravite, description: current?.description || '' } }
    })
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
    ctx.lineWidth = 2; ctx.strokeStyle = '#1C2A2F'; ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke()
    setHasSig(true)
  }

  function startDrawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    setDrawing(true)
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
    ctx.lineWidth = 2; ctx.strokeStyle = '#1C2A2F'; ctx.lineCap = 'round'
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top); ctx.stroke()
    setHasSig(true)
  }

  // Vérifier si toutes les photos obligatoires sont prises
  const photosObligatoiresOk = PHOTOS_OBLIGATOIRES.every(p => photos.some(ph => ph.zone === p.id))
  const photosManquantes = PHOTOS_OBLIGATOIRES.filter(p => !photos.some(ph => ph.zone === p.id))

  async function handleSave() {
    if (!photosObligatoiresOk) {
      alert('Veuillez prendre les 4 photos obligatoires : ' + photosManquantes.map(p => p.label).join(', '))
      return
    }
    setSaving(true)
    const signature = hasSig ? sigCanvas.current!.toDataURL() : null
    const dommagesArray = Object.entries(dommages).map(([zone, v]: any) => ({ zone, gravite: v.gravite, description: v.description }))
    await supabase.from('etats_lieux').insert({
      dossier_id: dossierId, type,
      dommages: dommagesArray,
      controle_interieur: controleInt,
      controle_equipements: controleEquip,
      signature_client: signature,
      signe_le: signature ? new Date().toISOString() : null,
      signe_par: dossier?.clients?.prenom + ' ' + dossier?.clients?.nom,
      photos: photos,
    })
    setSaving(false); setSaved(true)
    setTimeout(() => router.push('/dossier/' + dossierId), 1500)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer', color: '#FAF7F2' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>Etat des lieux — {type === 'entree' ? 'Entrée' : 'Sortie'} — {dossier.immatriculation}</span>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
        {saved && <div style={{ background: '#EBF5EE', border: '1px solid #A8D8B8', borderRadius: 12, padding: '1rem', marginBottom: 16, color: '#2A6B3A', fontWeight: 600, textAlign: 'center' as const }}>✓ Sauvegardé !</div>}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {(['entree', 'sortie'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid ' + (type === t ? '#C8723A' : '#EDE5D8'), background: type === t ? '#C8723A' : 'white', color: type === t ? 'white' : '#1A1A1A', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {t === 'entree' ? '↓ Entrée du véhicule' : '↑ Sortie du véhicule'}
            </button>
          ))}
        </div>

        {/* PHOTOS OBLIGATOIRES */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: !photosObligatoiresOk ? '2px solid #C8723A' : '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1 }}>
              Photos obligatoires
            </div>
            <span style={{ fontSize: 12, background: photosObligatoiresOk ? '#EBF5EE' : '#FFF0F0', color: photosObligatoiresOk ? '#2A6B3A' : '#A32D2D', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              {photos.filter(p => PHOTOS_OBLIGATOIRES.find(ob => ob.id === p.zone)).length} / 5
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {PHOTOS_OBLIGATOIRES.map(p => {
              const photo = photos.find(ph => ph.zone === p.id)
              const isUploading = uploadingPhoto === p.id
              return (
                <div key={p.id} style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid ' + (photo ? '#2A6B3A' : '#C8723A'), position: 'relative' as const }}>
                  {photo ? (
                    <div style={{ position: 'relative' as const }}>
                      <img src={photo.url} alt={p.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: 'rgba(42,107,58,0.85)', color: 'white', fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>✓ {p.label}</span>
                        <label style={{ cursor: 'pointer', fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                          Changer
                          <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e, p.id)} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', aspectRatio: '4/3', background: '#FFF8F3', cursor: 'pointer', gap: 6 }}>
                      {isUploading ? (
                        <span style={{ fontSize: 13, color: '#888' }}>Upload...</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 28 }}>📷</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#C8723A' }}>{p.label}</span>
                          <span style={{ fontSize: 11, color: '#888' }}>Appuyez pour photographier</span>
                        </>
                      )}
                      <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e, p.id)} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          {!photosObligatoiresOk && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF0F0', borderRadius: 8, fontSize: 12, color: '#A32D2D', border: '1px solid #F09595' }}>
              ⚠ Photos manquantes : {photosManquantes.map(p => p.label).join(', ')}
            </div>
          )}
        </div>

        {/* Schema vehicule */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.5rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Schéma du véhicule — cliquez sur une zone</div>
          <svg viewBox="0 0 600 280" style={{ width: '100%', display: 'block', background: '#FAF7F2', borderRadius: 8, marginBottom: 12 }}>
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
              const color = dmg ? (dmg.gravite === 'grave' ? '#E24B4A' : '#EF9F27') : '#C8723A'
              const isSelected = selectedZone === z.id
              return (
                <g key={z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={z.x} cy={z.y} r={isSelected ? 14 : 10} fill={dmg ? color : 'rgba(200,114,58,0.15)'} stroke={color} strokeWidth={isSelected ? 2.5 : 1} />
                  {dmg && <text x={z.x} y={z.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{dmg.gravite === 'grave' ? '!' : '~'}</text>}
                </g>
              )
            })}
          </svg>

          {selectedZone && (
            <div style={{ background: '#FFF0E6', borderRadius: 10, padding: '1rem', border: '1px solid #C8723A' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>{ZONES.find(z => z.id === selectedZone)?.label}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
                <button onClick={() => toggleDommage(selectedZone, 'leger')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'leger' ? '#EF9F27' : '#EDE5D8'), background: dommages[selectedZone]?.gravite === 'leger' ? '#FFF0E6' : 'white', color: '#7A3E10', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Léger</button>
                <button onClick={() => toggleDommage(selectedZone, 'grave')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'grave' ? '#E24B4A' : '#EDE5D8'), background: dommages[selectedZone]?.gravite === 'grave' ? '#FCEBEB' : 'white', color: '#791F1F', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Grave</button>
                {dommages[selectedZone] && <button onClick={() => { const n = {...dommages}; delete n[selectedZone]; setDommages(n) }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', color: '#888', cursor: 'pointer', fontSize: 13 }}>Effacer</button>}
                <label style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', color: '#1A1A1A', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📷 Photo zone
                  <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e, selectedZone)} style={{ display: 'none' }} multiple />
                </label>
              </div>
              {dommages[selectedZone] && <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 13, color: '#1A1A1A' }} placeholder="Description..." value={dommages[selectedZone]?.description || ''} onChange={e => setDommages((p: any) => ({ ...p, [selectedZone]: { ...p[selectedZone], description: e.target.value } }))} />}
            </div>
          )}
        </div>

        {/* Photos supplémentaires */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Photos supplémentaires</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px solid #C8723A', background: '#FFF0E6', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#C8723A' }}>
              📷 Prendre une photo
              <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoUpload(e)} style={{ display: 'none' }} multiple />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
              🖼 Importer
              <input type="file" accept="image/*" onChange={e => handlePhotoUpload(e)} style={{ display: 'none' }} multiple />
            </label>
            {uploadingPhoto === 'general' && <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>Upload...</span>}
          </div>

          {photos.filter(p => !PHOTOS_OBLIGATOIRES.find(ob => ob.id === p.zone)).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {photos.filter(p => !PHOTOS_OBLIGATOIRES.find(ob => ob.id === p.zone)).map((p, i) => {
                const realIdx = photos.indexOf(p)
                return (
                  <div key={i} style={{ position: 'relative' as const, borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
                    <img src={p.url} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {p.zone && <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 9, padding: '3px 5px', textAlign: 'center' as const }}>{ZONES.find(z => z.id === p.zone)?.label || p.zone}</div>}
                    <button onClick={() => removePhoto(realIdx)} style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Controles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[{ title: 'Contrôle intérieur', items: CTRL_INT, state: controleInt, setter: setControleInt }, { title: 'Contrôle équipements', items: CTRL_EQ, state: controleEquip, setter: setControleEquip }].map(({ title, items, state, setter }) => (
            <div key={title} style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 13, color: '#1A1A1A' }}>{item}</span>
                  <input type="checkbox" checked={state[item] || false} onChange={e => setter((p: any) => ({ ...p, [item]: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#C8723A' }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Signature */}
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Signature client</div>
          <canvas ref={sigCanvas} width={800} height={150}
            style={{ border: '1.5px dashed #EDE5D8', borderRadius: 8, width: '100%', cursor: 'crosshair', background: '#fafafa', display: 'block', touchAction: 'none' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
            onTouchStart={startDrawTouch} onTouchMove={drawTouch} onTouchEnd={() => setDrawing(false)}
          />
          <button onClick={() => { sigCanvas.current!.getContext('2d')!.clearRect(0, 0, 800, 150); setHasSig(false) }} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#888' }}>Effacer</button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1A1A1A' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving || !photosObligatoiresOk}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: photosObligatoiresOk ? '#C8723A' : '#EDE5D8', color: photosObligatoiresOk ? 'white' : '#888', cursor: photosObligatoiresOk ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>
            {saving ? 'Sauvegarde...' : !photosObligatoiresOk ? `⚠ ${photosManquantes.length} photo(s) manquante(s)` : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}