import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

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

/* ── Modal Ouvrir Session ────────────────────────────────────────────────── */
function ModalOuvrirSession({ caisse, onClose, onDone }) {
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading]         = useState(false)
  const [erreur, setErreur]           = useState('')

  const handleOuvrir = async () => {
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/caisses/${caisse.id}/sessions/ouvrir`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ commentaire: commentaire.trim() || undefined })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onDone(data.session)
      onClose()
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
              Ouvrir la session du jour
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              {caisse.nom} — {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ background: '#EFF6FF', borderLeft: '3px solid #2563EB', padding: '10px 14px',
          borderRadius: '8px', fontSize: '12px', color: '#1D4ED8', marginBottom: '18px' }}>
          Les encaissements et décaissements de la journée seront enregistrés dans cette session.
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '14px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div>
          <label style={lbl}>Commentaire (optionnel)</label>
          <input value={commentaire} onChange={e => setCommentaire(e.target.value)}
            placeholder="Ex: Ouverture normale" style={inp} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleOuvrir} disabled={loading}
            style={{ padding: '10px 24px', background: '#16A34A', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '700', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Ouverture…' : '🔓 Ouvrir la session'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal Clôturer Session ──────────────────────────────────────────────── */
function ModalCloturerSession({ caisse, session, onClose, onDone }) {
  const [montantBanque, setMontantBanque] = useState('')
  const [commentaire, setCommentaire]     = useState('')
  const [loading, setLoading]             = useState(false)
  const [erreur, setErreur]               = useState('')

  const handleCloturer = async () => {
    setLoading(true); setErreur('')
    try {
      const body = { commentaire: commentaire.trim() || undefined }
      if (montantBanque) body.montant_depose_banque = parseFloat(montantBanque)
      const res  = await fetch(`${API}/caisses/${caisse.id}/sessions/${session.id}/cloturer`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onDone(data.session)
      onClose()
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  const soldeJour = (session.total_entrees || 0) - (session.total_sorties || 0)

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
              Clôturer la session
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              {caisse.nom} — {session.date_session}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Récap du jour */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          {[
            { label: 'Entrées', value: session.total_entrees, color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Sorties', value: session.total_sorties, color: '#DC2626', bg: '#FEF2F2' },
            { label: 'Solde jour', value: soldeJour, color: '#1D4ED8', bg: '#EFF6FF' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ flex: 1, background: bg, borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color }}>{fmt(value)} FCFA</div>
            </div>
          ))}
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '14px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Montant déposé en banque (FCFA)</label>
            <input type="number" value={montantBanque} onChange={e => setMontantBanque(e.target.value)}
              placeholder={`Max ${fmt(soldeJour)} FCFA`} min="0" style={inp} />
          </div>
          <div>
            <label style={lbl}>Commentaire (optionnel)</label>
            <input value={commentaire} onChange={e => setCommentaire(e.target.value)}
              placeholder="Observations de clôture…" style={inp} />
          </div>
        </div>

        <div style={{ background: '#FFF7ED', borderLeft: '3px solid #EA580C', padding: '10px 14px',
          borderRadius: '8px', fontSize: '12px', color: '#9A3412', margin: '18px 0 0' }}>
          La clôture est définitive. Aucune transaction ne pourra être ajoutée à cette session après clôture.
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleCloturer} disabled={loading}
            style={{ padding: '10px 24px', background: '#EA580C', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '700', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Clôture…' : '🔒 Clôturer la session'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Tableau de bord session du jour ─────────────────────────────────────── */
function DashboardSession({ caisse }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/caisses/${caisse.id}/sessions/aujourd-hui`, { headers: getHeaders() })
      const json = await res.json()
      if (res.ok) setData(json)
    } catch {}
    finally { setLoading(false) }
  }, [caisse.id])

  useEffect(() => { reload() }, [reload])

  if (loading) return (
    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <div className="ft-spinner" />
    </div>
  )

  const session = data?.session
  if (!session) return null

  const paiements = []
  const depenses  = []

  return (
    <div style={{ marginTop: '12px', background: '#F8FAFC', borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B' }}>Aujourd'hui</span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Session ouverte {session.date_ouverture}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, background: '#F0FDF4', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '3px' }}>Entrées</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#16A34A' }}>{fmt(session.total_entrees)} FCFA</div>
        </div>
        <div style={{ flex: 1, background: '#FEF2F2', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '3px' }}>Sorties</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#DC2626' }}>{fmt(session.total_sorties)} FCFA</div>
        </div>
        <div style={{ flex: 1, background: '#EFF6FF', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '3px' }}>Solde jour</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1D4ED8' }}>{fmt(session.solde_jour)} FCFA</div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Page principale Comptable Caisses
   ══════════════════════════════════════════════════════════ */
export default function ComptableCaisses() {
  const [caisses, setCaisses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [sessions, setSessions] = useState({})  // { id_caisse: session | null }
  const [modalOuvrir, setModalOuvrir]   = useState(null)   // caisse object
  const [modalCloturer, setModalCloturer] = useState(null) // { caisse, session }
  const [flash, setFlash]               = useState(null)
  const [rapportCaisse, setRapportCaisse] = useState(null)
  const [rapportData, setRapportData]     = useState(null)
  const [rapportLoading, setRapportLoading] = useState(false)

  const showFlash = msg => { setFlash(msg); setTimeout(() => setFlash(null), 4000) }

  const fetchCaisses = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/caisses?statut=active`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  const fetchSessions = useCallback(async (caissesList) => {
    const result = {}
    await Promise.all(caissesList.map(async c => {
      try {
        const res  = await fetch(`${API}/caisses/${c.id}/sessions/aujourd-hui`, { headers: getHeaders() })
        const data = await res.json()
        if (res.ok) result[c.id] = data.session || null
      } catch {}
    }))
    setSessions(result)
  }, [])

  useEffect(() => { fetchCaisses() }, [fetchCaisses])
  useEffect(() => {
    if (caisses.length > 0) fetchSessions(caisses)
  }, [caisses, fetchSessions])

  const loadRapportCaisse = async (c) => {
    const s = sessions[c.id]
    if (!s) return
    setRapportCaisse(c)
    setRapportData(null)
    setRapportLoading(true)
    try {
      const res  = await fetch(`${API}/caisses/${c.id}/sessions/${s.id}/rapport`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setRapportData(data)
    } catch {}
    finally { setRapportLoading(false) }
  }

  const handleSessionOuverte = (caisse, session) => {
    setSessions(prev => ({ ...prev, [caisse.id]: session }))
    showFlash(`Session ouverte pour ${caisse.nom}`)
  }

  const handleSessionCloturee = (caisse, session) => {
    setSessions(prev => ({ ...prev, [caisse.id]: session }))
    showFlash(`Session clôturée pour ${caisse.nom}`)
    if (rapportCaisse?.id === caisse.id) { setRapportCaisse(null); setRapportData(null) }
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #2563EB 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Sessions de caisse</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>
              {today}
            </p>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* Flash */}
          {flash && (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '16px', fontSize: '13px', color: '#15803D',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✅ {flash}
            </div>
          )}

          {/* Explications */}
          <div className="ft-card" style={{ padding: '16px 20px', marginBottom: '24px',
            borderLeft: '4px solid #2563EB', background: '#EFF6FF' }}>
            <div style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: '600', marginBottom: '6px' }}>
              Comment fonctionnent les sessions ?
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#3B82F6' }}>
              <span>🔓 Ouvrir le matin → les transactions de la journée s'accumulent</span>
              <span>💵 Encaissements & décaissements → mis à jour en temps réel</span>
              <span>🔒 Clôturer le soir → déposer le solde en banque</span>
            </div>
          </div>

          {/* Cartes caisses */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {[1,2,3].map(i => <div key={i} className="ft-skeleton" style={{ height: '220px', borderRadius: '14px' }} />)}
            </div>
          ) : caisses.length === 0 ? (
            <div className="ft-empty ft-card" style={{ padding: '60px' }}>
              <span className="ft-empty-icon">🏦</span>
              <span className="ft-empty-title">Aucune caisse active</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {caisses.map(c => {
                const session     = sessions[c.id]
                const estOuverte  = session?.statut === 'ouverte'
                const estCloturee = session?.statut === 'cloturee'
                const aucune      = !session

                const borderColor = estOuverte ? '#16A34A' : estCloturee ? '#64748B' : '#2563EB'

                return (
                  <div key={c.id} className="ft-card" style={{
                    padding: '20px 22px', borderTop: `4px solid ${borderColor}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>{c.nom}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{c.type_caisse}</div>
                      </div>
                      {estOuverte && (
                        <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '4px 10px',
                          borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                          display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span className="ft-dot" style={{ background: '#16A34A' }} />
                          Ouverte
                        </span>
                      )}
                      {estCloturee && (
                        <span style={{ background: '#F1F5F9', color: '#64748B', padding: '4px 10px',
                          borderRadius: '99px', fontSize: '11px', fontWeight: '700' }}>
                          Clôturée
                        </span>
                      )}
                      {aucune && (
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px',
                          borderRadius: '99px', fontSize: '11px', fontWeight: '700' }}>
                          Pas de session
                        </span>
                      )}
                    </div>

                    {/* Solde caisse */}
                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600',
                        textTransform: 'uppercase', marginBottom: '3px' }}>Solde caisse</div>
                      <div style={{ fontSize: '18px', fontWeight: '800',
                        color: c.solde_actuel > 0 ? '#16A34A' : '#DC2626' }}>
                        {fmt(c.solde_actuel)} FCFA
                      </div>
                    </div>

                    {/* Stats session si ouverte */}
                    {estOuverte && session && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ flex: 1, background: '#F0FDF4', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Entrées</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#16A34A' }}>+{fmt(session.total_entrees)}</div>
                        </div>
                        <div style={{ flex: 1, background: '#FEF2F2', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Sorties</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#DC2626' }}>-{fmt(session.total_sorties)}</div>
                        </div>
                        <div style={{ flex: 1, background: '#EFF6FF', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Solde jour</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1D4ED8' }}>{fmt(session.solde_jour)}</div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {aucune && (
                        <button onClick={() => setModalOuvrir(c)}
                          style={{ flex: 1, padding: '9px', background: '#16A34A', color: '#fff',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: '700' }}>
                          🔓 Ouvrir la session
                        </button>
                      )}
                      {estOuverte && (
                        <>
                          <button onClick={() => loadRapportCaisse(c)}
                            style={{ flex: 1, padding: '9px', background: '#EFF6FF', color: '#1D4ED8',
                              border: '1px solid #BFDBFE', borderRadius: '8px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: '600' }}>
                            📋 Rapport du jour
                          </button>
                          <button onClick={() => setModalCloturer({ caisse: c, session })}
                            style={{ flex: 1, padding: '9px', background: '#EA580C', color: '#fff',
                              border: 'none', borderRadius: '8px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: '700' }}>
                            🔒 Clôturer
                          </button>
                        </>
                      )}
                      {estCloturee && (
                        <div style={{ flex: 1, padding: '9px', background: '#F1F5F9', color: '#94A3B8',
                          borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                          Session clôturée à {session.date_cloture?.split(' ')[1] || '—'}
                          {session.montant_depose_banque != null && (
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Déposé : {fmt(session.montant_depose_banque)} FCFA
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Rapport détaillé du jour */}
          {rapportCaisse && (
            <div className="ft-card" style={{ marginTop: '24px', padding: '24px 28px',
              borderTop: '3px solid #1D4ED8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1B3A6B' }}>
                  Rapport du jour — {rapportCaisse.nom}
                </h3>
                <button onClick={() => { setRapportCaisse(null); setRapportData(null) }}
                  style={{ background: '#F1F5F9', border: 'none', width: '30px', height: '30px',
                    borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
                  ✕
                </button>
              </div>

              {rapportLoading ? (
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
                  <div className="ft-spinner" />
                </div>
              ) : rapportData ? (
                <>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total entrées',   value: rapportData.recap.total_entrees, color: '#16A34A', bg: '#F0FDF4' },
                      { label: 'Total sorties',   value: rapportData.recap.total_sorties, color: '#DC2626', bg: '#FEF2F2' },
                      { label: 'Solde net du jour', value: rapportData.recap.solde_jour,  color: '#1D4ED8', bg: '#EFF6FF' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} style={{ flex: 1, background: bg, borderRadius: '10px',
                        padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600',
                          textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color }}>
                          {fmt(value)} <span style={{ fontSize: '12px', fontWeight: '500', color: '#94A3B8' }}>FCFA</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A',
                        marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ▲ Encaissements ({rapportData.paiements.length})
                      </div>
                      {rapportData.paiements.length === 0 ? (
                        <div style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>Aucun encaissement</div>
                      ) : rapportData.paiements.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                          padding: '7px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                          <span style={{ color: '#475569' }}>{p.reference}</span>
                          <span style={{ fontWeight: '700', color: '#16A34A' }}>+{fmt(p.montant)} FCFA</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626',
                        marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ▼ Décaissements ({rapportData.depenses.length})
                      </div>
                      {rapportData.depenses.length === 0 ? (
                        <div style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>Aucun décaissement</div>
                      ) : rapportData.depenses.map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
                          padding: '7px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                          <span style={{ color: '#475569' }}>{d.motif}</span>
                          <span style={{ fontWeight: '700', color: '#DC2626' }}>-{fmt(d.montant)} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>Erreur lors du chargement du rapport</div>
              )}
            </div>
          )}
        </div>
      </div>

      {modalOuvrir && (
        <ModalOuvrirSession
          caisse={modalOuvrir}
          onClose={() => setModalOuvrir(null)}
          onDone={session => handleSessionOuverte(modalOuvrir, session)}
        />
      )}

      {modalCloturer && (
        <ModalCloturerSession
          caisse={modalCloturer.caisse}
          session={modalCloturer.session}
          onClose={() => setModalCloturer(null)}
          onDone={session => handleSessionCloturee(modalCloturer.caisse, session)}
        />
      )}
    </div>
  )
}
