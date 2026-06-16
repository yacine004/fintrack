import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const STATUT_STYLES = {
  en_attente: { bg: '#FFF7ED', color: '#EA580C', label: '⏳ En attente' },
  validee:    { bg: '#F0FDF4', color: '#16A34A', label: '✅ Validée' },
  rejetee:    { bg: '#FEF2F2', color: '#DC2626', label: '❌ Rejetée' },
}

const CATEGORIES = ['Fournitures', 'Salaires', 'Maintenance', 'Evenements', 'Informatique', 'Autre']

// ── Modal Dépense ─────────────────────────────────────────────────────────────
function ModalDepense({ caisses, onClose, onSave }) {
  const [form, setForm] = useState({ id_caisse: '', montant: '', motif: '', categorie: '' })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)
  const [alerte, setAlerte]   = useState(null)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.id_caisse || !form.montant || !form.motif) {
      setErreur('Caisse, montant et motif sont obligatoires')
      return
    }
    if (parseFloat(form.montant) <= 0) {
      setErreur('Le montant doit être positif')
      return
    }
    setLoading(true)
    setErreur('')
    try {
      const res  = await fetch(`${API}/depenses`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...form, montant: parseFloat(form.montant) })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      if (data.alerte_budget) {
        setAlerte(data.alerte_budget)
      } else {
        onSave()
        onClose()
      }
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

  if (alerte) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px',
          width: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '50px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#D97706', fontSize: '18px', margin: '0 0 12px' }}>Alerte Budget</h2>
          <div style={{ background: '#FFF7ED', border: '1px solid #FCD34D', borderRadius: '10px',
            padding: '14px', marginBottom: '20px', color: '#92400E', fontSize: '14px' }}>
            {alerte}
          </div>
          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
            La dépense a quand même été enregistrée avec succès.
          </p>
          <button onClick={() => { onSave(); onClose() }}
            style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            Compris
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1B3A6B', fontWeight: '700' }}>💸 Enregistrer une dépense</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Montant (FCFA) *</label>
              <input name="montant" type="number" value={form.montant} onChange={handleChange}
                placeholder="50000" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select name="categorie" value={form.categorie} onChange={handleChange} style={inputStyle}>
                <option value="">Sans catégorie</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
            <label style={labelStyle}>Motif *</label>
            <input name="motif" value={form.motif} onChange={handleChange}
              placeholder="Ex: Achat fournitures bureau" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#DC2626',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳...' : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale Dépenses RAF ──────────────────────────────────────────────
export default function RafDepenses() {
  const navigate = useNavigate()
  const [depenses, setDepenses]   = useState([])
  const [kpis, setKpis]           = useState({ total_depenses: 0, total_depense: 0, nb_en_attente: 0 })
  const [caisses, setCaisses]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)

  const fetchDepenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreStatut)    params.set('statut', filtreStatut)
      if (filtreCategorie) params.set('categorie', filtreCategorie)
      const res  = await fetch(`${API}/depenses?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setDepenses(data.depenses)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        setKpis(data.kpis)
      }
    } catch { /* empty */ }
    finally { setLoading(false) }
  }, [page, filtreStatut, filtreCategorie])

  const fetchCaisses = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses)
    } catch { /* empty */ }
  }, [])

  // eslint-disable-next-line
  useEffect(() => { fetchDepenses() }, [fetchDepenses])
  // eslint-disable-next-line
  useEffect(() => { fetchCaisses() }, [fetchCaisses])

  const handleValider = async (id) => {
    if (!confirm('Valider cette dépense ?')) return
    try {
      const res = await fetch(`${API}/depenses/${id}/valider`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) fetchDepenses()
    } catch { /* empty */ }
  }

  const handleRejeter = async (id) => {
    if (!confirm('Rejeter cette dépense ? Le solde sera remboursé.')) return
    try {
      const res = await fetch(`${API}/depenses/${id}/rejeter`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) fetchDepenses()
    } catch { /* empty */ }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>💸 Gestion des Dépenses</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>{total} dépense{total > 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/raf/budgets')}
              style={{ padding: '11px 18px', background: '#EFF6FF', color: '#1D4ED8',
                border: '1.5px solid #BFDBFE', borderRadius: '10px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600' }}>
              📊 Contrôle budgets
            </button>
            <button onClick={() => setShowModal(true)}
              style={{ padding: '11px 22px', background: '#DC2626', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              ＋ Nouvelle dépense
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626' }}>{kpis.total_depenses}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Total dépenses</div>
          </div>
          <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#EA580C' }}>
              {kpis.total_depense?.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Montant total dépensé</div>
          </div>
          <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#D97706' }}>{kpis.nb_en_attente}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>En attente de validation</div>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="validee">✅ Validées</option>
            <option value="rejetee">❌ Rejetées</option>
          </select>
          <select value={filtreCategorie} onChange={e => { setFiltreCategorie(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : depenses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucune dépense</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FEF2F2' }}>
                  {['Motif', 'Montant', 'Catégorie', 'Caisse', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#DC2626', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #FCA5A5' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {depenses.map((d, i) => {
                  const st = STATUT_STYLES[d.statut] || STATUT_STYLES.en_attente
                  return (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1E293B', maxWidth: '200px' }}>
                        {d.motif}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>
                        {parseFloat(d.montant).toLocaleString('fr-FR')} <span style={{ fontSize: '11px' }}>FCFA</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {d.categorie ? (
                          <span style={{ background: '#F1F5F9', color: '#475569',
                            padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                            {d.categorie}
                          </span>
                        ) : <span style={{ color: '#94A3B8' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{d.caisse}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: st.bg, color: st.color,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8' }}>{d.date_depense}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {d.statut === 'en_attente' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleValider(d.id)}
                              style={{ padding: '5px 10px', background: '#F0FDF4', color: '#16A34A',
                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              ✅ Valider
                            </button>
                            <button onClick={() => handleRejeter(d.id)}
                              style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              ❌ Rejeter
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {nbPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Préc.</button>
              <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>Page {page} / {nbPages}</span>
              <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: page === nbPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suiv. →</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ModalDepense caisses={caisses} onClose={() => setShowModal(false)} onSave={() => fetchDepenses()} />
      )}
    </div>
  )
}
