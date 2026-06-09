import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer } from 'recharts'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

export default function ComptableDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res  = await fetch(`${API}/dashboard`, { headers: getHeaders() })
        const json = await res.json()
        if (res.ok) setData(json)
      } catch {}
      finally { setLoading(false) }
    }
    fetchDashboard()
  }, [])

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
            <div>Chargement...</div>
          </div>
        </div>
      </div>
    )
  }

  const kpis     = data?.kpis || {}
  const evolution = data?.evolution || []
  const topCaisses = data?.top_caisses || []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>
            📊 Tableau de Bord — Comptable
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
            Vue d'ensemble de l'activité financière
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { icon: '💰', label: 'Total encaissé', value: `${fmt(kpis.total_encaisse)} FCFA`, bg: '#F0FDF4', color: '#16A34A' },
            { icon: '💸', label: 'Total dépensé',  value: `${fmt(kpis.total_depense)} FCFA`,  bg: '#FEF2F2', color: '#DC2626' },
            { icon: '🎓', label: 'Étudiants actifs', value: kpis.nb_etudiants_actifs,         bg: '#F5F3FF', color: '#7C3AED' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, borderRadius: '14px', padding: '22px 24px',
              flex: 1, minWidth: '180px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{k.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Graphique évolution */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
          marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
            📈 Évolution des recettes — 6 derniers mois
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolution} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => [`${v.toLocaleString('fr-FR')} FCFA`, 'Recettes']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
              <Bar dataKey="recettes" fill="#27AE60" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* État caisses */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
            🏦 Soldes des caisses
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {topCaisses.map((c, i) => (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px',
                padding: '14px 18px', flex: 1, minWidth: '160px',
                borderLeft: `4px solid #1B3A6B` }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                  {c.nom}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800',
                  color: c.solde > 0 ? '#16A34A' : '#DC2626' }}>
                  {c.solde.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
