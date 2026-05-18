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
        const { data, error } = await supabase.from('dossiers').select('*, clients(*)').eq('id', id).single()
        if (data) setDossier(data)
        else console.error('Erreur dossier:', error)
      }
      setLoading(false)
    }
    load()
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

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true)
    const canvas = sigCanvas.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
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
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  async function handleSave() {
    setSaving(true)
    const signature = hasSig ? sigCanvas.current!.toDataURL() : null
    const dommagesArray = Object.entries(dommages).map(([zone, v]: any) => ({ zone, gravite: v.gravite, description: v.description }))
    const { error } = await supabase.from('etats_lieux').insert({
      dossier_id: dossierId,
      type,
      dommages: dommagesArray,
      controle_interieur: controleInt,
      controle_equipements: controleEquip,
      signature_client: signature,
      signe_le: signature ? new Date().toISOString() : null,
      signe_par: dossier?.clients?.prenom + ' ' + dossier?.clients?.nom,
    })
    if (error) console.error('Erreur save:', error)
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/dossier/' + dossierId), 1500)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ color: '#A32D2D', marginBottom: 12 }}>Dossier introuvable (ID: {dossierId})</div>
      <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer' }}>← Retour</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Etat des lieux — {type === 'entree' ? 'Entree' : 'Sortie'} — {dossier.immatriculation}</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        {saved && <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem', marginBottom: 16, color: '#27500A', fontWeight: 600, textAlign: 'center' }}>Sauvegarde !</div>}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {(['entree', 'sortie'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid ' + (type === t ? '#E07B2A' : '#e8e2d9'), background: type === t ? '#E07B2A' : 'white', color: type === t ? 'white' : '#2D3748', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {t === 'entree' ? 'Entree du vehicule' : 'Sortie du vehicule'}
            </button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Schema du vehicule — cliquez sur une zone</div>
          <svg viewBox="0 0 600 280" style={{ width: '100%', display: 'block', background: '#f8f6f3', borderRadius: 8, marginBottom: 12 }}>
            <rect x="60" y="100" width="480" height="80" rx="10" fill="#D3D1C7" />
            <rect x="120" y="70" width="280" height="80" rx="8" fill="#B4B2A9" />
            <rect x="60" y="170" width="480" height="18" rx="4" fill="#B4B2A9" />
            <ellipse cx="140" cy="200" rx="30" ry="16" fill="#888780" />
            <ellipse cx="140" cy="200" rx="18" ry="10" fill="#5F5E5A" />
            <ellipse cx="460" cy="200" rx="30" ry="16" fill="#888780" />
            <ellipse cx="460" cy="200" rx="18" ry="10" fill="#5F5E5A" />
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

          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 12, color: '#888' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#E24B4A', marginRight: 4 }} />Grave</span>
            <span style={{ fontSize: 12, color: '#888' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#EF9F27', marginRight: 4 }} />Leger</span>
          </div>

          {selectedZone && (
            <div style={{ background: '#FDF0E6', borderRadius: 10, padding: '1rem', border: '1px solid #E07B2A' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748', marginBottom: 10 }}>{ZONES.find(z => z.id === selectedZone)?.label}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => toggleDommage(selectedZone, 'leger')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'leger' ? '#EF9F27' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'leger' ? '#FAEEDA' : 'white', color: '#854F0B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Leger</button>
                <button onClick={() => toggleDommage(selectedZone, 'grave')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'grave' ? '#E24B4A' : '#e8e2d9'), background: dommages[selectedZone]?.gravite === 'grave' ? '#FCEBEB' : 'white', color: '#791F1F', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Grave</button>
                {dommages[selectedZone] && <button onClick={() => { const n = {...dommages}; delete n[selectedZone]; setDommages(n) }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', color: '#888', cursor: 'pointer', fontSize: 13 }}>Effacer</button>}
              </div>
              {dommages[selectedZone] && (
                <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} placeholder="Description..." value={dommages[selectedZone]?.description || ''} onChange={e => setDommages((p: any) => ({ ...p, [selectedZone]: { ...p[selectedZone], description: e.target.value } }))} />
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[{ title: 'Controle interieur', items: CTRL_INT, state: controleInt, setter: setControleInt }, { title: 'Controle equipements', items: CTRL_EQ, state: controleEquip, setter: setControleEquip }].map(({ title, items, state, setter }) => (
            <div key={title} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 13, color: '#2D3748' }}>{item}</span>
                  <input type="checkbox" checked={state[item] || false} onChange={e => setter((p: any) => ({ ...p, [item]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Signature client</div>
          <canvas ref={sigCanvas} width={800} height={150} style={{ border: '1.5px dashed #e8e2d9', borderRadius: 8, width: '100%', cursor: 'crosshair', background: '#fafafa', display: 'block' }} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} />
          <button onClick={clearSig} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', color: '#888' }}>Effacer</button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 14, color: '#2D3748' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}