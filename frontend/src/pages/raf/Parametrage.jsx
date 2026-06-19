import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
const lbl = { fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }

const STATUT_STYLES = {
  active:   { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC', label: 'Active' },
  inactive: { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Inactive' },
  futur:    { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', label: 'Futur' },
}

// ── Onglet Années scolaires ───────────────────────────────────────────────────
function OngletAnnees() {
  const [annees,  setAnnees]  = useState([])
  const [libelle, setLibelle] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur,  setErreur]  = useState('')
  const [msg,     setMsg]     = useState('')

  const charger = async () => {
    const res  = await fetch(`${API}/annees-scolaires`, { headers: H() })
    const data = await res.json()
    if (res.ok) setAnnees(data.annees)
  }

  useEffect(() => { charger() }, [])

  const creer = async () => {
    setErreur(''); setMsg('')
    if (!libelle.trim()) return setErreur('Entrez un libellé (ex: 2026-2027)')
    setLoading(true)
    const res  = await fetch(`${API}/annees-scolaires`, { method: 'POST', headers: H(), body: JSON.stringify({ libelle: libelle.trim() }) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setErreur(data.message)
    setMsg(data.message); setLibelle(''); charger()
  }

  const activer = async (id) => {
    setErreur(''); setMsg('')
    const res  = await fetch(`${API}/annees-scolaires/${id}/activer`, { method: 'PUT', headers: H() })
    const data = await res.json()
    if (!res.ok) setErreur(data.message)
    else { setMsg(data.message); charger() }
  }

  const supprimer = async (id, lib) => {
    if (!window.confirm(`Supprimer l'année ${lib} ?`)) return
    const res = await fetch(`${API}/annees-scolaires/${id}`, { method: 'DELETE', headers: H() })
    const data = await res.json()
    if (res.ok) { setMsg(data.message); charger() }
    else setErreur(data.message)
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
        Une seule année peut être <strong>active</strong> à la fois. Toutes les nouvelles inscriptions et paiements utilisent l'année active.
      </p>

      {/* Créer une année */}
      <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B', marginBottom: '12px' }}>Créer une nouvelle année scolaire</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Libellé (format AAAA-AAAA)</label>
            <input value={libelle} onChange={e => setLibelle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && creer()}
              placeholder="2026-2027" style={inp} />
          </div>
          <button onClick={creer} disabled={loading} style={{
            padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            {loading ? '...' : '+ Créer'}
          </button>
        </div>
        {erreur && <div style={{ marginTop: '8px', color: '#DC2626', fontSize: '13px' }}>{erreur}</div>}
        {msg    && <div style={{ marginTop: '8px', color: '#16A34A', fontSize: '13px' }}>✓ {msg}</div>}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {annees.map(a => {
          const estFutur = new Date(a.date_debut) > new Date()
          const s = a.active ? STATUT_STYLES.active : estFutur ? STATUT_STYLES.futur : STATUT_STYLES.inactive
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: '#fff',
              border: `1.5px solid ${a.active ? '#86EFAC' : estFutur ? '#BAE6FD' : '#E2E8F0'}`,
              borderRadius: '10px', padding: '14px 18px',
              boxShadow: a.active ? '0 0 0 3px rgba(134,239,172,0.2)' : estFutur ? '0 0 0 3px rgba(186,230,253,0.3)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1B3A6B' }}>{a.libelle}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {a.date_debut} → {a.date_fin}
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                {s.label}
              </span>
              {!a.active && !estFutur && (
                <button onClick={() => activer(a.id)} style={{
                  padding: '6px 14px', background: '#1B3A6B', color: '#fff', border: 'none',
                  borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                }}>
                  Activer
                </button>
              )}
              {!a.active && estFutur && (
                <span title={`Activable à partir du ${new Date(a.date_debut).toLocaleDateString('fr-FR')}`} style={{
                  padding: '6px 14px', background: '#F0F9FF', color: '#0369A1',
                  border: '1px solid #BAE6FD', borderRadius: '6px', fontSize: '12px',
                  fontWeight: '600', cursor: 'help', userSelect: 'none',
                }}>
                  🔒 Dès le {new Date(a.date_debut).toLocaleDateString('fr-FR')}
                </span>
              )}
              {!a.active && (
                <button onClick={() => supprimer(a.id, a.libelle)} style={{
                  padding: '6px 10px', background: '#FEF2F2', color: '#DC2626',
                  border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                }}>
                  🗑
                </button>
              )}
            </div>
          )
        })}
        {annees.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '32px' }}>
            Aucune année scolaire enregistrée
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onglet Référence paiement ─────────────────────────────────────────────────
function OngletRefPaiement() {
  const [prefixe, setPrefixe] = useState('FT')
  const [msg,     setMsg]     = useState('')
  const [exemple, setExemple] = useState('')

  useEffect(() => {
    fetch(`${API}/annees-scolaires/config`, { headers: H() })
      .then(r => r.json())
      .then(d => { if (d.ref_prefixe) setPrefixe(d.ref_prefixe) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const code = prefixe.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const now  = new Date()
    const yy1  = String(now.getFullYear()).slice(2)
    const yy2  = String(now.getFullYear() + 1).slice(2)
    setExemple(`${code}-${yy1}${yy2}-00042`)
  }, [prefixe])

  const sauvegarder = async () => {
    setMsg('')
    const res  = await fetch(`${API}/annees-scolaires/config`, {
      method: 'POST', headers: H(),
      body: JSON.stringify({ ref_prefixe: prefixe.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'FT' })
    })
    const data = await res.json()
    if (res.ok) setMsg('Configuration sauvegardée')
    else setMsg(data.message)
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
        Chaque paiement reçoit une référence unique auto-générée. Configurez le préfixe de ces références.
      </p>
      <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Préfixe (2-6 caractères alphanumériques)</label>
          <input value={prefixe} onChange={e => setPrefixe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="FT" style={{ ...inp, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }} />
        </div>
        <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: '600' }}>Exemple de référence générée : </span>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#1B3A6B', fontFamily: 'monospace' }}>{exemple}</span>
        </div>
        <button onClick={sauvegarder} style={{
          padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          Sauvegarder
        </button>
        {msg && <div style={{ marginTop: '10px', color: '#16A34A', fontSize: '13px' }}>✓ {msg}</div>}
      </div>

      <div style={{ marginTop: '24px', padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', marginBottom: '4px' }}>ℹ Format de la référence</div>
        <div style={{ fontSize: '12px', color: '#78350F' }}>
          <strong>{prefixe || 'FT'}</strong> - <strong>AABB</strong> (codes année) - <strong>NNNNN</strong> (numéro séquentiel)
          <br/>Ex : <code style={{ background: '#FEF3C7', padding: '1px 4px', borderRadius: '3px' }}>{exemple}</code>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Parametrage() {
  const [onglet, setOnglet] = useState('annees')

  const tabs = [
    { key: 'annees',     label: '📅 Années scolaires' },
    { key: 'ref',        label: '🔑 Référence paiement' },
  ]

  const tabStyle = (active) => ({
    padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', border: 'none', transition: 'all .15s',
    background: active ? '#1B3A6B' : 'transparent',
    color:      active ? '#fff'    : '#64748B',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1B3A6B', margin: 0 }}>
            Paramétrage
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Configuration de l'année scolaire et des règles de paiement
          </p>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} style={tabStyle(onglet === t.key)} onClick={() => setOnglet(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {onglet === 'annees' && <OngletAnnees />}
          {onglet === 'ref'    && <OngletRefPaiement />}
        </div>
      </div>
    </div>
  )
}
