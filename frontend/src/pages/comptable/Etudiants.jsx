import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const MODE_LABELS = { especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', wave: 'Wave' }
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

// ── Modal Solde ────────────────────────────────────────────────────────────
function ModalSolde({ etudiant, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState('')

  useEffect(() => {
    fetch(`${API}/etudiants/suivi?matricule=${etudiant.matricule}`)
      .then(r => r.json())
      .then(d => {
        if (d.etudiant) setData(d)
        else setErreur(d.message || 'Impossible de charger les données')
      })
      .catch(() => setErreur('Erreur de connexion'))
      .finally(() => setLoading(false))
  }, [etudiant.matricule])

  const aJour = data?.resume?.a_jour
  const pct   = data ? Math.min(100, Math.round((data.resume.total_paye / data.resume.tarif_annuel) * 100)) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '680px',
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          background: '#1B3A6B', borderRadius: '16px 16px 0 0',
          padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>
              Suivi paiements — {etudiant.prenom} {etudiant.nom}
            </div>
            <div style={{ color: '#93C5FD', fontSize: '12px', marginTop: '2px' }}>
              {etudiant.matricule} | {etudiant.classe} {etudiant.filiere}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>⏳ Chargement...</div>}
          {erreur  && <div style={{ color: '#DC2626', padding: '20px', textAlign: 'center' }}>⚠️ {erreur}</div>}

          {data && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Frais annuels',  val: fmt(data.resume.tarif_annuel),  bg: '#EFF6FF', color: '#1B3A6B' },
                  { label: 'Total payé',      val: fmt(data.resume.total_paye),    bg: '#F0FDF4', color: '#16A34A' },
                  { label: 'Solde restant',   val: fmt(data.resume.solde_restant),
                    bg: data.resume.solde_restant > 0 ? '#FEF2F2' : '#F0FDF4',
                    color: data.resume.solde_restant > 0 ? '#DC2626' : '#16A34A' },
                ].map(({ label, val, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: aJour ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${aJour ? '#16A34A' : '#DC2626'}`,
                borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: aJour ? '#16A34A' : '#DC2626', fontSize: '14px' }}>
                    {aJour ? '✅ Situation à jour' : '⚠️ Solde impayé'}
                  </span>
                  <span style={{ fontWeight: '800', color: aJour ? '#16A34A' : '#DC2626' }}>{pct}%</span>
                </div>
                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: pct >= 100 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626',
                    borderRadius: '99px', transition: 'width 0.4s',
                  }} />
                </div>
              </div>

              {data.paiements.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
                  Aucun paiement enregistré.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Réf.', 'Motif', 'Montant', 'Mode', 'Sem.', 'Date'].map(h => (
                          <th key={h} style={{
                            padding: '9px 12px', textAlign: 'left', fontWeight: '700',
                            color: '#64748B', fontSize: '11px', textTransform: 'uppercase',
                            borderBottom: '1px solid #E2E8F0',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.paiements.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '9px 12px', fontWeight: '600', color: '#1B3A6B' }}>{p.reference}</td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{p.motif || '—'}</td>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#16A34A', whiteSpace: 'nowrap' }}>{fmt(p.montant)}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: '#EFF6FF', color: '#1B3A6B', padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                              {MODE_LABELS[p.mode_paiement] || p.mode_paiement}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{
                              background: p.semestre === 'S1' ? '#EFF6FF' : '#F0FDF4',
                              color: p.semestre === 'S1' ? '#1D4ED8' : '#15803D',
                              padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                            }}>{p.semestre}</span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{p.date_paiement}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F1F5F9', borderTop: '2px solid #E2E8F0' }}>
                        <td colSpan={2} style={{ padding: '10px 12px', fontWeight: '700', color: '#1B3A6B' }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#16A34A' }}>{fmt(data.resume.total_paye)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ComptableEtudiants() {
  const [etudiants, setEtudiants] = useState([])
  const [stats, setStats]         = useState({ total: 0, actifs: 0, archives: 0 })
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtreClasse, setFiltreClasse] = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)
  const [modalSolde, setModalSolde] = useState(null)

  const fetchEtudiants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search)       params.set('search', search)
      if (filtreClasse) params.set('classe', filtreClasse)
      params.set('statut', 'actif')

      const res  = await fetch(`${API}/etudiants?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setEtudiants(data.etudiants)
        setTotal(data.total)
        setNbPages(data.nb_pages)
      }
    } catch {}
    finally { setLoading(false) }
  }, [page, search, filtreClasse])

  const fetchStats = async () => {
    try {
      const res  = await fetch(`${API}/etudiants/stats`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch {}
  }

  useEffect(() => { fetchEtudiants(); fetchStats() }, [fetchEtudiants])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>🎓 Étudiants</h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
            {total} étudiant{total > 1 ? 's' : ''} actif{total > 1 ? 's' : ''}
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: stats.total, bg: '#EFF6FF', color: '#1D4ED8' },
            { label: 'Actifs', value: stats.actifs, bg: '#F0FDF4', color: '#16A34A' },
            { label: 'Archivés', value: stats.archives, bg: '#FFF7ED', color: '#EA580C' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="🔍 Rechercher (nom, matricule)..."
            style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #E2E8F0',
              borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          <select value={filtreClasse} onChange={e => { setFiltreClasse(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les classes</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : etudiants.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucun étudiant trouvé</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Matricule', 'Nom complet', 'Classe / Filière', 'Contact', 'Année académique', 'Solde'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {etudiants.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1B3A6B' }}>{e.matricule}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', color: '#1E293B' }}>{e.prenom} {e.nom}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>{e.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px',
                        borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{e.classe}</span>
                      {e.filiere && <span style={{ marginLeft: '6px', color: '#64748B', fontSize: '12px' }}>{e.filiere}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{e.contact || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{e.annee_academique}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setModalSolde(e)}
                        style={{ padding: '5px 12px', background: '#F0FDF4', color: '#16A34A',
                          border: '1px solid #86EFAC', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                        💰 Voir solde
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {nbPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #F1F5F9' }}>
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

      {modalSolde && (
        <ModalSolde etudiant={modalSolde} onClose={() => setModalSolde(null)} />
      )}
    </div>
  )
}
