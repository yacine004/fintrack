import { useState, useEffect, useCallback } from 'react'

const TODAY = new Date()
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

// ── Helpers barème ISM (configurable, géré dans Paramétrage → Échéancier) ────

export function getNiveau(classe) {
  const c = (classe || '').toUpperCase()
  if (c.includes('M2')) return 'M2'
  if (c.includes('M1')) return 'M1'
  if (c.includes('L3')) return 'L3'
  if (c.includes('L2')) return 'L2'
  return 'L1'
}

const _baremeCache = new Map()

/** Récupère le barème complet (tous niveaux) configuré pour une année scolaire.
 * Mis en cache par année pour éviter de refetch à chaque rendu — le barème ne
 * change pas pendant une session, sauf modification volontaire par le RAF. */
export async function fetchBareme(annee) {
  if (!annee) return null
  if (_baremeCache.has(annee)) return _baremeCache.get(annee)
  try {
    const res  = await fetch(`${API}/echeancier/bareme?annee=${encodeURIComponent(annee)}`, { headers: getHeaders() })
    const data = await res.json()
    if (res.ok) { _baremeCache.set(annee, data.niveaux); return data.niveaux }
  } catch { /* ignore */ }
  return null
}

/** Invalide le cache (à appeler après modification du barème dans Paramétrage). */
export function invaliderCacheBareme(annee) {
  if (annee) _baremeCache.delete(annee)
  else _baremeCache.clear()
}

const ECHEANCIER_VIDE = {
  inscription: [], scolarite: [], encadrement: [],
  totalInscription: 0, totalScolarite: 0, totalEncadrement: 0, totalAnnuel: 0,
  niveau: null, fraisMensuel: 0,
}

/** Construit l'échéancier d'un niveau à partir du barème déjà récupéré via
 * fetchBareme(annee). Retourne un échéancier vide (et non une erreur) si le
 * barème n'est pas encore chargé ou si aucune ligne n'est configurée. */
export function genererEcheancier(niveau, bareme) {
  const data = bareme?.[niveau]
  if (!data) return { ...ECHEANCIER_VIDE, niveau }

  const toDate = (items) => items.map(i => ({ ...i, date: new Date(i.date + 'T00:00:00') }))
  return {
    inscription: toDate(data.inscription),
    scolarite:   toDate(data.scolarite),
    encadrement: toDate(data.encadrement),
    totalInscription: data.totalInscription,
    totalScolarite:   data.totalScolarite,
    totalEncadrement: data.totalEncadrement,
    totalAnnuel:      data.totalAnnuel,
    niveau,
    fraisMensuel: data.fraisMensuel,
  }
}

export function calculerStatuts(echeancier, totalPaye) {
  const all = [...echeancier.inscription, ...echeancier.scolarite, ...echeancier.encadrement]
  let budget = totalPaye
  const statuts = {}
  for (const item of all) {
    if (budget >= item.montant) {
      statuts[item.key] = 'paye'
      budget -= item.montant
    } else {
      statuts[item.key] = item.date <= TODAY ? 'du' : 'attente'
    }
  }
  return statuts
}

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal Paiement (partagée) ─────────────────────────────────────────────────
// Le montant n'est jamais saisi manuellement : il est calculé depuis l'échéancier.
// Si defaultEtudiant est fourni, l'étudiant est pré-sélectionné (ex: depuis ModalEcheancier).
// Sinon, le caissier tape le matricule pour trouver l'étudiant.

