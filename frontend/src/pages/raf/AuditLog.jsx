import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const ACTION_STYLES = {
  CREATE: { bg: '#F0FDF4', color: '#16A34A', label: '➕ Création' },
  UPDATE: { bg: '#EFF6FF', color: '#2563EB', label: '✏️ Modification' },
  DELETE: { bg: '#FEF2F2', color: '#DC2626', label: '🗑️ Suppression' },
  LOGIN:  { bg: '#F5F3FF', color: '#7C3AED', label: '🔐 Connexion' },
  LOGOUT: { bg: '#FFF7ED', color: '#EA580C', label: '🚪 Déconnexion' },
  VALIDER: { bg: '#F0FDF4', color: '#16A34A', label: '✅ Validation' },
  REJETER: { bg: '#FEF2F2', color: '#DC2626', label: '❌ Rejet' },
}

const ENTITES = ['Utilisateur', 'Etudiant', 'Caisse', 'Paiement', 'Depense', 'Budget', 'Rapport']

export default function RafAuditLog() {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtreAction, setFiltreAction] = useState('')
  const [filtreEntite, setFiltreEntite] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin]     = useState('')
  const [page, setPage]           = useState(1)
  const [nbPages, setNbPages]     = useState(1)
  const [total, setTotal]         = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (filtreAction) params.set('action', filtreAction)
      if (filtreEntite) params.set('entite', filtreEntite)
      if (dateDebut)    params.set('date_debut', dateDebut)
      if (dateFin)      params.set('date_fin', dateFin)

      const res  = await fetch(`${API}/audit?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs)
        setTotal(data.total)
        setNbPages(data.nb_pages)
      }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreAction, filtreEntite, dateDebut, dateFin])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const getActionStyle = (action) => {
    const key = Object.keys(ACTION_STYLES).find(k => action?.toUpperCase().includes(k))
    return ACTION_STYLES[key] || { bg: '#F8FAFC', color: '#64748B', label: action }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>📋 Journal d'Audit</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {total} action{total > 1 ? 's' : ''} tracée{total > 1 ? 's' : ''} dans le système
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filtreAction} onChange={e => { setFiltreAction(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les actions</option>
            {Object.keys(ACTION_STYLES).map(a => (
              <option key={a} value={a}>{ACTION_STYLES[a].label}</option>
            ))}
          </select>
          <select value={filtreEntite} onChange={e => { setFiltreEntite(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les entités</option>
            {ENTITES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          <span style={{ color: '#94A3B8' }}>→</span>
          <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          {(filtreAction || filtreEntite || dateDebut || dateFin) && (
            <button onClick={() => { setFiltreAction(''); setFiltreEntite(''); setDateDebut(''); setDateFin(''); setPage(1) }}
              style={{ padding: '9px 14px', background: '#F1F5F9', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: '#64748B' }}>✕ Effacer</button>
          )}
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
              Aucune action enregistrée
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Date', 'Utilisateur', 'Rôle', 'Action', 'Entité', 'ID entité', 'Détails'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const st = getActionStyle(log.action)
                  return (
                    <tr key={log.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                      borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '11px 16px', fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        {log.date_action}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                        {log.utilisateur_nom}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          background: log.utilisateur_role === 'raf' ? '#EFF6FF' : '#F0FDF4',
                          color: log.utilisateur_role === 'raf' ? '#1D4ED8' : '#16A34A',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {log.utilisateur_role}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ background: st.bg, color: st.color,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                        {log.entite}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748B' }}>
                        {log.id_entite || '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '12px', color: '#94A3B8',
                        maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
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
