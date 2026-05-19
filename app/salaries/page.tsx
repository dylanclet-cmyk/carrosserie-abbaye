'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SalariesPage() {
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [conges, setConges] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'equipe' | 'messagerie'>('equipe')
  const [selectedSalarie, setSelectedSalarie] = useState<any>(null)
  const [conversation, setConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      const { data: sals } = await supabase.from('salaries').select('*').eq('actif', true).order('nom')
      setSalaries(sals || [])
      const { data: c } = await supabase.from('conges').select('*, salaries(*)').order('created_at', { ascending: false })
      setConges(c || [])
      // Charger messages
      const { data: msgs } = await supabase.from('messages').select('*, expediteur:expediteur_id(prenom, nom), destinataire:destinataire_id(prenom, nom)').order('created_at', { ascending: true })
      setMessages(msgs || [])
      // Marquer messages recus comme lus
      if (sal) {
        await supabase.from('messages').update({ lu: true }).eq('destinataire_id', sal.id).eq('lu', false)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, conversation])

  function getCongesSalarie(salarieId: string) {
    return conges.filter(c => c.salarie_id === salarieId)
  }

  function getJoursMaladie(salarieId: string) {
    const annee = new Date().getFullYear()
    return conges.filter(c => c.salarie_id === salarieId && c.type === 'maladie' && c.statut === 'accepte' && c.date_debut?.startsWith(annee.toString())).reduce((a, c) => a + (c.nb_jours || 0), 0)
  }

  function getCongesEnCours(salarieId: string) {
    const today = new Date().toISOString().split('T')[0]
    return conges.find(c => c.salarie_id === salarieId && c.statut === 'accepte' && c.date_debut <= today && c.date_fin >= today)
  }

  function getConversation(avecId: string) {
    return messages.filter(m =>
      (m.expediteur_id === salarie?.id && m.destinataire_id === avecId) ||
      (m.expediteur_id === avecId && m.destinataire_id === salarie?.id)
    )
  }

  function getMessagesGeneraux() {
    return messages.filter(m => m.type === 'general')
  }

  function getNonLus(avecId: string) {
    return messages.filter(m => m.expediteur_id === avecId && m.destinataire_id === salarie?.id && !m.lu).length
  }

  async function sendMessage(destinataireId: string | null) {
    if (!newMessage.trim()) return
    setSending(true)
    const { data } = await supabase.from('messages').insert({
      expediteur_id: salarie.id,
      destinataire_id: destinataireId,
      contenu: newMessage,
      type: destinataireId ? 'message' : 'general'
    }).select('*, expediteur:expediteur_id(prenom, nom), destinataire:destinataire_id(prenom, nom)').single()
    if (data) setMessages([...messages, data])
    setNewMessage('')
    setSending(false)
  }

  async function sendFile(destinataireId: string | null, file: File) {
    if (!file) return
    setUploadingFile(true)
    const path = 'messages/' + salarie.id + '/' + Date.now() + '_' + file.name
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (error) { setUploadingFile(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const { data } = await supabase.from('messages').insert({
      expediteur_id: salarie.id,
      destinataire_id: destinataireId,
      contenu: null,
      fichier_url: urlData.publicUrl,
      fichier_nom: file.name,
      type: 'fichier'
    }).select('*, expediteur:expediteur_id(prenom, nom), destinataire:destinataire_id(prenom, nom)').single()
    if (data) setMessages([...messages, data])
    setUploadingFile(false)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const typeLabels: any = { conge: 'Conge paye', rtt: 'RTT', maladie: 'Arret maladie', autre: 'Autre' }
  const statutColors: any = {
    en_attente: { color: '#854F0B', bg: '#FAEEDA' },
    accepte: { color: '#27500A', bg: '#EAF3DE' },
    refuse: { color: '#791F1F', bg: '#FCEBEB' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Equipe & Messagerie</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOnglet('equipe')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'equipe' ? '#E07B2A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Equipe</button>
          <button onClick={() => setOnglet('messagerie')} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: onglet === 'messagerie' ? '#E07B2A' : 'transparent', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Messagerie</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>

        {onglet === 'equipe' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedSalarie ? '1fr 1.5fr' : '1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', marginBottom: 16 }}>Equipe ({salaries.length} salaries)</div>
              {salaries.map(s => {
                const congesEnCours = getCongesEnCours(s.id)
                const joursMal = getJoursMaladie(s.id)
                const congesSal = getCongesSalarie(s.id)
                return (
                  <div key={s.id} onClick={() => setSelectedSalarie(selectedSalarie?.id === s.id ? null : s)} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: selectedSalarie?.id === s.id ? '2px solid #E07B2A' : '1px solid #e8e2d9', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.role === 'chef_atelier' ? '#2D3748' : '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: s.role === 'chef_atelier' ? '#E07B2A' : '#E07B2A', flexShrink: 0 }}>
                          {s.prenom?.[0]}{s.nom?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748' }}>{s.prenom} {s.nom}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{s.email}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: s.role === 'chef_atelier' ? '#2D3748' : '#FDF0E6', color: s.role === 'chef_atelier' ? '#E07B2A' : '#854F0B', fontWeight: 600 }}>
                              {s.role === 'chef_atelier' ? 'Chef atelier' : 'Technicien'}
                            </span>
                            {congesEnCours && (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: congesEnCours.type === 'maladie' ? '#FCEBEB' : '#EAF3DE', color: congesEnCours.type === 'maladie' ? '#791F1F' : '#27500A', fontWeight: 600 }}>
                                {congesEnCours.type === 'maladie' ? '🔴 En arret' : '🟡 En conge'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: 11, color: '#888' }}>Maladie {new Date().getFullYear()}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: joursMal >= 10 ? '#A32D2D' : joursMal >= 5 ? '#854F0B' : '#3B6D11' }}>{joursMal}j</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedSalarie && (
              <div>
                <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#E07B2A' }}>
                      {selectedSalarie.prenom?.[0]}{selectedSalarie.nom?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#2D3748' }}>{selectedSalarie.prenom} {selectedSalarie.nom}</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{selectedSalarie.email}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{selectedSalarie.role === 'chef_atelier' ? 'Chef atelier' : 'Technicien'} · {selectedSalarie.taux_horaire}€/h</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Maladie {new Date().getFullYear()}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: getJoursMaladie(selectedSalarie.id) >= 10 ? '#A32D2D' : '#2D3748' }}>{getJoursMaladie(selectedSalarie.id)}j</div>
                    </div>
                    <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Total absences</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#2D3748' }}>{getCongesSalarie(selectedSalarie.id).filter(c => c.statut === 'accepte').reduce((a, c) => a + (c.nb_jours || 0), 0)}j</div>
                    </div>
                    <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Demandes</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#2D3748' }}>{getCongesSalarie(selectedSalarie.id).length}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Historique conges & arrets</div>
                  {getCongesSalarie(selectedSalarie.id).length === 0 ? (
                    <div style={{ textAlign: 'center' as const, color: '#888', fontSize: 13, padding: '1rem' }}>Aucun conge ou arret</div>
                  ) : getCongesSalarie(selectedSalarie.id).map(c => {
                    const sc = statutColors[c.statut] || statutColors.en_attente
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f0ede8', color: '#555' }}>{typeLabels[c.type]}</span>
                        <span style={{ fontSize: 12, color: '#2D3748', flex: 1 }}>{new Date(c.date_debut).toLocaleDateString('fr-FR')} → {new Date(c.date_fin).toLocaleDateString('fr-FR')}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{c.nb_jours}j</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600 }}>{c.statut}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {onglet === 'messagerie' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, height: 'calc(100vh - 120px)' }}>
            {/* Sidebar conversations */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e2d9', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e2d9', fontSize: 13, fontWeight: 700, color: '#2D3748' }}>Conversations</div>
              <div style={{ flex: 1, overflowY: 'auto' as const }}>
                {/* Message general */}
                <div onClick={() => setConversation('general')} style={{ padding: '12px 16px', cursor: 'pointer', background: conversation === 'general' ? '#FDF0E6' : 'white', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2D3748', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>General</div>
                    <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>Message a toute l equipe</div>
                  </div>
                </div>
                {/* Conversations individuelles */}
                {salaries.filter(s => s.id !== salarie?.id).map(s => {
                  const nonLus = getNonLus(s.id)
                  const lastMsg = messages.filter(m => (m.expediteur_id === salarie?.id && m.destinataire_id === s.id) || (m.expediteur_id === s.id && m.destinataire_id === salarie?.id)).slice(-1)[0]
                  return (
                    <div key={s.id} onClick={() => setConversation(s.id)} style={{ padding: '12px 16px', cursor: 'pointer', background: conversation === s.id ? '#FDF0E6' : 'white', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#E07B2A', flexShrink: 0 }}>
                        {s.prenom?.[0]}{s.nom?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: nonLus > 0 ? 700 : 600, color: '#2D3748' }}>{s.prenom} {s.nom}</div>
                        <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {lastMsg ? (lastMsg.fichier_nom || lastMsg.contenu || 'Fichier') : 'Aucun message'}
                        </div>
                      </div>
                      {nonLus > 0 && <span style={{ background: '#E24B4A', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>{nonLus}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Zone messages */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e2d9', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
              {!conversation ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>
                  Selectionnez une conversation
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e2d9', fontSize: 14, fontWeight: 700, color: '#2D3748', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {conversation === 'general' ? '📢 General — toute l equipe' : (() => { const s = salaries.find(s => s.id === conversation); return s ? s.prenom + ' ' + s.nom : '' })()}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px' }}>
                    {(conversation === 'general' ? getMessagesGeneraux() : getConversation(conversation)).map(m => {
                      const isMine = m.expediteur_id === salarie?.id
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                          {!isMine && (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FDF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#E07B2A', flexShrink: 0, marginRight: 8 }}>
                              {m.expediteur?.prenom?.[0]}{m.expediteur?.nom?.[0]}
                            </div>
                          )}
                          <div style={{ maxWidth: '70%' }}>
                            {!isMine && <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{m.expediteur?.prenom} {m.expediteur?.nom}</div>}
                            <div style={{ background: isMine ? '#E07B2A' : '#f8f6f3', color: isMine ? 'white' : '#2D3748', padding: '10px 14px', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 13 }}>
                              {m.fichier_url ? (
                                <a href={m.fichier_url} target="_blank" rel="noreferrer" style={{ color: isMine ? 'white' : '#E07B2A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>📄</span> {m.fichier_nom}
                                </a>
                              ) : m.contenu}
                            </div>
                            <div style={{ fontSize: 10, color: '#aaa', marginTop: 3, textAlign: isMine ? 'right' : 'left' as const }}>
                              {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {new Date(m.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e2d9', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <label style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e8e2d9', background: '#f8f6f3', cursor: 'pointer', fontSize: 16, flexShrink: 0 }} title="Envoyer un fichier PDF">
                      📎
                      <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(conversation === 'general' ? null : conversation, f) }} disabled={uploadingFile} />
                    </label>
                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(conversation === 'general' ? null : conversation) } }}
                      placeholder="Ecrire un message... (Entree pour envoyer)"
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', resize: 'none' as const, minHeight: 40, maxHeight: 100, fontFamily: 'system-ui' }} rows={1} />
                    <button onClick={() => sendMessage(conversation === 'general' ? null : conversation)} disabled={sending || !newMessage.trim()}
                      style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#E07B2A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {sending ? '...' : '→'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}