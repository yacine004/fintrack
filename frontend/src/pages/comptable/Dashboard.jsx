import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const CAISSE_COLORS = ['#1B3A6B', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#2D8CFF']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px',
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}>
      <div style={{ fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
          <span>{p.name} : <strong style={{ color: p.color }}>{fmt(p.value)} FCFA</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function ComptableDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API}/dashboard`, { headers: getHeaders() })
        const json = await res.json()
        if (res.ok) setData(json)
      } catch {}
      finally { setLoading(false) }
    }
    fetch_()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: '32px' }}>
          <div className="ft-skeleton" style={{ width: '280px', height: '28px', marginBottom: '32px' }} />
          <div style={{ display: 'flex', gap: '14px', marginBottom: '28px' }}>
            {[1,2,3].map(i => (
              <div key={i} className="ft-skeleton" style={{ flex: 1, height: '90px', borderRadius: '14px' }} />
            ))}
          </div>
          <div className="ft-skeleton" style={{ height: '280px', borderRadius: '14px', marginBottom: '20px' }} />
          <div className="ft-skeleton" style={{ height: '150px', borderRadius: '14px' }} />
        </div>
      </div>
    )
  }

  const kpis       = data?.kpis || {}
  const evolution  = data?.evolution || []
  const topCaisses = data?.top_caisses || []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1B3A6B 0%, #2D5BB7 60%, #2D8CFF 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
              {getGreeting()}, {user.prenom || 'Comptable'} 👋
            </p>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              Tableau de Bord
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              Vue financière · ISM Dakar
            </p>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total encaissé',   value: `${fmt(kpis.total_encaisse)} FCFA`, color: '#16A34A', bg: '#F0FDF4', icon: '💰' },
              { label: 'Total dépensé',    value: `${fmt(kpis.total_depense)} FCFA`,  color: '#DC2626', bg: '#FEF2F2', icon: '💸' },
              { label: 'Étudiants actifs', value: kpis.nb_etudiants_actifs ?? '—',    color: '#7C3AED', bg: '#F5F3FF', icon: '🎓' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="ft-card" style={{
                padding: '20px 22px', flex: 1, minWidth: '160px',
                borderTop: `3px solid ${color}`, cursor: 'default'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{icon}</div>
                </div>
                <div style={{ fontSize: typeof value === 'number' ? '28px' : '18px',
                  fontWeight: '800', color, lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Graphique */}
          <div className="ft-card" style={{ padding: '22px 24px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex',
                alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>📈</span> Évolution des recettes
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>6 derniers mois</p>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={evolution} margin={{ top: 4, right: 10, left: 10, bottom: 4 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94A3B8', fontFamily: 'Inter' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="recettes" name="Recettes" fill="#16A34A" radius={[5,5,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Soldes caisses */}
          {topCaisses.length > 0 && (
            <div className="ft-card" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px',
                display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏦</span> Soldes des caisses
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                {topCaisses.map((c, i) => (
                  <div key={i} style={{
                    background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px',
                    borderLeft: `3px solid ${CAISSE_COLORS[i % CAISSE_COLORS.length]}`,
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569',
                      marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%',
                        background: CAISSE_COLORS[i % CAISSE_COLORS.length] }} />
                      {c.nom}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '800',
                      color: c.solde > 0 ? '#16A34A' : '#DC2626' }}>
                      {fmt(c.solde)}
                      <span style={{ fontSize: '11px', fontWeight: '500', color: '#94A3B8', marginLeft: '4px' }}>FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px', textTransform: 'capitalize' }}>
                      {c.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
