'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PERMISSIONS = [
  { key: 'voir_tous_dossiers', label: 'Voir tous les dossiers', desc: 'Voir les dossiers des autres techniciens' },
  { key: 'creer_dossiers', label: 'Créer des dossiers', desc: 'Créer de nouveaux dossiers clients' },
  { key: 'facturer', label: 'Facturer', desc: 'Marquer un dossier comme facturé' },
  { key: 'acces_planning', label: 'Accès planning', desc: 'Voir le planning atelier' },
  { key: 'acces_clients', label: 'Accès clients', desc: 'Voir et modifier la base clients' },
  { key: 'acces_courtoisie', label: 'Accès courtoisie', desc: 'Gérer les véhicules de courtoisie' },
  { key: 'acces_stats', label: 'Accès statistiques', desc: 'Voir les stats et avis' },
  { key: 'acces_admin', label: 'Accès admin', desc: 'Gérer les salariés et paramètres' },
]

const ROLES = [
  { value: 'gerant', label: 'Gérant', color: '#C8723A', bg: '#FFF0E6' },
  { value: 'chef_atelier', label: 'Chef atelier', color: '#2A6B3A', bg: '#EBF5EE' },
  { value: 'technicien', label: 'Technicien', color: '#185FA5', bg: '#EBF3FC' },
  { value: 'apprenti', label: 'Apprenti', color: '#7A3E10', bg: '#FFF8F0' },
]

