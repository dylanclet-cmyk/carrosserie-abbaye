'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [salarie, setSalarie] = useState<any>(null)
  const [salaries, setSalaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingSalarie, setEditingSalarie] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newSalarie, setNewSalarie] = useState({
    prenom: '', nom: '', email: '', password: '', role: 'technicien', taux_horaire: '38'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: sal } = await supabase.from('salaries').select('*').eq('email', user.email).single()
      if (sal?.role !== 'chef_atelier') { router.push('/'); return }
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

    // Créer le compte Auth via l'API Supabase Admin
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newSalarie.email,
        password: newSalarie.password,
        prenom: newSalarie.prenom,
        nom: newSalarie.nom,
        role: newSalarie.role,
        taux_horaire: parseFloat(newSalarie.taux_horaire) || 38
      })
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la creation' })
      setSaving(false)
      return
    }

    setMessage({ type: 'success', text: newSalarie.prenom + ' ' + newSalarie.nom + ' a ete cree avec succes !' })
    setSalaries([...salaries, result.salarie])
    setNewSalarie({ prenom: '', nom: '', email: '', password: '', role: 'technicien', taux_horaire: '38' })
    setShowForm(false)
    setSaving(false)
  }

  async function toggleActif(sal: any) {
    await supabase.from('salaries').update({ actif: !sal.actif }).eq('id', sal.id)
    setSalaries(salaries.map(s => s.id === sal.id ? { ...s, actif: !s.actif } : s))
  }

  async function updateTaux(sal: any, taux: string) {
    await supabase.from('salaries').update({ taux_horaire: parseFloat(taux) }).eq('id', sal.id)
    setSalaries(salaries.map(s => s.id === sal.id ? { ...s, taux_horaire: parseFloat(taux) } : s))
    setEditingSalarie(null)
    setMessage({ type: 'success', text: 'Taux horaire mis a jour' })
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1A1A1A', background: '#FFFFFF' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block' as const, marginBottom: 4, fontWeight: 600 }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#EDE5D8' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Administration — Gestion des salaries</span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: '#C8723A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nouveau salarie
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 820, margin: '0 auto' }}>

        {message && (
          <div style={{ background: message.type === 'success' ? '#EBF5EE' : '#FCEBEB', border: '1px solid ' + (message.type === 'success' ? '#A8D8B8' : '#E24B4A'), borderRadius: 12, padding: '0.75rem 1.25rem', marginBottom: 16, color: message.type === 'success' ? '#2A6B3A' : '#791F1F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{message.type === 'success' ? '✓' : '⚠'}</span> {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Total salaries</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>{salaries.length}</div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Actifs</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2A6B3A' }}>{salaries.filter(s => s.actif).length}</div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '1rem', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Techniciens</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#C8723A' }}>{salaries.filter(s => s.role === 'technicien').length}</div>
          </div>
        </div>

        {salaries.map(s => (
          <div key={s.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 10, opacity: s.actif ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: s.role === 'chef_atelier' ? '#C8723A' : '#F5DEC8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#C8723A', flexShrink: 0 }}>
                  {s.prenom?.[0]}{s.nom?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{s.prenom} {s.nom}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{s.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.role === 'chef_atelier' ? '#C8723A' : '#F5DEC8', color: s.role === 'chef_atelier' ? '#FFF' : '#7A3E10', fontWeight: 600 }}>
                      {s.role === 'chef_atelier' ? 'Chef atelier' : 'Technicien'}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.actif ? '#EBF5EE' : '#F1EFE8', color: s.actif ? '#2A6B3A' : '#888', fontWeight: 600 }}>
                      {s.actif ? 'Actif' : 'Inactif'}
                    </span>
                    {editingSalarie === s.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" defaultValue={s.taux_horaire} id={'taux-' + s.id} style={{ width: 70, padding: '3px 8px', borderRadius: 6, border: '1px solid #EDE5D8', fontSize: 12 }} />
                        <span style={{ fontSize: 11, color: '#888' }}>€/h</span>
                        <button onClick={() => { const val = (document.getElementById('taux-' + s.id) as HTMLInputElement)?.value; updateTaux(s, val) }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#2A6B3A', color: 'white', cursor: 'pointer' }}>OK</button>
                        <button onClick={() => setEditingSalarie(null)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', color: '#888' }}>Annuler</button>
                      </div>
                    ) : (
                      <span onClick={() => setEditingSalarie(s.id)} style={{ fontSize: 11, color: '#888', cursor: 'pointer', padding: '2px 8px', borderRadius: 20, background: '#FAF7F2' }}>
                        {s.taux_horaire}€/h ✏️
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {s.id !== salarie?.id && (
                  <button onClick={() => toggleActif(s)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #EDE5D8', background: s.actif ? '#FCEBEB' : '#EBF5EE', cursor: 'pointer', fontSize: 12, color: s.actif ? '#791F1F' : '#2A6B3A', fontWeight: 600 }}>
                    {s.actif ? 'Desactiver' : 'Reactiver'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>Nouveau salarie</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Un compte de connexion sera cree automatiquement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Prenom *</label><input style={inputStyle} value={newSalarie.prenom} onChange={e => setNewSalarie({ ...newSalarie, prenom: e.target.value })} placeholder="Julien" /></div>
              <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={newSalarie.nom} onChange={e => setNewSalarie({ ...newSalarie, nom: e.target.value })} placeholder="Martin" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Email * (sera utilise pour se connecter)</label><input style={inputStyle} type="email" value={newSalarie.email} onChange={e => setNewSalarie({ ...newSalarie, email: e.target.value })} placeholder="julien@carrosserie-abbaye.fr" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Mot de passe *</label><input style={inputStyle} type="password" value={newSalarie.password} onChange={e => setNewSalarie({ ...newSalarie, password: e.target.value })} placeholder="Minimum 6 caracteres" /></div>
              <div>
                <label style={labelStyle}>Role *</label>
                <select style={inputStyle} value={newSalarie.role} onChange={e => setNewSalarie({ ...newSalarie, role: e.target.value })}>
                  <option value="technicien">Technicien</option>
                  <option value="chef_atelier">Chef atelier</option>
                </select>
              </div>
              <div><label style={labelStyle}>Taux horaire (€/h)</label><input style={inputStyle} type="number" value={newSalarie.taux_horaire} onChange={e => setNewSalarie({ ...newSalarie, taux_horaire: e.target.value })} placeholder="38" /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); setMessage(null) }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1A1A1A' }}>Annuler</button>
              <button onClick={createSalarie} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C8723A', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving ? 'Creation en cours...' : 'Creer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}