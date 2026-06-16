import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
         PieChart, Pie, Cell, ResponsiveContainer,
         LineChart, Line } from 'recharts'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const COLORS_PIE = ['#1B3A6B', '#27AE60', '#E67E22', '#8E44AD', '#E74C3C', '#2E75B6']

function KpiCard({ label, value, sub, bg, color, icon }) {
  return (
    <div style={{ background: bg, borderRadius: '14px', padding: '22px 24px',
      flex: 1, minWidth: '160px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default function RafDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtreCaisse, setFiltreCaisse] = useState('')
  const [caisses, setCaisses] = useState([])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const params = filtreCaisse ? `?caisse_id=${filtreCaisse}` : ''
      const res    = await fetch(`${API}/dashboard${params}`, { headers: getHeaders() })
      const json   = await res.json()
      if (res.ok) setData(json)
    } catch {}
    finally { setLoading(false) }
  }

  const fetchCaisses = async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const json = await res.json()
      if (res.ok) setCaisses(json.caisses)
    } catch {}
  }

  useEffect(() => { fetchDashboard(); fetchCaisses() }, [filtreCaisse])

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
            <div>Chargement du tableau de bord...</div>
          </div>
        </div>
      </div>
    )
  }

  const kpis                = data?.kpis || {}
  const evolution           = data?.evolution || []
  const modes               = data?.repartition_modes || []
  const alertes             = data?.alertes_budget || []
  const alertesIntelligentes = data?.alertes_intelligentes || []
  const topCaisses          = data?.top_caisses || []
  const comparaison         = data?.comparaison || null
  const previsions          = data?.previsions || []

  const donneesGraphPrevisions = [
    ...evolution.map(e => ({ mois: e.mois, recettes: e.recettes, depenses: e.depenses })),
    ...previsions.map(p => ({ mois: p.mois, recettes_prev: p.recettes_prevues, depenses_prev: p.depenses_prevues })),
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>
              📊 Tableau de Bord — RAF
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              Vue d'ensemble financière en temps réel
            </p>
          </div>
          <select value={filtreCaisse} onChange={e => setFiltreCaisse(e.target.value)}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              fontSize: '14px', outline: 'none', background: '#fff' }}>
            <option value="">Toutes les caisses</option>
            {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {/* Alertes budget */}
        {alertes.length > 0 && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alertes.map((a, i) => (
              <div key={i} style={{
                background: a.type === 'depasse' ? '#FEF2F2' : '#FFF7ED',
                border: `1px solid ${a.type === 'depasse' ? '#FCA5A5' : '#FCD34D'}`,
                borderRadius: '10px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>{a.type === 'depasse' ? '🚨' : '⚠️'}</span>
                <span style={{ fontSize: '14px', fontWeight: '600',
                  color: a.type === 'depasse' ? '#DC2626' : '#D97706' }}>
                  Budget "{a.categorie}" — {a.taux}% consommé
                  {a.type === 'depasse' ? ' — DÉPASSÉ !' : ' — Attention'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Alertes intelligentes */}
        {alertesIntelligentes.length > 0 && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alertesIntelligentes.map((a, i) => (
              <div key={i} style={{
                background: a.niveau === 'danger' ? '#FEF2F2' : '#FFF7ED',
                border: `1px solid ${a.niveau === 'danger' ? '#FCA5A5' : '#FCD34D'}`,
                borderRadius: '10px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>{a.niveau === 'danger' ? '🚨' : '📊'}</span>
                <span style={{ fontSize: '14px', fontWeight: '600',
                  color: a.niveau === 'danger' ? '#DC2626' : '#D97706' }}>
                  {a.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <KpiCard icon="💰" label="Total encaissé" value={`${fmt(kpis.total_encaisse)} FCFA`}
            bg="#F0FDF4" color="#16A34A" />
          <KpiCard icon="💸" label="Total dépensé" value={`${fmt(kpis.total_depense)} FCFA`}
            bg="#FEF2F2" color="#DC2626" />
          <KpiCard icon="🏦" label="Solde global" value={`${fmt(kpis.solde_global)} FCFA`}
            bg="#EFF6FF" color="#1B3A6B" />
          <KpiCard icon="🎓" label="Étudiants actifs" value={kpis.nb_etudiants_actifs}
            bg="#F5F3FF" color="#7C3AED" />
          <KpiCard icon="⚠️" label="Impayés" value={kpis.nb_impayes}
            bg="#FFF7ED" color="#EA580C"
            sub={kpis.nb_impayes > 0 ? 'Voir la liste' : 'Aucun impayé'} />
        </div>

        {/* Comparaison N vs N-1 — masquée si aucune donnée N-1 */}
        {comparaison && (comparaison.recettes_n1 > 0 || comparaison.depenses_n1 > 0) && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
            marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
              📅 Comparaison {comparaison.annee_n} vs {comparaison.annee_n1}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Recettes', n: comparaison.recettes_n, n1: comparaison.recettes_n1, evol: comparaison.evol_recettes, color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Dépenses', n: comparaison.depenses_n, n1: comparaison.depenses_n1, evol: comparaison.evol_depenses, color: '#DC2626', bg: '#FEF2F2' },
              ].map(({ label, n, n1, evol, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: '10px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '10px',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{comparaison.annee_n1}</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#475569' }}>{fmt(n1)} FCFA</div>
                    </div>
                    <div style={{ fontSize: '22px', color: '#CBD5E1' }}>→</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{comparaison.annee_n}</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color }}>{fmt(n)} FCFA</div>
                    </div>
                  </div>
                  {evol !== null && (
                    <div style={{ marginTop: '10px', textAlign: 'center',
                      background: evol >= 0 ? (label === 'Dépenses' ? '#FEF9C3' : '#DCFCE7') : (label === 'Dépenses' ? '#DCFCE7' : '#FEE2E2'),
                      borderRadius: '20px', padding: '3px 12px', display: 'inline-block', fontSize: '13px', fontWeight: '700',
                      color: evol >= 0 ? (label === 'Dépenses' ? '#92400E' : '#15803D') : (label === 'Dépenses' ? '#15803D' : '#B91C1C') }}>
                      {evol >= 0 ? '▲' : '▼'} {Math.abs(evol)}%
                    </div>
                  )}
                  {evol === null && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#94A3B8' }}>Pas de données {comparaison.annee_n1}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>

          {/* Histogramme évolution 6 mois */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
              📈 Évolution Recettes / Dépenses — 6 derniers mois
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evolution} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v, n) => [`${v.toLocaleString('fr-FR')} FCFA`, n === 'recettes' ? 'Recettes' : 'Dépenses']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                <Legend formatter={v => v === 'recettes' ? 'Recettes' : 'Dépenses'} />
                <Bar dataKey="recettes" fill="#27AE60" radius={[4,4,0,0]} />
                <Bar dataKey="depenses" fill="#E74C3C" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Camembert modes de paiement */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
              🥧 Modes de paiement
            </h3>
            {modes.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={modes} dataKey="nb" nameKey="mode" cx="50%" cy="50%"
                      outerRadius={75} label={({ mode, percent }) => `${mode} ${(percent*100).toFixed(0)}%`}
                      labelLine={false} fontSize={11}>
                      {modes.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, 'Nombre']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {modes.map((m, i) => (
                    <span key={i} style={{ background: '#F8FAFC', borderRadius: '20px',
                      padding: '3px 10px', fontSize: '11px', color: COLORS_PIE[i % COLORS_PIE.length],
                      fontWeight: '600', border: `1px solid ${COLORS_PIE[i % COLORS_PIE.length]}` }}>
                      {m.mode} ({m.nb})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: '13px' }}>
                Aucun paiement enregistré
              </div>
            )}
          </div>
        </div>

        {/* Prévisions trésorerie */}
        {previsions.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
            marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
              🔮 Prévisions trésorerie — 6 prochains mois
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94A3B8' }}>
              Projection linéaire basée sur les 6 derniers mois (lignes pointillées = prévisions)
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={donneesGraphPrevisions} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v, n) => [`${Number(v).toLocaleString('fr-FR')} FCFA`, n]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="recettes" name="Recettes (réel)" stroke="#27AE60" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="depenses" name="Dépenses (réel)" stroke="#E74C3C" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="recettes_prev" name="Recettes (prévu)" stroke="#27AE60" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="depenses_prev" name="Dépenses (prévu)" stroke="#E74C3C" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top caisses */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>
            🏦 État des Caisses
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {topCaisses.map((c, i) => (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px',
                padding: '14px 18px', flex: 1, minWidth: '160px',
                borderLeft: `4px solid ${COLORS_PIE[i % COLORS_PIE.length]}` }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                  {c.nom}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800',
                  color: c.solde > 0 ? '#16A34A' : '#DC2626' }}>
                  {c.solde.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px',
                  textTransform: 'capitalize' }}>{c.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
