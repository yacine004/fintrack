import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const CATEGORIES = ['Fournitures', 'Salaires', 'Maintenance', 'Evenements', 'Informatique', 'Autre']

function ModalBudget({ budget, onClose, onSave }) {
  const [form, setForm] = useState({
    categorie: '', montant_alloue: '', annee: new Date().getFullYear().toString(), ...budget
  })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.categorie || !form.montant_alloue) {
      setErreur('Catégorie et montant sont obligatoires')
      return
    }
    setLoading(true)
    setErreur('')
    try {
      const url    = budget ? `${API}/budgets/${budget.id}` : `${API}/budgets`
      const method = budget ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
      onClose()
    } catch { setErreur('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700' }}>
            {budget ? '✏️ Modifier le budget' : '📊 Nouveau budget'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Catégorie *</label>
            <select name="categorie" value={form.categorie} onChange={handleChange} style={inputStyle} disabled={!!budget}>
              <option value="">Sélectionner</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Montant alloué (FCFA) *</label>
              <input name="montant_alloue" type="number" value={form.montant_alloue}
                onChange={handleChange} placeholder="500000" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Année *</label>
              <select name="annee" value={form.annee} onChange={handleChange} style={inputStyle} disabled={!!budget}>
                {['2024', '2025', '2026', '2027'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#1B3A6B',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳...' : budget ? '✅ Modifier' : '✅ Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal réaffectation inter-budgets ─────────────────────────────────────────
function ModalReaffecter({ destination, allBudgets, onClose, onSave }) {
  const [idSource, setIdSource] = useState('')
  const [montant,  setMontant]  = useState('')
  const [erreur,   setErreur]   = useState('')
  const [loading,  setLoading]  = useState(false)

  // Sources éligibles : ont de la marge et ne sont pas la destination
  const sources    = allBudgets.filter(b => b.id !== destination.id && b.montant_restant > 0)
  const srcBudget  = sources.find(b => b.id === parseInt(idSource))
  const margeSource = srcBudget ? srcBudget.montant_restant : 0
  const montantNum  = parseFloat(montant) || 0

  const transferer = async () => {
    setErreur('')
    if (!idSource)              { setErreur('Sélectionnez un budget source'); return }
    if (!montant || montantNum <= 0) { setErreur('Entrez un montant positif'); return }
    if (montantNum > margeSource)    { setErreur(`Marge disponible : ${margeSource.toLocaleString('fr-FR')} FCFA`); return }
    setLoading(true)
    const res  = await fetch(`${API}/budgets/reaffecter`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ id_source: parseInt(idSource), id_destination: destination.id, montant: montantNum })
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErreur(data.message); return }
    onSave(data.message)
    onClose()
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700' }}>↔ Réaffectation budgétaire</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Destination fixée */}
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', marginBottom: '4px' }}>Budget à renforcer (destination)</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{destination.categorie}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Alloué : {destination.montant_alloue.toLocaleString('fr-FR')} FCFA · Consommé : {destination.montant_consomme.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        {/* Sélecteur source */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Budget source (doit avoir de la marge)</label>
          {sources.length === 0 ? (
            <div style={{ padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#B45309', fontSize: '13px' }}>
              Aucun budget avec marge disponible pour cette année
            </div>
          ) : (
            <select value={idSource} onChange={e => setIdSource(e.target.value)} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.categorie} — marge : {s.montant_restant.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Montant */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Montant à transférer (FCFA)</label>
          <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
            placeholder="Ex : 100 000" min="0" max={margeSource} style={inputStyle} />
          {srcBudget && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Marge disponible : <strong>{margeSource.toLocaleString('fr-FR')} FCFA</strong>
            </div>
          )}
        </div>

        {/* Aperçu d'impact */}
        {srcBudget && montantNum > 0 && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: '6px' }}>
              Aperçu de l'impact
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{srcBudget.categorie} (source)</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: montantNum > margeSource ? '#DC2626' : '#1E293B' }}>
                  {srcBudget.montant_alloue.toLocaleString('fr-FR')} → {(srcBudget.montant_alloue - montantNum).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{destination.categorie} (dest.)</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>
                  {destination.montant_alloue.toLocaleString('fr-FR')} → {(destination.montant_alloue + montantNum).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>
          </div>
        )}

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={transferer} disabled={loading || sources.length === 0} style={{
            padding: '10px 24px', background: loading || sources.length === 0 ? '#94A3B8' : '#1B3A6B',
            color: '#fff', border: 'none', borderRadius: '8px',
            cursor: loading || sources.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600'
          }}>
            {loading ? '⏳…' : '↔ Transférer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RafBudgets() {
  const [budgets, setBudgets] = useState([])
  const [kpis, setKpis]       = useState({ total_alloue: 0, total_consomme: 0, nb_depasses: 0, taux_global: 0 })
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee]     = useState(new Date().getFullYear().toString())
  const [modal, setModal]     = useState(null)
  const [modalReaff, setModalReaff] = useState(null)
  const [msgReaff,   setMsgReaff]   = useState('')

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/budgets?annee=${annee}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setBudgets(data.budgets); setKpis(data.kpis) }
    } catch { /* empty */ }
    finally { setLoading(false) }
  }, [annee])

  // eslint-disable-next-line
  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const handleSupprimer = async (id) => {
    if (!confirm('Supprimer ce budget ?')) return
    try {
      const res = await fetch(`${API}/budgets/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (res.ok) fetchBudgets()
    } catch { /* empty */ }
  }

  const getBarColor = (taux) => {
    if (taux >= 100) return '#DC2626'
    if (taux >= 80)  return '#D97706'
    return '#16A34A'
  }

  const getAlerteBadge = (alerte) => {
    if (alerte === 'depasse')  return { bg: '#FEF2F2', color: '#DC2626', label: '🚨 Dépassé' }
    if (alerte === 'attention') return { bg: '#FFF7ED', color: '#D97706', label: '⚠️ Attention' }
    return { bg: '#F0FDF4', color: '#16A34A', label: '✅ Normal' }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>📊 Contrôle Budgétaire</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              Suivi des enveloppes budgétaires — Année {annee}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={annee} onChange={e => setAnnee(e.target.value)}
              style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
              {['2024', '2025', '2026', '2027'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setModal('creer')}
              style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              ＋ Nouveau budget
            </button>
          </div>
        </div>

        {/* KPIs globaux */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1B3A6B' }}>
              {kpis.total_alloue?.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Budget total alloué</div>
          </div>
          <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#EA580C' }}>
              {kpis.total_consomme?.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Consommé ({kpis.taux_global}%)</div>
          </div>
          <div style={{ background: kpis.nb_depasses > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', padding: '20px 24px', flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: kpis.nb_depasses > 0 ? '#DC2626' : '#16A34A' }}>
              {kpis.nb_depasses}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Budget{kpis.nb_depasses > 1 ? 's' : ''} dépassé{kpis.nb_depasses > 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Message réaffectation */}
        {msgReaff && (
          <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#16A34A', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            ✓ {msgReaff}
          </div>
        )}

        {/* Tableau budgets */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : budgets.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              Aucun budget défini pour {annee}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Catégorie', 'Alloué (FCFA)', 'Consommé (FCFA)', 'Restant (FCFA)', 'Taux', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => {
                  const badge    = getAlerteBadge(b.alerte)
                  const barColor = getBarColor(b.taux_consommation)
                  return (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                        {b.categorie}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1B3A6B', fontWeight: '600' }}>
                        {b.montant_alloue.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#EA580C', fontWeight: '600' }}>
                        {b.montant_consomme.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px',
                        color: b.montant_restant === 0 ? '#DC2626' : '#16A34A', fontWeight: '600' }}>
                        {b.montant_restant.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, background: '#E2E8F0', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, b.taux_consommation)}%`,
                              height: '100%', borderRadius: '20px', background: barColor,
                              transition: 'width 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: barColor, minWidth: '40px' }}>
                            {b.taux_consommation}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: badge.bg, color: badge.color,
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setModal(b)}
                            style={{ padding: '5px 10px', background: '#EFF6FF', color: '#2563EB',
                              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                          {(b.alerte === 'depasse' || b.alerte === 'attention') && (
                            <button onClick={() => { setMsgReaff(''); setModalReaff(b) }}
                              title="Réaffecter depuis un autre budget"
                              style={{ padding: '5px 10px', background: '#FFF7ED', color: '#D97706',
                                border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                              ↔
                            </button>
                          )}
                          <button onClick={() => handleSupprimer(b.id)}
                            style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <ModalBudget
          budget={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchBudgets() }}
        />
      )}

      {modalReaff && (
        <ModalReaffecter
          destination={modalReaff}
          allBudgets={budgets}
          onClose={() => setModalReaff(null)}
          onSave={msg => { setMsgReaff(msg); setTimeout(() => setMsgReaff(''), 6000); fetchBudgets() }}
        />
      )}
    </div>
  )
}
