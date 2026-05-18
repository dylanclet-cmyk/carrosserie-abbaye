'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function PDFPage() {
  const [dossier, setDossier] = useState<any>(null)
  const [heures, setHeures] = useState<any[]>([])
  const [etats, setEtats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: dos } = await supabase.from('dossiers').select('*, clients(*), salaries(*)').eq('id', params.id).single()
      setDossier(dos)
      const { data: h } = await supabase.from('heures').select('*, salaries(*)').eq('dossier_id', params.id).order('date_travail', { ascending: false })
      setHeures(h || [])
      const { data: e } = await supabase.from('etats_lieux').select('*').eq('dossier_id', params.id).order('created_at')
      setEtats(e || [])
      setLoading(false)
    }
    load()
  }, [])

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const orange = [224, 123, 42] as [number, number, number]
    const dark = [45, 55, 72] as [number, number, number]
    const gray = [136, 136, 136] as [number, number, number]
    const lightBg = [248, 246, 243] as [number, number, number]

    let y = 0

    // Header
    doc.setFillColor(...dark)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Carrosserie de l\'Abbaye', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Fiche dossier — ' + (dossier?.immatriculation || ''), 14, 20)
    doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR'), 150, 20)

    y = 38

    // Statut badge
    const statusLabels: any = {
      en_attente_signature: 'En attente signature',
      en_cours: 'En cours',
      pret_restituer: 'Pret a restituer',
      termine: 'Termine',
      facture: 'Facture',
    }
    doc.setFillColor(...orange)
    doc.roundedRect(14, y - 5, 50, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(statusLabels[dossier?.statut] || '', 39, y, { align: 'center' })

    y += 10

    // Section Client et Vehicule
    doc.setFillColor(...lightBg)
    doc.rect(14, y, 85, 45, 'F')
    doc.rect(111, y, 85, 45, 'F')

    doc.setTextColor(...orange)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT', 18, y + 7)
    doc.text('VEHICULE', 115, y + 7)

    doc.setTextColor(...dark)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text((dossier?.clients?.prenom || '') + ' ' + (dossier?.clients?.nom || ''), 18, y + 14)
    doc.text(dossier?.immatriculation || '', 115, y + 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.text(dossier?.clients?.telephone || '', 18, y + 20)
    doc.text(dossier?.clients?.email || '', 18, y + 26)
    doc.text((dossier?.clients?.assurance || '') + (dossier?.clients?.num_police ? ' — ' + dossier?.clients?.num_police : ''), 18, y + 32)

    doc.setTextColor(...dark)
    doc.text((dossier?.marque || '') + ' ' + (dossier?.modele || '') + ' — ' + (dossier?.couleur || ''), 115, y + 20)
    doc.text('Entree : ' + (dossier?.date_entree ? new Date(dossier.date_entree).toLocaleDateString('fr-FR') : ''), 115, y + 26)
    doc.text('Kilometrage : ' + (dossier?.km_entree?.toLocaleString() || '0') + ' km', 115, y + 32)
    doc.text('Carburant : ' + (dossier?.carburant_entree || ''), 115, y + 38)

    y += 53

    // Technicien et heures
    doc.setFillColor(...lightBg)
    doc.rect(14, y, 182, 20, 'F')
    doc.setTextColor(...orange)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('INFOS CHANTIER', 18, y + 7)
    doc.setTextColor(...dark)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const totalH = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
    const heuresEst = Number(dossier?.heures_estimees) || 0
    doc.text('Technicien : ' + (dossier?.salaries ? dossier.salaries.prenom + ' ' + dossier.salaries.nom : 'Non assigne'), 18, y + 13)
    doc.text('Heures saisies : ' + totalH + 'h', 90, y + 13)
    doc.text('Heures estimees : ' + (heuresEst > 0 ? heuresEst + 'h' : '—'), 140, y + 13)

    y += 28

    // Note technicien
    if (dossier?.notes) {
      doc.setFillColor(253, 240, 230)
      doc.rect(14, y, 182, 16, 'F')
      doc.setDrawColor(...orange)
      doc.setLineWidth(0.5)
      doc.rect(14, y, 182, 16, 'S')
      doc.setTextColor(...orange)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTE DU TECHNICIEN', 18, y + 6)
      doc.setTextColor(...dark)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const noteLines = doc.splitTextToSize(dossier.notes, 170)
      doc.text(noteLines[0], 18, y + 12)
      y += 24
    }

    // Heures détail
    if (heures.length > 0) {
      doc.setTextColor(...orange)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DETAIL DES HEURES', 14, y)
      y += 6

      doc.setFillColor(...dark)
      doc.rect(14, y, 182, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text('Date', 18, y + 5)
      doc.text('Type de travail', 50, y + 5)
      doc.text('Technicien', 110, y + 5)
      doc.text('Heures', 170, y + 5)
      y += 9

      const typeLabels: any = {
        debosselage: 'Debosselage', peinture: 'Peinture',
        remplacement_piece: 'Remplacement piece', finition: 'Finition',
        controle_qualite: 'Controle qualite', autre: 'Autre'
      }

      heures.forEach((h, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...lightBg)
          doc.rect(14, y - 3, 182, 7, 'F')
        }
        doc.setTextColor(...dark)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(new Date(h.date_travail).toLocaleDateString('fr-FR'), 18, y + 2)
        doc.text(typeLabels[h.type_travail] || h.type_travail, 50, y + 2)
        doc.text((h.salaries?.prenom || '') + ' ' + (h.salaries?.nom || ''), 110, y + 2)
        doc.text(h.duree_heures + 'h', 170, y + 2)
        y += 7
      })

      // Total
      doc.setFillColor(...orange)
      doc.rect(14, y, 182, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL', 110, y + 5)
      doc.text(totalH + 'h', 170, y + 5)
      y += 14
    }

    // États des lieux
    if (etats.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setTextColor(...orange)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('ETATS DES LIEUX', 14, y)
      y += 6

      etats.forEach(e => {
        doc.setFillColor(...lightBg)
        doc.rect(14, y, 182, 10, 'F')
        doc.setTextColor(...dark)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const typeLabel = e.type === 'entree' ? 'Entree' : 'Sortie'
        doc.text(typeLabel + ' — ' + new Date(e.created_at).toLocaleDateString('fr-FR'), 18, y + 6)
        doc.text((e.dommages?.length || 0) + ' dommage(s) note(s)', 80, y + 6)
        if (e.signature_client) {
          doc.setTextColor(39, 80, 10)
          doc.text('Signe', 160, y + 6)
        }
        y += 12
      })
    }

    // Footer
    doc.setFillColor(...dark)
    doc.rect(0, 285, 210, 12, 'F')
    doc.setTextColor(160, 174, 192)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Carrosserie de l\'Abbaye — Document genere automatiquement le ' + new Date().toLocaleDateString('fr-FR'), 105, 292, { align: 'center' })

    doc.save('dossier-' + (dossier?.immatriculation || 'export') + '.pdf')
  }

  if (loading) return <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#888' }}>Chargement...</div>

  const totalHeures = heures.reduce((a, h) => a + Number(h.duree_heures), 0)
  const typeLabels: any = {
    debosselage: 'Debosselage', peinture: 'Peinture',
    remplacement_piece: 'Remplacement piece', finition: 'Finition',
    controle_qualite: 'Controle qualite', autre: 'Autre'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2D3748', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: '1px solid #4a5568', background: 'transparent', cursor: 'pointer', color: '#e8e2d9' }}>← Retour</button>
          <img src="/logo.png" alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Export PDF — {dossier?.immatriculation}</span>
        </div>
        <button onClick={exportPDF} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          Telecharger le PDF
        </button>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid #e8e2d9', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Client</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3748' }}>{dossier?.clients?.prenom} {dossier?.clients?.nom}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{dossier?.clients?.telephone}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{dossier?.clients?.assurance}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Vehicule</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2D3748' }}>{dossier?.immatriculation}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{dossier?.marque} {dossier?.modele} — {dossier?.couleur}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Entree : {dossier?.date_entree ? new Date(dossier.date_entree).toLocaleDateString('fr-FR') : ''}</div>
            </div>
          </div>

          {dossier?.notes && (
            <div style={{ background: '#FDF0E6', border: '1px solid #E07B2A', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#E07B2A', fontWeight: 700, marginBottom: 4 }}>NOTE TECHNICIEN</div>
              <div style={{ fontSize: 13, color: '#2D3748' }}>{dossier.notes}</div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #e8e2d9', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Heures ({totalHeures}h total)</div>
            {heures.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 12, color: '#888', minWidth: 80 }}>{new Date(h.date_travail).toLocaleDateString('fr-FR')}</span>
                <span style={{ fontSize: 12, color: '#2D3748', flex: 1 }}>{typeLabels[h.type_travail] || h.type_travail}</span>
                <span style={{ fontSize: 12, color: '#555' }}>{h.salaries?.prenom} {h.salaries?.nom}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3748' }}>{h.duree_heures}h</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' as const }}>
          <button onClick={exportPDF} style={{ background: '#E07B2A', color: 'white', border: 'none', borderRadius: 10, padding: '14px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Telecharger le PDF
          </button>
        </div>
      </div>
    </div>
  )
}