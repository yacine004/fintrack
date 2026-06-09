import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const TYPE_INFO = {
  mensuel:      { label: '📅 Mensuel',      desc: 'Récapitulatif d\'un mois' },
  trimestriel:  { label: '📆 Trimestriel',  desc: 'Récapitulatif d\'un trimestre' },
  annuel:       { label: '🗓️ Annuel',        desc: 'Récapitulatif d\'une année' },
}

export default function RafRapports() {
  const [rapports, setRapports]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [total, setTotal]           = useState(0)

  // Formulaire
  const [type, setType]       = useState('mensuel')
  const [periode, setPeriode] = useState(new Date().toISOString().slice(0, 7))
  const [format, setFormat]   = useState('pdf')
  const [erreur, setErreur]   = useState('')

  const now = new Date()

  const getPeriodeLabel = () => {
    if (type === 'mensuel') return 'Mois (AAAA-MM)'
    if (type === 'trimestriel') return 'Trimestre (ex: 2026T1)'
    return 'Année (AAAA)'
  }

  const getPeriodePlaceholder = () => {
    if (type === 'mensuel') return now.toISOString().slice(0, 7)
    if (type === 'trimestriel') return `${now.getFullYear()}T${Math.ceil((now.getMonth()+1)/3)}`
    return String(now.getFullYear())
  }

  const fetchRapports = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/rapports?page=${page}&limit=10`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setRapports(data.rapports); setTotal(data.total); setNbPages(data.nb_pages) }
    } catch {}
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchRapports() }, [fetchRapports])

  const handleGenerer = async () => {
    if (!periode) { setErreur('La période est obligatoire'); return }
    setGenerating(true)
    setErreur('')
    try {
      const res  = await fetch(`${API}/rapports`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ type, periode, format })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      fetchRapports()
    } catch { setErreur('Erreur de connexion') }
    finally { setGenerating(false) }
  }

  const handleExporter = (id, fmt) => {
    window.open(`${API}/rapports/${id}/export?format=${fmt}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>📑 Rapports Financiers</h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
            Générez et exportez des rapports en PDF ou Excel
          </p>
        </div>

        {/* Formulaire de génération */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px',
          marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1B3A6B' }}>
            ⚙️ Générer un nouveau rapport
          </h3>

          {erreur && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
              padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
              ⚠️ {erreur}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B',
                marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type *</label>
              <select value={type} onChange={e => { setType(e.target.value); setPeriode(getPeriodePlaceholder()) }}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
                  borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
                {Object.entries(TYPE_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B',
                marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {getPeriodeLabel()} *
              </label>
              <input value={periode} onChange={e => setPeriode(e.target.value)}
                placeholder={getPeriodePlaceholder()}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B',
                marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Format *</label>
              <select value={format} onChange={e => setFormat(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
                  borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
                <option value="pdf">📄 PDF</option>
                <option value="excel">📊 Excel</option>
              </select>
            </div>
            <button onClick={handleGenerer} disabled={generating}
              style={{ padding: '10px 24px', background: generating ? '#94A3B8' : '#1B3A6B',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: generating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600',
                whiteSpace: 'nowrap' }}>
              {generating ? '⏳ Génération...' : '⚡ Générer'}
            </button>
          </div>

          {/* Aperçu du type sélectionné */}
          <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px 16px', marginTop: '16px',
            display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              {TYPE_INFO[type]?.desc} — Format : {format === 'pdf' ? 'PDF téléchargeable' : 'Excel (.xlsx)'}
            </span>
          </div>
        </div>

        {/* Historique des rapports */}
        <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
              📋 Historique des rapports ({total})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : rapports.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📑</div>
              Aucun rapport généré. Utilisez le formulaire ci-dessus.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Type', 'Période', 'Format', 'Date génération', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rapports.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                    borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        {TYPE_INFO[r.type]?.label || r.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                      {r.periode}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: r.format === 'pdf' ? '#FEF2F2' : '#F0FDF4',
                        color: r.format === 'pdf' ? '#DC2626' : '#16A34A',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        {r.format === 'pdf' ? '📄 PDF' : '📊 Excel'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94A3B8' }}>
                      {r.date_creation}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleExporter(r.id, 'pdf')}
                          style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          📄 PDF
                        </button>
                        <button onClick={() => handleExporter(r.id, 'excel')}
                          style={{ padding: '5px 10px', background: '#F0FDF4', color: '#16A34A',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          📊 Excel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
