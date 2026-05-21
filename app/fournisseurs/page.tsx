'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nom: '', site_internet: '', franco_de_port: '', telephone: '', email: '', notes: ''
  })
  const [commerciaux, setCommerciaux] = useState<{ nom: string, telephone: string }[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('fournisseurs').select('*').order('nom')
      setFournisseurs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function resetForm() {
    setForm({ nom: '', site_internet: '', franco_de_port: '', telephone: '', email: '', notes: '' })
    setCommerciaux([])
    setEditingId(null)
  }

  function openEdit(f: any) {
    setForm({
      nom: f.nom || '',
      site_internet: f.site_internet || '',
      franco_de_port: f.franco_de_port?.toString() || '',
      telephone: f.telephone || '',
      email: f.email || '',
      notes: f.notes || '',
    })
    setCommerciaux(f.commerciaux || [])
    setEditingId(f.id)
    setShowForm(true)
  }

  async function saveFournisseur() {
    if (!form.nom) return
    setSaving(true)
    const data = {
      nom: form.nom,
      site_internet: form.site_internet,
      franco_de_port: parseFloat(form.franco_de_port) || 0,
      telephone: form.telephone,
      email: form.email,
      notes: form.notes,
      commerciaux: commerciaux.filter(c => c.nom),
    }
    if (editingId) {
      await supabase.from('fournisseurs').update(data).eq('id', editingId)
      setFournisseurs(fournisseurs.map(f => f.id === editingId ? { ...f, ...data } : f))
    } else {
      const { data: newF } = await supabase.from('fournisseurs').insert(data).select().single()
      if (newF) setFournisseurs([...fournisseurs, newF])
    }
    setSaving(false)
    setShowForm(false)
    resetForm()
  }

  async function deleteFournisseur(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return
    await supabase.from('fournisseurs').delete().eq('id', id)
    setFournisseurs(fournisseurs.filter(f => f.id !== id))
  }

  const filtered = fournisseurs.filter(f =>
    f.nom?.toLowerCase().includes(search.toLowerCase()) ||
    f.site_internet?.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE5D8', fontSize: 14, color: '#1A1A1A', background: '#FFFFFF', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#888', display: 'block', marginBottom: 4, fontWeight: 500 }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#C8723A', padding: '0 1.5rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer', color: '#FAF7F2' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ color: '#FAF7F2', fontSize: 14, fontWeight: 500 }}>Fournisseurs ({fournisseurs.length})</span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} style={{ background: 'rgba(255,255,255,0.2)', color: '#FAF7F2', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Nouveau
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>

        {/* Recherche */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            style={{ ...inputStyle, paddingLeft: 40 }} />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: 16 }}>🔍</span>
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }}>×</button>}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '3rem', textAlign: 'center', color: '#999', border: '1px solid #EDE5D8', fontSize: 13 }}>
            {search ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur — cliquez sur "+ Nouveau" pour en ajouter'}
          </div>
        ) : filtered.map(f => (
          <div key={f.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #EDE5D8', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F5DEC8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: '#7A3E10', flexShrink: 0 }}>
                    {f.nom?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{f.nom}</div>
                    {f.site_internet && (
                      <a href={f.site_internet.startsWith('http') ? f.site_internet : 'https://' + f.site_internet}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#C8723A', textDecoration: 'none' }}>
                        🌐 {f.site_internet}
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: f.commerciaux?.length > 0 ? 8 : 0 }}>
                  {f.franco_de_port > 0 && (
                    <span style={{ fontSize: 12, background: '#EBF5EE', color: '#2A6B3A', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
                      Franco : {f.franco_de_port}€
                    </span>
                  )}
                  {f.telephone && (
                    <a href={'tel:' + f.telephone} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>
                      📞 {f.telephone}
                    </a>
                  )}
                  {f.email && (
                    <a href={'mailto:' + f.email} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>
                      ✉ {f.email}
                    </a>
                  )}
                </div>

                {f.commerciaux?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: '#C8723A', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Commerciaux</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {f.commerciaux.map((c: any, i: number) => (
                        <div key={i} style={{ background: '#F4F0EA', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#1A1A1A' }}>
                          <strong>{c.nom}</strong>{c.telephone && <span style={{ color: '#888' }}> · {c.telephone}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {f.notes && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: '#FFF8F3', borderRadius: 6, fontSize: 12, color: '#7A3E10', border: '1px solid #E8C8A0' }}>
                    {f.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(f)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #C8723A', background: '#FFF0E6', cursor: 'pointer', fontSize: 12, color: '#C8723A', fontWeight: 500 }}>Modifier</button>
                <button onClick={() => deleteFournisseur(f.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #F09595', background: '#FFF0F0', cursor: 'pointer', fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>Supprimer</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', marginBottom: 20 }}>
              {editingId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Nom *</label><input style={inputStyle} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Axalta, PPG..." /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Site internet</label><input style={inputStyle} value={form.site_internet} onChange={e => setForm({ ...form, site_internet: e.target.value })} placeholder="www.fournisseur.fr" /></div>
              <div><label style={labelStyle}>Franco de port (€)</label><input style={inputStyle} type="number" value={form.franco_de_port} onChange={e => setForm({ ...form, franco_de_port: e.target.value })} placeholder="150" /></div>
              <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="04 XX XX XX XX" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@fournisseur.fr" /></div>
            </div>

            {/* Commerciaux */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={labelStyle}>Commerciaux</label>
                <button onClick={() => setCommerciaux([...commerciaux, { nom: '', telephone: '' }])}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #C8723A', background: '#FFF0E6', cursor: 'pointer', color: '#C8723A' }}>+ Ajouter</button>
              </div>
              {commerciaux.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} value={c.nom} onChange={e => setCommerciaux(commerciaux.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))} placeholder="Nom du commercial" />
                  <input style={inputStyle} value={c.telephone} onChange={e => setCommerciaux(commerciaux.map((x, j) => j === i ? { ...x, telephone: e.target.value } : x))} placeholder="Téléphone" />
                  <button onClick={() => setCommerciaux(commerciaux.filter((_, j) => j !== i))}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #F09595', background: '#FFF0F0', cursor: 'pointer', color: '#A32D2D', fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Conditions, remarques..." /></div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowForm(false); resetForm() }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #EDE5D8', background: '#FFFFFF', cursor: 'pointer', fontSize: 14, color: '#1A1A1A' }}>Annuler</button>
              <button onClick={saveFournisseur} disabled={saving || !form.nom} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: form.nom ? '#C8723A' : '#EDE5D8', color: '#FFF', cursor: form.nom ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 500 }}>
                {saving ? 'Sauvegarde...' : editingId ? '✓ Modifier' : '✓ Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}