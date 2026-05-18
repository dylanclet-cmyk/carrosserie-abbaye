'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const ZONES = [
  { id: 'aile_av_g', label: 'Aile avant gauche', x: 120, y: 80 },
  { id: 'aile_av_d', label: 'Aile avant droite', x: 120, y: 200 },
  { id: 'capot', label: 'Capot', x: 80, y: 140 },
  { id: 'pare_choc_av', label: 'Pare-chocs avant', x: 40, y: 140 },
  { id: 'porte_av_g', label: 'Porte avant gauche', x: 220, y: 80 },
  { id: 'porte_av_d', label: 'Porte avant droite', x: 220, y: 200 },
  { id: 'porte_ar_g', label: 'Porte arrière gauche', x: 320, y: 80 },
  { id: 'porte_ar_d', label: 'Porte arrière droite', x: 320, y: 200 },
  { id: 'aile_ar_g', label: 'Aile arrière gauche', x: 420, y: 80 },
  { id: 'aile_ar_d', label: 'Aile arrière droite', x: 420, y: 200 },
  { id: 'coffre', label: 'Coffre', x: 480, y: 140 },
  { id: 'pare_choc_ar', label: 'Pare-chocs arrière', x: 520, y: 140 },
  { id: 'toit', label: 'Toit', x: 270, y: 140 },
  { id: 'pare_brise_av', label: 'Pare-brise avant', x: 150, y: 140 },
  { id: 'pare_brise_ar', label: 'Pare-brise arrière', x: 400, y: 140 },
]

const CONTROLE_INTERIEUR = ['Propreté intérieure', 'Tableau de bord', 'Sièges / sellerie', 'Tapis de sol', 'Coffre']
const CONTROLE_EQUIPEMENTS = ['Roue de secours', 'Cric / clé de roue', 'Gilet / triangle', 'Documents de bord', '2e jeu de clés']

