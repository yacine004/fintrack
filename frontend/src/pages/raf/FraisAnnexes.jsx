import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const STATUT_INFO = {
  en_attente: { label: 'En attente',  bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  validee:    { label: 'Validé',      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  rejetee:    { label: 'Rejeté',      bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  paye:       { label: 'Payé',        bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  annule:     { label: 'Annulé',      bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0' },
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

export default function RafFraisAnnexes() {
  const [onglet, setOnglet] = useState('demandes')

  // ── Types (catalogue) ──────────────────────────────────────────────────────
  const [types, setTypes]           = useState([])
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [typeForm, setTypeForm]     = useState({ id: null, nom: '', montant: '', description: '' })
  const [typeMsg, setTypeMsg]       = useState('')

  // ── Demandes ────────────────────────────────────────────────────────────────
  const [frais, setFrais]           = useState([])
  const [kpis, setKpis]             = useState({ en_attente: 0, total_encaisse: 0 })
  const [filtreStatut, setFiltreStatut] = useState('en_attente')
  const [loading, setLoading]       = useState(false)
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [caisses, setCaisses]       = useState([])

  // ── Modal nouvelle demande ──────────────────────────────────────────────────
  const [showNouveau, setShowNouveau] = useState(false)
  const [matricule, setMatricule]     = useState('')
  const [etuTrouve, setEtuTrouve]     = useState(null)
  const [searchErr, setSearchErr]     = useState('')
  const [idType, setIdType]           = useState('')
  const [montantPerso, setMontantPerso] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [creerMsg, setCreerMsg]       = useState('')
  const [creerLoading, setCreerLoading] = useState(false)

  // ── Modal encaissement ──────────────────────────────────────────────────────
  const [encaisser, setEncaisser]   = useState(null)
  const [encMode, setEncMode]       = useState('especes')
  const [encCaisse, setEncCaisse]   = useState('')
  const [encLoading, setEncLoading] = useState(false)
  const [encMsg, setEncMsg]         = useState('')

  // ── Modal rejet ───────────────────────────────────────────────────────────────
  const [rejeter, setRejeter]       = useState(null)
  const [motifRejet, setMotifRejet] = useState('')

  const fetchTypes = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/frais-annexes/types`, { headers: H() })
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
      if (res.ok) { setFrais(data.frais); setNbPages(data.nb_pages); setKpis(data.kpis) }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, filtreStatut])

  const fetchCaisses = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/caisses`, { headers: H() })
      const data = await res.json()
      if (res.ok) setCaisses(data.caisses)
    } catch { /* ignore */ }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTypes() },  [fetchTypes])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchFrais() },  [fetchFrais])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCaisses() }, [fetchCaisses])

  // ── Types CRUD ──────────────────────────────────────────────────────────────
  const ouvrirNouveauType = () => { setTypeForm({ id: null, nom: '', montant: '', description: '' }); setShowTypeForm(true); setTypeMsg('') }
  const ouvrirEditType    = (t) => { setTypeForm({ id: t.id, nom: t.nom, montant: t.montant, description: t.description }); setShowTypeForm(true); setTypeMsg('') }

  const enregistrerType = async () => {
    if (!typeForm.nom.trim() || !typeForm.montant) { setTypeMsg('❌ Nom et montant obligatoires'); return }
    const url    = typeForm.id ? `${API}/frais-annexes/types/${typeForm.id}` : `${API}/frais-annexes/types`
    const method = typeForm.id ? 'PUT' : 'POST'
    const res  = await fetch(url, { method, headers: H(), body: JSON.stringify(typeForm) })
    const data = await res.json()
    if (!res.ok) { setTypeMsg('❌ ' + data.message); return }
    setShowTypeForm(false)
    fetchTypes()
  }

  const toggleActifType = async (t) => {
    await fetch(`${API}/frais-annexes/types/${t.id}`, { method: 'PUT', headers: H(), body: JSON.stringify({ actif: !t.actif }) })
    fetchTypes()
  }

  const supprimerType = async (t) => {
    if (!confirm(`Supprimer le type "${t.nom}" ?`)) return
    await fetch(`${API}/frais-annexes/types/${t.id}`, { method: 'DELETE', headers: H() })
    fetchTypes()
  }

  // ── Recherche étudiant ──────────────────────────────────────────────────────
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

  // ── Créer demande ───────────────────────────────────────────────────────────
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
      fetchFrais()
    } catch { setCreerMsg('❌ Erreur réseau') }
    finally { setCreerLoading(false) }
  }

  // ── Valider / Rejeter ───────────────────────────────────────────────────────
  const validerDemande = async (f) => {
    const res  = await fetch(`${API}/frais-annexes/${f.id}/valider`, { method: 'POST', headers: H() })
    const data = await res.json()
    if (!res.ok) { alert(data.message); return }
    fetchFrais()
  }

  const ouvrirRejet = (f) => { setRejeter(f); setMotifRejet('') }

  const confirmerRejet = async () => {
    const res  = await fetch(`${API}/frais-annexes/${rejeter.id}/rejeter`, {
      method: 'POST', headers: H(), body: JSON.stringify({ motif_rejet: motifRejet })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.message); return }
    setRejeter(null)
    fetchFrais()
  }

  // ── Encaisser ───────────────────────────────────────────────────────────────
  const ouvrirEncaissement = (f) => { setEncaisser(f); setEncMode('especes'); setEncCaisse(''); setEncMsg('') }

  const confirmerEncaissement = async () => {
    if (!encCaisse) { setEncMsg('❌ Sélectionnez une caisse'); return }
    setEncLoading(true); setEncMsg('')
    try {
      const res  = await fetch(`${API}/frais-annexes/${encaisser.id}/encaisser`, {
        method: 'POST', headers: H(), body: JSON.stringify({ id_caisse: encCaisse, mode_paiement: encMode })
      })
      const data = await res.json()
      if (!res.ok) { setEncMsg('❌ ' + data.message); return }
      setEncaisser(null)
      fetchFrais()
    } catch { setEncMsg('❌ Erreur réseau') }
    finally { setEncLoading(false) }
  }

  const annulerDemande = async (f) => {
    if (!confirm(`Annuler la demande de "${f.type_nom}" pour ${f.etudiant} ?`)) return
    await fetch(`${API}/frais-annexes/${f.id}`, { method: 'DELETE', headers: H() })
    fetchFrais()
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

  const typeActif = (id) => types.find(t => String(t.id) === String(id))
  const montantAffiche = montantPerso || typeActif(idType)?.montant || ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1B3A6B', margin: 0 }}>Frais annexes</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
              Rattrapages, attestations, duplicatas, cartes étudiant…
            </p>
          </div>
          {onglet === 'demandes' && (
            <button onClick={() => setShowNouveau(true)} style={{
              padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              + Nouvelle demande
            </button>
          )}
          {onglet === 'catalogue' && (
            <button onClick={ouvrirNouveauType} style={{
              padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              + Nouveau type
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px',
          padding: '4px', width: 'fit-content', marginBottom: '20px' }}>
          {[{ key: 'demandes', label: 'Demandes' }, { key: 'catalogue', label: 'Catalogue de frais' }].map(({ key, label }) => (
            <button key={key} onClick={() => setOnglet(key)} style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              border: 'none', borderRadius: '7px',
              background: onglet === key ? '#1B3A6B' : 'transparent',
              color:      onglet === key ? '#fff'    : '#64748B',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ONGLET DEMANDES ──────────────────────────────────────────────────── */}
        {onglet === 'demandes' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#FFFBEB', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>En attente</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#B45309' }}>{kpis.en_attente}</div>
              </div>
              <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Total encaissé</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>{fmt(kpis.total_encaisse)} FCFA</div>
              </div>
              <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: '#1B3A6B', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Types actifs</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1B3A6B' }}>{types.filter(t => t.actif).length}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px',
              padding: '4px', width: 'fit-content', marginBottom: '16px' }}>
              {[
                { key: 'en_attente', label: 'En attente' },
                { key: 'validee',    label: 'Validés (à encaisser)' },
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

            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
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
                  {f.statut === 'en_attente' && (
                    <>
                      <button onClick={() => validerDemande(f)} style={{
                        padding: '6px 14px', background: '#1D4ED8', color: '#fff', border: 'none',
                        borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      }}>
                        Valider
                      </button>
                      <button onClick={() => ouvrirRejet(f)} style={{
                        padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                        borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      }}>
                        Rejeter
                      </button>
                    </>
                  )}
                  {f.statut === 'validee' && (
                    <>
                      <button onClick={() => ouvrirEncaissement(f)} style={{
                        padding: '6px 14px', background: '#16A34A', color: '#fff', border: 'none',
                        borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      }}>
                        Encaisser
                      </button>
                      <button onClick={() => annulerDemande(f)} style={{
                        padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                        borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      }}>
                        ✕
                      </button>
                    </>
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
          </>
        )}

        {/* ── ONGLET CATALOGUE ─────────────────────────────────────────────────── */}
        {onglet === 'catalogue' && (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {types.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Aucun type de frais défini</div>
            ) : types.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', gap: '12px', opacity: t.actif ? 1 : 0.5 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{t.nom}</div>
                  {t.description && <div style={{ fontSize: '12px', color: '#64748B' }}>{t.description}</div>}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1B3A6B', width: '120px', textAlign: 'right' }}>
                  {fmt(t.montant)} F
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                  background: t.actif ? '#F0FDF4' : '#F8FAFC', color: t.actif ? '#16A34A' : '#94A3B8' }}>
                  {t.actif ? 'Actif' : 'Inactif'}
                </span>
                <button onClick={() => ouvrirEditType(t)} style={{
                  padding: '6px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px',
                  fontSize: '12px', cursor: 'pointer', color: '#1B3A6B', fontWeight: '600',
                }}>
                  Modifier
                </button>
                <button onClick={() => toggleActifType(t)} style={{
                  padding: '6px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px',
                  fontSize: '12px', cursor: 'pointer', color: '#64748B', fontWeight: '600',
                }}>
                  {t.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => supprimerType(t)} style={{
                  padding: '6px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px',
                  fontSize: '12px', cursor: 'pointer', color: '#DC2626', fontWeight: '600',
                }}>
                  Suppr.
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal nouveau/édition type ──────────────────────────────────────────── */}
      {showTypeForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '420px' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: '#1B3A6B' }}>
              {typeForm.id ? 'Modifier le type de frais' : 'Nouveau type de frais'}
            </h3>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Nom</label>
            <input value={typeForm.nom} onChange={e => setTypeForm({ ...typeForm, nom: e.target.value })}
              placeholder="Ex: Attestation de scolarité"
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }} />

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Montant (FCFA)</label>
            <input type="number" value={typeForm.montant} onChange={e => setTypeForm({ ...typeForm, montant: e.target.value })}
              placeholder="5000"
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }} />

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Description (optionnel)</label>
            <textarea value={typeForm.description || ''} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
              rows={2}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block', resize: 'vertical' }} />

            {typeMsg && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>{typeMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowTypeForm(false)} style={{ ...inp, cursor: 'pointer' }}>Annuler</button>
              <button onClick={enregistrerType} style={{
                padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nouvelle demande ───────────────────────────────────────────────── */}
      {showNouveau && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '460px' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: '17px', fontWeight: '800', color: '#1B3A6B' }}>Nouvelle demande de frais</h3>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Matricule de l'étudiant</label>
            <div style={{ display: 'flex', gap: '8px', margin: '6px 0 6px' }}>
              <input value={matricule} onChange={e => setMatricule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && chercherEtudiant()}
                style={{ ...inp, flex: 1, fontFamily: 'monospace' }} />
              <button onClick={chercherEtudiant} style={{
                padding: '9px 16px', background: '#1B3A6B', color: '#fff', border: 'none',
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
              {types.filter(t => t.actif).map(t => (
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
                padding: '9px 20px', background: '#1B3A6B', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: creerLoading ? 'not-allowed' : 'pointer',
              }}>
                {creerLoading ? '...' : 'Créer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal encaissement ───────────────────────────────────────────────────── */}
      {encaisser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '420px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#1B3A6B' }}>Encaisser le frais</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748B' }}>
              {encaisser.etudiant} — {encaisser.type_nom} — <strong>{fmt(encaisser.montant)} FCFA</strong>
            </p>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Mode de paiement</label>
            <select value={encMode} onChange={e => setEncMode(e.target.value)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Caisse</label>
            <select value={encCaisse} onChange={e => setEncCaisse(e.target.value)}
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block' }}>
              <option value="">Sélectionner</option>
              {caisses.filter(c => c.statut === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.nom} — {fmt(c.solde_actuel)} FCFA</option>
              ))}
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

      {/* ── Modal rejet ───────────────────────────────────────────────────────────── */}
      {rejeter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '420px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#DC2626' }}>Rejeter la demande</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748B' }}>
              {rejeter.etudiant} — {rejeter.type_nom} — {fmt(rejeter.montant)} FCFA
            </p>

            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Motif du rejet (optionnel)</label>
            <textarea value={motifRejet} onChange={e => setMotifRejet(e.target.value)} rows={3}
              placeholder="Ex : document déjà délivré, justificatif manquant…"
              style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '6px 0 14px', display: 'block', resize: 'vertical' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setRejeter(null)} style={{ ...inp, cursor: 'pointer' }}>Annuler</button>
              <button onClick={confirmerRejet} style={{
                padding: '9px 20px', background: '#DC2626', color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              }}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
