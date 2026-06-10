import { useState, useEffect, useCallback } from 'react'
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

function ModalDepense({ caisses, onClose, onSave }) {
  const [form, setForm] = useState({ id_caisse: '', montant: '', motif: '', categorie: '' })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.id_caisse || !form.montant || !form.motif) {
      setErreur('Caisse, montant et motif sont obligatoires')
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
      onSave()
      onClose()
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700' }}>💸 Enregistrer une dépense</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Motif *</label>
            <input name="motif" value={form.motif} onChange={handleChange}
              placeholder="Ex: Achat fournitures bureau" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#FFF7ED', border: '1px solid #FCD34D', borderRadius: '8px',
          padding: '10px 14px', marginTop: '12px', fontSize: '12px', color: '#92400E' }}>
          ℹ️ La dépense sera soumise à la validation du RAF avant d'être définitivement approuvée.
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#EA580C',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳...' : '✅ Soumettre'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ComptableDepenses() {
  const [depenses, setDepenses] = useState([])
  const [kpis, setKpis]         = useState({ total_depenses: 0, total_depense: 0, nb_en_attente: 0 })
  const [caisses, setCaisses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]         = useState(1)
  const [nbPages, setNbPages]   = useState(1)
  const [total, setTotal]       = useState(0)

  const fetchDepenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreStatut) params.set('statut', filtreStatut)
      const res  = await fetch(`${API}/depenses?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setDepenses(data.depenses)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        setKpis(data.kpis)
      }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreStatut])

  const fetchCaisses = async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses)
    } catch {}
  }

  useEffect(() => { fetchDepenses() }, [fetchDepenses])
  useEffect(() => { fetchCaisses() }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>💸 Dépenses</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>{total} dépense{total > 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '11px 22px', background: '#EA580C', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ＋ Soumettre une dépense
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626' }}>{kpis.total_depenses}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Total dépenses</div>
          </div>
          <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#D97706' }}>{kpis.nb_en_attente}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>En attente validation RAF</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="validee">✅ Validées</option>
            <option value="rejetee">❌ Rejetées</option>
          </select>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : depenses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucune dépense</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Motif', 'Montant', 'Catégorie', 'Caisse', 'Statut', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {depenses.map((d, i) => {
                  const st = STATUT_STYLES[d.statut] || STATUT_STYLES.en_attente
                  return (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>{d.motif}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>
                        {parseFloat(d.montant).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{d.categorie || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{d.caisse}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: st.bg, color: st.color,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8' }}>{d.date_depense}</td>
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
      {showModal && <ModalDepense caisses={caisses} onClose={() => setShowModal(false)} onSave={() => fetchDepenses()} />}
    </div>
  )
}
