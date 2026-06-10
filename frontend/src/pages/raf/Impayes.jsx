import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

export default function RafImpayes() {
  const [impayes, setImpayes]     = useState([])
  const [totalImpaye, setTotalImpaye] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [filtreClasse, setFiltreClasse] = useState('')
  const [filtreAnnee, setFiltreAnnee]   = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)

  const fetchImpayes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreClasse) params.set('classe', filtreClasse)
      if (filtreAnnee)  params.set('annee', filtreAnnee)

      const res  = await fetch(`${API}/paiements/impayes?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setImpayes(data.impayes)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        setTotalImpaye(data.total_impaye)
      }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreClasse, filtreAnnee])

  useEffect(() => { fetchImpayes() }, [fetchImpayes])

  const getPct = (paye, attendu) => Math.min(100, Math.round((paye / attendu) * 100))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>⚠️ Étudiants en Impayé</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {total} étudiant{total > 1 ? 's' : ''} avec solde restant dû
            </p>
          </div>
          <button onClick={() => window.location.href = '/raf/paiements'}
            style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ← Retour aux paiements
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#DC2626' }}>{total}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Étudiants en impayé</div>
          </div>
          <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#EA580C' }}>
              {totalImpaye.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Total impayé global</div>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <select value={filtreClasse} onChange={e => { setFiltreClasse(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les classes</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtreAnnee} onChange={e => { setFiltreAnnee(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les années</option>
            {['2023-2024', '2024-2025', '2025-2026'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Tableau impayés */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : impayes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#16A34A' }}>Aucun impayé !</div>
              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                Tous les étudiants sont à jour dans leurs paiements.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FEF2F2' }}>
                  {['Matricule', 'Étudiant', 'Classe', 'Payé', 'Attendu', 'Solde restant', 'Avancement', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#DC2626', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #FCA5A5' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impayes.map((imp, i) => {
                  const pct = getPct(imp.total_paye, imp.montant_attendu)
                  const e   = imp.etudiant
                  return (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#FFFBFB',
                      borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#1B3A6B' }}>
                        {e.matricule}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: '#1E293B' }}>{e.prenom} {e.nom}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{e.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {e.classe}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#16A34A', fontWeight: '600' }}>
                        {imp.total_paye.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>
                        {imp.montant_attendu.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>
                        {imp.solde_restant.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: '120px' }}>
                        <div style={{ background: '#E2E8F0', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: '20px',
                            background: pct >= 75 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626'
                          }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', textAlign: 'center' }}>
                          {pct}%
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => window.location.href = '/raf/paiements'}
                          style={{ padding: '5px 10px', background: '#1B3A6B', color: '#fff',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          💳 Payer
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
    </div>
  )
}
