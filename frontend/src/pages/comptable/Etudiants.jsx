import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { PhoneDisplay } from '../../components/PhoneInput'
import ModalEcheancier from '../../components/ModalEcheancier'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const toSigle = (filiere) => /\(([^)]+)\)$/.exec(filiere)?.[1] ?? filiere

export default function ComptableEtudiants() {
  const [etudiants, setEtudiants] = useState([])
  const [stats, setStats]         = useState({ total: 0, actifs: 0, archives: 0 })
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtreClasse, setFiltreClasse] = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)
  const [modalEch, setModalEch]   = useState(null)

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
            { label: 'Total',    value: stats.total,    bg: '#EFF6FF', color: '#1D4ED8' },
            { label: 'Actifs',   value: stats.actifs,   bg: '#F0FDF4', color: '#16A34A' },
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
                  {['Matricule', 'Nom complet', 'Classe / Filière', 'Contact', 'Année académique', 'Échéancier'].map(h => (
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px',
                          borderRadius: '4px', fontSize: '12px', fontWeight: '600', width: 'fit-content' }}>{e.classe}</span>
                        {e.filiere && (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{toSigle(e.filiere)}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><PhoneDisplay value={e.contact} /></td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{e.annee_academique}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setModalEch(e)}
                        style={{ padding: '5px 12px', background: '#EFF6FF', color: '#1B3A6B',
                          border: '1px solid #BFDBFE', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                        📋 Échéancier
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

      {modalEch && (
        <ModalEcheancier
          etudiant={modalEch}
          caisses={[]}
          onClose={() => setModalEch(null)}
          onRefresh={fetchEtudiants}
        />
      )}
    </div>
  )
}