export function ModalPaiement({ defaultEtudiant, paiementsInitiaux, caisses, onClose, onSave, onRecu, zIndex = 1000 }) {
  const [matriculeInput, setMatriculeInput] = useState(defaultEtudiant?.matricule || '')
  const [etudiant, setEtudiant]             = useState(defaultEtudiant || null)
  const [suggestions, setSuggestions]       = useState([])
  const [searchLoading, setSearchLoading]   = useState(false)
  const [paiementsEtu, setPaiementsEtu]     = useState(paiementsInitiaux || [])
  const [loadingEtu, setLoadingEtu]         = useState(false)
  const [selectedAmounts, setSelectedAmounts] = useState(new Map()) // key → montant encaissé
  const [showAvance, setShowAvance]         = useState(false)
  const [idCaisse, setIdCaisse]             = useState('')
  const [mode, setMode]                     = useState('especes')
  const [prochainRef, setProchainRef]       = useState('')
  const [erreur, setErreur]                 = useState('')
  const [loading, setLoading]               = useState(false)
  const [success, setSuccess]               = useState(null)

  // Caisse auto-assignée (caissier) vs sélectable (RAF)
  const userRole       = JSON.parse(localStorage.getItem('user') || '{}').role || 'comptable'
  const [caisseAffectee, setCaisseAffectee] = useState(null)
  const [loadingCaisse, setLoadingCaisse]   = useState(false)
  const [erreurCaisse, setErreurCaisse]     = useState('')

  const chargerPaiements = useCallback(async (id, annee) => {
    setLoadingEtu(true)
    try {
      const params = new URLSearchParams({ etudiant_id: id, limit: 200 })
      if (annee) params.set('annee', annee)
      const res  = await fetch(`${API}/paiements?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setPaiementsEtu(data.paiements)
    } catch {}
    finally { setLoadingEtu(false) }
  }, [])

  // eslint-disable-next-line
  useEffect(() => { if (defaultEtudiant && !paiementsInitiaux) chargerPaiements(defaultEtudiant.id, defaultEtudiant.annee_academique) }, [])

  // Fetch prochain numéro de référence (lecture seule, pour affichage)
  // eslint-disable-next-line
  useEffect(() => {
    fetch(`${API}/paiements/prochain-numero`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => { if (data.reference) setProchainRef(data.reference) })
      .catch(() => {})
  }, [])

  // Fetch caisse assignée si caissier (comptable)
  // eslint-disable-next-line
  useEffect(() => {
    if (userRole === 'raf') return
    setLoadingCaisse(true)
    fetch(`${API}/affectations/ma-caisse`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.caisse) {
          setCaisseAffectee(data.caisse)
          setIdCaisse(String(data.caisse.id))
        } else {
          setErreurCaisse(data.message || 'Aucune caisse assignée — contactez le RAF')
        }
      })
      .catch(() => setErreurCaisse('Impossible de récupérer la caisse assignée'))
      .finally(() => setLoadingCaisse(false))
  }, [])

  // Autocomplete par matricule/nom (debounce 300 ms) — uniquement sans defaultEtudiant
  useEffect(() => {
    if (defaultEtudiant || matriculeInput.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res  = await fetch(`${API}/etudiants?search=${encodeURIComponent(matriculeInput.trim())}&statut=actif&limit=6`, { headers: getHeaders() })
        const data = await res.json()
        if (res.ok) setSuggestions(data.etudiants || [])
      } catch {}
      finally { setSearchLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [matriculeInput, defaultEtudiant])

  const selectStudent = async (etu) => {
    setEtudiant(etu); setMatriculeInput(etu.matricule)
    setSuggestions([]); setSelectedAmounts(new Map()); setShowAvance(false)
    await chargerPaiements(etu.id, etu.annee_academique)
  }

  // Barème de l'année académique de l'étudiant sélectionné
  const [bareme, setBareme] = useState(null)
  useEffect(() => {
    if (!etudiant?.annee_academique) return
    fetchBareme(etudiant.annee_academique).then(setBareme)
  }, [etudiant?.annee_academique])

  // Calculs échéancier
  const niveau     = etudiant ? getNiveau(etudiant.classe) : 'L1'
  const ech        = genererEcheancier(niveau, bareme)
  const totalPaye  = paiementsEtu.reduce((s, p) => s + parseFloat(p.montant), 0)
  const statuts    = etudiant ? calculerStatuts(ech, totalPaye) : {}
  const allItems   = [...ech.inscription, ...ech.scolarite, ...ech.encadrement]
  const dues       = allItems.filter(i => statuts[i.key] === 'du')
  const futures    = allItems.filter(i => statuts[i.key] === 'attente')

  const selectedKeys = new Set(selectedAmounts.keys())

  // La Map stocke des strings pour laisser l'input se vider librement
  const toggleKey = (key, fullMontant) => setSelectedAmounts(prev => {
    const next = new Map(prev)
    next.has(key) ? next.delete(key) : next.set(key, String(fullMontant))
    return next
  })

  const setAmount = (key, rawValue, maxMontant) => {
    if (rawValue === '') {
      setSelectedAmounts(prev => { const next = new Map(prev); next.set(key, ''); return next })
      return
    }
    const parsed = parseInt(rawValue, 10)
    if (isNaN(parsed)) return
    setSelectedAmounts(prev => {
      const next = new Map(prev)
      next.set(key, String(Math.min(parsed, maxMontant)))
      return next
    })
  }

  const montantTotal = [...selectedAmounts.values()].reduce((s, v) => s + (parseInt(v, 10) || 0), 0)
  const autoMotif    = allItems.filter(i => selectedKeys.has(i.key)).map(i => {
    const custom = parseInt(selectedAmounts.get(i.key), 10) || 0
    return custom < i.montant ? `${i.label} (partiel : ${custom.toLocaleString('fr-FR')} FCFA)` : i.label
  }).join(' ; ')
  const canSubmit    = etudiant && montantTotal > 0 && idCaisse && !erreurCaisse

  const handleSubmit = async () => {
    if (!etudiant)               { setErreur('Veuillez sélectionner un étudiant'); return }
    if (montantTotal === 0) { setErreur('Sélectionnez au moins une échéance à régler'); return }
    if (!idCaisse)               { setErreur('Sélectionnez une caisse'); return }
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/paiements`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ id_etudiant: etudiant.id, id_caisse: idCaisse, montant: montantTotal, mode_paiement: mode, motif: autoMotif })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      setSuccess(data)
    } catch { setErreur('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  const renderRow = (item, selectable) => {
    const isSelected  = selectedKeys.has(item.key)
    const isPaid      = statuts[item.key] === 'paye'
    const rawStr      = selectedAmounts.get(item.key) ?? String(item.montant)
    const customAmt   = parseInt(rawStr, 10) || 0   // valeur numérique pour calculs/affichage
    const isPartial   = isSelected && customAmt < item.montant

    return (
      <div key={item.key} style={{ marginBottom: '6px' }}>
        {/* Ligne principale */}
        <div
          onClick={() => selectable && !isPaid && toggleKey(item.key, item.montant)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: isSelected ? '8px 8px 0 0' : '8px', border: `1.5px solid ${isSelected ? '#1B3A6B' : '#E2E8F0'}`, borderBottom: isSelected ? '1px solid #BAE6FD' : undefined, background: isPaid ? '#F8FAFC' : isSelected ? '#EFF6FF' : '#fff', cursor: selectable && !isPaid ? 'pointer' : 'default', opacity: isPaid ? 0.5 : 1 }}>
          {selectable && !isPaid ? (
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isSelected ? '#1B3A6B' : '#CBD5E1'}`, background: isSelected ? '#1B3A6B' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSelected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
            </div>
          ) : <div style={{ width: '18px', flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: isPaid ? '#94A3B8' : '#1E293B' }}>{item.label}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtDate(item.date)}</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: isPaid ? '#94A3B8' : isPartial ? '#EA580C' : '#1B3A6B', textAlign: 'right' }}>
            {isPartial ? `${customAmt.toLocaleString('fr-FR')} FCFA` : `${item.montant.toLocaleString('fr-FR')} FCFA`}
          </div>
          {isPaid && <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>✅ Payé</span>}
          {isPartial && <span style={{ background: '#FFF7ED', color: '#EA580C', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>Partiel</span>}
        </div>
        {/* Zone montant — visible quand la ligne est cochée et non payée */}
        {isSelected && !isPaid && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: '#F0F9FF', border: '1.5px solid #1B3A6B', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>Montant à encaisser :</span>
            <input
              type="number"
              value={rawStr}
              onChange={e => setAmount(item.key, e.target.value, item.montant)}
              min={1}
              max={item.montant}
              style={{ flex: 1, padding: '5px 10px', border: `1.5px solid ${isPartial ? '#EA580C' : '#1B3A6B'}`, borderRadius: '6px', fontSize: '14px', fontWeight: '700', color: isPartial ? '#EA580C' : '#1B3A6B', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
              / {item.montant.toLocaleString('fr-FR')} FCFA
            </span>
            {isPartial && (
              <button
                onClick={() => setAmount(item.key, String(item.montant), item.montant)}
                style={{ padding: '4px 10px', background: '#EFF6FF', color: '#1B3A6B', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                Tout payer
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', width: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#16A34A', fontSize: '22px', margin: '0 0 8px' }}>Paiement enregistré !</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '4px' }}>
            {etudiant?.prenom} {etudiant?.nom} — <strong>{montantTotal.toLocaleString('fr-FR')} FCFA</strong>
          </p>
          <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '20px', lineHeight: '1.5' }}>{autoMotif}</p>
          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Nouveau solde caisse</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>{success.nouveau_solde?.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => onRecu?.(success.paiement.id, success.paiement.reference)}
              style={{ padding: '10px 20px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              🖨️ Voir le reçu PDF
            </button>
            <button onClick={() => { onSave?.(); onClose() }}
              style={{ padding: '10px 20px', background: '#F1F5F9', color: '#374151', border: '1.5px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulaire principal ──────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1B3A6B', fontWeight: '700' }}>💳 Enregistrer un paiement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        {/* ── Recherche étudiant (si pas de defaultEtudiant) ── */}
        {!defaultEtudiant && (
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={labelStyle}>Matricule ou nom de l'étudiant *</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={matriculeInput}
                onChange={e => { setMatriculeInput(e.target.value); setEtudiant(null); setPaiementsEtu([]); setSelectedAmounts(new Map()) }}
                placeholder="Ex: ISM-2024-001 ou Diallo…"
                style={{ ...inputStyle, flex: 1 }}
                autoFocus
              />
              {searchLoading && <span style={{ color: '#94A3B8', fontSize: '13px' }}>⏳</span>}
            </div>
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: '4px' }}>
                {suggestions.map(s => (
                  <div key={s.id}
                    onClick={() => selectStudent(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ background: '#EFF6FF', color: '#1B3A6B', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{s.matricule}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>{s.prenom} {s.nom}</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>{s.classe}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bandeau étudiant sélectionné ── */}
        {etudiant && (
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', border: '1.5px solid #BAE6FD', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#1B3A6B', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{etudiant.matricule}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{etudiant.prenom} {etudiant.nom}</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>{etudiant.classe}{etudiant.filiere ? ` — ${etudiant.filiere}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Déjà réglé</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A' }}>{totalPaye.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
        )}

        {/* ── Sélection des échéances ── */}
        {etudiant && (
          <div style={{ marginBottom: '20px' }}>
            {loadingEtu ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>⏳ Chargement de l'échéancier...</div>
            ) : (
              <>
                {/* Échéances dues */}
                {dues.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      ❌ Échéances dues — {dues.length} à régler
                    </div>
                    {dues.map(item => renderRow(item, true))}
                  </div>
                )}

                {/* Toggle avance */}
                {futures.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div onClick={() => setShowAvance(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 0', userSelect: 'none' }}>
                      <div style={{ width: '36px', height: '20px', borderRadius: '20px', background: showAvance ? '#1B3A6B' : '#CBD5E1', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: '2px', left: showAvance ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Paiement en avance — {futures.length} échéance{futures.length > 1 ? 's' : ''} future{futures.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {showAvance && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#92400E', padding: '6px 10px', background: '#FFFBEB', borderRadius: '6px', marginBottom: '8px', border: '1px solid #FDE68A' }}>
                          ℹ️ Ces échéances ne sont pas encore dues. L'étudiant paie en avance.
                        </div>
                        {futures.map(item => renderRow(item, true))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages état */}
                {dues.length === 0 && futures.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#F0FDF4', borderRadius: '8px', color: '#16A34A', fontSize: '13px', fontWeight: '600', border: '1px solid #BBF7D0' }}>
                    ✅ Scolarité entièrement apurée pour cet étudiant
                  </div>
                )}
                {dues.length === 0 && futures.length > 0 && !showAvance && (
                  <div style={{ textAlign: 'center', padding: '10px', background: '#F0FDF4', borderRadius: '8px', color: '#16A34A', fontSize: '12px', fontWeight: '600', border: '1px solid #BBF7D0' }}>
                    ✅ Aucune échéance due — activez le toggle ci-dessus pour un paiement en avance
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Récap montant calculé ── */}
        {selectedAmounts.size > 0 && (
          <div style={{ background: '#1B3A6B', color: '#fff', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {selectedAmounts.size} échéance{selectedAmounts.size > 1 ? 's' : ''} — montant à encaisser
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>
                {montantTotal.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
            <span style={{ fontSize: '30px' }}>💳</span>
          </div>
        )}

        {/* ── Mode, caisse, référence ── */}
        {etudiant && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '8px' }}>
            <div>
              <label style={labelStyle}>Mode de paiement *</label>
              <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle}>
                <option value="especes">💵 Espèces</option>
                <option value="virement">🏦 Virement</option>
                <option value="cheque">📝 Chèque</option>
                <option value="wave">📱 Wave</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Caisse *</label>
              {userRole === 'raf' ? (
                <select value={idCaisse} onChange={e => setIdCaisse(e.target.value)} style={inputStyle}>
                  <option value="">Sélectionner</option>
                  {caisses.filter(c => c.statut === 'active').map(c => (
                    <option key={c.id} value={c.id}>{c.nom} — {c.solde_actuel.toLocaleString('fr-FR')} FCFA</option>
                  ))}
                </select>
              ) : loadingCaisse ? (
                <div style={{ ...inputStyle, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⏳ Chargement de la caisse assignée…
                </div>
              ) : erreurCaisse ? (
                <div style={{ padding: '9px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1.5px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: '600' }}>
                  ⚠️ {erreurCaisse}
                </div>
              ) : caisseAffectee ? (
                <div style={{ padding: '9px 14px', background: '#F0FDF4', borderRadius: '8px', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>🏦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>{caisseAffectee.nom}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Solde : {caisseAffectee.solde_actuel.toLocaleString('fr-FR')} FCFA</div>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>Assignée</span>
                </div>
              ) : null}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Référence de paiement</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: '#F0F9FF', borderRadius: '8px', border: '1.5px solid #BAE6FD' }}>
                <span style={{ fontSize: '14px' }}>🏷️</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '14px', color: '#0369A1', letterSpacing: '0.5px' }}>
                  {prochainRef || '…'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748B', marginLeft: 'auto' }}>Générée automatiquement</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || loading}
            style={{ padding: '10px 24px', background: (!canSubmit || loading) ? '#94A3B8' : '#16A34A', color: '#fff', border: 'none', borderRadius: '8px', cursor: (!canSubmit || loading) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳ Enregistrement...' : canSubmit ? `✅ Encaisser ${montantTotal.toLocaleString('fr-FR')} FCFA` : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Échéancier ISM 2025-2026 (composant partagé) ───────────────────────

export default function ModalEcheancier({ etudiant, caisses, etudiants, onClose, onRefresh }) {
  const [paiementsEtu, setPaiementsEtu] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showPaiement, setShowPaiement] = useState(false)

  const chargerPaiements = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/paiements?etudiant_id=${etudiant.id}&limit=200`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setPaiementsEtu(data.paiements)
    } catch { /* network */ }
    finally { setLoading(false) }
  }, [etudiant.id])

  // eslint-disable-next-line
  useEffect(() => { chargerPaiements() }, [chargerPaiements])

  const [bareme, setBareme] = useState(null)
  useEffect(() => {
    if (!etudiant.annee_academique) return
    fetchBareme(etudiant.annee_academique).then(setBareme)
  }, [etudiant.annee_academique])

  const niveau      = getNiveau(etudiant.classe)
  const echeancier  = genererEcheancier(niveau, bareme)
  const totalPaye   = paiementsEtu.reduce((s, p) => s + parseFloat(p.montant), 0)
  const statuts     = calculerStatuts(echeancier, totalPaye)
  const resteAPayer = Math.max(0, echeancier.totalAnnuel - totalPaye)

  const allItems     = [...echeancier.inscription, ...echeancier.scolarite, ...echeancier.encadrement]
  const itemsDus     = allItems.filter(i => statuts[i.key] === 'du')
  const montantDuNow = itemsDus.reduce((s, i) => s + i.montant, 0)
  const prochainItem = allItems.filter(i => statuts[i.key] === 'attente').sort((a, b) => a.date - b.date)[0]

  const handleRecu = async (id, ref) => {
    try {
      const res = await fetch(`${API}/paiements/${id}/recu`, { headers: getHeaders() })
      if (!res.ok) { alert('Erreur génération du reçu'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.target = '_blank'
      a.download = `recu_${ref || 'FT-' + String(id).padStart(5, '0')}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Erreur de connexion') }
  }

  const getBadge = (key) => {
    const s = statuts[key]
    if (s === 'paye') return { bg: '#F0FDF4', color: '#16A34A', label: '✅ Payé' }
    if (s === 'du')   return { bg: '#FEF2F2', color: '#DC2626', label: '❌ Dû' }
    return { bg: '#F8FAFC', color: '#94A3B8', label: '🕐 En attente' }
  }

  const TH = { padding: '8px 14px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' }
  const TD = { padding: '10px 14px', fontSize: '13px', color: '#475569' }

  const renderSection = (titre, items, headerColor, headerBg, totalSection) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ background: headerColor, color: '#fff', padding: '10px 16px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '14px' }}>{titre}</span>
        <span style={{ fontSize: '13px', opacity: 0.9 }}>{totalSection.toLocaleString('fr-FR')} FCFA</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E2E8F0', borderTop: 'none' }}>
        <thead>
          <tr style={{ background: headerBg }}>
            <th style={TH}>Échéance</th>
            <th style={TH}>Libellé</th>
            <th style={{ ...TH, textAlign: 'right' }}>Montant</th>
            <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const badge  = getBadge(item.key)
            const rowBg  = statuts[item.key] === 'paye' ? '#F0FDF4' : statuts[item.key] === 'du' ? '#FFF5F5' : '#fff'
            return (
              <tr key={item.key} style={{ background: rowBg, borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ ...TD, color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(item.date)}</td>
                <td style={{ ...TD, color: '#1E293B', fontWeight: '500' }}>{item.label}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: '700', color: '#1B3A6B' }}>
                  {item.montant.toLocaleString('fr-FR')} FCFA
                </td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', width: '820px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', marginBottom: '24px' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #2D5FA8 100%)', borderRadius: '16px 16px 0 0', padding: '24px 28px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.65, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ISM Dakar · Échéancier 2025-2026
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800' }}>
                  {etudiant.prenom} {etudiant.nom}
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.85 }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '20px' }}>
                    {etudiant.matricule}
                  </span>
                  <span>{etudiant.classe}{etudiant.filiere ? ` — ${etudiant.filiere}` : ''}</span>
                </div>
              </div>
              <button onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                ⏳ Chargement de l'échéancier...
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '16px 16px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Total annuel</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1B3A6B' }}>
                      {echeancier.totalAnnuel.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {niveau} · {echeancier.fraisMensuel.toLocaleString('fr-FR')}/mois
                    </div>
                  </div>

                  <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '16px 16px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Montant payé</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#16A34A' }}>
                      {totalPaye.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {paiementsEtu.length} paiement{paiementsEtu.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div style={{ background: montantDuNow > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', padding: '16px 16px', border: montantDuNow > 0 ? '2px solid #FCA5A5' : '2px solid transparent' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Dû maintenant</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: montantDuNow > 0 ? '#DC2626' : '#16A34A' }}>
                      {montantDuNow.toLocaleString('fr-FR')}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {montantDuNow === 0 ? '✅ À jour' : `${itemsDus.length} versement${itemsDus.length > 1 ? 's' : ''} en retard`}
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px 16px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Prochaine échéance</div>
                    {prochainItem ? (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1B3A6B' }}>
                          {prochainItem.montant.toLocaleString('fr-FR')}
                          <span style={{ fontSize: '11px', fontWeight: '600' }}> FCFA</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          📅 {fmtDate(prochainItem.date)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: resteAPayer === 0 ? '#16A34A' : '#94A3B8' }}>—</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                          {resteAPayer === 0
                            ? '✅ Scolarité apurée'
                            : montantDuNow > 0
                              ? 'Toutes les échéances sont passées'
                              : 'Aucune échéance à venir'}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Reste total (sous les KPI) */}
                <div style={{ background: resteAPayer > 0 ? '#FFFBEB' : '#F0FDF4', borderRadius: '10px', padding: '12px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${resteAPayer > 0 ? '#FDE68A' : '#BBF7D0'}` }}>
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
                    Reste total à payer sur l'année
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: resteAPayer > 0 ? '#B45309' : '#16A34A' }}>
                    {resteAPayer.toLocaleString('fr-FR')} FCFA
                    {resteAPayer === 0 && <span style={{ fontSize: '12px', marginLeft: '8px' }}>— Scolarité apurée ✅</span>}
                  </span>
                </div>

                {/* Sections tableau */}
                {renderSection("🟦 Droits d'inscription", echeancier.inscription, '#1B3A6B', '#EFF6FF', echeancier.totalInscription)}
                {renderSection('🟧 Frais de scolarité', echeancier.scolarite, '#EA580C', '#FFF7ED', echeancier.totalScolarite)}
                {(niveau === 'L3' || niveau === 'M2') && renderSection('🟣 Encadrement & Soutenance', echeancier.encadrement, '#7C3AED', '#F5F3FF', echeancier.totalEncadrement)}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Taux de couverture :{' '}
                    <strong style={{ color: totalPaye >= echeancier.totalAnnuel ? '#16A34A' : '#1B3A6B' }}>
                      {Math.min(100, Math.round((totalPaye / echeancier.totalAnnuel) * 100))}%
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClose}
                      style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
                      Fermer
                    </button>
                    <button onClick={() => setShowPaiement(true)}
                      style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                      ＋ Enregistrer un paiement
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPaiement && (
        <ModalPaiement
          caisses={caisses}
          defaultEtudiant={etudiant}
          paiementsInitiaux={paiementsEtu}
          zIndex={2000}
          onClose={() => setShowPaiement(false)}
          onRecu={handleRecu}
          onSave={() => {
            setShowPaiement(false)
            chargerPaiements()
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
