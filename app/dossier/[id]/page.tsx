use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function DossierPage() {
  const [dossier, setDossier] = useState<any>(null)
  const [heures, setHeures] = useState<any[]>([])
  const [salarie, setSalarie] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newHeure, setNewHeure] = useState({ date: new Date().toISOString().split('T')[0], type_travail: 'debosselage', duree_heures: 2 })
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
      const { data: h } = await supabase.from('heures').select('*, salaries(*)').eq('dossier_id', params.id).order('date_travail', { ascending: false })
      setHeures(h || [])
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

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>
  if (!dossier) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Dossier introuvable</div>

  const totalHeures = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
  const coutMO = Math.round(totalHeures * (salarie?.taux_horaire || 38))
  const rentabilite = dossier.devis_montant > 0 ? Math.round((dossier.devis_montant - coutMO) / dossier.devis_montant * 100) : null

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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
        <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'white' }}>{dossier.immatriculation} — {dossier.marque} {dossier.modele}</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Client</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#2D3748', marginBottom: 4 }}>{dossier.clients?.prenom} {dossier.clients?.nom}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>{dossier.clients?.telephone}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{dossier.clients?.assurance}</div>
            <div style={{ fontSize: 13, color: '#555' }}>Entree : <strong>{new Date(dossier.date_entree).toLocaleDateString('fr-FR')}</strong></div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Kilometrage : <strong>{dossier.km_entree?.toLocaleString()} km</strong></div>
            {salarie?.role === 'chef_atelier' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Statut</div>
                <select onChange={e => updateStatut(e.target.value)} value={dossier.statut} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e8e2d9', fontSize: 13, color: '#2D3748' }}>
                  {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #e8e2d9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E07B2A', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>Rentabilite</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Heures saisies</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#2D3748' }}>{totalHeures} h</div>
              </div>
              <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Cout MO</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#A32D2D' }}>{coutMO} €</div>
              </div>
              {salarie?.role === 'chef_atelier' && (
                <>
                  <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Devis</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#3B6D11' }}>{dossier.devis_montant ? dossier.devis_montant + ' €' : '—'}</div>
                  </div>
                  <div style={{ background: '#f8f6f3', borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Rentabilite</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: rentabilite && rentabilite >= 50 ? '#3B6D11' : '#A32D2D' }}>{rentabilite !== null ? rentabilite + ' %' : '—'}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=entree')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #E07B2A', background: '#E07B2A', cursor: 'pointer', fontSize: 13, color: 'white', fontWeight: 700 }}>
            Etat des lieux entree
          </button>
          <button onClick={() => router.push('/etat-des-lieux?dossier=' + params.id + '&type=sortie')} style={{ padding: '10px 18px', borderRadius: 8, border: '2px solid #2D3748', background: 'white', cursor: 'pointer', fontSize: 13, color: '#2D3748', fontWeight: 600 }}>
            Etat des lieux sortie
          </button>
        </div>

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
              <span style={{ fontSize: 12, color: '#888' }}>{Math.round(Number(h.duree_heures) * (h.salaries?.taux_horaire || 38))} €</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
