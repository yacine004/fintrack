import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

const STATUTS = {
  valide:         { label: 'Validé',          bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  ajourn:         { label: 'Ajourné',         bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  exclu:          { label: 'Exclu',           bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  en_attente:     { label: 'En attente',      bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
  laissez_passer: { label: 'Laissez-passer', bg: '#F0FDFA', color: '#0D9488', border: '#99F6E4' },
  non_definie:    { label: 'Non définie',     bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0' },
}

function StatutBadge({ statut }) {
  const s = STATUTS[statut] || STATUTS.non_definie
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                   background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

export default function Autorisations() {
  const [anneeActive, setAnneeActive] = useState('2025-2026')
  const [annee,       setAnnee]       = useState('2025-2026')

  // ── Recherche par matricule ─────────────────────────────────────────────────
  const searchRef     = useRef(null)
  const [query,         setQuery]         = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchErreur,  setSearchErreur]  = useState('')
  const [searchResult,  setSearchResult]  = useState(null)

  // Formulaire de décision inline
  const [decStatut,  setDecStatut]  = useState('valide')
  const [decComment, setDecComment] = useState('')
  const [decDateLP,  setDecDateLP]  = useState('')
  const [decSaving,  setDecSaving]  = useState(false)
  const [decMsg,     setDecMsg]     = useState('')

  // ── Historique ──────────────────────────────────────────────────────────────
  const [autorisations, setAutorisations] = useState([])
  const [sansDef,       setSansDef]       = useState([])
  const [histLoading,   setHistLoading]   = useState(false)
  const [onglet,        setOnglet]        = useState('liste')

  // Charger l'année active au montage
  useEffect(() => {
    fetch(`${API}/annees-scolaires/active`, { headers: H() })
      .then(r => r.json())
      .then(d => { if (d.annee) { setAnneeActive(d.annee.libelle); setAnnee(d.annee.libelle) } })
      .catch(() => {})
  }, [])

  const chargerHistorique = useCallback(async () => {
    setHistLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/autorisations?annee=${annee}`, { headers: H() }),
        fetch(`${API}/autorisations/etudiants-manquants?annee=${annee}`, { headers: H() })
      ])
      const [d1, d2] = await Promise.all([r1.json(), r2.json()])
      if (r1.ok) setAutorisations(d1.autorisations)
      if (r2.ok) setSansDef(d2.etudiants)
    } catch { /* réseau */ }
    finally { setHistLoading(false) }
  }, [annee])

  useEffect(() => { chargerHistorique() }, [chargerHistorique])

  // Recherche par matricule
  const chercher = async (mat) => {
    const m = (mat !== undefined ? mat : query).trim()
    if (mat !== undefined) setQuery(mat)
    setSearchErreur(''); setSearchResult(null); setDecMsg(''); setDecDateLP('')
    if (!m) { setSearchErreur('Entrez un matricule'); return }
    setSearchLoading(true)
    const res  = await fetch(`${API}/autorisations/par-matricule?matricule=${encodeURIComponent(m)}&annee=${annee}`, { headers: H() })
    const data = await res.json()
    setSearchLoading(false)
    if (!res.ok) { setSearchErreur(data.message); return }
    setSearchResult(data)
    setDecStatut(data.autorisation?.statut || 'valide')
    setDecComment(data.autorisation?.commentaire || '')
    setDecDateLP(data.autorisation?.date_validite_lp || '')
  }

  // Appelé depuis les listes historiques : pré-remplit + lance la recherche
  const selectionnerMatricule = (matricule) => {
    setQuery(matricule)
    chercher(matricule)
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const enregistrerDecision = async () => {
    if (!searchResult) return
    setDecSaving(true); setDecMsg('')
    const res = await fetch(`${API}/autorisations`, {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        id_etudiant: searchResult.etudiant.id,
        annee, statut: decStatut, commentaire: decComment,
        ...(decStatut === 'laissez_passer' ? { date_validite_lp: decDateLP } : {}),
      })
    })
    const data = await res.json()
    setDecSaving(false)
    if (!res.ok) { setDecMsg('❌ ' + data.message); return }
    setDecMsg('✓ ' + data.message)
    chargerHistorique()
    chercher(query)
  }

  const stats = {
    valide:  autorisations.filter(a => a.statut === 'valide' || a.statut === 'laissez_passer').length,
    ajourn:  autorisations.filter(a => a.statut === 'ajourn').length,
    exclu:   autorisations.filter(a => a.statut === 'exclu').length,
    attente: autorisations.filter(a => a.statut === 'en_attente').length + sansDef.length,
  }

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', border: 'none', background: active ? '#1B3A6B' : 'transparent', color: active ? '#fff' : '#64748B',
  })

  const etu = searchResult?.etudiant

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1B3A6B', margin: 0 }}>
            Autorisations de Passage
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Validation du passage en classe supérieure — année {anneeActive}
          </p>
        </div>

        {/* Statistiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Validés',    value: stats.valide,  ...STATUTS.valide },
            { label: 'Ajournés',   value: stats.ajourn,  ...STATUTS.ajourn },
            { label: 'Exclus',     value: stats.exclu,   ...STATUTS.exclu },
            { label: 'En attente', value: stats.attente, ...STATUTS.en_attente },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '14px 18px', border: `1px solid ${s.border}` }}>
              <div style={{ fontSize: '11px', color: s.color, fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Recherche par matricule ──────────────────────────────────────────── */}
        <div ref={searchRef} style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1B3A6B', marginBottom: '14px' }}>
            🔍 Décision individuelle par matricule
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: (searchResult || searchErreur) ? '16px' : 0 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && chercher()}
              placeholder="Entrez le matricule de l'étudiant…"
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'monospace' }}
            />
            <button onClick={() => chercher()} disabled={searchLoading} style={{
              padding: '10px 24px', background: '#1B3A6B', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: searchLoading ? 'not-allowed' : 'pointer',
            }}>
              {searchLoading ? '...' : 'Rechercher'}
            </button>
          </div>

          {searchErreur && (
            <div style={{ color: '#DC2626', fontSize: '13px' }}>❌ {searchErreur}</div>
          )}

          {/* Carte étudiant trouvé + formulaire de décision */}
          {searchResult && etu && (
            <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
              {/* En-tête étudiant */}
              <div style={{ background: '#F8FAFC', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', background: '#1B3A6B', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '16px',
                }}>
                  {etu.prenom?.[0]}{etu.nom?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{etu.prenom} {etu.nom}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {etu.matricule} · {etu.classe} · {etu.filiere || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>Total payé</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#16A34A' }}>
                    {searchResult.total_paye.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <StatutBadge statut={searchResult.autorisation?.statut || 'non_definie'} />
              </div>

              {/* Formulaire de décision inline */}
              <div style={{ padding: '20px' }}>
                {searchResult.autorisation?.date_decision && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                    Dernière décision enregistrée le {searchResult.autorisation.date_decision}
                    {searchResult.autorisation.commentaire && ` — "${searchResult.autorisation.commentaire}"`}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Décision
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['valide', 'ajourn', 'exclu', 'laissez_passer'].map(k => {
                      const st = STATUTS[k]
                      return (
                        <button key={k} onClick={() => setDecStatut(k)} style={{
                          flex: 1, minWidth: '110px', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                          border: `2px solid ${decStatut === k ? st.color : '#E2E8F0'}`,
                          background: decStatut === k ? st.bg : '#fff',
                          color: decStatut === k ? st.color : '#64748B',
                          transition: 'all .15s',
                        }}>
                          {st.label}
                        </button>
                      )
                    })}
                  </div>

                  {decStatut === 'laissez_passer' && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '8px', padding: '12px 16px' }}>
                      <span style={{ fontSize: '13px', color: '#0D9488', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        Valide jusqu'au
                      </span>
                      <input
                        type="date"
                        value={decDateLP}
                        onChange={e => setDecDateLP(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ padding: '7px 12px', border: '1.5px solid #99F6E4', borderRadius: '7px', fontSize: '14px', outline: 'none', color: '#0F766E', fontWeight: '600' }}
                      />
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        L'étudiant sera considéré à jour jusqu'à cette date, même s'il a des arriérés.
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <textarea
                    value={decComment}
                    onChange={e => setDecComment(e.target.value)}
                    placeholder="Commentaire (optionnel) — motif, conditions de passage…"
                    rows={2}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: decMsg.startsWith('❌') ? '#DC2626' : '#16A34A' }}>
                    {decMsg}
                  </div>
                  <button onClick={enregistrerDecision} disabled={decSaving} style={{
                    padding: '9px 22px',
                    background: STATUTS[decStatut]?.color || '#1B3A6B',
                    color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                    cursor: decSaving ? 'not-allowed' : 'pointer',
                  }}>
                    {decSaving ? '...' : `Confirmer : ${STATUTS[decStatut]?.label}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Vue historique ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1B3A6B' }}>Vue historique</div>
          <input value={annee} onChange={e => setAnnee(e.target.value)}
            style={{ padding: '6px 10px', border: '1.5px solid #CBD5E1', borderRadius: '7px', fontSize: '13px', outline: 'none', width: '110px' }} />
          <button onClick={chargerHistorique} style={{
            padding: '6px 14px', background: '#1B3A6B', color: '#fff', border: 'none',
            borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>
            Actualiser
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
          <button style={tabStyle(onglet === 'liste')} onClick={() => setOnglet('liste')}>
            ✅ Décisions enregistrées ({autorisations.length})
          </button>
          <button style={tabStyle(onglet === 'attente')} onClick={() => setOnglet('attente')}>
            ⏳ Sans décision ({sansDef.length})
          </button>
        </div>

        {/* Décisions enregistrées */}
        {onglet === 'liste' && (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {histLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>
            ) : autorisations.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                Aucune décision enregistrée
              </div>
            ) : autorisations.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{a.etudiant}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{a.matricule} · {a.classe}</div>
                </div>
                <StatutBadge statut={a.statut} />
                {a.statut === 'laissez_passer' && a.date_validite_lp && (
                  <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '600', background: '#F0FDFA', padding: '2px 9px', borderRadius: '20px', border: '1px solid #99F6E4', whiteSpace: 'nowrap' }}>
                    LP → {new Date(a.date_validite_lp + 'T00:00:00').toLocaleDateString('fr-FR')}
                  </span>
                )}
                {a.commentaire && (
                  <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{a.commentaire}"
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                  {a.date_decision || a.date_creation}
                </div>
                <button onClick={() => selectionnerMatricule(a.matricule)}
                  style={{ padding: '5px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#1B3A6B', fontWeight: '600' }}>
                  Modifier
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Étudiants sans décision */}
        {onglet === 'attente' && (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {sansDef.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#16A34A', fontSize: '14px', fontWeight: '600' }}>
                ✅ Tous les étudiants ont une décision
              </div>
            ) : sansDef.map(e => (
              <div key={e.id_etudiant || e.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{e.prenom} {e.nom}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{e.matricule} · {e.classe} · {e.filiere || '—'}</div>
                </div>
                <StatutBadge statut="non_definie" />
                <button onClick={() => selectionnerMatricule(e.matricule)}
                  style={{ padding: '7px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                  Décider
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
