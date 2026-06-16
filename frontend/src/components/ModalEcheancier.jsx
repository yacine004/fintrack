import { useState, useEffect, useCallback } from 'react'

const TODAY = new Date()
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

// ── Helpers barème ISM 2025-2026 ──────────────────────────────────────────────

export function getNiveau(classe) {
  const c = (classe || '').toUpperCase()
  if (c.includes('M2')) return 'M2'
  if (c.includes('M1')) return 'M1'
  if (c.includes('L3')) return 'L3'
  if (c.includes('L2')) return 'L2'
  return 'L1'
}

export function genererEcheancier(niveau) {
  const fraisMensuel = niveau === 'M1' ? 100000 : niveau === 'M2' ? 97500 : 95000

  const inscription = [
    { key: 'ins1', date: new Date(2025, 8,  5), label: "Tranche 1/4 — Droits d'inscription", montant: 112500 },
    { key: 'ins2', date: new Date(2025, 9,  5), label: "Tranche 2/4 — Droits d'inscription", montant: 112500 },
    { key: 'ins3', date: new Date(2026, 0,  5), label: "Tranche 3/4 — Droits d'inscription", montant: 112500 },
    { key: 'ins4', date: new Date(2026, 1,  5), label: "Tranche 4/4 — Droits d'inscription", montant: 112500 },
  ]

  const moisData = [
    ['Septembre 2025', new Date(2025, 8,  5)],
    ['Octobre 2025',   new Date(2025, 9,  5)],
    ['Novembre 2025',  new Date(2025, 10, 5)],
    ['Décembre 2025',  new Date(2025, 11, 5)],
    ['Janvier 2026',   new Date(2026, 0,  5)],
    ['Février 2026',   new Date(2026, 1,  5)],
    ['Mars 2026',      new Date(2026, 2,  5)],
    ['Avril 2026',     new Date(2026, 3,  5)],
    ['Mai 2026',       new Date(2026, 4,  5)],
    ['Juin 2026',      new Date(2026, 5,  5)],
  ]
  const scolarite = moisData.map(([mois, date], i) => ({
    key: `sc${i + 1}`, date, label: `Mensualité — ${mois}`, montant: fraisMensuel
  }))

  const encadrement = niveau === 'L3' ? [
    { key: 'enc1', date: new Date(2026, 2, 5), label: 'Encadrement & Soutenance de mémoire', montant: 75000 },
  ] : []

  const totalInscription = 4 * 112500
  const totalScolarite   = 10 * fraisMensuel
  const totalEncadrement = niveau === 'L3' ? 75000 : 0
  const totalAnnuel      = totalInscription + totalScolarite + totalEncadrement

  return { inscription, scolarite, encadrement, totalInscription, totalScolarite, totalEncadrement, totalAnnuel, niveau, fraisMensuel }
}

export function calculerStatuts(echeancier, totalPaye) {
  const all = [...echeancier.inscription, ...echeancier.scolarite, ...echeancier.encadrement]
  let budget = totalPaye
  const statuts = {}
  for (const item of all) {
    if (budget >= item.montant) {
      statuts[item.key] = 'paye'
      budget -= item.montant
    } else {
      statuts[item.key] = item.date <= TODAY ? 'du' : 'attente'
    }
  }
  return statuts
}

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal Paiement (partagée) ─────────────────────────────────────────────────

