import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import ModalEcheancier, { ModalPaiement, genererEcheancier, getNiveau, fetchBareme } from '../../components/ModalEcheancier'

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

const inp = {
  padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
  fontSize: '13px', outline: 'none', background: '#fff', fontFamily: 'Inter, sans-serif',
}

const fmt = n => Number(n || 0).toLocaleString('fr-FR')

/* ── Tableau Transactions ────────────────────────────────────────────────── */
function TabTransactions({ paiements, loading, nbPages, page, setPage, filtreMode, setFiltreMode,
  filtreCaisse, setFiltreCaisse, dateDebut, setDateDebut, dateFin, setDateFin, caisses, handleRecu }) {

  const hasFilters = filtreMode || filtreCaisse || dateDebut || dateFin

  return (
    <>
      {/* Filtres */}
      <div className="ft-card" style={{ padding: '14px 18px', marginBottom: '18px',
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtreMode} onChange={e => { setFiltreMode(e.target.value); setPage(1) }} style={inp}>
          <option value="">Tous les modes</option>
          {Object.entries(MODE_INFO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filtreCaisse} onChange={e => { setFiltreCaisse(e.target.value); setPage(1) }} style={inp}>
          <option value="">Toutes les caisses</option>
          {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }} style={inp} />
          <span style={{ color: '#CBD5E1', fontSize: '18px', fontWeight: '300' }}>–</span>
          <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }} style={inp} />
        </div>
        {hasFilters && (
          <button onClick={() => { setFiltreMode(''); setFiltreCaisse(''); setDateDebut(''); setDateFin(''); setPage(1) }}
            style={{ ...inp, cursor: 'pointer', color: '#64748B', fontWeight: '600', fontSize: '12px' }}>
            ✕ Effacer
          </button>
        )}
      </div>

      {/* Table */}
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
              {hasFilters ? 'Modifiez les filtres pour voir plus de résultats' : 'Enregistrez un premier paiement'}
            </span>
          </div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Référence', 'Étudiant', 'Montant', 'Mode', 'Caisse', 'Motif', 'Date', ''].map(h => (
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
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A' }}>
                        {fmt(p.montant)}
                      </span>
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
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{p.caisse}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', maxWidth: '140px',
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
    </>
  )
}

