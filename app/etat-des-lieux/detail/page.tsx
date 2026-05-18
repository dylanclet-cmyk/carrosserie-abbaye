'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const ZONES_LABELS: any = {
  aile_av_g: 'Aile avant gauche',
  aile_av_d: 'Aile avant droite',
  capot: 'Capot',
  pare_choc_av: 'Pare-chocs avant',
  porte_av_g: 'Porte avant gauche',
  porte_av_d: 'Porte avant droite',
  porte_ar_g: 'Porte arriere gauche',
  porte_ar_d: 'Porte arriere droite',
  aile_ar_g: 'Aile arriere gauche',
  aile_ar_d: 'Aile arriere droite',
  coffre: 'Coffre',
  toit: 'Toit',
}

const ZONES_POS: any = {
  aile_av_g: { x: 120, y: 80 },
  aile_av_d: { x: 120, y: 200 },
  capot: { x: 80, y: 140 },
  pare_choc_av: { x: 40, y: 140 },
  porte_av_g: { x: 220, y: 80 },
  porte_av_d: { x: 220, y: 200 },
  porte_ar_g: { x: 320, y: 80 },
  porte_ar_d: { x: 320, y: 200 },
  aile_ar_g: { x: 420, y: 80 },
  aile_ar_d: { x: 420, y: 200 },
  coffre: { x: 480, y: 140 },
  toit: { x: 270, y: 140 },
}

function DetailContent() {
  const [etat, setEtat] = useState<any>(null)
  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const etatId = searchParams.get('id')
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (etatId) {
        const { data: e } = await supabase.from('etats_lieux').select('*').eq('id', etatId).single()
        setEtat(e)
        if (e?.dossier_id) {
          const { data: d } = await supabase.from('dossiers').select('*, clients(*)').eq('id', e.dossier_id).single()
          setDossier(d)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!etat) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Etat des lieux introuvable</div>

  const dommages = etat.dommages || []
  const controleInt = etat.controle_interieur || {}
  const controleEquip = etat.controle_equipements || {}

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>
          Detail etat des lieux — {etat.type === 'entree' ? 'Entree' : 'Sortie'}
          {dossier && ' — ' + dossier.immatriculation}
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Vehicule</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748' }}>{dossier?.immatriculation} — {dossier?.marque} {dossier?.modele}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748' }}>{dossier?.clients?.prenom} {dossier?.clients?.nom}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748' }}>{new Date(etat.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Type</div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: etat.type === 'entree' ? '#E6F1FB' : '#EAF3DE', color: etat.type === 'entree' ? '#0C447C' : '#27500A' }}>
                {etat.type === 'entree' ? 'Entree' : 'Sortie'}
              </span>
            </div>
            {etat.signe_par && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Signe par</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3748' }}>{etat.signe_par}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>Schema des dommages</div>
          <svg viewBox="0 0 600 280" style={{ width: '100%', display: 'block', background: '#f8f6f3', borderRadius: 8, marginBottom: 16 }}>
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
            {dommages.map((d: any) => {
              const pos = ZONES_POS[d.zone]
              if (!pos) return null
              const color = d.gravite === 'grave' ? '#E24B4A' : '#EF9F27'
              return (
                <g key={d.zone}>
                  <circle cx={pos.x} cy={pos.y} r={12} fill={color} stroke="white" strokeWidth={1.5} />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{d.gravite === 'grave' ? '!' : '~'}</text>
                </g>
              )
            })}
          </svg>

          {dommages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: '1rem' }}>Aucun dommage note</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Detail des dommages</div>
              {dommages.map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.gravite === 'grave' ? '#E24B4A' : '#EF9F27', flexShrink: 0, marginTop: 4, display: 'inline-block' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{ZONES_LABELS[d.zone] || d.zone}</div>
                    {d.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{d.description}</div>}
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: d.gravite === 'grave' ? '#FCEBEB' : '#FAEEDA', color: d.gravite === 'grave' ? '#791F1F' : '#854F0B' }}>{d.gravite}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Controle interieur</div>
            {Object.entries(controleInt).map(([item, val]: any) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#2D3748' }}>{item}</span>
                <span style={{ fontSize: 14, color: val ? '#3B6D11' : '#A32D2D' }}>{val ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Controle equipements</div>
            {Object.entries(controleEquip).map(([item, val]: any) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#2D3748' }}>{item}</span>
                <span style={{ fontSize: 14, color: val ? '#3B6D11' : '#A32D2D' }}>{val ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>

        {etat.signature_client && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Signature client</div>
            <img src={etat.signature_client} alt="Signature" style={{ border: '1px solid #e8e2d9', borderRadius: 8, maxWidth: '100%', background: '#fafafa' }} />
            {etat.signe_le && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                Signe le {new Date(etat.signe_le).toLocaleDateString('fr-FR')} a {new Date(etat.signe_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function EtatDetail() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>}>
      <DetailContent />
    </Suspense>
  )
}
