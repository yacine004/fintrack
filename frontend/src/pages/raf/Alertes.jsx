import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

const CLASSES = ['', 'L1', 'L2', 'L3', 'M1', 'M2']

function Badge({ children, color = '#DC2626', bg = '#FEF2F2', border = '#FECACA' }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                   background: bg, color, border: `1px solid ${border}` }}>
      {children}
    </span>
  )
}

export default function Alertes() {
  const [anneeActive, setAnneeActive]   = useState('2025-2026')
  const [annee,       setAnnee]         = useState('2025-2026')
  const [classe,      setClasse]        = useState('')
  const [impayes,     setImpayes]       = useState([])
  const [loading,     setLoading]       = useState(false)
  const [selected,    setSelected]      = useState(new Set())   // ids sélectionnés
  const [expand,      setExpand]        = useState(new Set())   // ids détail ouvert

  const [sending,     setSending]       = useState(false)
  const [sendMsg,     setSendMsg]       = useState('')
  const [sendErr,     setSendErr]       = useState('')

  // Charger l'année active
  useEffect(() => {
    fetch(`${API}/annees-scolaires/active`, { headers: H() })
      .then(r => r.json())
      .then(d => { if (d.annee) { setAnneeActive(d.annee.libelle); setAnnee(d.annee.libelle) } })
      .catch(() => {})
  }, [])

  const charger = useCallback(async () => {
    setLoading(true); setSendMsg(''); setSendErr('')
    const params = new URLSearchParams({ annee })
    if (classe) params.set('classe', classe)
    try {
      const res  = await fetch(`${API}/alertes/impayes?${params}`, { headers: H() })
      const data = await res.json()
      if (res.ok) { setImpayes(data.impayes); setSelected(new Set()) }
    } catch {}
    finally { setLoading(false) }
  }, [annee, classe])

  useEffect(() => { charger() }, [charger])

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAll = () => {
    if (selected.size === impayes.length) setSelected(new Set())
    else setSelected(new Set(impayes.map(e => e.id)))
  }
  const toggleExpand = (id) => setExpand(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const telecharger = async (url, filename) => {
    try {
      const res = await fetch(url, { headers: H() })
      if (!res.ok) { alert('Erreur lors de la génération du fichier'); return }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href; a.download = filename; a.click()
      URL.revokeObjectURL(href)
    } catch { alert('Erreur réseau') }
  }

  const exportPdf = () => telecharger(
    `${API}/alertes/export-pdf?annee=${annee}`,
    `impayes_${annee.replace('-','_')}.pdf`
  )
  const exportCsv = () => telecharger(
    `${API}/alertes/export-csv?annee=${annee}`,
    `impayes_${annee.replace('-','_')}.csv`
  )

  const envoyerRelances = async () => {
    setSendMsg(''); setSendErr(''); setSending(true)
    const ids = selected.size > 0 ? [...selected] : []
    try {
      const res  = await fetch(`${API}/alertes/envoyer-relances`, {
        method: 'POST', headers: H(),
        body: JSON.stringify({ annee, ids })
      })
      const data = await res.json()
      if (res.ok) setSendMsg(`${data.message}${data.echecs?.length ? ` (${data.echecs.length} échec(s))` : ''}`)
      else setSendErr(data.message || 'Erreur')
    } catch { setSendErr('Erreur réseau') }
    finally { setSending(false) }
  }

  const totalDu = impayes.reduce((s, e) => s + e.montant_du, 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* En-tête */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1B3A6B', margin: 0 }}>
            Alertes & Relances
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Étudiants avec des échéances en retard
          </p>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px 24px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px',
                      display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B',
                            textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Année
            </label>
            <input value={annee} onChange={e => setAnnee(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: '8px',
                       fontSize: '14px', outline: 'none', width: '130px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B',
                            textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Classe
            </label>
            <select value={classe} onChange={e => setClasse(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: '8px',
                       fontSize: '14px', outline: 'none' }}>
              <option value="">Toutes</option>
              {CLASSES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={charger} style={{
            padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            🔍 Actualiser
          </button>
        </div>

        {/* Statistiques */}
        {impayes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Retardataires', value: impayes.length, color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Montant total dû', value: `${totalDu.toLocaleString('fr-FR')} FCFA`, color: '#B45309', bg: '#FFFBEB' },
              { label: 'Sélectionnés', value: selected.size > 0 ? selected.size : 'Tous', color: '#1B3A6B', bg: '#EFF6FF' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: s.color, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={exportPdf} style={{
            padding: '8px 16px', background: '#fff', border: '1.5px solid #CBD5E1',
            borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#1B3A6B',
          }}>
            📄 Exporter PDF
          </button>
          <button onClick={exportCsv} style={{
            padding: '8px 16px', background: '#fff', border: '1.5px solid #CBD5E1',
            borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#1B3A6B',
          }}>
            📊 Exporter CSV
          </button>
          {impayes.length > 0 && (
            <button onClick={envoyerRelances} disabled={sending} style={{
              padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '13px', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: '600',
              opacity: sending ? 0.7 : 1,
            }}>
              {sending ? '⏳ Envoi...' : `📧 Envoyer relances ${selected.size > 0 ? `(${selected.size})` : '(tous)'}`}
            </button>
          )}
        </div>

        {sendMsg && <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '12px' }}>✓ {sendMsg}</div>}
        {sendErr && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>⚠ {sendErr}</div>}

        {/* Liste */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Chargement...</div>
          ) : impayes.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#16A34A', fontSize: '15px', fontWeight: '600' }}>
              ✅ Aucun retard pour cette période
            </div>
          ) : (
            <>
              {/* En-tête liste */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px',
                            background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', gap: '12px' }}>
                <input type="checkbox" checked={selected.size === impayes.length && impayes.length > 0}
                  onChange={toggleAll} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <span style={{ flex: 1, fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                  Étudiant
                </span>
                <span style={{ width: '80px', fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Classe</span>
                <span style={{ width: '130px', fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Payé</span>
                <span style={{ width: '130px', fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', textAlign: 'right' }}>Dû</span>
                <span style={{ width: '24px' }} />
              </div>

              {impayes.map(etu => (
                <div key={etu.id}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px',
                                borderBottom: '1px solid #F1F5F9', gap: '12px',
                                background: selected.has(etu.id) ? '#EFF6FF' : '#fff' }}>
                    <input type="checkbox" checked={selected.has(etu.id)} onChange={() => toggleSelect(etu.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
                        {etu.prenom} {etu.nom}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {etu.matricule}
                        {etu.email && <span> · {etu.email}</span>}
                        {!etu.email && <Badge color='#B45309' bg='#FFFBEB' border='#FDE68A'>Pas d'email</Badge>}
                      </div>
                    </div>
                    <div style={{ width: '80px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', background: '#EFF6FF',
                                     color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px' }}>
                        {etu.classe}
                      </span>
                    </div>
                    <div style={{ width: '130px', textAlign: 'right', fontSize: '13px', color: '#64748B' }}>
                      {etu.total_paye.toLocaleString('fr-FR')} F
                    </div>
                    <div style={{ width: '130px', textAlign: 'right', fontSize: '14px',
                                  fontWeight: '800', color: '#DC2626' }}>
                      {etu.montant_du.toLocaleString('fr-FR')} F
                    </div>
                    <button onClick={() => toggleExpand(etu.id)} style={{
                      width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                      background: '#F1F5F9', cursor: 'pointer', fontSize: '12px', color: '#64748B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {expand.has(etu.id) ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Détail retards */}
                  {expand.has(etu.id) && (
                    <div style={{ padding: '12px 20px 12px 52px', background: '#FFFBEB',
                                  borderBottom: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E',
                                    textTransform: 'uppercase', marginBottom: '8px' }}>
                        Détail des échéances non réglées
                      </div>
                      {etu.retards.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                              fontSize: '12px', padding: '4px 0',
                                              borderBottom: i < etu.retards.length - 1 ? '1px dashed #FDE68A' : 'none' }}>
                          <span style={{ color: '#78350F' }}>{r.label}</span>
                          <span style={{ color: '#64748B' }}>Échéance : {r.date}</span>
                          <span style={{ fontWeight: '700', color: '#DC2626' }}>
                            {r.manquant.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
