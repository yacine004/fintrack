import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import ModalEcheancier from '../../components/ModalEcheancier'
import PhoneInput, { parsePhone, PhoneDisplay } from '../../components/PhoneInput'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const FILIERES_L = [
  'Informatique Appliquée à la Gestion des Entreprises (IAGE)',
  'Génie Logiciel – Réseaux et Systèmes (GLRS)',
  'Technologie Transport et Logistique (TTL)',
  'Mathématiques Appliquées – Informatique et Économétrie (MAIE)',
  'Électronique, Télécommunications et Systèmes Embarqués (ETSE)',
  'Modélisation Statistique – Informatique – Économie et Finance (MOSIEF)',
  'Intelligence Artificielle (IA)',
  'Cybersécurité (CS)',
]
const FILIERES_M = [
  'MBA Data & Intelligence Artificielle (MBA-DIA)',
  "MBA Management et Sécurité des Systèmes d'Information (MBA-MSSI)",
  'MBA Actuariat, Big Data et Assurance Quantitative (MBA-ABDAQ)',
  'MBA Management Ingénierie Réseaux et Systèmes Décisionnels (MBA-MIRSD)',
  'Master Management de Projets (MMP)',
  'Master Management de Projets Internationaux (MMPI)',
]
const getFilieres = (classe) => (['M1', 'M2'].includes(classe) ? FILIERES_M : FILIERES_L)
const toSigle = (filiere) => /\(([^)]+)\)$/.exec(filiere)?.[1] ?? filiere

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
  borderRadius: '8px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', background: '#fff',
  transition: 'border-color 0.18s'
}
const lbl = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
}

