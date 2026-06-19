import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
         PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const COLORS = ['#1B3A6B', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#2D8CFF']

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/* ── KPI Card ──────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, bg, icon, trend }) {
  return (
    <div className="ft-card" style={{
      padding: '20px 22px', flex: 1, minWidth: '155px',
      borderTop: `3px solid ${color}`, cursor: 'default'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B',
          textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {label}
        </span>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div className="ft-stat" style={{ color, marginBottom: '4px' }}>{value}</div>
      {(sub || trend != null) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          {trend != null && (
            <span style={{
              background: trend >= 0 ? '#DCFCE7' : '#FEE2E2',
              color: trend >= 0 ? '#15803D' : '#B91C1C',
              fontSize: '11px', fontWeight: '700', padding: '1px 7px',
              borderRadius: '99px'
            }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ fontSize: '12px', color: '#94A3B8' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Section title ─────────────────────────────────────── */
function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '17px' }}>{icon}</span> {title}
      </h3>
      {subtitle && <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>{subtitle}</p>}
    </div>
  )
}

/* ── Loading skeleton ──────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div className="ft-skeleton" style={{ width: '280px', height: '28px', marginBottom: '8px' }} />
            <div className="ft-skeleton" style={{ width: '200px', height: '16px' }} />
          </div>
          <div className="ft-skeleton" style={{ width: '180px', height: '38px', borderRadius: '8px' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="ft-skeleton" style={{ flex: 1, minWidth: '140px', height: '100px', borderRadius: '14px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div className="ft-skeleton" style={{ height: '300px', borderRadius: '14px' }} />
          <div className="ft-skeleton" style={{ height: '300px', borderRadius: '14px' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Tooltip customisé ─────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px',
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}>
      <div style={{ fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', marginBottom: '2px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span>{p.name} : <strong style={{ color: p.color }}>{fmt(p.value)} FCFA</strong></span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Page principale
   ══════════════════════════════════════════════════════════ */
