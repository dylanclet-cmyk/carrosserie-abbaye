'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AvisPage() {
  const [mode, setMode] = useState<'client' | 'salarie'>('client')
  const [dossier, setDossier] = useState<any>(null)
  const [salarie, setSalarie] = useState<any>(null)
  const [avis, setAvis] = useState<any[]>([])
  const [note, setNote] = useState(0)
  const [hoverNote, setHoverNote] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [moyenneNote, setMoyenneNote] = useState(0)
  const [onglet, setOnglet] = useState<'laisser' | 'lire'>('laisser')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dossierId = params.get('dossier')
    const modeParam = params.get('mode')
    if (modeParam === 'salarie') setMode('salarie')

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (modeParam === 'salarie' && user) {
        const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
        setSalarie(sal)
        if (sal) {
          const { data: avisData } = await supabase.from('avis').select('*, dossiers(immatriculation, marque, modele)').eq('salarie_id', sal.id).order('created_at', { ascending: false })
          setAvis(avisData || [])
          if (avisData && avisData.length > 0) {
            const moy = avisData.reduce((a, v) => a + v.note, 0) / avisData.length
            setMoyenneNote(Math.round(moy * 10) / 10)
          }
        }
      } else if (dossierId) {
        const { data: dos } = await supabase.from('dossiers').select('*, clients(*), salaries(*)').eq('id', dossierId).single()
        setDossier(dos)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function submitAvis() {
    if (note === 0) { alert('Veuillez choisir une note'); return }
    setSaving(true)
    await supabase.from('avis').insert({
      dossier_id: dossier.id,
      salarie_id: dossier.salarie_id,
      note,
      commentaire: commentaire || null,
      client_nom: dossier.clients?.prenom + ' ' + dossier.clients?.nom,
    })
    setSaved(true)
    setSaving(false)
  }

  function getEncouragement(moy: number) {
    if (moy === 0) return { emoji: '🌟', texte: 'Pas encore d avis — continuez comme ca !' }
    if (moy >= 4.5) return { emoji: '🏆', texte: 'Excellent ! Vos clients vous adorent !' }
    if (moy >= 4) return { emoji: '🌟', texte: 'Super travail ! Continuez comme ca !' }
    if (moy >= 3.5) return { emoji: '👍', texte: 'Bon travail ! Encore un petit effort !' }
    if (moy >= 3) return { emoji: '💪', texte: 'Vous progressez ! Ne lachez pas !' }
    return { emoji: '🎯', texte: 'Du travail a faire — vous pouvez y arriver !' }
  }

  function renderStars(note: number, size = 32, interactive = false, onHover?: (n: number) => void, onClick?: (n: number) => void) {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i}
            style={{ fontSize: size, cursor: interactive ? 'pointer' : 'default', filter: i <= (hoverNote || note) ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'transform 0.1s', transform: interactive && i <= (hoverNote || note) ? 'scale(1.1)' : 'scale(1)' }}
            onMouseEnter={() => interactive && onHover && onHover(i)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            onClick={() => interactive && onClick && onClick(i)}
          >⭐</span>
        ))}
      </div>
    )
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888', textAlign: 'center' as const }}>Chargement...</div>

  // Mode client — laisser un avis
  if (mode === 'client') {
    if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

    if (saved) {
      return (
        <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '3rem', maxWidth: 480, width: '90%', textAlign: 'center' as const, boxShadow: '0 4px 30px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2A2F', marginBottom: 8 }}>Merci pour votre avis !</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Votre retour nous aide a nous ameliorer.</div>
            {renderStars(note, 36)}
            <div style={{ marginTop: 24, fontSize: 14, color: '#1C2A2F', fontWeight: 600 }}>Carrosserie de l Abbaye</div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '2rem', maxWidth: 500, width: '100%', boxShadow: '0 4px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 60, objectFit: 'contain', marginBottom: 12 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1C2A2F', marginBottom: 4 }}>Comment s est passee votre reparation ?</div>
            <div style={{ fontSize: 13, color: '#888' }}>{dossier.immatriculation} — {dossier.marque} {dossier.modele}</div>
            {dossier.salaries && <div style={{ fontSize: 13, color: '#C8723A', marginTop: 4 }}>Technicien : {dossier.salaries.prenom} {dossier.salaries.nom}</div>}
          </div>

          <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>Votre satisfaction globale</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderStars(note, 44, true, setHoverNote, setNote)}
            </div>
            {note > 0 && (
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: note >= 4 ? '#2A6B3A' : note >= 3 ? '#7A3E10' : '#A32D2D' }}>
                {note === 5 ? 'Excellent !' : note === 4 ? 'Tres bien !' : note === 3 ? 'Bien' : note === 2 ? 'Peut mieux faire' : 'Decevant'}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Un commentaire ? (optionnel)</label>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
              placeholder="Dites-nous ce que vous avez pense de notre service..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1C2A2F', minHeight: 90, resize: 'none' as const, fontFamily: 'system-ui', boxSizing: 'border-box' as const }} />
          </div>

          <button onClick={submitAvis} disabled={saving || note === 0} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: note === 0 ? '#ccc' : '#C8723A', color: 'white', cursor: note === 0 ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}>
            {saving ? 'Envoi...' : 'Envoyer mon avis'}
          </button>
        </div>
      </div>
    )
  }

  // Mode salarié — voir ses avis
  const encourage = getEncouragement(moyenneNote)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Mes avis clients</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOnglet('laisser')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'laisser' ? '#C8723A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Ma note</button>
          <button onClick={() => setOnglet('lire')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'lire' ? '#C8723A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Tous les avis ({avis.length})</button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 820, margin: '0 auto' }}>

        {onglet === 'laisser' && (
          <>
            {/* Carte note globale */}
            <div style={{ background: moyenneNote >= 4 ? '#EBF5EE' : moyenneNote >= 3 ? '#FFF0E6' : 'white', borderRadius: 16, padding: '2rem', border: '1px solid #EDE5D8', marginBottom: 20, textAlign: 'center' as const }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{encourage.emoji}</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Votre note moyenne</div>
              <div style={{ fontSize: 56, fontWeight: 700, color: moyenneNote >= 4 ? '#2A6B3A' : moyenneNote >= 3 ? '#7A3E10' : '#A32D2D', marginBottom: 8 }}>
                {moyenneNote > 0 ? moyenneNote.toFixed(1) : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                {moyenneNote > 0 ? renderStars(Math.round(moyenneNote), 28) : <span style={{ fontSize: 13, color: '#888' }}>Aucun avis pour le moment</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C2A2F' }}>{encourage.texte}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{avis.length} avis au total</div>
            </div>

            {/* Stats par note */}
            {avis.length > 0 && (
              <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Repartition des notes</div>
                {[5, 4, 3, 2, 1].map(n => {
                  const count = avis.filter(a => a.note === n).length
                  const pct = avis.length > 0 ? (count / avis.length) * 100 : 0
                  return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#1C2A2F', minWidth: 20 }}>{n}⭐</span>
                      <div style={{ flex: 1, height: 10, background: '#f0ede8', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: n >= 4 ? '#2A6B3A' : n === 3 ? '#EF9F27' : '#E24B4A', borderRadius: 5 }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#888', minWidth: 30 }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {onglet === 'lire' && (
          <div>
            {avis.length === 0 ? (
              <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '2rem', textAlign: 'center' as const, color: '#888', border: '1px solid #EDE5D8' }}>
                Aucun avis pour le moment
              </div>
            ) : avis.map(a => (
              <div key={a.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2A2F' }}>{a.client_nom || 'Client anonyme'}</div>
                    {a.dossiers && <div style={{ fontSize: 12, color: '#888' }}>{a.dossiers.immatriculation} — {a.dossiers.marque} {a.dossiers.modele}</div>}
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 20, filter: i <= a.note ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>)}
                  </div>
                </div>
                {a.commentaire && (
                  <div style={{ background: '#FAF7F2', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#1C2A2F', fontStyle: 'italic' as const }}>
                    "{a.commentaire}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}