import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { invaliderCacheBareme } from '../../components/ModalEcheancier'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
const lbl = { fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2']
const MOIS_NOMS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const TYPE_INFO = {
  inscription: { label: "Droits d'inscription", bg: '#EFF6FF', color: '#1B3A6B' },
  scolarite:   { label: 'Scolarité',             bg: '#FFF7ED', color: '#EA580C' },
  encadrement: { label: 'Encadrement & Soutenance', bg: '#F5F3FF', color: '#7C3AED' },
}

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

// ── Modal créer/modifier une ligne d'échéancier ───────────────────────────────
function ModalLigne({ ligne, annee, niveau, onClose, onSave }) {
  const [form, setForm] = useState({
    type_ligne: 'inscription', label: '', mois: 9, jour: 5, decalage_annee: 0, montant: '', ordre: 0,
    ...ligne,
  })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setErreur('')
    if (!form.label.trim()) { setErreur('Libellé obligatoire'); return }
    if (!form.montant || Number(form.montant) <= 0) { setErreur('Montant invalide'); return }
    setLoading(true)
    try {
      const url    = ligne ? `${API}/echeancier/lignes/${ligne.id}` : `${API}/echeancier/lignes`
      const method = ligne ? 'PUT' : 'POST'
      const body   = ligne ? form : { ...form, annee, niveau }
      const res  = await fetch(url, { method, headers: H(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      invaliderCacheBareme(annee)
      onSave()
    } catch { setErreur('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '460px' }}>
        <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: '#1B3A6B' }}>
          {ligne ? 'Modifier la ligne' : 'Nouvelle ligne'} — {niveau}
        </h3>

        <label style={lbl}>Type</label>
        <select value={form.type_ligne} onChange={e => set('type_ligne', e.target.value)}
          disabled={!!ligne} style={{ ...inp, marginBottom: '14px' }}>
          {Object.entries(TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <label style={lbl}>Libellé</label>
        <input value={form.label} onChange={e => set('label', e.target.value)}
          placeholder="Ex : Mensualité — Septembre" style={{ ...inp, marginBottom: '14px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={lbl}>Mois</label>
            <select value={form.mois} onChange={e => set('mois', Number(e.target.value))} style={inp}>
              {MOIS_NOMS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Jour</label>
            <input type="number" min="1" max="28" value={form.jour} onChange={e => set('jour', Number(e.target.value))} style={inp} />
          </div>
          <div>
            <label style={lbl}>Année</label>
            <select value={form.decalage_annee} onChange={e => set('decalage_annee', Number(e.target.value))} style={inp}>
              <option value={0}>Début (ex: 2025)</option>
              <option value={1}>Fin (ex: 2026)</option>
            </select>
          </div>
        </div>

        <label style={lbl}>Montant (FCFA)</label>
        <input type="number" value={form.montant} onChange={e => set('montant', e.target.value)}
          placeholder="95000" style={{ ...inp, marginBottom: '16px' }} />

        {erreur && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>❌ {erreur}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ ...inp, width: 'auto', padding: '9px 18px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal dupliquer un barème vers une autre année ────────────────────────────
function ModalDupliquer({ anneeDestination, annees, onClose, onSave }) {
  const [anneeSource, setAnneeSource] = useState('')
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const sources = annees.filter(a => a.libelle !== anneeDestination)

  const handleSubmit = async () => {
    setErreur('')
    if (!anneeSource) { setErreur('Sélectionnez une année source'); return }
    setLoading(true)
    try {
      const res  = await fetch(`${API}/echeancier/dupliquer`, {
        method: 'POST', headers: H(),
        body: JSON.stringify({ annee_source: anneeSource, annee_destination: anneeDestination }),
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      invaliderCacheBareme(anneeDestination)
      onSave(data.message)
    } catch { setErreur('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '420px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#1B3A6B' }}>Dupliquer un barème</h3>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748B' }}>
          Copier le barème complet (tous niveaux) vers <strong>{anneeDestination}</strong>
        </p>

        <label style={lbl}>Année source</label>
        <select value={anneeSource} onChange={e => setAnneeSource(e.target.value)} style={{ ...inp, marginBottom: '16px' }}>
          <option value="">Sélectionner</option>
          {sources.map(a => <option key={a.id} value={a.libelle}>{a.libelle}</option>)}
        </select>

        {erreur && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>❌ {erreur}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ ...inp, width: 'auto', padding: '9px 18px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '...' : 'Dupliquer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Onglet Échéancier (barème de paiement) ────────────────────────────────────
function OngletEcheancier() {
  const [annees, setAnnees] = useState([])
  const [annee, setAnnee]   = useState('')
  const [niveau, setNiveau] = useState('L1')
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')
  const [erreur, setErreur] = useState('')
  const [modalLigne, setModalLigne]         = useState(null) // null | 'creer' | <ligne>
  const [modalDupliquer, setModalDupliquer] = useState(false)

  useEffect(() => {
    fetch(`${API}/annees-scolaires`, { headers: H() })
      .then(r => r.json())
      .then(d => {
        if (!d.annees) return
        setAnnees(d.annees)
        const active = d.annees.find(a => a.active) || d.annees[0]
        if (active) setAnnee(active.libelle)
      })
      .catch(() => {})
  }, [])

  const chargerLignes = useCallback(async () => {
    if (!annee) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/echeancier/lignes?annee=${encodeURIComponent(annee)}&niveau=${niveau}`, { headers: H() })
      const data = await res.json()
      if (res.ok) setLignes(data.lignes)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [annee, niveau])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { chargerLignes() }, [chargerLignes])

  const initialiser = async () => {
    setMsg(''); setErreur('')
    const res  = await fetch(`${API}/echeancier/initialiser`, { method: 'POST', headers: H(), body: JSON.stringify({ annee }) })
    const data = await res.json()
    if (!res.ok) { setErreur(data.message); return }
    setMsg(data.message)
    invaliderCacheBareme(annee)
    chargerLignes()
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette ligne du barème ?')) return
    await fetch(`${API}/echeancier/lignes/${id}`, { method: 'DELETE', headers: H() })
    invaliderCacheBareme(annee)
    chargerLignes()
  }

  const total = lignes.reduce((s, l) => s + l.montant, 0)
  const groupes = { inscription: [], scolarite: [], encadrement: [] }
  lignes.forEach(l => groupes[l.type_ligne]?.push(l))

  return (
    <div>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
        Le barème (montants et dates des échéances) est propre à chaque année scolaire et à chaque niveau.
        Toute modification s'applique immédiatement aux paiements, alertes et tableaux de bord.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={lbl}>Année scolaire</label>
          <select value={annee} onChange={e => setAnnee(e.target.value)} style={{ ...inp, width: '160px' }}>
            {annees.map(a => <option key={a.id} value={a.libelle}>{a.libelle}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '8px', padding: '4px' }}>
          {NIVEAUX.map(n => (
            <button key={n} onClick={() => setNiveau(n)} style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              border: 'none', borderRadius: '6px',
              background: niveau === n ? '#1B3A6B' : 'transparent',
              color:      niveau === n ? '#fff'    : '#64748B',
            }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={() => setModalDupliquer(true)} style={{
            padding: '9px 16px', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '8px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#475569',
          }}>
            ⧉ Dupliquer depuis une autre année
          </button>
          <button onClick={() => setModalLigne('creer')} style={{
            padding: '9px 18px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          }}>
            + Nouvelle ligne
          </button>
        </div>
      </div>

      {msg    && <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#16A34A', fontSize: '13px' }}>✓ {msg}</div>}
      {erreur && <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>❌ {erreur}</div>}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
      ) : lignes.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px' }}>
          <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '16px' }}>
            Aucun barème défini pour {niveau} en {annee}
          </div>
          <button onClick={initialiser} style={{
            padding: '10px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          }}>
            Initialiser le barème ISM par défaut (tous niveaux)
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1B3A6B' }}>Total annuel — {niveau}</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1B3A6B' }}>{total.toLocaleString('fr-FR')} FCFA</span>
          </div>

          {Object.entries(groupes).filter(([, items]) => items.length > 0).map(([type, items]) => {
            const info = TYPE_INFO[type]
            return (
              <div key={type} style={{ marginBottom: '20px' }}>
                <div style={{ background: info.color, color: '#fff', padding: '9px 16px', borderRadius: '8px 8px 0 0', fontWeight: '700', fontSize: '13px' }}>
                  {info.label} — {items.reduce((s, l) => s + l.montant, 0).toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  {items.map((l, i) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                      background: i % 2 === 0 ? '#fff' : info.bg, borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: '#1E293B' }}>{l.label}</span>
                      <span style={{ fontSize: '12px', color: '#64748B', width: '160px' }}>
                        📅 {l.jour} {MOIS_NOMS[l.mois]} (année {l.decalage_annee === 0 ? 'début' : 'fin'})
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B', width: '110px', textAlign: 'right' }}>
                        {l.montant.toLocaleString('fr-FR')} FCFA
                      </span>
                      <button onClick={() => setModalLigne(l)} style={{
                        padding: '5px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px',
                        fontSize: '12px', cursor: 'pointer', color: '#1B3A6B', fontWeight: '600',
                      }}>
                        ✏️
                      </button>
                      <button onClick={() => supprimer(l.id)} style={{
                        padding: '5px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px',
                        fontSize: '12px', cursor: 'pointer', color: '#DC2626',
                      }}>
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {modalLigne && (
        <ModalLigne
          ligne={modalLigne === 'creer' ? null : modalLigne}
          annee={annee} niveau={niveau}
          onClose={() => setModalLigne(null)}
          onSave={() => { setModalLigne(null); chargerLignes() }}
        />
      )}

      {modalDupliquer && (
        <ModalDupliquer
          anneeDestination={annee} annees={annees}
          onClose={() => setModalDupliquer(false)}
          onSave={(message) => { setModalDupliquer(false); setMsg(message); chargerLignes() }}
        />
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Parametrage() {
  const [onglet, setOnglet] = useState('annees')

  const tabs = [
    { key: 'annees',     label: '📅 Années scolaires' },
    { key: 'echeancier', label: '💳 Échéancier de paiement' },
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
          {onglet === 'annees'     && <OngletAnnees />}
          {onglet === 'echeancier' && <OngletEcheancier />}
          {onglet === 'ref'        && <OngletRefPaiement />}
        </div>
      </div>
    </div>
  )
}
