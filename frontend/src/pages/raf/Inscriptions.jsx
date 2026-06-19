import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { genererEcheancier, getNiveau, calculerStatuts } from '../../components/ModalEcheancier'
import PhoneInput from '../../components/PhoneInput'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const ANNEE_COURANTE = '2025-2026'
const CLASSES        = ['L1', 'L2', 'L3', 'M1', 'M2']
const MODES_PAIEMENT = ['especes', 'wave', 'orange_money', 'virement', 'cheque']

const FILIERES_LICENCE = [
  'Informatique Appliquée à la Gestion des Entreprises (IAGE)',
  'Génie Logiciel – Réseaux et Systèmes (GLRS)',
  'Technologie Transport et Logistique (TTL)',
  'Mathématiques Appliquées – Informatique et Économétrie (MAIE)',
  'Électronique, Télécommunications et Systèmes Embarqués (ETSE)',
  'Modélisation Statistique – Informatique – Économie et Finance (MOSIEF)',
  'Intelligence Artificielle (IA)',
  'Cybersécurité (CS)',
]

const FILIERES_MASTER = [
  'MBA Data & Intelligence Artificielle (MBA-DIA)',
  'MBA Management et Sécurité des Systèmes d\'Information (MBA-MSSI)',
  'MBA Actuariat, Big Data et Assurance Quantitative (MBA-ABDAQ)',
  'MBA Management Ingénierie Réseaux et Systèmes Décisionnels (MBA-MIRSD)',
  'Master Management de Projets (MMP)',
  'Master Management de Projets Internationaux (MMPI)',
]

function getFilieres(classe) {
  return ['M1', 'M2'].includes(classe) ? FILIERES_MASTER : FILIERES_LICENCE
}