export default function AdminPage() {
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSalarie, setSelectedSalarie] = useState<any>(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [pendingHeures, setPendingHeures] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newSalarie, setNewSalarie] = useState({
    prenom: '', nom: '', email: '', password: '', role: 'technicien', taux_horaire: '38', heures_contrat: '35'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      if (sal?.role !== 'gerant' && sal?.role !== 'chef_atelier') { router.push('/'); return }
      setSalarie(sal)
      const { data: sals } = await supabase.from('salaries').select('*').order('nom')
      setSalaries(sals || [])
      setLoading(false)
    }
    load()
  }, [])

  async function createSalarie() {
    if (!newSalarie.email || !newSalarie.password || !newSalarie.nom || !newSalarie.prenom) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' })
      return
    }
    setSaving(true)
    setMessage(null)
    const defaultPerms = {
      voir_tous_dossiers: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      creer_dossiers: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      facturer: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      acces_planning: true,
      acces_clients: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      acces_courtoisie: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      acces_stats: ['gerant', 'chef_atelier'].includes(newSalarie.role),
      acces_admin: newSalarie.role === 'gerant',
    }
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSalarie, taux_horaire: parseFloat(newSalarie.taux_horaire) || 38, heures_contrat: parseFloat(newSalarie.heures_contrat) || 35, permissions: defaultPerms })
    })
    const result = await response.json()
    if (!response.ok) { setMessage({ type: 'error', text: result.error || 'Erreur' }); setSaving(false); return }
    setMessage({ type: 'success', text: newSalarie.prenom + ' ' + newSalarie.nom + ' créé !' })
    setSalaries([...salaries, result.salarie])
    setNewSalarie({ prenom: '', nom: '', email: '', password: '', role: 'technicien', taux_horaire: '38', heures_contrat: '35' })
    setShowForm(false)
    setSaving(false)
  }

  async function toggleActif(sal: any) {
    await supabase.from('salaries').update({ actif: !sal.actif }).eq('id', sal.id)
    setSalaries(salaries.map(s => s.id === sal.id ? { ...s, actif: !s.actif } : s))
  }

  async function deleteSalarie(id: string) {
    if (!confirm('Supprimer définitivement ce salarié ?')) return
    await supabase.from('salaries').delete().eq('id', id)
    setSalaries(salaries.filter(s => s.id !== id))
    setMessage({ type: 'success', text: 'Salarié supprimé' })
  }

  async function updateTaux(sal: any, taux: string) {
    await supabase.from('salaries').update({ taux_horaire: parseFloat(taux) }).eq('id', sal.id)
    setSalaries(salaries.map(s => s.id === sal.id ? { ...s, taux_horaire: parseFloat(taux) } : s))
  }

  async function updatePermissions(salarieId: string, permissions: any) {
    await supabase.from('salaries').update({ permissions }).eq('id', salarieId)
    setSalaries(salaries.map(s => s.id === salarieId ? { ...s, permissions } : s))
    setSelectedSalarie((prev: any) => prev ? { ...prev, permissions } : prev)
  }

  async function saveChanges() {
    if (!selectedSalarie) return
    setSaving(true)
    const updates: any = {}
    if (pendingRole !== null) updates.role = pendingRole
    if (pendingHeures !== null) updates.heures_contrat = pendingHeures
    if (Object.keys(updates).length > 0) {
      await supabase.from('salaries').update(updates).eq('id', selectedSalarie.id)
      setSalaries(salaries.map(s => s.id === selectedSalarie.id ? { ...s, ...updates } : s))
      setSelectedSalarie((prev: any) => prev ? { ...prev, ...updates } : prev)
    }
    setPendingRole(null)
    setPendingHeures(null)
    setMessage({ type: 'success', text: 'Modifications enregistrées !' })
    setSaving(false)
    setShowPermissions(false)
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1A1A1A', background: '#FFFFFF', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#888', display: 'block', marginBottom: 4, fontWeight: 500 }
  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[2]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer', color: '#FAF7F2' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Administration</span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: 'rgba(255,255,255,0.2)', color: '#FAF7F2', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ Nouveau salarié</button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>
        {message && (
          <div style={{ background: message.type === 'success' ? '#EBF5EE' : '#FFF0F0', border: '1px solid ' + (message.type === 'success' ? '#A8D8B8' : '#F09595'), borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: message.type === 'success' ? '#2A6B3A' : '#A32D2D', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            {message.type === 'success' ? '✓' : '⚠'} {message.text}
            <button onClick={() => setMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 16 }}>×</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {ROLES.map(r => (
            <div key={r.value} style={{ background: '#FFFFFF', borderRadius: 10, padding: '12px 14px', border: '1px solid #EDE5D8' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: r.color }}>{salaries.filter(s => s.role === r.value).length}</div>
            </div>
          ))}
        </div>

        {salaries.map(s => {
          const roleInfo = getRoleInfo(s.role)
          return (
            <div key={s.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 10, opacity: s.actif ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5DEC8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, color: '#7A3E10', flexShrink: 0 }}>
                    {s.prenom?.[0]}{s.nom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{s.prenom} {s.nom}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{s.email}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: roleInfo.bg, color: roleInfo.color, fontWeight: 500 }}>{roleInfo.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.actif ? '#EBF5EE' : '#F4F0EA', color: s.actif ? '#2A6B3A' : '#888' }}>{s.actif ? 'Actif' : 'Inactif'}</span>
                      <span style={{ fontSize: 11, color: '#C8723A' }}>{s.taux_horaire}€/h · {s.heures_contrat || 35}h/sem</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setSelectedSalarie(s); setPendingRole(null); setPendingHeures(null); setShowPermissions(true) }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #C8723A', background: '#FFF0E6', cursor: 'pointer', fontSize: 12, color: '#C8723A', fontWeight: 500 }}>Modifier</button>
                  {s.id !== salarie?.id && <>
                    <button onClick={() => toggleActif(s)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #EDE5D8', background: s.actif ? '#FFF0F0' : '#EBF5EE', cursor: 'pointer', fontSize: 12, color: s.actif ? '#A32D2D' : '#2A6B3A', fontWeight: 500 }}>{s.actif ? 'Désactiver' : 'Réactiver'}</button>
                    <button onClick={() => deleteSalarie(s.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #F09595', background: '#FFF0F0', cursor: 'pointer', fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>Supprimer</button>
                  </>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showPermissions && selectedSalarie && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F5DEC8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: '#7A3E10' }}>
                {selectedSalarie.prenom?.[0]}{selectedSalarie.nom?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A' }}>{selectedSalarie.prenom} {selectedSalarie.nom}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{selectedSalarie.email}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Rôle</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {ROLES.map(r => {
                  const currentRole = pendingRole || selectedSalarie.role
                  return (
                    <button key={r.value} onClick={() => setPendingRole(r.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid ' + (currentRole === r.value ? r.color : '#EDE5D8'), background: currentRole === r.value ? r.bg : '#FFFFFF', cursor: 'pointer', fontSize: 13, color: currentRole === r.value ? r.color : '#888', fontWeight: currentRole === r.value ? 500 : 400 }}>
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16, padding: '14px 16px', background: '#FFF8F3', borderRadius: 10, border: '1px solid #E8C8A0' }}>
              <label style={{ ...labelStyle, color: '#C8723A' }}>Heures contractuelles / semaine</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" min={1} max={48}
                  value={pendingHeures !== null ? pendingHeures : (selectedSalarie.heures_contrat || 35)}
                  onChange={e => setPendingHeures(parseFloat(e.target.value))}
                  style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #EDE5D8', fontSize: 16, fontWeight: 500, color: '#1A1A1A', background: '#FFFFFF', textAlign: 'center' }} />
                <span style={{ fontSize: 14, color: '#888' }}>heures / semaine</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Taux horaire (€/h)</label>
              <input type="number" defaultValue={selectedSalarie.taux_horaire || 38}
                style={{ ...inputStyle, width: 120 }}
                onBlur={e => updateTaux(selectedSalarie, e.target.value)} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8723A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Permissions</div>
            {PERMISSIONS.map(p => {
              const perms = selectedSalarie.permissions || {}
              const isActive = perms[p.key] || false
              return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F4F0EA' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{p.desc}</div>
                  </div>
                  <button onClick={() => updatePermissions(selectedSalarie.id, { ...perms, [p.key]: !isActive })}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: isActive ? '#C8723A' : '#EDE5D8', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, left: isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
                  </button>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowPermissions(false); setSelectedSalarie(null); setPendingRole(null); setPendingHeures(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1A1A1A' }}>Annuler</button>
              <button onClick={saveChanges} disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#C8723A', color: '#FFF', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                {saving ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>Nouveau salarié</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Un compte de connexion sera créé automatiquement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Prénom *</label><input style={inputStyle} value={newSalarie.prenom} onChange={e => setNewSalarie({ ...newSalarie, prenom: e.target.value })} placeholder="Julien" /></div>
              <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={newSalarie.nom} onChange={e => setNewSalarie({ ...newSalarie, nom: e.target.value })} placeholder="Martin" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Email *</label><input style={inputStyle} type="email" value={newSalarie.email} onChange={e => setNewSalarie({ ...newSalarie, email: e.target.value })} placeholder="julien@carrosserie-abbaye.fr" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Mot de passe *</label><input style={inputStyle} type="password" value={newSalarie.password} onChange={e => setNewSalarie({ ...newSalarie, password: e.target.value })} placeholder="Minimum 6 caractères" /></div>
              <div>
                <label style={labelStyle}>Rôle *</label>
                <select style={inputStyle} value={newSalarie.role} onChange={e => setNewSalarie({ ...newSalarie, role: e.target.value })}>
                  <option value="gerant">Gérant</option>
                  <option value="chef_atelier">Chef atelier</option>
                  <option value="technicien">Technicien</option>
                  <option value="apprenti">Apprenti</option>
                </select>
              </div>
              <div><label style={labelStyle}>Taux (€/h)</label><input style={inputStyle} type="number" value={newSalarie.taux_horaire} onChange={e => setNewSalarie({ ...newSalarie, taux_horaire: e.target.value })} placeholder="38" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Heures contrat / semaine</label><input style={inputStyle} type="number" value={newSalarie.heures_contrat} onChange={e => setNewSalarie({ ...newSalarie, heures_contrat: e.target.value })} placeholder="35" /></div>
            </div>
            {message && message.type === 'error' && <div style={{ background: '#FFF0F0', border: '1px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>{message.text}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); setMessage(null) }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1A1A1A' }}>Annuler</button>
              <button onClick={createSalarie} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C8723A', color: '#FFFFFF', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{saving ? 'Création...' : 'Créer le compte'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}