export function ModalPaiement({ etudiants, caisses, defaultEtudiant, onClose, onSave, onRecu, zIndex = 1000 }) {
  const [form, setForm] = useState({
    id_etudiant: defaultEtudiant?.id?.toString() || '',
    id_caisse: '', montant: '',
    mode_paiement: 'especes', motif: '', reference: ''
  })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.id_etudiant || !form.id_caisse || !form.montant || !form.mode_paiement) {
      setErreur('Étudiant, caisse, montant et mode sont obligatoires')
      return
    }
    if (parseFloat(form.montant) <= 0) { setErreur('Le montant doit être positif'); return }
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/paiements`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...form, montant: parseFloat(form.montant) })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      setSuccess(data)
    } catch { setErreur('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
  }

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px',
          width: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#16A34A', fontSize: '22px', margin: '0 0 8px' }}>Paiement enregistré !</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
            Montant : <strong>{parseFloat(form.montant).toLocaleString('fr-FR')} FCFA</strong>
          </p>
          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Nouveau solde caisse</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>
              {success.nouveau_solde?.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => onRecu?.(success.paiement.id)}
              style={{ padding: '10px 20px', background: '#1B3A6B', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              🖨️ Voir le reçu PDF
            </button>
            <button onClick={() => { onSave(); onClose() }}
              style={{ padding: '10px 20px', background: '#F1F5F9', color: '#374151',
                border: '1.5px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1B3A6B', fontWeight: '700' }}>💳 Enregistrer un paiement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Étudiant *</label>
            <select name="id_etudiant" value={form.id_etudiant} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner un étudiant</option>
              {etudiants.map(e => (
                <option key={e.id} value={e.id}>
                  {e.matricule} — {e.prenom} {e.nom} ({e.classe})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Montant (FCFA) *</label>
              <input name="montant" type="number" value={form.montant} onChange={handleChange}
                placeholder="150000" min="0" step="500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mode de paiement *</label>
              <select name="mode_paiement" value={form.mode_paiement} onChange={handleChange} style={inputStyle}>
                <option value="especes">💵 Espèces</option>
                <option value="virement">🏦 Virement</option>
                <option value="cheque">📝 Chèque</option>
                <option value="wave">📱 Wave</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Caisse *</label>
            <select name="id_caisse" value={form.id_caisse} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner une caisse</option>
              {caisses.filter(c => c.statut === 'active').map(c => (
                <option key={c.id} value={c.id}>
                  {c.nom} — Solde : {c.solde_actuel.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Motif</label>
            <input name="motif" value={form.motif} onChange={handleChange}
              placeholder="Ex: Frais de scolarité Semestre 1" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Référence / N° reçu</label>
            <input name="reference" value={form.reference} onChange={handleChange}
              placeholder="Ex: VIR-2026-001" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#1B3A6B',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳ Enregistrement...' : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Échéancier ISM 2025-2026 (composant partagé) ───────────────────────

export default function ModalEcheancier({ etudiant, caisses, etudiants, onClose, onRefresh }) {
  const [paiementsEtu, setPaiementsEtu] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showPaiement, setShowPaiement] = useState(false)

  const chargerPaiements = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/paiements?etudiant_id=${etudiant.id}&limit=200`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setPaiementsEtu(data.paiements)
    } catch { /* network */ }
    finally { setLoading(false) }
  }, [etudiant.id])

  // eslint-disable-next-line
  useEffect(() => { chargerPaiements() }, [chargerPaiements])

  const niveau      = getNiveau(etudiant.classe)
  const echeancier  = genererEcheancier(niveau)
  const totalPaye   = paiementsEtu.reduce((s, p) => s + parseFloat(p.montant), 0)
  const statuts     = calculerStatuts(echeancier, totalPaye)
  const resteAPayer = Math.max(0, echeancier.totalAnnuel - totalPaye)

  const handleRecu = async (id) => {
    try {
      const res = await fetch(`${API}/paiements/${id}/recu`, { headers: getHeaders() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'
      a.download = `recu_FT${String(id).padStart(5, '0')}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Erreur de connexion') }
  }

  const getBadge = (key) => {
    const s = statuts[key]
    if (s === 'paye') return { bg: '#F0FDF4', color: '#16A34A', label: '✅ Payé' }
    if (s === 'du')   return { bg: '#FEF2F2', color: '#DC2626', label: '❌ Dû' }
    return { bg: '#F8FAFC', color: '#94A3B8', label: '🕐 En attente' }
  }

  const TH = { padding: '8px 14px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' }
  const TD = { padding: '10px 14px', fontSize: '13px', color: '#475569' }

  const renderSection = (titre, items, headerColor, headerBg, totalSection) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ background: headerColor, color: '#fff', padding: '10px 16px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '14px' }}>{titre}</span>
        <span style={{ fontSize: '13px', opacity: 0.9 }}>{totalSection.toLocaleString('fr-FR')} FCFA</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E2E8F0', borderTop: 'none' }}>
        <thead>
          <tr style={{ background: headerBg }}>
            <th style={TH}>Échéance</th>
            <th style={TH}>Libellé</th>
            <th style={{ ...TH, textAlign: 'right' }}>Montant</th>
            <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const badge  = getBadge(item.key)
            const rowBg  = statuts[item.key] === 'paye' ? '#F0FDF4' : statuts[item.key] === 'du' ? '#FFF5F5' : '#fff'
            return (
              <tr key={item.key} style={{ background: rowBg, borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ ...TD, color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</td>
                <td style={{ ...TD, color: '#1E293B', fontWeight: '500' }}>{item.label}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: '700', color: '#1B3A6B' }}>
                  {item.montant.toLocaleString('fr-FR')} FCFA
                </td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', width: '820px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', marginBottom: '24px' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #2D5FA8 100%)', borderRadius: '16px 16px 0 0', padding: '24px 28px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.65, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ISM Dakar · Échéancier 2025-2026
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800' }}>
                  {etudiant.prenom} {etudiant.nom}
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.85 }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '20px' }}>
                    {etudiant.matricule}
                  </span>
                  <span>{etudiant.classe}{etudiant.filiere ? ` — ${etudiant.filiere}` : ''}</span>
                </div>
              </div>
              <button onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                ⏳ Chargement de l'échéancier...
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                  <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '18px 20px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Total annuel attendu</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1B3A6B' }}>
                      {echeancier.totalAnnuel.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {niveau} · {echeancier.fraisMensuel.toLocaleString('fr-FR')} FCFA/mois
                    </div>
                  </div>
                  <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '18px 20px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Montant payé</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>
                      {totalPaye.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {paiementsEtu.length} paiement{paiementsEtu.length !== 1 ? 's' : ''} enregistré{paiementsEtu.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ background: resteAPayer > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', padding: '18px 20px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Reste à payer</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: resteAPayer > 0 ? '#DC2626' : '#16A34A' }}>
                      {resteAPayer.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {resteAPayer === 0 ? '✅ Scolarité apurée' : 'Solde restant dû'}
                    </div>
                  </div>
                </div>

                {/* Sections tableau */}
                {renderSection("🟦 Droits d'inscription", echeancier.inscription, '#1B3A6B', '#EFF6FF', echeancier.totalInscription)}
                {renderSection('🟧 Frais de scolarité', echeancier.scolarite, '#EA580C', '#FFF7ED', echeancier.totalScolarite)}
                {niveau === 'L3' && renderSection('🟣 Encadrement & Soutenance', echeancier.encadrement, '#7C3AED', '#F5F3FF', echeancier.totalEncadrement)}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Taux de couverture :{' '}
                    <strong style={{ color: totalPaye >= echeancier.totalAnnuel ? '#16A34A' : '#1B3A6B' }}>
                      {Math.min(100, Math.round((totalPaye / echeancier.totalAnnuel) * 100))}%
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClose}
                      style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
                      Fermer
                    </button>
                    <button onClick={() => setShowPaiement(true)}
                      style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                      ＋ Enregistrer un paiement
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPaiement && (
        <ModalPaiement
          etudiants={etudiants}
          caisses={caisses}
          defaultEtudiant={etudiant}
          zIndex={2000}
          onClose={() => setShowPaiement(false)}
          onRecu={handleRecu}
          onSave={() => {
            setShowPaiement(false)
            chargerPaiements()
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