// ── Helpers UI ────────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1',
  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none', background: '#fff',
}
const lbl = { fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }
const btn = (variant = 'primary') => ({
  padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
  cursor: 'pointer', border: 'none', transition: 'opacity .15s',
  background: variant === 'primary' ? '#1B3A6B' : variant === 'green' ? '#16A34A' : '#F1F5F9',
  color:      variant === 'primary' ? '#fff'    : variant === 'green' ? '#fff'    : '#475569',
})

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B',
                    borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '14px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>{children}</div>
}
function Row3({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>{children}</div>
}
function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

// ── Sous-composant : EcheancierInitial ───────────────────────────────────────
// Affiche l'échéancier au moment de l'inscription avec sélection + montants partiels
function EcheancierInitial({ niveau, selectedAmounts, onToggle, onSetAmount }) {
  const ech = genererEcheancier(niveau)

  const renderGroup = (items, titre) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B',
                    textTransform: 'uppercase', marginBottom: '6px' }}>{titre}</div>
      {items.map(item => {
        const isSelected = selectedAmounts.has(item.key)
        const rawStr     = selectedAmounts.get(item.key) ?? String(item.montant)
        const customAmt  = parseInt(rawStr, 10) || 0
        const isPartial  = isSelected && customAmt < item.montant
        return (
          <div key={item.key} style={{ marginBottom: '6px' }}>
            <div
              onClick={() => onToggle(item.key, item.montant)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: isSelected ? '8px 8px 0 0' : '8px',
                border: isSelected ? '1.5px solid #1B3A6B' : '1.5px solid #E2E8F0',
                background: isSelected ? '#EFF6FF' : '#F8FAFC',
                cursor: 'pointer', userSelect: 'none',
              }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px',
                border: isSelected ? '2px solid #1B3A6B' : '2px solid #CBD5E1',
                background: isSelected ? '#1B3A6B' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
              </div>
              <span style={{ flex: 1, fontSize: '13px', color: '#1E293B' }}>{item.label}</span>
              {isPartial && (
                <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309',
                               border: '1px solid #FDE68A', borderRadius: '4px', padding: '2px 6px' }}>
                  Partiel
                </span>
              )}
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1B3A6B', whiteSpace: 'nowrap' }}>
                {item.montant.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            {isSelected && (
              <div onClick={e => e.stopPropagation()} style={{
                background: '#F0F9FF', border: '1.5px solid #1B3A6B', borderTop: 'none',
                borderRadius: '0 0 8px 8px', padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>Montant :</span>
                <input
                  type="number" value={rawStr}
                  onChange={e => onSetAmount(item.key, e.target.value, item.montant)}
                  style={{ width: '130px', padding: '5px 8px', border: '1.5px solid #93C5FD',
                           borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                />
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  / {item.montant.toLocaleString('fr-FR')} FCFA
                </span>
                {isPartial && (
                  <button onClick={() => onSetAmount(item.key, String(item.montant), item.montant)}
                    style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 8px',
                             background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: '5px',
                             cursor: 'pointer', color: '#1B3A6B', fontWeight: '600' }}>
                    Tout payer
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const totalSelected = [...selectedAmounts.values()].reduce((s, v) => s + (parseInt(v, 10) || 0), 0)

  return (
    <div>
      {renderGroup(ech.inscription, "Droits d'inscription")}
      {renderGroup(ech.scolarite,   'Scolarité mensuelle')}
      {ech.encadrement.length > 0 && renderGroup(ech.encadrement, 'Encadrement & Soutenance')}
      {selectedAmounts.size > 0 && (
        <div style={{
          marginTop: '12px', padding: '12px 16px',
          background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: '#166534' }}>
            {selectedAmounts.size} paiement(s) sélectionné(s)
          </span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#15803D' }}>
            {totalSelected.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      )}
    </div>
  )
}

// ── Onglet Nouvelle Inscription ───────────────────────────────────────────────
function OngletInscription({ caisses }) {
  const [annee,     setAnnee]     = useState(ANNEE_COURANTE)
  const [matricule, setMatricule] = useState('')
  const [loadingMat, setLoadingMat] = useState(false)

  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', contact: '',
    classe: 'L1', filiere: FILIERES_LICENCE[0],
  })

  // Paiement initial
  const [selectedAmounts, setSelectedAmounts] = useState(new Map())
  const [idCaisse, setIdCaisse]     = useState('')
  const [mode,     setMode]         = useState('especes')
  const [prochainRef, setProchainRef] = useState('')

  const [loading, setLoading]  = useState(false)
  const [erreur,  setErreur]   = useState('')
  const [success, setSuccess]  = useState(null)

  const niveau = getNiveau(form.classe)

  const genererMatricule = useCallback(async () => {
    setLoadingMat(true)
    try {
      const res  = await fetch(`${API}/inscriptions/prochain-matricule?annee=${annee}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setMatricule(data.matricule)
    } catch {}
    finally { setLoadingMat(false) }
  }, [annee])

  useEffect(() => { genererMatricule() }, [genererMatricule])

  // eslint-disable-next-line
  useEffect(() => {
    fetch(`${API}/paiements/prochain-numero`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => { if (data.reference) setProchainRef(data.reference) })
      .catch(() => {})
  }, [])

  const toggleKey = (key, fullMontant) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev)
      next.has(key) ? next.delete(key) : next.set(key, String(fullMontant))
      return next
    })
  }
  const setAmount = (key, rawValue, maxMontant) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev)
      if (rawValue === '') { next.set(key, ''); return next }
      const parsed = parseInt(rawValue, 10)
      if (isNaN(parsed)) return prev
      next.set(key, String(Math.min(parsed, maxMontant)))
      return next
    })
  }

  const montantTotal = [...selectedAmounts.values()].reduce((s, v) => s + (parseInt(v, 10) || 0), 0)

  const valider = async () => {
    setErreur('')
    if (!form.nom.trim() || !form.prenom.trim()) return setErreur('Nom et prénom obligatoires')
    if (!matricule.trim()) return setErreur('Matricule manquant — réessayez')

    const pmt = (montantTotal > 0 && idCaisse)
      ? { montant: montantTotal, id_caisse: Number(idCaisse), mode_paiement: mode,
          motif: 'Paiement initial à l\'inscription' }
      : null

    setLoading(true)
    try {
      const res = await fetch(`${API}/inscriptions/nouvelle`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          etudiant: { ...form, matricule, annee_academique: annee },
          paiement: pmt,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message || 'Erreur'); setLoading(false); return }
      setSuccess(data)
    } catch { setErreur('Erreur réseau') }
    finally { setLoading(false) }
  }

  if (success) {
    const etu = success.etudiant
    const pmt = success.paiement
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803D', marginBottom: '8px' }}>
          Inscription réussie !
        </div>
        <div style={{ fontSize: '15px', color: '#475569', marginBottom: '24px' }}>
          {etu.prenom} {etu.nom} — <strong>{etu.matricule}</strong>
        </div>
        {pmt && (
          <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC',
                        borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>
              Paiement initial enregistré
            </div>
            <div style={{ fontSize: '14px', color: '#1E293B' }}>
              {pmt.montant.toLocaleString('fr-FR')} FCFA — {pmt.mode_paiement}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button style={btn('primary')} onClick={() => {
            setSuccess(null); setForm({ nom:'', prenom:'', email:'', contact:'', classe:'L1', filiere:'GLRS' })
            setSelectedAmounts(new Map()); setIdCaisse(''); setMatricule(''); genererMatricule()
          }}>
            Nouvelle inscription
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '780px' }}>
      {erreur && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '8px',
                      padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
          {erreur}
        </div>
      )}

      <Section title="Année académique">
        <Row2>
          <Field label="Année académique *">
            <select value={annee} onChange={e => setAnnee(e.target.value)} style={inp}>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </Field>
          <Field label="Matricule généré automatiquement">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={matricule} onChange={e => setMatricule(e.target.value)}
                style={{ ...inp, flex: 1, background: '#F8FAFC', fontWeight: '700', color: '#1B3A6B' }} />
              <button onClick={genererMatricule} disabled={loadingMat}
                style={{ ...btn(), padding: '9px 12px', fontSize: '12px' }}>
                {loadingMat ? '...' : '↻'}
              </button>
            </div>
          </Field>
        </Row2>
      </Section>

      <Section title="Informations de l'étudiant">
        <Row2>
          <Field label="Nom *">
            <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Diallo" style={inp} />
          </Field>
          <Field label="Prénom *">
            <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
              placeholder="Mamadou" style={inp} />
          </Field>
        </Row2>
        <Row2>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="m.diallo@ism.edu.sn" style={inp} />
          </Field>
          <Field label="Contact">
            <PhoneInput
              value={form.contact || ''}
              onChange={v => setForm(f => ({ ...f, contact: v }))}
            />
          </Field>
        </Row2>
        <Row2>
          <Field label="Classe *">
            <select value={form.classe} onChange={e => setForm(f => ({ ...f, classe: e.target.value, filiere: getFilieres(e.target.value)[0] }))} style={inp}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Filière">
            <select value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))} style={inp}>
              {getFilieres(form.classe).map(fi => <option key={fi} value={fi}>{fi}</option>)}
            </select>
          </Field>
        </Row2>
      </Section>

      <Section title={`Échéancier ${annee} — Niveau ${niveau} (paiements optionnels à l'inscription)`}>
        <EcheancierInitial
          niveau={niveau}
          selectedAmounts={selectedAmounts}
          onToggle={toggleKey}
          onSetAmount={setAmount}
        />
        {selectedAmounts.size > 0 && (
          <div style={{ marginTop: '16px', padding: '14px', background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B',
                          textTransform: 'uppercase', marginBottom: '10px' }}>
              Encaissement initial
            </div>
            <Row3>
              <Field label="Caisse *">
                <select value={idCaisse} onChange={e => setIdCaisse(e.target.value)} style={inp}>
                  <option value="">-- Choisir --</option>
                  {caisses.filter(c => c.statut === 'active').map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mode de paiement">
                <select value={mode} onChange={e => setMode(e.target.value)} style={inp}>
                  {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Référence de paiement">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F0F9FF', borderRadius: '8px', border: '1.5px solid #BAE6FD' }}>
                  <span>🏷️</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: '#0369A1' }}>
                    {prochainRef || '…'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>Auto</span>
                </div>
              </Field>
            </Row3>
          </div>
        )}
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
        <button style={btn('green')} onClick={valider} disabled={loading}>
          {loading ? 'Enregistrement...' : 'Inscrire l\'étudiant'}
        </button>
      </div>
    </div>
  )
}

// ── Onglet Réinscription ──────────────────────────────────────────────────────
function OngletReinscription({ caisses }) {
  const [matriculeInput, setMatriculeInput] = useState('')
  const [etudiant,  setEtudiant]    = useState(null)
  const [totalPaye, setTotalPaye]   = useState(0)
  const [autorisation, setAutorisation] = useState(null)  // statut passage
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchErr, setSearchErr]   = useState('')

  const [nouvelleClasse, setNouvelleClasse] = useState('')
  const [nouvelleAnnee,  setNouvelleAnnee]  = useState('2026-2027')
  const [nouvelleFiliere, setNouvelleFiliere] = useState('')

  const [selectedAmounts, setSelectedAmounts] = useState(new Map())
  const [idCaisse, setIdCaisse]     = useState('')
  const [mode,     setMode]         = useState('especes')
  const [prochainRef, setProchainRef] = useState('')

  const [loading, setLoading] = useState(false)
  const [erreur,  setErreur]  = useState('')
  const [success, setSuccess] = useState(null)

  // eslint-disable-next-line
  useEffect(() => {
    fetch(`${API}/paiements/prochain-numero`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => { if (data.reference) setProchainRef(data.reference) })
      .catch(() => {})
  }, [])

  const rechercherEtudiant = async () => {
    if (!matriculeInput.trim()) return
    setSearchErr(''); setEtudiant(null); setSelectedAmounts(new Map())
    setLoadingSearch(true)
    try {
      const res  = await fetch(`${API}/inscriptions/etudiant?matricule=${encodeURIComponent(matriculeInput.trim())}`, { headers: getHeaders() })
      const data = await res.json()
      if (!res.ok) { setSearchErr(data.message); setLoadingSearch(false); return }
      setEtudiant(data.etudiant)
      setTotalPaye(data.total_paye_annee || 0)
      setNouvelleClasse(data.etudiant.classe || 'L1')
      setNouvelleFiliere(data.etudiant.filiere || getFilieres(data.etudiant.classe || 'L1')[0])
      // Vérifier autorisation de passage
      const rAuth = await fetch(`${API}/autorisations/verifier/${data.etudiant.id}?annee=${data.etudiant.annee_academique}`, { headers: getHeaders() })
      const dAuth = await rAuth.json()
      setAutorisation(dAuth)
    } catch { setSearchErr('Erreur réseau') }
    finally { setLoadingSearch(false) }
  }

  const toggleKey = (key, fullMontant) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev)
      next.has(key) ? next.delete(key) : next.set(key, String(fullMontant))
      return next
    })
  }
  const setAmount = (key, rawValue, maxMontant) => {
    setSelectedAmounts(prev => {
      const next = new Map(prev)
      if (rawValue === '') { next.set(key, ''); return next }
      const parsed = parseInt(rawValue, 10)
      if (isNaN(parsed)) return prev
      next.set(key, String(Math.min(parsed, maxMontant)))
      return next
    })
  }

  const montantTotal = [...selectedAmounts.values()].reduce((s, v) => s + (parseInt(v, 10) || 0), 0)
  const niveau       = getNiveau(nouvelleClasse)

  const valider = async () => {
    setErreur('')
    if (!nouvelleClasse) return setErreur('Choisir la nouvelle classe')
    if (!nouvelleAnnee)  return setErreur('Choisir la nouvelle année')

    const pmt = (montantTotal > 0 && idCaisse)
      ? { montant: montantTotal, id_caisse: Number(idCaisse), mode_paiement: mode,
          motif: 'Paiement initial à la réinscription' }
      : null

    setLoading(true)
    try {
      const res = await fetch(`${API}/inscriptions/reinscription`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          id_etudiant:    etudiant.id,
          nouvelle_classe: nouvelleClasse,
          nouvelle_annee:  nouvelleAnnee,
          paiement:        pmt,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message || 'Erreur'); setLoading(false); return }
      setSuccess(data)
    } catch { setErreur('Erreur réseau') }
    finally { setLoading(false) }
  }

  if (success) {
    const etu = success.etudiant
    const pmt = success.paiement
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803D', marginBottom: '8px' }}>
          Réinscription effectuée !
        </div>
        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
          {success.message}
        </div>
        <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
          Classe : <strong>{etu.classe}</strong> — Année : <strong>{etu.annee_academique}</strong>
        </div>
        {pmt && (
          <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC',
                        borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '6px' }}>
              Paiement enregistré
            </div>
            <div style={{ fontSize: '14px', color: '#1E293B' }}>
              {pmt.montant.toLocaleString('fr-FR')} FCFA — {pmt.mode_paiement}
            </div>
          </div>
        )}
        <button style={btn('primary')} onClick={() => {
          setSuccess(null); setEtudiant(null); setMatriculeInput(''); setSelectedAmounts(new Map()); setIdCaisse('')
        }}>
          Nouvelle réinscription
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '780px' }}>
      {/* Recherche matricule */}
      <Section title="Rechercher l'étudiant">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Matricule de l'étudiant</label>
            <input
              value={matriculeInput}
              onChange={e => setMatriculeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rechercherEtudiant()}
              placeholder="ISM2526/DK-00001"
              style={inp}
            />
          </div>
          <button style={{ ...btn('primary'), padding: '9px 18px' }}
            onClick={rechercherEtudiant} disabled={loadingSearch}>
            {loadingSearch ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
        {searchErr && (
          <div style={{ marginTop: '10px', color: '#DC2626', fontSize: '13px',
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        borderRadius: '6px', padding: '8px 12px' }}>
            {searchErr}
          </div>
        )}
      </Section>

      {/* Fiche étudiant trouvé */}
      {etudiant && (
        <>
          <Section title="Statut actuel de l'étudiant">
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                          borderRadius: '10px', padding: '14px 18px' }}>
              <Row2>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>ÉTUDIANT</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                    {etudiant.prenom} {etudiant.nom}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{etudiant.matricule}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>CLASSE ACTUELLE</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B' }}>{etudiant.classe}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{etudiant.filiere} — {etudiant.annee_academique}</div>
                </div>
              </Row2>
              <div style={{ marginTop: '8px', padding: '8px 12px',
                            background: totalPaye > 0 ? '#F0FDF4' : '#FEF2F2',
                            border: `1px solid ${totalPaye > 0 ? '#86EFAC' : '#FECACA'}`,
                            borderRadius: '6px', fontSize: '13px',
                            color: totalPaye > 0 ? '#166534' : '#DC2626' }}>
                Total payé cette année : <strong>{totalPaye.toLocaleString('fr-FR')} FCFA</strong>
              </div>
              {autorisation && (() => {
                const cfg = {
                  valide:      { bg: '#F0FDF4', border: '#86EFAC', color: '#166534', label: '✅ Passage validé par le RAF' },
                  ajourn:      { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', label: '⚠️ Ajourné — passage soumis à conditions' },
                  exclu:       { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: '🚫 Exclu — réinscription non autorisée' },
                  en_attente:  { bg: '#F8FAFC', border: '#CBD5E1', color: '#64748B', label: '⏳ Décision en attente' },
                  non_definie: { bg: '#F8FAFC', border: '#CBD5E1', color: '#94A3B8', label: 'ℹ️ Aucune décision de passage enregistrée' },
                }
                const s = cfg[autorisation.statut] || cfg.non_definie
                return (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: s.bg,
                                border: `1px solid ${s.border}`, borderRadius: '6px',
                                fontSize: '13px', color: s.color, fontWeight: '600' }}>
                    {s.label}
                    {autorisation.commentaire && <span style={{ fontWeight: '400', marginLeft: '8px' }}>— {autorisation.commentaire}</span>}
                  </div>
                )
              })()}
            </div>
          </Section>

          <Section title="Nouvelle inscription">
            <Row3>
              <Field label="Nouvelle année académique *">
                <select value={nouvelleAnnee} onChange={e => setNouvelleAnnee(e.target.value)} style={inp}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </Field>
              <Field label="Nouvelle classe *">
                <select value={nouvelleClasse} onChange={e => { setNouvelleClasse(e.target.value); setNouvelleFiliere(getFilieres(e.target.value)[0]) }} style={inp}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Filière">
                <select value={nouvelleFiliere} onChange={e => setNouvelleFiliere(e.target.value)} style={inp}>
                  {getFilieres(nouvelleClasse).map(fi => <option key={fi} value={fi}>{fi}</option>)}
                </select>
              </Field>
            </Row3>
          </Section>

          {nouvelleClasse && (
            <Section title={`Échéancier ${nouvelleAnnee} — Niveau ${niveau} (paiements optionnels)`}>
              <EcheancierInitial
                niveau={niveau}
                selectedAmounts={selectedAmounts}
                onToggle={toggleKey}
                onSetAmount={setAmount}
              />
              {selectedAmounts.size > 0 && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#F8FAFC',
                              border: '1.5px solid #E2E8F0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B',
                                textTransform: 'uppercase', marginBottom: '10px' }}>
                    Encaissement initial
                  </div>
                  <Row3>
                    <Field label="Caisse *">
                      <select value={idCaisse} onChange={e => setIdCaisse(e.target.value)} style={inp}>
                        <option value="">-- Choisir --</option>
                        {caisses.filter(c => c.statut === 'active').map(c => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Mode de paiement">
                      <select value={mode} onChange={e => setMode(e.target.value)} style={inp}>
                        {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                      </select>
                    </Field>
                    <Field label="Référence de paiement">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F0F9FF', borderRadius: '8px', border: '1.5px solid #BAE6FD' }}>
                        <span>🏷️</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: '#0369A1' }}>
                          {prochainRef || '…'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>Auto</span>
                      </div>
                    </Field>
                  </Row3>
                </div>
              )}
            </Section>
          )}

          {erreur && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '8px',
                          padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
              {erreur}
            </div>
          )}

          {(() => {
            // Calcul des arriérés de l'année en cours
            const niveauAct  = getNiveau(etudiant.classe)
            const echAct     = genererEcheancier(niveauAct)
            const statutsAct = calculerStatuts(echAct, totalPaye)
            const allItems   = [...echAct.inscription, ...echAct.scolarite, ...echAct.encadrement]
            // Montant des items 'du' non couverts
            let budget = totalPaye
            let montantDu = 0
            for (const item of allItems) {
              if (budget >= item.montant) { budget -= item.montant }
              else if (statutsAct[item.key] === 'du') {
                montantDu += item.montant - (budget > 0 ? budget : 0)
                budget = 0
              }
            }

            if (autorisation?.statut === 'exclu') {
              return (
                <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#DC2626', marginBottom: '4px' }}>
                    🚫 Réinscription impossible — Étudiant exclu
                  </div>
                  <div style={{ fontSize: '13px', color: '#B91C1C' }}>
                    La décision d'exclusion pour {etudiant.annee_academique} doit être levée par le RAF via la page <strong>Autorisations</strong>.
                  </div>
                </div>
              )
            }

            if (autorisation?.statut === 'ajourn' && montantDu > 0) {
              return (
                <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#DC2626', marginBottom: '6px' }}>
                    🚫 Réinscription bloquée — Étudiant ajourné avec arriérés
                  </div>
                  <div style={{ fontSize: '13px', color: '#B91C1C', marginBottom: '8px' }}>
                    Condition de l'ajournement non remplie : l'étudiant doit solder ses arriérés avant de se réinscrire.
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626', background: '#fff', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 12px', display: 'inline-block' }}>
                    Montant dû : {montantDu.toLocaleString('fr-FR')} FCFA
                  </div>
                  {autorisation.commentaire && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400E' }}>
                      Note du RAF : {autorisation.commentaire}
                    </div>
                  )}
                </div>
              )
            }

            if (autorisation?.statut === 'ajourn' && montantDu === 0) {
              return (
                <div>
                  <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#166534', fontWeight: '600' }}>
                    ✅ Condition remplie — Arriérés soldés. Réinscription autorisée.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button style={btn('green')} onClick={valider} disabled={loading}>
                      {loading ? 'Enregistrement...' : 'Valider la réinscription'}
                    </button>
                  </div>
                </div>
              )
            }

            // Statut valide, en_attente ou non_definie → accès libre
            return (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                <button style={btn('green')} onClick={valider} disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Valider la réinscription'}
                </button>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Inscriptions() {
  const [onglet,  setOnglet]  = useState('inscription')
  const [caisses, setCaisses] = useState([])

  useEffect(() => {
    fetch(`${API}/caisses`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { if (d.caisses) setCaisses(d.caisses) })
      .catch(() => {})
  }, [])

  const tabStyle = (active) => ({
    padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', border: 'none', transition: 'all .15s',
    background: active ? '#1B3A6B' : 'transparent',
    color:      active ? '#fff'    : '#64748B',
    borderBottom: active ? '3px solid #2D8CFF' : '3px solid transparent',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {/* En-tête */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1B3A6B', margin: 0 }}>
            Gestion des Inscriptions
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Première inscription et réinscription des étudiants
          </p>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0',
                      borderRadius: '10px', padding: '4px', marginBottom: '28px',
                      width: 'fit-content' }}>
          <button style={tabStyle(onglet === 'inscription')} onClick={() => setOnglet('inscription')}>
            ✏️ Nouvelle Inscription
          </button>
          <button style={tabStyle(onglet === 'reinscription')} onClick={() => setOnglet('reinscription')}>
            🔄 Réinscription
          </button>
        </div>

        {/* Contenu */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {onglet === 'inscription'
            ? <OngletInscription   caisses={caisses} />
            : <OngletReinscription caisses={caisses} />}
        </div>
      </div>
    </div>
  )
}
