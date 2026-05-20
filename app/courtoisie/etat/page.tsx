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

export default function EtatLieuxCourtoisie() {
  const [type, setType] = useState<'depart' | 'retour'>('depart')
  const [pret, setPret] = useState<any>(null)
  const [pretId, setPretId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dommages, setDommages] = useState<any>({})
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [controleInt, setControleInt] = useState<any>({})
  const [controleEquip, setControleEquip] = useState<any>({})
  const [kmReleve, setKmReleve] = useState('')
  const [carburant, setCarburant] = useState('3/4')
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('pret')
    const t = params.get('type') as 'depart' | 'retour'
    if (t) setType(t)
    if (id) setPretId(id)
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (id) {
        const { data } = await supabase.from('prets_courtoisie').select('*, vehicules_courtoisie(*), dossiers(*, clients(*))').eq('id', id).single()
        setPret(data)
        if (data?.vehicules_courtoisie?.km_actuel) setKmReleve(data.vehicules_courtoisie.km_actuel.toString())
      }
      setLoading(false)
    }
    load()
  }, [])

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

  async function handleSave() {
    setSaving(true)
    const signature = hasSig ? sigCanvas.current!.toDataURL() : null
    const dommagesArray = Object.entries(dommages).map(([zone, v]: any) => ({ zone, gravite: v.gravite, description: v.description }))
    await supabase.from('etats_lieux_courtoisie').insert({
      pret_id: pretId,
      vehicule_id: pret?.vehicule_id,
      type,
      dommages: dommagesArray,
      controle_interieur: controleInt,
      controle_equipements: controleEquip,
      km_releve: parseInt(kmReleve) || 0,
      carburant,
      signature_client: signature,
      signe_le: signature ? new Date().toISOString() : null,
      signe_par: pret?.dossiers?.clients?.prenom + ' ' + pret?.dossiers?.clients?.nom,
    })
    if (type === 'retour') {
      await supabase.from('prets_courtoisie').update({ statut: 'rendu', date_retour: new Date().toISOString().split('T')[0], km_retour: parseInt(kmReleve) || 0, carburant_retour: carburant }).eq('id', pretId)
      await supabase.from('vehicules_courtoisie').update({ km_actuel: parseInt(kmReleve) || 0 }).eq('id', pret?.vehicule_id)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => router.push('/dossier/' + pret?.dossier_id), 1500)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!pret) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Pret introuvable</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>
          Etat des lieux courtoisie — {type === 'depart' ? 'Depart' : 'Retour'} — {pret?.vehicules_courtoisie?.immatriculation}
        </span>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
        {saved && <div style={{ background: '#EBF5EE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem', marginBottom: 16, color: '#2A6B3A', fontWeight: 600, textAlign: 'center' as const }}>Sauvegarde !</div>}

        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Vehicule de courtoisie</div><div style={{ fontSize: 14, fontWeight: 600, color: '#1C2A2F' }}>{pret?.vehicules_courtoisie?.immatriculation} — {pret?.vehicules_courtoisie?.marque} {pret?.vehicules_courtoisie?.modele}</div></div>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Client</div><div style={{ fontSize: 14, fontWeight: 600, color: '#1C2A2F' }}>{pret?.dossiers?.clients?.prenom} {pret?.dossiers?.clients?.nom}</div></div>
            <div><div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Retour prevu</div><div style={{ fontSize: 14, fontWeight: 600, color: '#1C2A2F' }}>{new Date(pret?.date_fin_prevue).toLocaleDateString('fr-FR')}</div></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {(['depart', 'retour'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '8px 20px', borderRadius: 8, border: '2px solid ' + (type === t ? '#C8723A' : '#EDE5D8'), background: type === t ? '#C8723A' : 'white', color: type === t ? 'white' : '#1C2A2F', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {t === 'depart' ? 'Etat des lieux depart' : 'Etat des lieux retour'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Kilometrage releve</div>
            <input type="number" value={kmReleve} onChange={e => setKmReleve(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 16, fontWeight: 700, color: '#1C2A2F' }} placeholder="Ex: 25340" />
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Niveau carburant</div>
            <select value={carburant} onChange={e => setCarburant(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 14, color: '#1C2A2F' }}>
              <option>vide</option><option>1/4</option><option>1/2</option><option>3/4</option><option>plein</option>
            </select>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.5rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Schema du vehicule</div>
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
                  <circle cx={z.x} cy={z.y} r={isSelected ? 14 : 10} fill={dmg ? color : 'rgba(224,123,42,0.15)'} stroke={color} strokeWidth={isSelected ? 2.5 : 1} />
                  {dmg && <text x={z.x} y={z.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{dmg.gravite === 'grave' ? '!' : '~'}</text>}
                </g>
              )
            })}
          </svg>
          {selectedZone && (
            <div style={{ background: '#FFF0E6', borderRadius: 10, padding: '1rem', border: '1px solid #C8723A' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2A2F', marginBottom: 10 }}>{ZONES.find(z => z.id === selectedZone)?.label}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => toggleDommage(selectedZone, 'leger')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'leger' ? '#EF9F27' : '#EDE5D8'), background: dommages[selectedZone]?.gravite === 'leger' ? '#FFF0E6' : 'white', color: '#7A3E10', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Leger</button>
                <button onClick={() => toggleDommage(selectedZone, 'grave')} style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid ' + (dommages[selectedZone]?.gravite === 'grave' ? '#E24B4A' : '#EDE5D8'), background: dommages[selectedZone]?.gravite === 'grave' ? '#FCEBEB' : 'white', color: '#791F1F', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Grave</button>
                {dommages[selectedZone] && <button onClick={() => { const n = {...dommages}; delete n[selectedZone]; setDommages(n) }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', color: '#888', cursor: 'pointer', fontSize: 13 }}>Effacer</button>}
              </div>
              {dommages[selectedZone] && <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE5D8', fontSize: 13, color: '#1C2A2F' }} placeholder="Description..." value={dommages[selectedZone]?.description || ''} onChange={e => setDommages((p: any) => ({ ...p, [selectedZone]: { ...p[selectedZone], description: e.target.value } }))} />}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[{ title: 'Controle interieur', items: CTRL_INT, state: controleInt, setter: setControleInt }, { title: 'Controle equipements', items: CTRL_EQ, state: controleEquip, setter: setControleEquip }].map(({ title, items, state, setter }) => (
            <div key={title} style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 13, color: '#1C2A2F' }}>{item}</span>
                  <input type="checkbox" checked={state[item] || false} onChange={e => setter((p: any) => ({ ...p, [item]: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1.25rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Signature client</div>
          <canvas ref={sigCanvas} width={800} height={150} style={{ border: '1.5px dashed #EDE5D8', borderRadius: 8, width: '100%', cursor: 'crosshair', background: '#fafafa', display: 'block' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} />
          <button onClick={() => { sigCanvas.current!.getContext('2d')!.clearRect(0, 0, 800, 150); setHasSig(false) }} style={{ marginTop: 8, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#888' }}>Effacer</button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1C2A2F' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#C8723A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {saving ? 'Sauvegarde...' : type === 'retour' ? 'Valider le retour' : 'Sauvegarder etat depart'}
          </button>
        </div>
      </div>
    </div>
  )
}