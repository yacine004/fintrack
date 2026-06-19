import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const STATUT_INFO = {
  en_attente: { bg: '#FFF7ED', color: '#EA580C', dot: '#EA580C', label: 'En attente' },
  validee:    { bg: '#EFF6FF', color: '#2563EB', dot: '#2563EB', label: 'Validée'    },
  rejetee:    { bg: '#FEF2F2', color: '#DC2626', dot: '#DC2626', label: 'Rejetée'    },
  payee:      { bg: '#F0FDF4', color: '#16A34A', dot: '#16A34A', label: 'Décaissée'  },
}

const CATEGORIES = ['Fournitures', 'Salaires', 'Maintenance', 'Evenements', 'Informatique', 'Autre']

const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
  borderRadius: '8px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', background: '#fff',
}
const lbl = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
}

/* ── Modal Nouvelle demande ──────────────────────────────────────────────── */
function ModalDepense({ caisses, onClose, onSave }) {
  const [form, setForm]       = useState({ id_caisse: '', montant: '', motif: '', categorie: '' })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.id_caisse || !form.montant || !form.motif) {
      setErreur('Caisse, montant et motif sont obligatoires'); return
    }
    if (parseFloat(form.montant) <= 0) { setErreur('Le montant doit être positif'); return }
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/depenses`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...form, montant: parseFloat(form.montant) })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave(); onClose()
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
              Nouvelle demande de dépense
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              La demande sera validée par le RAF avant décaissement
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div className="ft-alert" style={{ background: '#EFF6FF', borderLeft: '3px solid #2563EB',
          padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#1D4ED8',
          marginBottom: '18px', display: 'flex', gap: '8px' }}>
          <span>ℹ️</span>
          <span>Aucun argent ne sera débité à ce stade. Le caissier procédera au décaissement après validation.</span>
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '16px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>Montant (FCFA) *</label>
              <input name="montant" type="number" value={form.montant} onChange={handleChange}
                placeholder="50 000" min="0" style={inp} />
            </div>
            <div>
              <label style={lbl}>Catégorie</label>
              <select name="categorie" value={form.categorie} onChange={handleChange} style={inp}>
                <option value="">Sans catégorie</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Caisse *</label>
            <select name="id_caisse" value={form.id_caisse} onChange={handleChange} style={inp}>
              <option value="">Sélectionner une caisse</option>
              {caisses.filter(c => c.statut === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Motif *</label>
            <input name="motif" value={form.motif} onChange={handleChange}
              placeholder="Ex: Achat fournitures bureau" style={inp} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', fontSize: '13px', fontWeight: '600', color: '#64748B', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Envoi…' : 'Soumettre la demande'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page principale RAF ─────────────────────────────────────────────────── */
export default function RafDepenses() {
  const navigate = useNavigate()
  const [depenses, setDepenses]         = useState([])
  const [kpis, setKpis]                 = useState({ total_depenses: 0, total_decaisse: 0, nb_en_attente: 0, nb_validees: 0 })
  const [caisses, setCaisses]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [page, setPage]                 = useState(1)
  const [nbPages, setNbPages]           = useState(1)
  const [total, setTotal]               = useState(0)
  const [msgAction, setMsgAction]       = useState(null)

  const fetchDepenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreStatut)    params.set('statut', filtreStatut)
      if (filtreCategorie) params.set('categorie', filtreCategorie)
      const res  = await fetch(`${API}/depenses?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setDepenses(data.depenses); setTotal(data.total); setNbPages(data.nb_pages); setKpis(data.kpis) }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, filtreStatut, filtreCategorie])

  const fetchCaisses = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses)
    } catch { /* ignore */ }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDepenses() }, [fetchDepenses])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCaisses() },  [fetchCaisses])

  const flash = msg => { setMsgAction(msg); setTimeout(() => setMsgAction(null), 3000) }

  const handleValider = async (id) => {
    if (!window.confirm('Valider cette demande de dépense ?')) return
    try {
      const res  = await fetch(`${API}/depenses/${id}/valider`, { method: 'PUT', headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { flash(data.message); fetchDepenses() }
      else flash(data.message)
    } catch { /* ignore */ }
  }

  const handleRejeter = async (id) => {
    if (!window.confirm('Rejeter cette demande de dépense ?')) return
    try {
      const res  = await fetch(`${API}/depenses/${id}/rejeter`, { method: 'PUT', headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { flash(data.message); fetchDepenses() }
      else flash(data.message)
    } catch { /* ignore */ }
  }

  const hasFilters = filtreStatut || filtreCategorie

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7F1D1D 0%, #B91C1C 50%, #DC2626 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Gestion des Dépenses</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                Validation RAF · Décaissement par le caissier
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate('/raf/budgets')}
                style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.35)', borderRadius: '9px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                📊 Budgets
              </button>
              <button onClick={() => setShowModal(true)}
                style={{ padding: '9px 20px', background: '#fff', color: '#DC2626',
                  border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                + Nouvelle demande
              </button>
            </div>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* Flash message */}
          {msgAction && (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '16px', fontSize: '13px', color: '#15803D',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✅ {msgAction}
            </div>
          )}

          {/* Workflow guide */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '24px', background: '#fff',
            borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            {[
              { step: '1', label: 'Demande créée', sub: 'RAF ou Comptable', color: '#EA580C', bg: '#FFF7ED' },
              { step: '→', label: '', sub: '', color: '#CBD5E1', bg: '#F8FAFC', arrow: true },
              { step: '2', label: 'Validation RAF', sub: 'En attente → Validée', color: '#2563EB', bg: '#EFF6FF' },
              { step: '→', label: '', sub: '', color: '#CBD5E1', bg: '#F8FAFC', arrow: true },
              { step: '3', label: 'Décaissement', sub: 'Caissier / Comptable', color: '#16A34A', bg: '#F0FDF4' },
            ].map(({ step, label, sub, color, bg, arrow }, i) => (
              <div key={i} style={{ flex: arrow ? 0.3 : 1, background: bg, padding: arrow ? '14px 8px' : '14px 18px',
                textAlign: 'center', borderRight: i < 4 ? '1px solid #E2E8F0' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                {arrow ? (
                  <span style={{ color, fontSize: '18px', fontWeight: '700' }}>→</span>
                ) : (
                  <>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color,
                      color: '#fff', fontWeight: '800', fontSize: '13px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>{step}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color }}>{label}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{sub}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total demandes',       value: kpis.total_depenses, color: '#64748B', bg: '#F1F5F9', icon: '🧾' },
              { label: 'En attente validation', value: kpis.nb_en_attente,  color: '#EA580C', bg: '#FFF7ED', icon: '⏳' },
              { label: 'Validées (à décaisser)', value: kpis.nb_validees,  color: '#2563EB', bg: '#EFF6FF', icon: '✅' },
              { label: 'Montant décaissé',       value: `${fmt(kpis.total_decaisse)} FCFA`, color: '#DC2626', bg: '#FEF2F2', icon: '💸' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="ft-card" style={{
                padding: '18px 22px', flex: 1, borderTop: `3px solid ${color}`, cursor: 'default'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{icon}</div>
                </div>
                <div style={{ fontSize: typeof value === 'string' ? '16px' : '28px',
                  fontWeight: '800', color, lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="ft-card" style={{ padding: '14px 18px', marginBottom: '18px',
            display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', padding: '9px 14px' }}>
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
              <option value="rejetee">Rejetées</option>
              <option value="payee">Décaissées</option>
            </select>
            <select value={filtreCategorie} onChange={e => { setFiltreCategorie(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', padding: '9px 14px' }}>
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setFiltreStatut(''); setFiltreCategorie(''); setPage(1) }}
                style={{ ...inp, cursor: 'pointer', color: '#64748B', fontWeight: '600',
                  fontSize: '12px', width: 'auto', padding: '9px 14px' }}>
                ✕ Effacer
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>
              {total} résultat{total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tableau */}
          <div className="ft-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div className="ft-spinner" />
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>Chargement…</span>
              </div>
            ) : depenses.length === 0 ? (
              <div className="ft-empty">
                <span className="ft-empty-icon">💸</span>
                <span className="ft-empty-title">Aucune dépense trouvée</span>
                <span className="ft-empty-sub">
                  {hasFilters ? 'Modifiez les filtres' : 'Aucune demande de dépense pour le moment'}
                </span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: '#FFF5F5', borderBottom: '2px solid #FCA5A5' }}>
                    {['Motif', 'Montant', 'Catégorie', 'Caisse', 'Demandeur', 'Statut', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '700', color: '#B91C1C', textTransform: 'uppercase',
                        letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depenses.map((d, i) => {
                    const st = STATUT_INFO[d.statut] || STATUT_INFO.en_attente
                    return (
                      <tr key={d.id} className="ft-tr"
                        style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600',
                          color: '#1E293B', maxWidth: '180px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.motif}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>{fmt(d.montant)}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>FCFA</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {d.categorie ? (
                            <span style={{ background: '#F1F5F9', color: '#475569',
                              padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>
                              {d.categorie}
                            </span>
                          ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{d.caisse}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {d.demandeur ? (
                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                              {d.demandeur}
                              {d.demandeur_role && (
                                <span style={{ marginLeft: '5px', fontSize: '10px', color: '#94A3B8',
                                  background: '#F1F5F9', padding: '1px 6px', borderRadius: '99px' }}>
                                  {d.demandeur_role}
                                </span>
                              )}
                            </span>
                          ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: st.bg, color: st.color, padding: '3px 10px',
                            borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {d.date_depense}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                            {d.statut === 'en_attente' && (
                              <>
                                <button onClick={() => handleValider(d.id)}
                                  style={{ padding: '5px 10px', background: '#EFF6FF', color: '#2563EB',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  ✓ Valider
                                </button>
                                <button onClick={() => handleRejeter(d.id)}
                                  style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: '700' }}>
                                  ✕
                                </button>
                              </>
                            )}
                            {d.statut === 'validee' && (
                              <button onClick={() => handleRejeter(d.id)}
                                style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                                  fontSize: '12px', fontWeight: '600' }}>
                                Annuler
                              </button>
                            )}
                            {d.statut === 'payee' && d.date_paiement_sortie && (
                              <span style={{ fontSize: '11px', color: '#16A34A', whiteSpace: 'nowrap' }}>
                                {d.date_paiement_sortie}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {nbPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '6px', padding: '14px', borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
                    background: '#fff', fontSize: '13px', fontWeight: '600',
                    color: page === 1 ? '#CBD5E1' : '#1B3A6B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                  ← Préc.
                </button>
                {Array.from({ length: Math.min(nbPages, 7) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '7px',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      background: page === n ? '#DC2626' : '#F1F5F9',
                      color:      page === n ? '#fff'    : '#64748B' }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                  style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
                    background: '#fff', fontSize: '13px', fontWeight: '600',
                    color: page === nbPages ? '#CBD5E1' : '#1B3A6B', cursor: page === nbPages ? 'not-allowed' : 'pointer' }}>
                  Suiv. →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ModalDepense caisses={caisses} onClose={() => setShowModal(false)} onSave={() => fetchDepenses()} />
      )}
    </div>
  )
}