export default function RafDashboard() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [filtreCaisse, setFiltreCaisse] = useState('')
  const [caisses, setCaisses]       = useState([])
  const user                        = JSON.parse(localStorage.getItem('user') || '{}')

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const params = filtreCaisse ? `?caisse_id=${filtreCaisse}` : ''
      const res    = await fetch(`${API}/dashboard${params}`, { headers: getHeaders() })
      const json   = await res.json()
      if (res.ok) setData(json)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const fetchCaisses = async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: getHeaders() })
      const json = await res.json()
      if (res.ok) setCaisses(json.caisses)
    } catch { /* ignore */ }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboard(); fetchCaisses() }, [filtreCaisse])

  if (loading) return <LoadingSkeleton />

  const kpis                 = data?.kpis || {}
  const evolution            = data?.evolution || []
  const modes                = data?.repartition_modes || []
  const alertes              = data?.alertes_budget || []
  const alertesIntelligentes = data?.alertes_intelligentes || []
  const topCaisses           = data?.top_caisses || []
  const comparaison          = data?.comparaison || null
  const previsions           = data?.previsions || []
  const tauxClasse           = data?.taux_recouvrement_classe || []
  const tauxFiliere          = data?.taux_recouvrement_filiere || []

  const donneesGraphPrevisions = [
    ...evolution.map(e => ({ mois: e.mois, recettes: e.recettes, depenses: e.depenses })),
    ...previsions.map(p => ({ mois: p.mois, recettes_prev: p.recettes_prevues, depenses_prev: p.depenses_prevues })),
  ]

  const allAlertes = [
    ...alertes.map(a => ({ ...a, cls: a.type === 'depasse' ? 'ft-alert ft-alert-danger' : 'ft-alert ft-alert-warning',
      icone: a.type === 'depasse' ? '🚨' : '⚠️',
      texte: `Budget "${a.categorie}" — ${a.taux}% consommé${a.type === 'depasse' ? ' — DÉPASSÉ !' : ' — Seuil atteint'}` })),
    ...alertesIntelligentes.map(a => ({ cls: a.niveau === 'danger' ? 'ft-alert ft-alert-danger' : 'ft-alert ft-alert-warning',
      icone: a.niveau === 'danger' ? '🚨' : '📊', texte: a.message })),
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Bandeau header ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1B3A6B 0%, #2D5BB7 60%, #2D8CFF 100%)',
          padding: '28px 32px 24px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Cercles décoratifs */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', right: '120px', width: '240px', height: '240px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                {getGreeting()}, {user.prenom || 'RAF'} 👋
              </p>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                Tableau de Bord
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                Vue financière en temps réel · ISM Dakar
              </p>
            </div>
            <select value={filtreCaisse} onChange={e => setFiltreCaisse(e.target.value)}
              style={{ padding: '9px 14px', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px', fontSize: '13px', outline: 'none',
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                backdropFilter: 'blur(8px)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="" style={{ color: '#1B3A6B' }}>Toutes les caisses</option>
              {caisses.map(c => <option key={c.id} value={c.id} style={{ color: '#1B3A6B' }}>{c.nom}</option>)}
            </select>
          </div>
        </div>

        {/* ── Corps ──────────────────────────────────────── */}
        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* Alertes */}
          {allAlertes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {allAlertes.map((a, i) => (
                <div key={i} className={a.cls} style={{ fontSize: '13px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{a.icone}</span>
                  <span style={{ fontWeight: '600' }}>{a.texte}</span>
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <KpiCard icon="💰" label="Total encaissé"   color="#16A34A" bg="#F0FDF4"
              value={`${fmt(kpis.total_encaisse)} FCFA`} />
            <KpiCard icon="💸" label="Total dépensé"    color="#DC2626" bg="#FEF2F2"
              value={`${fmt(kpis.total_depense)} FCFA`} />
            <KpiCard icon="🏦" label="Solde global"     color="#1B3A6B" bg="#EFF6FF"
              value={`${fmt(kpis.solde_global)} FCFA`} />
            <KpiCard icon="🎓" label="Étudiants actifs" color="#7C3AED" bg="#F5F3FF"
              value={kpis.nb_etudiants_actifs ?? '—'} />
            <KpiCard icon="⚠️" label="Impayés"          color="#EA580C" bg="#FFF7ED"
              value={kpis.nb_impayes ?? 0}
              sub={kpis.nb_impayes > 0 ? 'À régulariser' : 'Aucun impayé ✓'} />
          </div>

          {/* Comparaison N vs N-1 */}
          {comparaison && (comparaison.recettes_n1 > 0 || comparaison.depenses_n1 > 0) && (
            <div className="ft-card" style={{ padding: '22px 24px', marginBottom: '24px' }}>
              <SectionTitle icon="📅" title={`Comparaison ${comparaison.annee_n} vs ${comparaison.annee_n1}`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'Recettes', n: comparaison.recettes_n, n1: comparaison.recettes_n1,
                    evol: comparaison.evol_recettes, color: '#16A34A', bg: '#F0FDF4', positifBon: true },
                  { label: 'Dépenses', n: comparaison.depenses_n, n1: comparaison.depenses_n1,
                    evol: comparaison.evol_depenses, color: '#DC2626', bg: '#FEF2F2', positifBon: false },
                ].map(({ label, n, n1, evol, color, bg, positifBon }) => (
                  <div key={label} style={{ background: bg, borderRadius: '10px', padding: '16px 18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>{comparaison.annee_n1}</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>{fmt(n1)} FCFA</div>
                      </div>
                      <div style={{ fontSize: '18px', color: '#CBD5E1', fontWeight: '300' }}>→</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>{comparaison.annee_n}</div>
                        <div style={{ fontSize: '17px', fontWeight: '800', color }}>{fmt(n)} FCFA</div>
                      </div>
                    </div>
                    {evol != null && (
                      <div style={{ marginTop: '10px' }}>
                        <span style={{
                          background: (evol >= 0) === positifBon ? '#DCFCE7' : '#FEE2E2',
                          color:      (evol >= 0) === positifBon ? '#15803D' : '#B91C1C',
                          fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '99px'
                        }}>
                          {evol >= 0 ? '▲' : '▼'} {Math.abs(evol)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graphiques */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px', marginBottom: '24px' }}>

            {/* Évolution 6 mois */}
            <div className="ft-card" style={{ padding: '22px 24px' }}>
              <SectionTitle icon="📈" title="Évolution Recettes / Dépenses" subtitle="6 derniers mois" />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={evolution} margin={{ top: 4, right: 10, left: 10, bottom: 4 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend formatter={v => v === 'recettes' ? 'Recettes' : 'Dépenses'}
                    wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter', paddingTop: '12px' }} />
                  <Bar dataKey="recettes" name="recettes" fill="#16A34A" radius={[5,5,0,0]} maxBarSize={40} />
                  <Bar dataKey="depenses" name="depenses" fill="#DC2626" radius={[5,5,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Modes de paiement */}
            <div className="ft-card" style={{ padding: '22px 24px' }}>
              <SectionTitle icon="🥧" title="Modes de paiement" />
              {modes.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={modes} dataKey="nb" nameKey="mode" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={75}
                        paddingAngle={3}>
                        {modes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Paiements']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {modes.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                            background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: '#475569', textTransform: 'capitalize' }}>{m.mode}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS[i % COLORS.length] }}>{m.nb}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="ft-empty" style={{ padding: '30px 0' }}>
                  <span className="ft-empty-icon">💳</span>
                  <span className="ft-empty-sub">Aucun paiement enregistré</span>
                </div>
              )}
            </div>
          </div>

          {/* Taux de recouvrement par classe / filière */}
          {(tauxClasse.length > 0 || tauxFiliere.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>

              {/* Par classe */}
              {tauxClasse.length > 0 && (
                <div className="ft-card" style={{ padding: '22px 24px' }}>
                  <SectionTitle icon="🎯" title="Recouvrement par classe" subtitle="Encaissé / attendu sur l'année académique" />
                  <ResponsiveContainer width="100%" height={Math.max(160, tauxClasse.length * 40)}>
                    <BarChart data={tauxClasse} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="classe" width={48}
                        tick={{ fontSize: 12, fill: '#475569', fontWeight: 600, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, _n, p) => [`${v}% — ${fmt(p.payload.paye)} / ${fmt(p.payload.attendu)} FCFA`, 'Recouvrement']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                      <Bar dataKey="taux" radius={[0, 6, 6, 0]} maxBarSize={26}>
                        {tauxClasse.map((entry, i) => (
                          <Cell key={i} fill={entry.taux >= 80 ? '#16A34A' : entry.taux >= 50 ? '#D97706' : '#DC2626'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Par filière */}
              {tauxFiliere.length > 0 && (
                <div className="ft-card" style={{ padding: '22px 24px' }}>
                  <SectionTitle icon="📚" title="Recouvrement par filière" subtitle="Triées du meilleur au moins bon taux" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '260px', overflowY: 'auto' }}>
                    {tauxFiliere.map((f, i) => {
                      const couleur = f.taux >= 80 ? '#16A34A' : f.taux >= 50 ? '#D97706' : '#DC2626'
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{f.filiere}</span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: couleur }}>{f.taux}%</span>
                          </div>
                          <div style={{ background: '#F1F5F9', borderRadius: '99px', height: '7px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, f.taux)}%`, height: '100%', background: couleur, borderRadius: '99px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prévisions trésorerie */}
          {previsions.length > 0 && (
            <div className="ft-card" style={{ padding: '22px 24px', marginBottom: '24px' }}>
              <SectionTitle icon="🔮" title="Prévisions trésorerie — 6 prochains mois"
                subtitle="Projection basée sur la tendance des 6 derniers mois · lignes pointillées = prévisions" />
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={donneesGraphPrevisions} margin={{ top: 4, right: 10, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter', paddingTop: '12px' }} />
                  <Line type="monotone" dataKey="recettes"      name="Recettes (réel)"   stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: '#16A34A' }} connectNulls />
                  <Line type="monotone" dataKey="depenses"      name="Dépenses (réel)"   stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3, fill: '#DC2626' }} connectNulls />
                  <Line type="monotone" dataKey="recettes_prev" name="Recettes (prévu)"  stroke="#16A34A" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="depenses_prev" name="Dépenses (prévu)"  stroke="#DC2626" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* État des caisses */}
          {topCaisses.length > 0 && (
            <div className="ft-card" style={{ padding: '22px 24px' }}>
              <SectionTitle icon="🏦" title="État des Caisses" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {topCaisses.map((c, i) => (
                  <div key={i} style={{
                    background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px',
                    borderLeft: `3px solid ${COLORS[i % COLORS.length]}`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569',
                      marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%',
                        background: COLORS[i % COLORS.length] }} />
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