/* ── Modal Étudiant ──────────────────────────────────────────────────────── */
function ModalEtudiant({ etudiant, onClose, onSave }) {
  const [form, setForm] = useState({
    matricule: '', nom: '', prenom: '', email: '',
    contact: '', classe: '', filiere: '', annee_academique: '2025-2026',
    ...etudiant
  })
  const [erreur, setErreur]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [loadingMat, setLoadingMat] = useState(false)

  useEffect(() => {
    if (etudiant) return
    setLoadingMat(true)
    fetch(`${API}/etudiants/prochain-matricule?annee=${encodeURIComponent(form.annee_academique)}`,
          { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { if (d.matricule) setForm(f => ({ ...f, matricule: d.matricule })) })
      .catch(() => {})
      .finally(() => setLoadingMat(false))
  }, [])

  const handleChange = e => {
    const { name, value } = e.target
    if (name === 'classe') {
      setForm(f => ({ ...f, classe: value, filiere: getFilieres(value)[0] || '' }))
    } else if (name === 'annee_academique' && !etudiant) {
      setForm(f => ({ ...f, annee_academique: value }))
      fetch(`${API}/etudiants/prochain-matricule?annee=${encodeURIComponent(value)}`,
            { headers: getHeaders() })
        .then(r => r.json())
        .then(d => { if (d.matricule) setForm(f => ({ ...f, matricule: d.matricule })) })
        .catch(() => {})
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async () => {
    if (!form.matricule || !form.nom || !form.prenom || !form.classe || !form.annee_academique) {
      setErreur('Matricule, nom, prénom, classe et année sont obligatoires')
      return
    }
    setLoading(true); setErreur('')
    try {
      const url    = etudiant ? `${API}/etudiants/${etudiant.id}` : `${API}/etudiants`
      const method = etudiant ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
    } catch { setErreur('Erreur de connexion au serveur') }
    finally   { setLoading(false) }
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '560px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
              {etudiant ? 'Modifier l\'étudiant' : 'Nouvel étudiant'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              {etudiant ? `Matricule ${etudiant.matricule}` : 'Remplissez les informations ci-dessous'}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '16px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={lbl}>Matricule *</label>
            <input name="matricule" value={form.matricule} onChange={handleChange}
              placeholder={loadingMat ? 'Génération…' : 'ISM2526/DK-00001'}
              style={{ ...inp, background: etudiant ? '#F8FAFC' : '#fff',
                color: etudiant ? '#94A3B8' : '#0F172A' }}
              disabled={!!etudiant} />
            {!etudiant && (
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 0' }}>
                Généré automatiquement · modifiable si nécessaire
              </p>
            )}
          </div>
          <div>
            <label style={lbl}>Nom *</label>
            <input name="nom" value={form.nom} onChange={handleChange} placeholder="Diallo" style={inp} />
          </div>
          <div>
            <label style={lbl}>Prénom *</label>
            <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Mamadou" style={inp} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input name="email" value={form.email} onChange={handleChange}
              placeholder="m.diallo@ism.edu.sn" style={inp} type="email" />
          </div>
          <div>
            <label style={lbl}>Contact</label>
            <PhoneInput
              value={form.contact || ''}
              onChange={v => setForm(f => ({ ...f, contact: v }))}
            />
          </div>
          <div>
            <label style={lbl}>Classe *</label>
            <select name="classe" value={form.classe} onChange={handleChange} style={inp}>
              <option value="">Sélectionner</option>
              {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Filière</label>
            <select name="filiere" value={form.filiere} onChange={handleChange}
              style={inp} disabled={!form.classe}>
              {!form.classe && <option value="">— Choisir d'abord la classe —</option>}
              {getFilieres(form.classe).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Année académique *</label>
            <select name="annee_academique" value={form.annee_academique} onChange={handleChange} style={inp}>
              {['2023-2024', '2024-2025', '2025-2026', '2026-2027'].map(a =>
                <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Enregistrement…' : etudiant ? 'Enregistrer' : 'Créer l\'étudiant'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page principale ─────────────────────────────────────────────────────── */
export default function RafEtudiants() {
  const [etudiants, setEtudiants]             = useState([])
  const [etudiantsActifs, setEtudiantsActifs] = useState([])
  const [caisses, setCaisses]                 = useState([])
  const [stats, setStats]                     = useState({ total: 0, actifs: 0, archives: 0 })
  const [loading, setLoading]                 = useState(true)
  const [search, setSearch]                   = useState('')
  const [filtreClasse, setFiltreClasse]       = useState('')
  const [filtreStatut, setFiltreStatut]       = useState('')
  const [page, setPage]                       = useState(1)
  const [nbPages, setNbPages]                 = useState(1)
  const [total, setTotal]                     = useState(0)
  const [modal, setModal]                     = useState(null)
  const [modalSolde, setModalSolde]           = useState(null)
  const [erreur, setErreur]                   = useState('')

  const fetchEtudiants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search)       params.set('search', search)
      if (filtreClasse) params.set('classe', filtreClasse)
      if (filtreStatut) params.set('statut', filtreStatut)
      const res  = await fetch(`${API}/etudiants?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { setEtudiants(data.etudiants); setTotal(data.total); setNbPages(data.nb_pages) }
    } catch { setErreur('Erreur de chargement') }
    finally { setLoading(false) }
  }, [page, search, filtreClasse, filtreStatut])

  const fetchStats = async () => {
    try {
      const res  = await fetch(`${API}/etudiants/stats`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch {}
  }

  useEffect(() => {
    async function load() {
      try {
        const [resE, resC] = await Promise.all([
          fetch(`${API}/etudiants?limit=200&statut=actif`, { headers: getHeaders() }),
          fetch(`${API}/caisses`, { headers: getHeaders() })
        ])
        const [dE, dC] = await Promise.all([resE.json(), resC.json()])
        if (resE.ok) setEtudiantsActifs(dE.etudiants)
        if (resC.ok) setCaisses(dC.caisses)
      } catch {}
    }
    load()
  }, [])

  useEffect(() => { fetchEtudiants(); fetchStats() }, [fetchEtudiants])

  const handleArchiver = async (id) => {
    if (!confirm('Confirmer l\'archivage / réactivation de cet étudiant ?')) return
    try {
      const res = await fetch(`${API}/etudiants/${id}/archiver`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) { fetchEtudiants(); fetchStats() }
    } catch {}
  }

  const handleSupprimer = async (id) => {
    if (!confirm('Supprimer définitivement cet étudiant et tous ses paiements ?')) return
    try {
      const res  = await fetch(`${API}/etudiants/${id}`, { method: 'DELETE', headers: getHeaders() })
      const data = await res.json()
      if (res.ok) { fetchEtudiants(); fetchStats() }
      else        setErreur(data.message || 'Erreur lors de la suppression')
    } catch { setErreur('Erreur de connexion au serveur') }
  }

  const classeColor = c => ({ L1: '#7C3AED', L2: '#1B3A6B', L3: '#0369A1', M1: '#0F766E', M2: '#15803D' }[c] || '#64748B')
  const classBg    = c => ({ L1: '#F5F3FF', L2: '#EFF6FF', L3: '#E0F2FE', M1: '#CCFBF1', M2: '#DCFCE7' }[c] || '#F1F5F9')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1B3A6B 0%, #2D5BB7 60%, #2D8CFF 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>
                Gestion des Étudiants
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                {total} étudiant{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''} · ISM Dakar
              </p>
            </div>
            <button onClick={() => setModal('creer')}
              style={{ padding: '10px 22px', background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.35)', borderRadius: '10px', fontSize: '13px',
                fontWeight: '700', backdropFilter: 'blur(8px)', cursor: 'pointer' }}>
              + Nouvel étudiant
            </button>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* Alertes */}
          {erreur && (
            <div className="ft-alert ft-alert-danger" style={{ marginBottom: '20px' }}>
              <span>⚠️</span>
              <span style={{ fontWeight: '600' }}>{erreur}</span>
              <button onClick={() => setErreur('')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#991B1B', fontSize: '16px', padding: '0 4px' }}>✕</button>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total inscrits', value: stats.total,    color: '#1B3A6B', bg: '#EFF6FF', icon: '🎓' },
              { label: 'Étudiants actifs', value: stats.actifs,   color: '#16A34A', bg: '#F0FDF4', icon: '✅' },
              { label: 'Archivés',        value: stats.archives, color: '#EA580C', bg: '#FFF7ED', icon: '📦' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="ft-card" style={{
                padding: '18px 22px', flex: 1, borderTop: `3px solid ${color}`, cursor: 'default'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{icon}</div>
                </div>
                <div className="ft-stat" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="ft-card" style={{ padding: '16px 20px', marginBottom: '20px',
            display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher par nom, matricule, email…"
              style={{ ...inp, flex: 1, minWidth: '200px', padding: '9px 14px' }} />
            <select value={filtreClasse} onChange={e => { setFiltreClasse(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', padding: '9px 14px' }}>
              <option value="">Toutes les classes</option>
              {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', padding: '9px 14px' }}>
              <option value="">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="archive">Archivés</option>
            </select>
            {(search || filtreClasse || filtreStatut) && (
              <button onClick={() => { setSearch(''); setFiltreClasse(''); setFiltreStatut(''); setPage(1) }}
                style={{ padding: '9px 14px', background: '#F1F5F9', border: '1px solid #E2E8F0',
                  borderRadius: '8px', fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Tableau */}
          <div className="ft-card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '48px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '14px' }}>
                <div className="ft-spinner" />
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>Chargement des étudiants…</span>
              </div>
            ) : etudiants.length === 0 ? (
              <div className="ft-empty">
                <span className="ft-empty-icon">🎓</span>
                <span className="ft-empty-title">Aucun étudiant trouvé</span>
                <span className="ft-empty-sub">
                  {search || filtreClasse || filtreStatut
                    ? 'Essayez de modifier les filtres de recherche'
                    : 'Cliquez sur « Nouvel étudiant » pour commencer'}
                </span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    {['Matricule', 'Étudiant', 'Classe', 'Contact', 'Année', 'Statut', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px',
                        whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {etudiants.map((e, i) => (
                    <tr key={e.id} className="ft-tr"
                      style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                        borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700',
                          color: '#1B3A6B', background: '#EFF6FF', padding: '3px 8px',
                          borderRadius: '5px', whiteSpace: 'nowrap' }}>{e.matricule}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#1E293B' }}>
                          {e.prenom} {e.nom}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>{e.email || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ display: 'inline-block', background: classBg(e.classe),
                            color: classeColor(e.classe), padding: '2px 9px', borderRadius: '5px',
                            fontSize: '12px', fontWeight: '700', width: 'fit-content' }}>{e.classe}</span>
                          {e.filiere && (
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                              {toSigle(e.filiere)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <PhoneDisplay value={e.contact} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {e.annee_academique}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: e.statut === 'actif' ? '#F0FDF4' : '#FFF7ED',
                          color: e.statut === 'actif' ? '#16A34A' : '#EA580C',
                          padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700'
                        }}>
                          <span className="ft-dot" style={{
                            background: e.statut === 'actif' ? '#16A34A' : '#EA580C',
                            animationPlayState: e.statut === 'actif' ? 'running' : 'paused'
                          }} />
                          {e.statut === 'actif' ? 'Actif' : 'Archivé'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => setModalSolde(e)} title="Voir l'échéancier"
                            style={{ padding: '5px 10px', background: '#EFF6FF', color: '#1B3A6B',
                              border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                              whiteSpace: 'nowrap' }}>
                            📋 Échéancier
                          </button>
                          <button onClick={() => setModal(e)} title="Modifier"
                            style={{ padding: '5px 9px', background: '#F0FDF4', color: '#16A34A',
                              border: 'none', borderRadius: '6px', fontSize: '13px' }}>✏️</button>
                          <button onClick={() => handleArchiver(e.id)}
                            title={e.statut === 'actif' ? 'Archiver' : 'Réactiver'}
                            style={{ padding: '5px 9px',
                              background: e.statut === 'actif' ? '#FFF7ED' : '#F0FDF4',
                              color:      e.statut === 'actif' ? '#EA580C' : '#16A34A',
                              border: 'none', borderRadius: '6px', fontSize: '13px' }}>
                            {e.statut === 'actif' ? '📦' : '♻️'}
                          </button>
                          <button onClick={() => handleSupprimer(e.id)} title="Supprimer"
                            style={{ padding: '5px 9px', background: '#FEF2F2', color: '#DC2626',
                              border: 'none', borderRadius: '6px', fontSize: '13px' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {nbPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '8px', padding: '16px 20px', borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
                    background: '#fff', fontSize: '13px', fontWeight: '600',
                    color: page === 1 ? '#CBD5E1' : '#1B3A6B' }}>
                  ← Préc.
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: Math.min(nbPages, 7) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      style={{ width: '32px', height: '32px', border: 'none', borderRadius: '7px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        background: page === n ? '#1B3A6B' : '#F1F5F9',
                        color:      page === n ? '#fff'    : '#64748B' }}>
                      {n}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                  style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
                    background: '#fff', fontSize: '13px', fontWeight: '600',
                    color: page === nbPages ? '#CBD5E1' : '#1B3A6B' }}>
                  Suiv. →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <ModalEtudiant
          etudiant={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchEtudiants(); fetchStats() }}
        />
      )}

      {modalSolde && (
        <ModalEcheancier
          etudiant={modalSolde}
          caisses={caisses}
          etudiants={etudiantsActifs}
          onClose={() => setModalSolde(null)}
          onRefresh={() => { fetchEtudiants(); fetchStats() }}
        />
      )}
    </div>
  )
}
