import { useState, useEffect, useCallback } from 'react'
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
        width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
              Soumettre une demande de dépense
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Soumise au RAF pour validation
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ background: '#EFF6FF', borderLeft: '3px solid #2563EB', padding: '10px 14px',
          borderRadius: '8px', fontSize: '12px', color: '#1D4ED8', marginBottom: '18px',
          display: 'flex', gap: '8px' }}>
          <span>ℹ️</span>
          <span>Aucun argent ne sera débité maintenant. Vous pourrez procéder au décaissement après validation RAF.</span>
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

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: '#EA580C', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '700', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Envoi…' : 'Soumettre la demande'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal Confirmation décaissement ─────────────────────────────────────── */
function ModalPayer({ depense, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur]   = useState('')
  const [alerte, setAlerte]   = useState(null)

  const handlePayer = async () => {
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/depenses/${depense.id}/payer`, {
        method: 'PUT', headers: getHeaders()
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      if (data.alerte_budget) setAlerte(data.alerte_budget)
      else { onDone(); onClose() }
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  if (alerte) {
    return (
      <div className="ft-backdrop">
        <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '40px',
          width: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#D97706', fontSize: '18px', margin: '0 0 14px', fontWeight: '800' }}>Alerte Budget</h2>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px',
            padding: '12px 16px', fontSize: '13px', color: '#92400E', marginBottom: '20px', textAlign: 'left' }}>
            {alerte}
          </div>
          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
            Le décaissement a été effectué avec succès.
          </p>
          <button onClick={() => { onDone(); onClose() }}
            style={{ padding: '10px 28px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            Compris
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>💵</div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
            Confirmer le décaissement
          </h2>
        </div>

        <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Motif</span>
            <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: '700', maxWidth: '220px',
              textAlign: 'right' }}>{depense.motif}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Caisse</span>
            <span style={{ fontSize: '13px', color: '#1E293B' }}>{depense.caisse}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0',
            paddingTop: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Montant à décaisser</span>
            <span style={{ fontSize: '18px', color: '#DC2626', fontWeight: '800' }}>
              {fmt(depense.montant)} FCFA
            </span>
          </div>
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '14px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ background: '#FFF7ED', borderLeft: '3px solid #EA580C', padding: '10px 14px',
          borderRadius: '8px', fontSize: '12px', color: '#9A3412', marginBottom: '20px' }}>
          Cette action est irréversible. L'argent sortira de la caisse immédiatement.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handlePayer} disabled={loading}
            style={{ padding: '10px 24px', background: '#16A34A', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '700', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Décaissement…' : '💵 Décaisser maintenant'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page principale Comptable ───────────────────────────────────────────── */
export default function ComptableDepenses() {
  const [depenses, setDepenses]         = useState([])
  const [kpis, setKpis]                 = useState({ total_depenses: 0, total_decaisse: 0, nb_en_attente: 0, nb_validees: 0 })
  const [caisses, setCaisses]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [depenseAPayer, setDepenseAPayer] = useState(null)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]                 = useState(1)
  const [nbPages, setNbPages]           = useState(1)
  const [total, setTotal]               = useState(0)
  const [msgAction, setMsgAction]       = useState(null)

  const fetchDepenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreStatut) params.set('statut', filtreStatut)
      const res  = await fetch(`${API}/depenses?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setDepenses(data.depenses); setTotal(data.total); setNbPages(data.nb_pages); setKpis(data.kpis) }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreStatut])

  useEffect(() => { fetchDepenses() }, [fetchDepenses])
  useEffect(() => {
    fetch(`${API}/caisses`, { headers: getHeaders() })
      .then(r => r.json()).then(d => { if (d.caisses) setCaisses(d.caisses) }).catch(() => {})
  }, [])

  const flash = msg => { setMsgAction(msg); setTimeout(() => setMsgAction(null), 4000) }

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
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Dépenses</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                Soumettre des demandes · Décaisser les validées
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ padding: '9px 20px', background: '#fff', color: '#DC2626',
                border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              + Nouvelle demande
            </button>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* Flash */}
          {msgAction && (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '16px', fontSize: '13px', color: '#15803D',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✅ {msgAction}
            </div>
          )}

          {/* Alerte validées en attente de décaissement */}
          {kpis.nb_validees > 0 && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '18px', fontSize: '13px', color: '#1D4ED8',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              onClick={() => setFiltreStatut('validee')}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <span>{kpis.nb_validees} demande{kpis.nb_validees > 1 ? 's' : ''} validée{kpis.nb_validees > 1 ? 's' : ''} en attente de décaissement</span>
              <span style={{ marginLeft: 'auto', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}>
                Voir →
              </span>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total demandes',       value: kpis.total_depenses, color: '#64748B', bg: '#F1F5F9', icon: '🧾' },
              { label: 'En attente RAF',        value: kpis.nb_en_attente,  color: '#EA580C', bg: '#FFF7ED', icon: '⏳' },
              { label: 'À décaisser',           value: kpis.nb_validees,    color: '#2563EB', bg: '#EFF6FF', icon: '✅' },
              { label: 'Total décaissé',        value: `${fmt(kpis.total_decaisse)} FCFA`, color: '#DC2626', bg: '#FEF2F2', icon: '💸' },
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
                <div style={{ fontSize: typeof value === 'string' ? '15px' : '28px',
                  fontWeight: '800', color, lineHeight: 1 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Filtre */}
          <div className="ft-card" style={{ padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
              style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', background: '#fff' }}>
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées (à décaisser)</option>
              <option value="payee">Décaissées</option>
              <option value="rejetee">Rejetées</option>
            </select>
            {filtreStatut && (
              <button onClick={() => { setFiltreStatut(''); setPage(1) }}
                style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                  fontSize: '12px', color: '#64748B', fontWeight: '600', background: '#fff', cursor: 'pointer' }}>
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
                  {filtreStatut ? 'Modifiez le filtre' : 'Soumettez une première demande de dépense'}
                </span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: '#FFF5F5', borderBottom: '2px solid #FCA5A5' }}>
                    {['Motif', 'Montant', 'Catégorie', 'Caisse', 'Statut', 'Date', 'Action'].map(h => (
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
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.motif}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>{fmt(d.montant)}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>FCFA</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>
                          {d.categorie || <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{d.caisse}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                              background: st.bg, color: st.color, padding: '3px 10px',
                              borderRadius: '99px', fontSize: '12px', fontWeight: '700', width: 'fit-content' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                              {st.label}
                            </span>
                            {d.validateur && (
                              <span style={{ fontSize: '10px', color: '#94A3B8' }}>par {d.validateur}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {d.date_depense}
                          {d.date_paiement_sortie && (
                            <div style={{ fontSize: '10px', color: '#16A34A' }}>
                              Décaissé : {d.date_paiement_sortie}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {d.statut === 'validee' && (
                            <button onClick={() => setDepenseAPayer(d)}
                              style={{ padding: '6px 14px', background: '#16A34A', color: '#fff',
                                border: 'none', borderRadius: '7px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              💵 Décaisser
                            </button>
                          )}
                          {d.statut === 'en_attente' && (
                            <span style={{ fontSize: '11px', color: '#EA580C', background: '#FFF7ED',
                              padding: '4px 10px', borderRadius: '99px', fontWeight: '600' }}>
                              Attend RAF
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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
        <ModalDepense caisses={caisses} onClose={() => setShowModal(false)} onSave={() => { fetchDepenses(); flash('Demande soumise avec succès') }} />
      )}
      {depenseAPayer && (
        <ModalPayer depense={depenseAPayer} onClose={() => setDepenseAPayer(null)}
          onDone={() => { fetchDepenses(); flash('Décaissement effectué avec succès') }} />
      )}
    </div>
  )
}
