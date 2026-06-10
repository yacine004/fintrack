import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const MODE_COLORS = {
  especes:  { bg: '#F0FDF4', color: '#16A34A', label: '💵 Espèces' },
  virement: { bg: '#EFF6FF', color: '#2563EB', label: '🏦 Virement' },
  cheque:   { bg: '#FFF7ED', color: '#EA580C', label: '📝 Chèque' },
  wave:     { bg: '#F5F3FF', color: '#7C3AED', label: '📱 Wave' },
}

// ── Modal Paiement ────────────────────────────────────────────────────────────
function ModalPaiement({ etudiants, caisses, onClose, onSave }) {
  const [form, setForm] = useState({
    id_etudiant: '', id_caisse: '', montant: '',
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
    if (parseFloat(form.montant) <= 0) {
      setErreur('Le montant doit être positif')
      return
    }
    setLoading(true)
    setErreur('')
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
            <button onClick={() => handleRecu(success.paiement.id)}
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0',
              borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
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

// ── Page principale Paiements RAF ─────────────────────────────────────────────
export default function RafPaiements() {
  const [paiements, setPaiements]   = useState([])
  const [kpis, setKpis]             = useState({ total_paiements: 0, total_encaisse: 0 })
  const [etudiants, setEtudiants]   = useState([])
  const [caisses, setCaisses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [filtreMode, setFiltreMode] = useState('')
  const [filtreCaisse, setFiltreCaisse] = useState('')
  const [dateDebut, setDateDebut]   = useState('')
  const [dateFin, setDateFin]       = useState('')
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [total, setTotal]           = useState(0)

  const fetchPaiements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreMode)   params.set('mode', filtreMode)
      if (filtreCaisse) params.set('caisse_id', filtreCaisse)
      if (dateDebut)    params.set('date_debut', dateDebut)
      if (dateFin)      params.set('date_fin', dateFin)

      const res  = await fetch(`${API}/paiements?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setPaiements(data.paiements)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        setKpis(data.kpis)
      }
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [page, filtreMode, filtreCaisse, dateDebut, dateFin])

  const fetchSelectData = async () => {
    try {
      const [resE, resC] = await Promise.all([
        fetch(`${API}/etudiants?limit=100&statut=actif`, { headers: getHeaders() }),
        fetch(`${API}/caisses`, { headers: getHeaders() })
      ])
      const [dataE, dataC] = await Promise.all([resE.json(), resC.json()])
      if (resE.ok) setEtudiants(dataE.etudiants)
      if (resC.ok) setCaisses(dataC.caisses)
    } catch { /* network error */ }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPaiements() }, [fetchPaiements])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSelectData() }, [])

  const handleRecu = async (id) => {
    try {
      const res = await fetch(`${API}/paiements/${id}/recu`, { headers: getHeaders() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'
      a.download = `recu_FT${String(id).padStart(5,'0')}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Erreur de connexion') }
  }

  const cardStyle = (bg) => ({
    background: bg, borderRadius: '12px', padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: '4px', flex: 1
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>💳 Paiements</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {total} paiement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.location.href = '/raf/impayes'}
              style={{ padding: '11px 18px', background: '#FEF2F2', color: '#DC2626',
                border: '1.5px solid #FCA5A5', borderRadius: '10px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600' }}>
              ⚠️ Voir les impayés
            </button>
            <button onClick={() => setShowModal(true)}
              style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              ＋ Nouveau paiement
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={cardStyle('#EFF6FF')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#1B3A6B' }}>{kpis.total_paiements}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Total paiements</span>
          </div>
          <div style={cardStyle('#F0FDF4')}>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#16A34A' }}>
              {kpis.total_encaisse?.toLocaleString('fr-FR')} FCFA
            </span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Total encaissé</span>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filtreMode} onChange={e => { setFiltreMode(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les modes</option>
            <option value="especes">💵 Espèces</option>
            <option value="virement">🏦 Virement</option>
            <option value="cheque">📝 Chèque</option>
            <option value="wave">📱 Wave</option>
          </select>
          <select value={filtreCaisse} onChange={e => { setFiltreCaisse(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les caisses</option>
            {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>→</span>
          <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          {(filtreMode || filtreCaisse || dateDebut || dateFin) && (
            <button onClick={() => { setFiltreMode(''); setFiltreCaisse(''); setDateDebut(''); setDateFin(''); setPage(1) }}
              style={{ padding: '9px 14px', background: '#F1F5F9', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: '#64748B' }}>✕ Effacer</button>
          )}
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : paiements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              💳 Aucun paiement enregistré
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['N°', 'Étudiant', 'Montant', 'Mode', 'Caisse', 'Motif', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paiements.map((p, i) => {
                  const modeInfo = MODE_COLORS[p.mode_paiement] || MODE_COLORS.especes
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                      borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#1B3A6B' }}>
                        FT-{String(p.id).padStart(5, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: '#1E293B' }}>{p.etudiant}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '800', color: '#16A34A' }}>
                        {parseFloat(p.montant).toLocaleString('fr-FR')} <span style={{ fontSize: '11px', fontWeight: '600' }}>FCFA</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: modeInfo.bg, color: modeInfo.color,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {modeInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{p.caisse}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>
                        {p.motif || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8' }}>{p.date_paiement}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleRecu(p.id)} title="Générer reçu PDF"
                          style={{ padding: '5px 10px', background: '#EFF6FF', color: '#2563EB',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          🖨️ Reçu
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {nbPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px',
              borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Préc.</button>
              <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>Page {page} / {nbPages}</span>
              <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: '#fff', cursor: page === nbPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suiv. →</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ModalPaiement
          etudiants={etudiants}
          caisses={caisses}
          onClose={() => setShowModal(false)}
          onSave={() => fetchPaiements()}
        />
      )}
    </div>
  )
}
