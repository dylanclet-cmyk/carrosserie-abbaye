'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

function EtatsLieux({ dossierId, router }: { dossierId: string, router: any }) {
  const [etats, setEtats] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('etats_lieux').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false }).then(({ data }) => setEtats(data || []))
  }, [])

  if (etats.length === 0) return null

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Etats des lieux</div>
      {etats.map(e => (
        <div key={e.id} onClick={() => router.push('/etat-des-lieux/detail?id=' + e.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: e.type === 'entree' ? '#E6F1FB' : '#EAF3DE', color: e.type === 'entree' ? '#0C447C' : '#27500A' }}>
            {e.type === 'entree' ? 'Entree' : 'Sortie'}
          </span>
          <span style={{ fontSize: 13, color: '#2D3748', flex: 1 }}>{e.dommages?.length || 0} dommage{e.dommages?.length > 1 ? 's' : ''} note{e.dommages?.length > 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('fr-FR')}</span>
          {e.signature_client && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>Signe</span>}
          <span style={{ fontSize: 12, color: '#E07B2A' }}>Voir →</span>
        </div>
      ))}
    </div>
  )
}

function ProgressionHeures({ totalHeures, heuresEstimees }: { totalHeures: number, heuresEstimees: number }) {
  if (!heuresEstimees || heuresEstimees === 0) return null
  const pct = Math.min(Math.round(totalHeures / heuresEstimees * 100), 100)
  const depasse = totalHeures > heuresEstimees

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: depasse ? '2px solid #E24B4A' : '1px solid #e8e2d9', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Progression du chantier</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 28, fontWeight: 700, color: depasse ? '#E24B4A' : '#2D3748' }}>{totalHeures}h</span>
          <span style={{ fontSize: 16, color: '#888', marginLeft: 4 }}>/ {heuresEstimees}h estimees</span>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: depasse ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#3B6D11' }}>{pct}%</span>
      </div>
      <div style={{ height: 12, background: '#f0ede8', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: pct + '%', background: depasse ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#3B6D11', borderRadius: 6, transition: 'width 0.3s' }} />
      </div>
      {depasse ? (
        <div style={{ fontSize: 13, color: '#E24B4A', fontWeight: 600 }}>
          Depassement de {Math.round((totalHeures - heuresEstimees) * 10) / 10}h !
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#888' }}>
          Il reste <strong style={{ color: '#2D3748' }}>{Math.round((heuresEstimees - totalHeures) * 10) / 10}h</strong> disponibles
        </div>
      )}
    </div>
  )
}

