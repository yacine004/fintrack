import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { ModalPaiement } from '../../components/ModalEcheancier'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const MODE_INFO = {
  especes:  { bg: '#F0FDF4', color: '#16A34A', label: 'Espèces',  dot: '#16A34A' },
  virement: { bg: '#EFF6FF', color: '#2563EB', label: 'Virement', dot: '#2563EB' },
  cheque:   { bg: '#FFF7ED', color: '#EA580C', label: 'Chèque',   dot: '#EA580C' },
  wave:     { bg: '#F5F3FF', color: '#7C3AED', label: 'Wave',     dot: '#7C3AED' },
}

const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const inp = {
  padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
  fontSize: '13px', outline: 'none', background: '#fff', fontFamily: 'Inter, sans-serif',
}

export default function ComptablePaiements() {
  const [paiements, setPaiements] = useState([])
  const [kpis, setKpis]           = useState({ total_paiements: 0, total_encaisse: 0 })
  const [caisses, setCaisses]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtreMode, setFiltreMode] = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)

  const fetchPaiements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreMode) params.set('mode', filtreMode)
      const res  = await fetch(`${API}/paiements?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setPaiements(data.paiements); setTotal(data.total); setNbPages(data.nb_pages); setKpis(data.kpis) }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreMode])

  const fetchCaisses = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses || [])
    } catch {}
  }, [])

  useEffect(() => { fetchPaiements() }, [fetchPaiements])
  useEffect(() => { fetchCaisses() },   [fetchCaisses])

  const handleRecu = async (id, ref) => {
    try {
      const res = await fetch(`${API}/paiements/${id}/recu`, { headers: getHeaders() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'
      a.download = `recu_${ref || 'FT-' + String(id).padStart(5,'0')}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Erreur de connexion') }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Paiements</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                {total} paiement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ padding: '9px 20px', background: '#fff', color: '#0F766E',
                border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              + Enregistrer un paiement
            </button>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total paiements',  value: kpis.total_paiements, color: '#1B3A6B', bg: '#EFF6FF', icon: '🧾', big: false },
              { label: 'Montant encaissé', value: `${fmt(kpis.total_encaisse)} FCFA`, color: '#16A34A', bg: '#F0FDF4', icon: '💰', big: true },
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
                <div style={{ fontSize: typeof value === 'string' ? '18px' : '28px',
                  fontWeight: '800', color, lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Filtre */}
          <div className="ft-card" style={{ padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '10px' }}>
            <select value={filtreMode} onChange={e => { setFiltreMode(e.target.value); setPage(1) }} style={inp}>
              <option value="">Tous les modes de paiement</option>
              {Object.entries(MODE_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {filtreMode && (
              <button onClick={() => { setFiltreMode(''); setPage(1) }}
                style={{ ...inp, cursor: 'pointer', color: '#64748B', fontWeight: '600', fontSize: '12px' }}>
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Tableau */}
          <div className="ft-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div className="ft-spinner" />
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>Chargement des paiements…</span>
              </div>
            ) : paiements.length === 0 ? (
              <div className="ft-empty">
                <span className="ft-empty-icon">💳</span>
                <span className="ft-empty-title">Aucun paiement trouvé</span>
                <span className="ft-empty-sub">
                  {filtreMode ? 'Modifiez le filtre de mode de paiement' : 'Enregistrez un premier paiement'}
                </span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    {['Référence', 'Étudiant', 'Montant', 'Mode', 'Motif', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                        letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((p, i) => {
                    const mi = MODE_INFO[p.mode_paiement] || MODE_INFO.especes
                    return (
                      <tr key={p.id} className="ft-tr"
                        style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700',
                            color: '#1B3A6B', background: '#EFF6FF', padding: '3px 8px', borderRadius: '5px' }}>
                            {p.reference || `FT-${String(p.id).padStart(5, '0')}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                          {p.etudiant}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A' }}>{fmt(p.montant)}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>FCFA</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: mi.bg, color: mi.color, padding: '3px 10px',
                            borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: mi.dot }} />
                            {mi.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', maxWidth: '130px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.motif || <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {p.date_paiement}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => handleRecu(p.id, p.reference)}
                            style={{ ...inp, cursor: 'pointer', color: '#2563EB', background: '#EFF6FF',
                              fontWeight: '600', fontSize: '12px', border: 'none', whiteSpace: 'nowrap' }}>
                            🖨️ Reçu
                          </button>
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
                  style={{ ...inp, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: '600',
                    color: page === 1 ? '#CBD5E1' : '#1B3A6B' }}>← Préc.</button>
                {Array.from({ length: Math.min(nbPages, 7) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '7px',
                      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      background: page === n ? '#1B3A6B' : '#F1F5F9',
                      color:      page === n ? '#fff'    : '#64748B' }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                  style={{ ...inp, cursor: page === nbPages ? 'not-allowed' : 'pointer', fontWeight: '600',
                    color: page === nbPages ? '#CBD5E1' : '#1B3A6B' }}>Suiv. →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ModalPaiement
          caisses={caisses}
          onClose={() => setShowModal(false)}
          onSave={() => { fetchPaiements(); setShowModal(false) }}
          onRecu={handleRecu}
        />
      )}
    </div>
  )
}
