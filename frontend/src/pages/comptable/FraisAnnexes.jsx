import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const STATUT_INFO = {
  en_attente: { label: 'À valider (RAF)', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  validee:    { label: 'Validé',          bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  rejetee:    { label: 'Rejeté',          bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  paye:       { label: 'Payé',            bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  annule:     { label: 'Annulé',          bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0' },
}

const MODES = [
  { value: 'especes',  label: '💵 Espèces' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'cheque',   label: '📝 Chèque' },
  { value: 'wave',     label: '📱 Wave' },
]

const inp = {
  padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
  fontSize: '13px', outline: 'none', background: '#fff', fontFamily: 'Inter, sans-serif',
}

function StatutBadge({ statut }) {
  const s = STATUT_INFO[statut] || STATUT_INFO.en_attente
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                   background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

export default function ComptableFraisAnnexes() {
  const [types, setTypes]   = useState([])
  const [frais, setFrais]   = useState([])
  const [filtreStatut, setFiltreStatut] = useState('validee')
  const [loading, setLoading] = useState(false)
  const [page, setPage]     = useState(1)
  const [nbPages, setNbPages] = useState(1)

  const [caisseAffectee, setCaisseAffectee] = useState(null)
  const [erreurCaisse, setErreurCaisse]     = useState('')

  // Modal nouvelle demande (statut en_attente — nécessite validation RAF)
  const [showNouveau, setShowNouveau] = useState(false)
  const [matricule, setMatricule]     = useState('')
  const [etuTrouve, setEtuTrouve]     = useState(null)
  const [searchErr, setSearchErr]     = useState('')
  const [idType, setIdType]           = useState('')
  const [montantPerso, setMontantPerso] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [creerMsg, setCreerMsg]       = useState('')
  const [creerLoading, setCreerLoading] = useState(false)

  // Encaissement d'une demande déjà validée par le RAF
  const [encaisser, setEncaisser] = useState(null)
  const [encMode, setEncMode]     = useState('especes')
  const [encLoading, setEncLoading] = useState(false)
  const [encMsg, setEncMsg]       = useState('')

  const fetchTypes = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/frais-annexes/types?actif=1`, { headers: H() })
      const data = await res.json()
      if (res.ok) setTypes(data.types)
    } catch { /* ignore */ }
  }, [])

  const fetchFrais = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (filtreStatut) params.set('statut', filtreStatut)
      const res  = await fetch(`${API}/frais-annexes?${params}`, { headers: H() })
      const data = await res.json()
      if (res.ok) { setFrais(data.frais); setNbPages(data.nb_pages) }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, filtreStatut])

  const fetchMaCaisse = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/affectations/ma-caisse`, { headers: H() })
      const data = await res.json()
      if (res.ok && data.caisse) setCaisseAffectee(data.caisse)
      else setErreurCaisse(data.message || 'Aucune caisse assignée')
    } catch { setErreurCaisse('Impossible de récupérer la caisse assignée') }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTypes() },    [fetchTypes])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchFrais() },    [fetchFrais])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMaCaisse() }, [fetchMaCaisse])

  const chercherEtudiant = async () => {
    setSearchErr(''); setEtuTrouve(null)
    if (!matricule.trim()) return
    try {
      const res  = await fetch(`${API}/inscriptions/etudiant?matricule=${encodeURIComponent(matricule)}`, { headers: H() })
      const data = await res.json()
      if (!res.ok) { setSearchErr(data.message); return }
      setEtuTrouve(data.etudiant)
    } catch { setSearchErr('Erreur réseau') }
  }

  const typeActif = (id) => types.find(t => String(t.id) === String(id))
  const montantAffiche = montantPerso || typeActif(idType)?.montant || ''

  const creerDemande = async () => {
    if (!etuTrouve) { setCreerMsg('❌ Recherchez un étudiant valide'); return }
    if (!idType)    { setCreerMsg('❌ Sélectionnez un type de frais'); return }
    setCreerLoading(true); setCreerMsg('')
    try {
      const body = { id_etudiant: etuTrouve.id, id_type: idType, commentaire }
      if (montantPerso) body.montant = montantPerso
      const res  = await fetch(`${API}/frais-annexes`, { method: 'POST', headers: H(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setCreerMsg('❌ ' + data.message); return }
      setShowNouveau(false)
      setMatricule(''); setEtuTrouve(null); setIdType(''); setMontantPerso(''); setCommentaire('')
      setFiltreStatut('en_attente'); setPage(1)
      fetchFrais()
    } catch { setCreerMsg('❌ Erreur réseau') }
    finally { setCreerLoading(false) }
  }

  const ouvrirEncaissement = (f) => { setEncaisser(f); setEncMode('especes'); setEncMsg('') }

  const confirmerEncaissement = async () => {
    if (!caisseAffectee) { setEncMsg('❌ Aucune caisse assignée'); return }
    setEncLoading(true); setEncMsg('')
    try {
      const res  = await fetch(`${API}/frais-annexes/${encaisser.id}/encaisser`, {
        method: 'POST', headers: H(), body: JSON.stringify({ id_caisse: caisseAffectee.id, mode_paiement: encMode })
      })
      const data = await res.json()
      if (!res.ok) { setEncMsg('❌ ' + data.message); return }
      setEncaisser(null)
      fetchFrais()
    } catch { setEncMsg('❌ Erreur réseau') }
    finally { setEncLoading(false) }
  }

  const telechargerRecu = async (f) => {
    try {
      const res = await fetch(`${API}/frais-annexes/${f.id}/recu`, { headers: H() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'; a.download = `recu_${f.reference}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { alert('Erreur réseau') }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)',
          padding: '28px 32px 24px', color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Frais annexes</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                Rattrapages, attestations, duplicatas…
              </p>
            </div>
            <button onClick={() => { setShowNouveau(true); setCreerMsg('') }} style={{
              padding: '9px 20px', background: '#fff', color: '#0F766E',
              border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              + Nouvelle demande
            </button>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {caisseAffectee ? (
            <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>🏦</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>{caisseAffectee.nom}</span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Solde : {fmt(caisseAffectee.solde_actuel)} FCFA</span>
            </div>
          ) : erreurCaisse && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '20px', color: '#DC2626', fontSize: '13px', fontWeight: '600' }}>
              ⚠️ {erreurCaisse}
            </div>
          )}

          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px',
            padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: '#0369A1' }}>
            ℹ️ Une demande créée doit d'abord être <strong>validée par le RAF</strong> avant de pouvoir être encaissée.
          </div>

          <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px',
            padding: '4px', width: 'fit-content', marginBottom: '16px' }}>
            {[
              { key: 'validee',    label: 'À encaisser' },
              { key: 'en_attente', label: 'En attente de validation' },
              { key: 'paye',       label: 'Payés' },
              { key: 'rejetee',    label: 'Rejetés' },
              { key: '',           label: 'Tous' },
            ].map(({ key, label }) => (
              <button key={key || 'tous'} onClick={() => { setFiltreStatut(key); setPage(1) }} style={{
                padding: '7px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                border: 'none', borderRadius: '6px',
                background: filtreStatut === key ? '#1B3A6B' : 'transparent',
                color:      filtreStatut === key ? '#fff'    : '#64748B',
              }}>
                {label}
              </button>
            ))}
          </div>

          <div className="ft-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>
            ) : frais.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Aucune demande</div>
            ) : frais.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{f.etudiant}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{f.matricule} · {f.classe} · {f.type_nom}</div>
                </div>
                <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: '800', color: '#1B3A6B' }}>
                  {fmt(f.montant)} F
                </div>
                <StatutBadge statut={f.statut} />
                <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', width: '90px' }}>
                  {f.date_paiement || f.date_creation}
                </div>
                {f.statut === 'validee' && (
                  <button onClick={() => ouvrirEncaissement(f)} style={{
                    padding: '6px 14px', background: '#16A34A', color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  }}>
                    Encaisser
                  </button>
                )}
                {f.statut === 'paye' && (
                  <button onClick={() => telechargerRecu(f)} style={{
                    padding: '6px 14px', background: '#EFF6FF', color: '#1D4ED8', border: 'none',
                    borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  }}>
                    🖨️ Reçu
                  </button>
                )}
                {f.statut === 'rejetee' && f.motif_rejet && (
                  <div style={{ fontSize: '11px', color: '#DC2626', maxWidth: '160px', fontStyle: 'italic' }}>
                    "{f.motif_rejet}"
                  </div>
                )}
              </div>
            ))}

            {nbPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ ...inp, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Préc.</button>
                <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>Page {page} / {nbPages}</span>
                <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                  style={{ ...inp, cursor: page === nbPages ? 'not-allowed' : 'pointer' }}>Suiv. →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal nouvelle demande (en attente de validation RAF) ────────────────── */}
      {showNouveau && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '460px' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: '#0F766E' }}>Nouveau frais annexe</h3>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Matricule de l'étudiant</label>
            <div style={{ display: 'flex', gap: '8px', margin: '6px 0 6px' }}>
              <input value={matricule} onChange={e => setMatricule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && chercherEtudiant()}
                style={{ ...inp, flex: 1, fontFamily: 'monospace' }} />
              <button onClick={chercherEtudiant} style={{
                padding: '9px 16px', background: '#0F766E', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}>
                Chercher
              </button>
            </div>
            {searchErr && <div style={{ color: '#DC2626', fontSize: '12px', marginBottom: '10px' }}>❌ {searchErr}</div>}
            {etuTrouve && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' }}>
                ✓ <strong>{etuTrouve.prenom} {etuTrouve.nom}</strong> — {etuTrouve.classe}
              </div>
            )}

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Type de frais</label>
            <select value={idType} onChange={e => setIdType(e.target.value)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }}>
              <option value="">Sélectionner</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.nom} — {fmt(t.montant)} FCFA</option>
              ))}
            </select>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Montant (ajustable)</label>
            <input type="number" value={montantAffiche} onChange={e => setMontantPerso(e.target.value)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }} />

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Commentaire (optionnel)</label>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={2}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block', resize: 'vertical' }} />

            {creerMsg && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>{creerMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowNouveau(false)} style={{ ...inp, cursor: 'pointer' }}>Annuler</button>
              <button onClick={creerDemande} disabled={creerLoading} style={{
                padding: '9px 20px', background: '#0F766E', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: creerLoading ? 'not-allowed' : 'pointer',
              }}>
                {creerLoading ? '...' : 'Envoyer la demande au RAF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal encaissement d'une demande validée ──────────────────────────────── */}
      {encaisser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '420px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#0F766E' }}>Encaisser le frais</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748B' }}>
              {encaisser.etudiant} — {encaisser.type_nom} — <strong>{fmt(encaisser.montant)} FCFA</strong>
            </p>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Mode de paiement</label>
            <select value={encMode} onChange={e => setEncMode(e.target.value)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            {encMsg && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>{encMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEncaisser(null)} style={{ ...inp, cursor: 'pointer' }}>Annuler</button>
              <button onClick={confirmerEncaissement} disabled={encLoading} style={{
                padding: '9px 20px', background: '#16A34A', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: encLoading ? 'not-allowed' : 'pointer',
              }}>
                {encLoading ? '...' : `Encaisser ${fmt(encaisser.montant)} FCFA`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