export default function DossierPage() {
  const [dossier, setDossier] = useState<any>(null)
  const [heures, setHeures] = useState<any[]>([])
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newHeure, setNewHeure] = useState({ date: new Date().toISOString().split('T')[0], type_travail: 'debosselage', duree_heures: 2 })
  const [showTerminer, setShowTerminer] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [terminating, setTerminating] = useState(false)
  const [terminated, setTerminated] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      setSalarie(sal)
      const { data: dos } = await supabase.from('dossiers').select('*, clients(*), salaries(*)').eq('id', params.id).single()
      setDossier(dos)
      if (dos?.notes) setCommentaire(dos.notes)
      const { data: h } = await supabase.from('heures').select('*, salaries(*)').eq('dossier_id', params.id).order('date_travail', { ascending: false })
      setHeures(h || [])
      if (sal?.role === 'chef_atelier') {
        const { data: sals } = await supabase.from('salaries').select('*').eq('actif', true).eq('role', 'technicien')
        setSalaries(sals || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function addHeure() {
    const { data } = await supabase.from('heures').insert({
      dossier_id: params.id,
      salarie_id: salarie.id,
      date_travail: newHeure.date,
      type_travail: newHeure.type_travail,
      duree_heures: newHeure.duree_heures
    }).select('*, salaries(*)').single()
    if (data) setHeures([data, ...heures])
  }

  async function updateStatut(statut: string) {
    await supabase.from('dossiers').update({ statut }).eq('id', params.id)
    setDossier({ ...dossier, statut })
  }

  async function assignerTechnicien(salarie_id: string) {
    await supabase.from('dossiers').update({ salarie_id }).eq('id', params.id)
    const sal = salaries.find(s => s.id === salarie_id)
    setDossier({ ...dossier, salarie_id, salaries: sal })
  }

  async function terminerChantier() {
    setTerminating(true)
    await supabase.from('dossiers').update({
      statut: 'pret_restituer',
      notes: commentaire,
    }).eq('id', params.id)
    setDossier({ ...dossier, statut: 'pret_restituer', notes: commentaire })
    setTerminating(false)
    setTerminated(true)
    setShowTerminer(false)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

  const totalHeures = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
  const heuresEstimees = Number(dossier.heures_estimees) || 0
  const estTermine = dossier.statut === 'pret_restituer' || dossier.statut === 'termine'

  const typeLabels: any = {
    debosselage: 'Debosselage',
    peinture: 'Peinture',
    remplacement_piece: 'Remplacement piece',
    finition: 'Finition',
    controle_qualite: 'Controle qualite',
    autre: 'Autre'
  }

  const statusOptions = [
    { value: 'en_attente_signature', label: 'En attente signature' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'pret_restituer', label: 'Pret a restituer' },
    { value: 'termine', label: 'Termine' },
  ]

  const statusColors: any = {
    en_attente_signature: { color: '#854F0B', bg: '#FAEEDA' },
    en_cours: { color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { color: '#27500A', bg: '#EAF3DE' },
    termine: { color: '#444441', bg: '#F1EFE8' },
  }
  const sc = statusColors[dossier.statut] || statusColors.en_cours

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'white' }}>{dossier.immatriculation} — {dossier.marque} {dossier.modele}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
          {statusOptions.find(s => s.value === dossier.statut)?.label}
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>

        {terminated && (
          <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16, color: '#27500A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✓</span>
            Chantier termine ! Le chef a ete prevenu. Vehicule pret a restituer.
          </div>
        )}

        {dossier.notes && (
          <div style={{ background: '#FDF0E6', border: '2px solid #E07B2A', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Note du technicien {dossier.salaries ? '— ' + dossier.salaries.prenom + ' ' + dossier.salaries.nom : ''}
            </div>
            <div style={{ fontSize: 14, color: '#2D3748' }}>{dossier.notes}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Client</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748', marginBottom: 4 }}>{dossier.clients?.prenom} {dossier.clients?.nom}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>{dossier.clients?.telephone}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{dossier.clients?.assurance}</div>
            <div style={{ fontSize: 13, color: '#555' }}>Entree : <strong>{new Date(dossier.date_entree).toLocaleDateString('fr-FR')}</strong></div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Kilometrage : <strong>{dossier.km_entree?.toLocaleString()} km</strong></div>
            {salarie?.role === 'chef_atelier' && (
              <>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Statut</div>
                  <select onChange={e => updateStatut(e.target.value)} value={dossier.statut} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Technicien assigne</div>
                  <select onChange={e => assignerTechnicien(e.target.value)} value={dossier.salarie_id || ''} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                    <option value="">-- Choisir un technicien --</option>
                    {salaries.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Infos chantier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures saisies</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#2D3748' }}>{totalHeures} h</div>
              </div>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures estimees</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#E07B2A' }}>{heuresEstimees > 0 ? heuresEstimees + ' h' : '—'}</div>
              </div>
              {dossier.salaries && (
                <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Technicien assigne</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748' }}>{dossier.salaries.prenom} {dossier.salaries.nom}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ProgressionHeures totalHeures={totalHeures} heuresEstimees={heuresEstimees} />

        {!estTermine && salarie?.role === 'technicien' && !showTerminer && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setShowTerminer(true)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #3B6D11', background: '#EAF3DE', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ✓ Terminer le chantier et prevenir le chef
            </button>
          </div>
        )}

        {showTerminer && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '2px solid #3B6D11', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#27500A', marginBottom: 12 }}>Terminer le chantier</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Ajoutez une note pour le chef (supplement, anomalie, recommandation...)</div>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Ex : Supplement fait — remplacement filtre a air. Prevoir changement des pneus avant."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748', minHeight: 100, resize: 'vertical' as const, fontFamily: 'system-ui' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowTerminer(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748' }}>Annuler</button>
              <button onClick={terminerChantier} disabled={terminating} style={{ flex: 1, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3B6D11', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {terminating ? 'En cours...' : '✓ Confirmer — chantier termine'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=entree')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #E07B2A', background: '#E07B2A', cursor: 'pointer', fontSize: 13, color: 'white', fontWeight: 700 }}>
            Etat des lieux entree
          </button>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=sortie')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #2D3748', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748', fontWeight: 600 }}>
            Etat des lieux sortie
          </button>
        </div>

        <EtatsLieux dossierId={params.id as string} router={router} />

        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Saisie des heures</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, marginBottom: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Date</div>
              <input type="date" value={newHeure.date} onChange={e => setNewHeure({ ...newHeure, date: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Type</div>
              <select value={newHeure.type_travail} onChange={e => setNewHeure({ ...newHeure, type_travail: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Heures</div>
              <input type="number" min="0.5" max="12" step="0.5" value={newHeure.duree_heures} onChange={e => setNewHeure({ ...newHeure, duree_heures: Number(e.target.value) })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }} />
            </div>
            <button onClick={addHeure} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 20 }}>+ Ajouter</button>
          </div>
          {heures.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: '1rem' }}>Aucune heure saisie</div>
          ) : heures.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#f8f6f3', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#888', minWidth: 80 }}>{new Date(h.date_travail).toLocaleDateString('fr-FR')}</span>
              <span style={{ fontSize: 13, color: '#2D3748', flex: 1 }}>{typeLabels[h.type_travail] || h.type_travail}</span>
              <span style={{ fontSize: 13, color: '#555' }}>{h.salaries?.prenom} {h.salaries?.nom}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748', minWidth: 40 }}>{h.duree_heures} h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}