export default function EtatDesLieux() {
  const [type, setType] = useState<'entree' | 'sortie'>('entree')
  const [dossier, setDossier] = useState<any>(null)
  const [dommages, setDommages] = useState<any>({})
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [controleInt, setControleInt] = useState<any>({})
  const [controleEquip, setControleEquip] = useState<any>({})
  const [photos, setPhotos] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const dossierId = searchParams.get('dossier')
    const typeParam = searchParams.get('type') as 'entree' | 'sortie'
    if (typeParam) setType(typeParam)
    if (dossierId) {
      supabase.from('dossiers').select('*, clients(*)').eq('id', dossierId).single().then(({ data }) => setDossier(data))
    }
  }, [])

  function toggleDommage(zoneId: string, gravite: string) {
    setDommages((prev: any) => {
      const current = prev[zoneId]
      if (current?.gravite === gravite) {
        const next = { ...prev }
        delete next[zoneId]
        return next
      }
      return { ...prev, [zoneId]: { gravite, description: current?.description || '' } }
    })
  }

  function setDescription(zoneId: string, description: string) {
    setDommages((prev: any) => ({ ...prev, [zoneId]: { ...prev[zoneId], description } }))
  }

  function startDraw(e: any) {
    setDrawing(true)
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e: any) {
    if (!drawing) return
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#2D3748'
    ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasSig(true)
  }

  function clearSig() {
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  async function handlePhoto(zone: string, phase: 'avant' | 'apres', file: File) {
    const path = `${dossier?.id}/${zone}_${phase}_${Date.now()}.${file.name.split('.').pop()}`
    const { data } = await supabase.storage.from('photos').upload(path, file)
    if (data) {
      const { data: url } = supabase.storage.from('photos').getPublicUrl(path)
      setPhotos((prev: any) => ({ ...prev, [`${zone}_${phase}`]: url.publicUrl }))
    }
  }

  async function handleSave() {
    setLoading(true)
    const signature = hasSig ? sigCanvas.current!.toDataURL() : null
    const dommagesArray = Object.entries(dommages).map(([zone, v]: any) => ({
      zone,
      gravite: v.gravite,
      description: v.description
    }))

    await supabase.from('etats_lieux').insert({
      dossier_id: dossier?.id,
      type,
      dommages: dommagesArray,
      controle_interieur: controleInt,
      controle_equipements: controleEquip,
      signature_client: signature,
      signe_le: signature ? new Date().toISOString() : null,
      signe_par: dossier?.clients?.prenom + ' ' + dossier?.clients?.nom,
    })

    setLoading(false)
    setSaved(true)
    setTimeout(() => router.push('/dossier/' + dossier?.id), 1500)
  }

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', background: 'white' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>
          Etat des lieux — {type === 'entree' ? 'Entree' : 'Sortie'}
          {dossier && ` — ${dossier.immatriculation}`}
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>

        {saved && (
          <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem', marginBottom: 16, color: '#27500A', fontWeight: 600, textAlign: 'center' }}>
            Etat des lieux sauvegarde ! Redirection...
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setType('entree')} style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid ' + (type === 'entree' ? '#E07B2A' : '#e8e2d9'), background: type === 'entree' ? '#E07B2A' : 'white', color: type === 'entree' ? 'white' : '#2D3748', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Entree du vehicule
          </button>
          <button onClick={() => setType('sortie')} style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid ' + (type === 'sortie' ? '#E07B2A' : '#e8e2d9'), background: type === 'sortie' ? '#E07B2A' : 'white', color: type === 'sortie' ? 'white' : '#2D3748', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Sortie du vehicule
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Schema du vehicule — cliquez sur une zone pour annoter</div>

          <div style={{ position: 'relative', background: '#f8f6f3', borderRadius: 8, padding: '1rem', marginBottom: 16 }}>
            <svg viewBox="0 0 600 280" style={{ width: '100%', display: 'block' }}>
              <rect x="60" y="100" width="480" height="80" rx="10" fill="#D3D1C7" />
              <rect x="120" y="70" width="280" height="80" rx="8" fill="#B4B2A9" />
              <rect x="60" y="170" width="480" height="18" rx="4" fill="#B4B2A9" />
              <ellipse cx="140" cy="200" rx="30" ry="16" fill="#888780" />
              <ellipse cx="140" cy="200" rx="18" ry="10" fill="#5F5E5A" />
              <ellipse cx="460" cy="200" rx="30" ry="16" fill="#888780" />
              <ellipse cx="460" cy="200" rx="18" ry="10" fill="#5F5E5A" />
              <rect x="68" y="108" width="80" height="48" rx="4" fill="#E6F1FB" stroke="#85B7EB" strokeWidth="0.5" />
              <rect x="180" y="108" width="70" height="48" rx="4" fill="#E6F1FB" stroke="#85B7EB" strokeWidth="0.5" />
              <rect x="280" y="108" width="70" height="48" rx="4" fill="#E6F1FB" stroke="#85B7EB" strokeWidth="0.5" />
              <rect x="390" y="108" width="80" height="48" rx="4" fill="#E6F1FB" stroke="#85B7EB" strokeWidth="0.5" />
              <rect x="60" y="118" width="20" height="32" rx="3" fill="#9FE1CB" />
              <rect x="520" y="118" width="20" height="32" rx="3" fill="#9FE1CB" />
              <text x="300" y="20" textAnchor="middle" fontSize="12" fill="#888">AVANT</text>
              <text x="300" y="270" textAnchor="middle" fontSize="12" fill="#888">ARRIERE</text>
              <text x="30" y="145" textAnchor="middle" fontSize="11" fill="#888">G</text>
              <text x="570" y="145" textAnchor="middle" fontSize="11" fill="#888">D</text>

              {ZONES.map(z => {
                const dmg = dommages[z.id]
                const color = dmg ? (dmg.gravite === 'grave' ? '#E24B4A' : '#EF9F27') : '#185FA5'
                const isSelected = selectedZone === z.id
                return (
                  <g key={z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={z.x} cy={z.y} r={isSelected ? 13 : 10} fill={dmg ? color : 'rgba(24,95,165,0.15)'} stroke={color} strokeWidth={isSelected ? 2 : 1} />
                    {dmg && <text x={z.x} y={z.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">{dmg.gravite === 'grave' ? '!' : '~'}</text>}
                  </g>
                )
              })}
            </svg>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E24B4A', display: 'inline-block' }} /> Grave</span>
              <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF9F27', display: 'inline-block' }} /> Leger</span>
              <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(24,95,165,0.15)', border: '1px solid #185FA5', display: 'inline-block' }} /> Aucun dommage</span>
            </div>
          </div>

          {selectedZone && (
            <div style={{ background: '#FDF0E6', borderRadius: 10, padding: '1rem', border: '1px solid #E07B2A' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748', marginBottom: 10 }}>
                {ZONES.find(z => z.id === selectedZone)?.label}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => toggleDommage(selectedZone, 'leger')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'leger' ? '#EF9F27' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'leger' ? '#FAEEDA' : 'white', color: '#854F0B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Leger
                </button>
                <button onClick={() => toggleDommage(selectedZone, 'grave')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'grave' ? '#E24B4A' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'grave' ? '#FCEBEB' : 'white', color: '#791F1F', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Grave
                </button>
                {dommages[selectedZone] && (
                  <button onClick={() => toggleDommage(selectedZone, dommages[selectedZone].gravite)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', color: '#888', cursor: 'pointer', fontSize: 13 }}>
                    Effacer
                  </button>
                )}
              </div>
              {dommages[selectedZone] && (
                <input style={inputStyle} placeholder="Description du dommage..." value={dommages[selectedZone]?.description || ''} onChange={e => setDescription(selectedZone, e.target.value)} />
              )}

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Photos</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom 4 }}>Avant</div>
                    {photos[`${selectedZone}_avant`] ? (
                      <img src={photos[`${selectedZone}_avant`]} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} alt="avant" />
                    ) : (
                      <label style={{ display: 'block', width: 80, height: 60, border: '1.5px dashed #e8e2d9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#888' }}>
                        + Photo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhoto(selectedZone, 'avant', e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Apres</div>
                    {photos[`${selectedZone}_apres`] ? (
                      <img src={photos[`${selectedZone}_apres`]} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} alt="apres" />
                    ) : (
                      <label style={{ width: 80, height: 60, border: '1.5px dashed #e8e2d9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#888' }}>
                        + Photo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhoto(selectedZone, 'apres', e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Controle interieur</div>
            {CONTROLE_INTERIEUR.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#2D3748' }}>{item}</span>
                <input type="checkbox" checked={controleInt[item] || false} onChange={e => setControleInt((p: any) => ({ ...p, [item]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Controle equipements</div>
            {CONTROLE_EQUIPEMENTS.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#2D3748' }}>{item}</span>
                <input type="checkbox" checked={controleEquip[item] || false} onChange={e => setControleEquip((p: any) => ({ ...p, [item]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Signature client</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Signez dans le cadre ci-dessous</div>
          <canvas
            ref={sigCanvas}
            width={600}
            height={120}
            style={{ border: '1.5px dashed #e8e2d9', borderRadius: 8, width: '100%', cursor: 'crosshair', background: '#fafafa', display: 'block' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={() => setDrawing(false)}
            onMouseLeave={() => setDrawing(false)}
          />
          <button onClick={clearSig} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', color: '#888' }}>Effacer</button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}