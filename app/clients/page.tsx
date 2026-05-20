'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [onglet, setOnglet] = useState<'clients' | 'vehicules'>('clients')
  const [searchImat, setSearchImat] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: c } = await supabase.from('clients').select('*').order('nom')
      setClients(c || [])
      const { data: d } = await supabase.from('dossiers').select('*, clients(*)').order('date_entree', { ascending: false })
      setDossiers(d || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.nom?.toLowerCase().includes(q) ||
      c.prenom?.toLowerCase().includes(q) ||
      c.telephone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      // Recherche par immatriculation via dossiers
      dossiers.some(d => d.client_id === c.id && d.immatriculation?.toLowerCase().includes(q))
    )
  })

  function getDossiersByClient(clientId: string) {
    return dossiers.filter(d => d.client_id === clientId)
  }

  function getLastImat(clientId: string) {
    const dos = getDossiersByClient(clientId)
    return dos.length > 0 ? dos[0].immatriculation : null
  }

  async function saveClient() {
    if (!editForm.nom) return
    setSaving(true)
    if (editForm.id) {
      await supabase.from('clients').update({
        nom: editForm.nom, prenom: editForm.prenom,
        telephone: editForm.telephone, email: editForm.email,
        assurance: editForm.assurance, num_police: editForm.num_police
      }).eq('id', editForm.id)
      setClients(clients.map(c => c.id === editForm.id ? { ...c, ...editForm } : c))
      setSelectedClient({ ...selectedClient, ...editForm })
    } else {
      const { data } = await supabase.from('clients').insert({
        nom: editForm.nom, prenom: editForm.prenom,
        telephone: editForm.telephone, email: editForm.email,
        assurance: editForm.assurance, num_police: editForm.num_police
      }).select().single()
      if (data) setClients([...clients, data])
    }
    setShowForm(false)
    setEditForm(null)
    setSaving(false)
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1C2A2F', background: '#FFFFFF' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 4, fontWeight: 600 }

  const vehiculesFiltres = searchImat.length >= 2 ? dossiers.filter(d => 
    d.immatriculation?.toLowerCase().includes(searchImat.toLowerCase())
  ) : []

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const statusColors: any = {
    en_attente_signature: { label: 'En attente', color: '#7A3E10', bg: '#FFF0E6' },
    en_cours: { label: 'En cours', color: '#0C447C', bg: '#E6F1FB' },
    pret_restituer: { label: 'Pret restituer', color: '#2A6B3A', bg: '#EBF5EE' },
    termine: { label: 'Termine', color: '#444', bg: '#F1EFE8' },
    facture: { label: 'Facture', color: '#3C3489', bg: '#EEEDFE' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Clients & Véhicules</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setOnglet('clients')} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: onglet === 'clients' ? 'rgba(255,255,255,0.3)' : 'transparent', color: '#FAF7F2', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>👤 Clients</button>
          <button onClick={() => setOnglet('vehicules')} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: onglet === 'vehicules' ? 'rgba(255,255,255,0.3)' : 'transparent', color: '#FAF7F2', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>🚗 Véhicules</button>
        </div>
        <button onClick={() => { setEditForm({ nom: '', prenom: '', telephone: '', email: '', assurance: '', num_police: '' }); setShowForm(true) }} style={{ background: '#C8723A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nouveau client
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>

        {onglet === 'clients' && (<>
        {/* Barre de recherche */}
        <div style={{ position: 'relative' as const, marginBottom: 20 }}>
          <span style={{ position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#888' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prenom, telephone, email ou immatriculation..."
            style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: 12, border: '2px solid #EDE5D8', fontSize: 14, color: '#1C2A2F', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }}
            onFocus={e => e.target.style.borderColor = '#C8723A'}
            onBlur={e => e.target.style.borderColor = '#EDE5D8'}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>×</button>
          )}
        </div>

        {search && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} pour "{search}"
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 1.5fr' : '1fr', gap: 20 }}>

          {/* Liste clients */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '2rem', textAlign: 'center' as const, color: '#888', border: '1px solid #EDE5D8' }}>
                {search ? 'Aucun client trouvé' : 'Aucun client dans la base'}
              </div>
            ) : filtered.map(c => {
              const lastImat = getLastImat(c.id)
              const nbDossiers = getDossiersByClient(c.id).length
              return (
                <div key={c.id} onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                  style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem 1.25rem', border: selectedClient?.id === c.id ? '2px solid #C8723A' : '1px solid #EDE5D8', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#C8723A', flexShrink: 0 }}>
                    {c.prenom?.[0]}{c.nom?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C2A2F' }}>{c.prenom} {c.nom}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{c.telephone}{c.email ? ' · ' + c.email : ''}</div>
                    {lastImat && <div style={{ fontSize: 11, color: '#C8723A', marginTop: 2, fontWeight: 600 }}>{lastImat}</div>}
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1C2A2F' }}>{nbDossiers}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>dossier{nbDossiers > 1 ? 's' : ''}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Fiche client */}
          {selectedClient && (
            <div>
              <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '1.25rem', border: '1px solid #EDE5D8', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#C8723A' }}>
                      {selectedClient.prenom?.[0]}{selectedClient.nom?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1C2A2F' }}>{selectedClient.prenom} {selectedClient.nom}</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{selectedClient.telephone}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditForm({ ...selectedClient }); setShowForm(true) }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #C8723A', background: '#FFFFFF', cursor: 'pointer', fontSize: 12, color: '#C8723A', fontWeight: 600 }}>Modifier</button>
                    <button onClick={() => router.push('/nouveau-dossier?client=' + selectedClient.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#C8723A', cursor: 'pointer', fontSize: 12, color: 'white', fontWeight: 600 }}>+ Nouveau dossier</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Email', value: selectedClient.email },
                    { label: 'Telephone', value: selectedClient.telephone },
                    { label: 'Assurance', value: selectedClient.assurance },
                    { label: 'N° police', value: selectedClient.num_police },
                  ].map(({ label, value }) => value ? (
                    <div key={label} style={{ background: '#FAF7F2', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2A2F' }}>{value}</div>
                    </div>
                  ) : null)}
                </div>

                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
                  Historique dossiers ({getDossiersByClient(selectedClient.id).length})
                </div>
                {getDossiersByClient(selectedClient.id).length === 0 ? (
                  <div style={{ textAlign: 'center' as const, color: '#888', fontSize: 13, padding: '1rem' }}>Aucun dossier</div>
                ) : getDossiersByClient(selectedClient.id).map(d => {
                  const sc = statusColors[d.statut] || statusColors.en_cours
                  return (
                    <div key={d.id} onClick={() => router.push('/dossier/' + d.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#FAF7F2', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C2A2F' }}>{d.immatriculation} — {d.marque} {d.modele}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Entree le {new Date(d.date_entree).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{sc.label}</span>
                      <span style={{ fontSize: 12, color: '#C8723A' }}>→</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      </> )}

      {/* Onglet véhicules */}
      {onglet === 'vehicules' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{ position: 'relative' as const, marginBottom: 20 }}>
            <span style={{ position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#888' }}>🔍</span>
            <input value={searchImat} onChange={e => setSearchImat(e.target.value)}
              placeholder="Rechercher par immatriculation (ex: AB-123-CD)..."
              style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: 12, border: '2px solid #EDE5D8', fontSize: 14, color: '#1A1A1A', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }}
              onFocus={e => e.target.style.borderColor = '#C8723A'}
              onBlur={e => e.target.style.borderColor = '#EDE5D8'}
              autoFocus />
            {searchImat && <button onClick={() => setSearchImat('')} style={{ position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#888' }}>×</button>}
          </div>

          {searchImat.length < 2 ? (
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '2rem', textAlign: 'center' as const, color: '#999', border: '1px solid #EDE5D8', fontSize: 13 }}>
              Tapez au moins 2 caractères pour rechercher un véhicule
            </div>
          ) : vehiculesFiltres.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '2rem', textAlign: 'center' as const, color: '#999', border: '1px solid #EDE5D8', fontSize: 13 }}>
              Aucun véhicule trouvé pour "{searchImat}"
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{vehiculesFiltres.length} dossier{vehiculesFiltres.length > 1 ? 's' : ''} trouvé{vehiculesFiltres.length > 1 ? 's' : ''}</div>
              {vehiculesFiltres.map(d => {
                const sc = statusColors[d.statut] || statusColors.en_cours
                return (
                  <div key={d.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{d.immatriculation}</span>
                          <span style={{ fontSize: 13, color: '#888' }}>{d.marque} {d.modele}</span>
                          {d.couleur && <span style={{ fontSize: 11, color: '#888', background: '#F4F0EA', padding: '2px 8px', borderRadius: 10 }}>{d.couleur}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                          Client : <strong style={{ color: '#1A1A1A' }}>{d.clients?.prenom} {d.clients?.nom}</strong>
                          {d.clients?.telephone && <span> · {d.clients.telephone}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          Entrée : {new Date(d.date_entree).toLocaleDateString('fr-FR')}
                          {d.km_entree > 0 && <span> · {d.km_entree?.toLocaleString()} km</span>}
                          {d.salaries && <span style={{ color: '#C8723A' }}> · {d.salaries.prenom} {d.salaries.nom}</span>}
                        </div>
                        {d.notes && <div style={{ marginTop: 6, padding: '4px 10px', background: '#FFF8F3', borderRadius: 6, fontSize: 12, color: '#7A3E10', border: '1px solid #E8C8A0' }}>{d.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 8 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' as const }}>{sc.label}</span>
                        <button onClick={() => router.push('/dossier/' + d.id)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: '1px solid #C8723A', background: 'transparent', cursor: 'pointer', color: '#C8723A', fontWeight: 500 }}>Voir</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {onglet === 'clients' && (
        <div style={{ display: 'none' }} />
      )}

      {/* Modal formulaire */}
      {showForm && editForm && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C2A2F', marginBottom: 20 }}>
              {editForm.id ? 'Modifier le client' : 'Nouveau client'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Prenom</label><input style={inputStyle} value={editForm.prenom || ''} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} placeholder="Pierre" /></div>
              <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={editForm.nom || ''} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} placeholder="Bernard" /></div>
              <div><label style={labelStyle}>Telephone</label><input style={inputStyle} value={editForm.telephone || ''} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} placeholder="06 12 34 56 78" /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@exemple.fr" /></div>
              <div><label style={labelStyle}>Assurance</label><input style={inputStyle} value={editForm.assurance || ''} onChange={e => setEditForm({ ...editForm, assurance: e.target.value })} placeholder="MAIF" /></div>
              <div><label style={labelStyle}>N° police</label><input style={inputStyle} value={editForm.num_police || ''} onChange={e => setEditForm({ ...editForm, num_police: e.target.value })} placeholder="88421" /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); setEditForm(null) }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1C2A2F' }}>Annuler</button>
              <button onClick={saveClient} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C8723A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving ? 'Sauvegarde...' : editForm.id ? 'Modifier' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}