/* ── Tableau Par étudiant ────────────────────────────────────────────────── */
function TabEtudiants({ etudiants, setSelectedEtu }) {
  const NIVEAU_STYLE = {
    L1: { bg: '#F5F3FF', color: '#7C3AED' }, L2: { bg: '#EFF6FF', color: '#1B3A6B' },
    L3: { bg: '#E0F2FE', color: '#0369A1' }, M1: { bg: '#CCFBF1', color: '#0F766E' },
    M2: { bg: '#DCFCE7', color: '#15803D' },
  }

  // Barème regroupé par année académique (les étudiants affichés peuvent appartenir à des années différentes)
  const [baremeParAnnee, setBaremeParAnnee] = useState({})
  useEffect(() => {
    const annees = [...new Set(etudiants.map(e => e.annee_academique).filter(Boolean))]
    Promise.all(annees.map(a => fetchBareme(a).then(b => [a, b])))
      .then(pairs => setBaremeParAnnee(Object.fromEntries(pairs)))
  }, [etudiants])

  if (etudiants.length === 0) {
    return (
      <div className="ft-empty ft-card" style={{ padding: '60px 20px' }}>
        <span className="ft-empty-icon">👥</span>
        <span className="ft-empty-title">Aucun étudiant actif</span>
      </div>
    )
  }

  return (
    <div className="ft-card" style={{ overflow: 'hidden' }}>
      <table>
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
            {['Matricule', 'Étudiant', 'Niveau', 'Total 2025-2026', 'Frais mensuel', 'Échéancier'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {etudiants.map((e, i) => {
            const niv  = getNiveau(e.classe)
            const ech  = genererEcheancier(niv, baremeParAnnee[e.annee_academique])
            const nc   = NIVEAU_STYLE[niv] || NIVEAU_STYLE.L1
            return (
              <tr key={e.id} className="ft-tr"
                style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700',
                    color: '#1B3A6B', background: '#EFF6FF', padding: '3px 8px', borderRadius: '5px' }}>
                    {e.matricule}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#1E293B' }}>{e.prenom} {e.nom}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{e.email || ''}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: nc.bg, color: nc.color, padding: '3px 10px',
                    borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>{niv}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#1B3A6B' }}>
                    {fmt(ech.totalAnnuel)} FCFA
                  </div>
                  {niv === 'L3' && (
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                      dont encadrement mémoire
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                  {fmt(ech.fraisMensuel)} FCFA
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => setSelectedEtu(e)}
                    style={{ padding: '7px 14px', background: '#1B3A6B', color: '#fff',
                      border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    📋 Échéancier
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Page principale
   ══════════════════════════════════════════════════════════ */
export default function RafPaiements() {
  const [paiements, setPaiements]       = useState([])
  const [kpis, setKpis]                 = useState({ total_paiements: 0, total_encaisse: 0 })
  const [etudiants, setEtudiants]       = useState([])
  const [caisses, setCaisses]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('transactions')
  const [showModal, setShowModal]       = useState(false)
  const [selectedEtu, setSelectedEtu]   = useState(null)
  const [filtreMode, setFiltreMode]     = useState('')
  const [filtreCaisse, setFiltreCaisse] = useState('')
  const [dateDebut, setDateDebut]       = useState('')
  const [dateFin, setDateFin]           = useState('')
  const [page, setPage]                 = useState(1)
  const [nbPages, setNbPages]           = useState(1)
  const [total, setTotal]               = useState(0)

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
      if (res.ok) { setPaiements(data.paiements); setTotal(data.total); setNbPages(data.nb_pages); setKpis(data.kpis) }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreMode, filtreCaisse, dateDebut, dateFin])

  const fetchSelectData = useCallback(async () => {
    try {
      const [resE, resC] = await Promise.all([
        fetch(`${API}/etudiants?limit=200&statut=actif`, { headers: getHeaders() }),
        fetch(`${API}/caisses`, { headers: getHeaders() })
      ])
      const [dE, dC] = await Promise.all([resE.json(), resC.json()])
      if (resE.ok) setEtudiants(dE.etudiants)
      if (resC.ok) setCaisses(dC.caisses)
    } catch {}
  }, [])

  useEffect(() => { fetchPaiements() },  [fetchPaiements])
  useEffect(() => { fetchSelectData() }, [fetchSelectData])

  const handleRecu = async (id, ref) => {
    try {
      const res = await fetch(`${API}/paiements/${id}/recu`, { headers: getHeaders() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'
      a.download = `recu_${ref || 'FT-' + String(id).padStart(5, '0')}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Erreur de connexion') }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header gradient */}
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => window.location.href = '/raf/impayes'}
                style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.35)', borderRadius: '9px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                ⚠️ Impayés
              </button>
              <button onClick={() => setShowModal(true)}
                style={{ padding: '9px 20px', background: '#fff', color: '#0F766E',
                  border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                + Nouveau paiement
              </button>
            </div>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total paiements',  value: kpis.total_paiements, color: '#1B3A6B', bg: '#EFF6FF', icon: '🧾' },
              { label: 'Montant encaissé', value: `${fmt(kpis.total_encaisse)} FCFA`,
                color: '#16A34A', bg: '#F0FDF4', icon: '💰' },
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
                <div className="ft-stat" style={{ color, fontSize: label === 'Montant encaissé' ? '20px' : '26px' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px',
            padding: '4px', width: 'fit-content', marginBottom: '20px' }}>
            {[
              { key: 'transactions', label: 'Transactions' },
              { key: 'etudiants',    label: 'Par étudiant' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  border: 'none', borderRadius: '7px',
                  background: tab === key ? '#1B3A6B' : 'transparent',
                  color:      tab === key ? '#fff'    : '#64748B',
                  transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Contenu onglet */}
          {tab === 'transactions' && (
            <TabTransactions
              paiements={paiements} loading={loading} nbPages={nbPages} page={page} setPage={setPage}
              filtreMode={filtreMode} setFiltreMode={setFiltreMode}
              filtreCaisse={filtreCaisse} setFiltreCaisse={setFiltreCaisse}
              dateDebut={dateDebut} setDateDebut={setDateDebut}
              dateFin={dateFin} setDateFin={setDateFin}
              caisses={caisses} handleRecu={handleRecu}
            />
          )}
          {tab === 'etudiants' && (
            <TabEtudiants etudiants={etudiants} setSelectedEtu={setSelectedEtu} />
          )}
        </div>
      </div>

      {showModal && (
        <ModalPaiement
          etudiants={etudiants} caisses={caisses}
          onClose={() => setShowModal(false)}
          onRecu={handleRecu}
          onSave={() => fetchPaiements()}
        />
      )}

      {selectedEtu && (
        <ModalEcheancier
          etudiant={selectedEtu} caisses={caisses} etudiants={etudiants}
          onClose={() => setSelectedEtu(null)}
          onRefresh={() => fetchPaiements()}
        />
      )}
    </div>
  )
}
