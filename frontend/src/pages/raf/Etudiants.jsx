import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const FILIERES_L = ['GLRS', 'MIAGE', 'TTL', 'MAIE', 'ETSE', 'MOSIEF', 'IA', 'CS']
const FILIERES_M = ['MBA/DIA', 'MBI/MSSI', 'MBA/ABDAQ', 'MBI/MIRSD', 'MMP', 'MMPI']
const FILIERES_ALL = [...FILIERES_L, ...FILIERES_M]

const MODE_LABELS = {
  especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', wave: 'Wave'
}

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
const TARIFS = { L1: 700000, L2: 700000, L3: 700000, M1: 1500000, M2: 1500000 }

// ── Composant Modal Étudiant ───────────────────────────────────────────────
function ModalEtudiant({ etudiant, onClose, onSave }) {
  const [form, setForm] = useState({
    matricule: '', nom: '', prenom: '', email: '',
    contact: '', classe: '', filiere: '', annee_academique: '2025-2026',
    ...etudiant
  })
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.matricule || !form.nom || !form.prenom || !form.classe || !form.annee_academique) {
      setErreur('Matricule, nom, prénom, classe et année sont obligatoires')
      return
    }
    setLoading(true)
    setErreur('')
    try {
      const url    = etudiant ? `${API}/etudiants/${etudiant.id}` : `${API}/etudiants`
      const method = etudiant ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
    } catch { setErreur('Erreur de connexion au serveur') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit'
  }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1B3A6B', fontWeight: '700' }}>
            {etudiant ? '✏️ Modifier l\'étudiant' : '🎓 Nouvel étudiant'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Matricule *</label>
            <input name="matricule" value={form.matricule} onChange={handleChange}
              placeholder="ISM2026001" style={inputStyle} disabled={!!etudiant} />
          </div>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input name="nom" value={form.nom} onChange={handleChange} placeholder="Diallo" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prénom *</label>
            <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Mamadou" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input name="email" value={form.email} onChange={handleChange} placeholder="email@ism.edu.sn" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contact</label>
            <input name="contact" value={form.contact} onChange={handleChange} placeholder="77 000 00 00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Classe *</label>
            <select name="classe" value={form.classe} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner</option>
              {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Filière</label>
            <select name="filiere" value={form.filiere} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner</option>
              <optgroup label="Licence (L1-L3)">
                {FILIERES_L.map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
              <optgroup label="Master (M1-M2)">
                {FILIERES_M.map(f => <option key={f} value={f}>{f}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Année académique *</label>
            <select name="annee_academique" value={form.annee_academique} onChange={handleChange} style={inputStyle}>
              {['2023-2024', '2024-2025', '2025-2026', '2026-2027'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0',
            borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#1B3A6B',
              color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳ Enregistrement...' : etudiant ? '✅ Modifier' : '✅ Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Solde Étudiant ───────────────────────────────────────────────────
function ModalSolde({ etudiant, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState('')

  useEffect(() => {
    fetch(`${API}/etudiants/suivi?matricule=${etudiant.matricule}`)
      .then(r => r.json())
      .then(d => {
        if (d.etudiant) setData(d)
        else setErreur(d.message || 'Impossible de charger les données')
      })
      .catch(() => setErreur('Erreur de connexion'))
      .finally(() => setLoading(false))
  }, [etudiant.matricule])

  const aJour = data?.resume?.a_jour
  const pct   = data ? Math.min(100, Math.round((data.resume.total_paye / data.resume.tarif_annuel) * 100)) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '680px',
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: '#1B3A6B', borderRadius: '16px 16px 0 0',
          padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>
              Suivi paiements — {etudiant.prenom} {etudiant.nom}
            </div>
            <div style={{ color: '#93C5FD', fontSize: '12px', marginTop: '2px' }}>
              {etudiant.matricule} | {etudiant.classe} {etudiant.filiere}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>⏳ Chargement...</div>}
          {erreur  && <div style={{ color: '#DC2626', padding: '20px', textAlign: 'center' }}>⚠️ {erreur}</div>}

          {data && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Frais annuels',  val: fmt(data.resume.tarif_annuel),  bg: '#EFF6FF', color: '#1B3A6B' },
                  { label: 'Total payé',      val: fmt(data.resume.total_paye),    bg: '#F0FDF4', color: '#16A34A' },
                  { label: 'Solde restant',   val: fmt(data.resume.solde_restant), bg: data.resume.solde_restant > 0 ? '#FEF2F2' : '#F0FDF4', color: data.resume.solde_restant > 0 ? '#DC2626' : '#16A34A' },
                ].map(({ label, val, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Statut + barre */}
              <div style={{
                background: aJour ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${aJour ? '#16A34A' : '#DC2626'}`,
                borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: aJour ? '#16A34A' : '#DC2626', fontSize: '14px' }}>
                    {aJour ? '✅ Situation à jour' : '⚠️ Solde impayé'}
                  </span>
                  <span style={{ fontWeight: '800', color: aJour ? '#16A34A' : '#DC2626' }}>{pct}%</span>
                </div>
                <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: pct >= 100 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626',
                    borderRadius: '99px', transition: 'width 0.4s',
                  }} />
                </div>
              </div>

              {/* Tableau paiements */}
              {data.paiements.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
                  Aucun paiement enregistré pour cet étudiant.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Réf.', 'Motif', 'Montant', 'Mode', 'Sem.', 'Date'].map(h => (
                          <th key={h} style={{
                            padding: '9px 12px', textAlign: 'left', fontWeight: '700',
                            color: '#64748B', fontSize: '11px', textTransform: 'uppercase',
                            borderBottom: '1px solid #E2E8F0',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.paiements.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '9px 12px', fontWeight: '600', color: '#1B3A6B' }}>{p.reference}</td>
                          <td style={{ padding: '9px 12px', color: '#374151', maxWidth: '180px' }}>{p.motif || '—'}</td>
                          <td style={{ padding: '9px 12px', fontWeight: '700', color: '#16A34A', whiteSpace: 'nowrap' }}>{fmt(p.montant)}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: '#EFF6FF', color: '#1B3A6B', padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                              {MODE_LABELS[p.mode_paiement] || p.mode_paiement}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{
                              background: p.semestre === 'S1' ? '#EFF6FF' : '#F0FDF4',
                              color: p.semestre === 'S1' ? '#1D4ED8' : '#15803D',
                              padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                            }}>{p.semestre}</span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{p.date_paiement}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F1F5F9', borderTop: '2px solid #E2E8F0' }}>
                        <td colSpan={2} style={{ padding: '10px 12px', fontWeight: '700', color: '#1B3A6B' }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#16A34A' }}>{fmt(data.resume.total_paye)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale Étudiants RAF ──────────────────────────────────────────
export default function RafEtudiants() {
  const [etudiants, setEtudiants]   = useState([])
  const [stats, setStats]           = useState({ total: 0, actifs: 0, archives: 0 })
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtreClasse, setFiltreClasse] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [total, setTotal]           = useState(0)
  const [modal, setModal]           = useState(null) // null | 'creer' | etudiant
  const [modalSolde, setModalSolde] = useState(null) // null | etudiant
  const [erreur, setErreur]         = useState('')

  const fetchEtudiants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search)       params.set('search', search)
      if (filtreClasse) params.set('classe', filtreClasse)
      if (filtreStatut) params.set('statut', filtreStatut)

      const res  = await fetch(`${API}/etudiants?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setEtudiants(data.etudiants)
        setTotal(data.total)
        setNbPages(data.nb_pages)
      }
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

  useEffect(() => { fetchEtudiants(); fetchStats() }, [fetchEtudiants])

  const handleArchiver = async (id) => {
    if (!confirm('Confirmer l\'archivage / réactivation de cet étudiant ?')) return
    try {
      const res = await fetch(`${API}/etudiants/${id}/archiver`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) { fetchEtudiants(); fetchStats() }
    } catch {}
  }

  const handleSupprimer = async (id) => {
    if (!confirm('Supprimer définitivement cet étudiant ?')) return
    try {
      const res = await fetch(`${API}/etudiants/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (res.ok) { fetchEtudiants(); fetchStats() }
    } catch {}
  }

  const handleSearch = e => { setSearch(e.target.value); setPage(1) }

  const cardStyle = (bg, color) => ({
    background: bg, borderRadius: '12px', padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: '4px', flex: 1
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>🎓 Gestion des Étudiants</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {total} étudiant{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setModal('creer')}
            style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ＋ Nouvel étudiant
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={cardStyle('#EFF6FF', '#1D4ED8')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#1B3A6B' }}>{stats.total}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Total étudiants</span>
          </div>
          <div style={cardStyle('#F0FDF4', '#16A34A')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#16A34A' }}>{stats.actifs}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Actifs</span>
          </div>
          <div style={cardStyle('#FFF7ED', '#EA580C')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#EA580C' }}>{stats.archives}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Archivés</span>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={handleSearch} placeholder="🔍 Rechercher (nom, matricule, email)..."
            style={{ flex: 1, minWidth: '220px', padding: '9px 14px', border: '1.5px solid #E2E8F0',
              borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
          <select value={filtreClasse} onChange={e => { setFiltreClasse(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Toutes les classes</option>
            {['L1', 'L2', 'L3', 'M1', 'M2'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="archive">Archivés</option>
          </select>
          {(search || filtreClasse || filtreStatut) && (
            <button onClick={() => { setSearch(''); setFiltreClasse(''); setFiltreStatut(''); setPage(1) }}
              style={{ padding: '9px 14px', background: '#F1F5F9', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: '#64748B' }}>
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : etudiants.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              🎓 Aucun étudiant trouvé
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Matricule', 'Nom complet', 'Classe / Filière', 'Contact', 'Année', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                      letterSpacing: '0.5px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {etudiants.map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                    transition: 'background 0.15s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F0F7FF'}
                    onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFC'}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600',
                      color: '#1B3A6B', borderBottom: '1px solid #F1F5F9' }}>{e.matricule}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontWeight: '600', color: '#1E293B' }}>{e.prenom} {e.nom}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>{e.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px',
                        borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{e.classe}</span>
                      {e.filiere && <span style={{ marginLeft: '6px', color: '#64748B', fontSize: '12px' }}>{e.filiere}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                      {e.contact || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                      {e.annee_academique}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{
                        background: e.statut === 'actif' ? '#F0FDF4' : '#FFF7ED',
                        color: e.statut === 'actif' ? '#16A34A' : '#EA580C',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {e.statut === 'actif' ? '● Actif' : '● Archivé'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => setModalSolde(e)} title="Voir solde et paiements"
                          style={{ padding: '5px 10px', background: '#F0FDF4', color: '#16A34A',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          💰 Solde
                        </button>
                        <button onClick={() => setModal(e)} title="Modifier"
                          style={{ padding: '5px 10px', background: '#EFF6FF', color: '#2563EB',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                        <button onClick={() => handleArchiver(e.id)} title={e.statut === 'actif' ? 'Archiver' : 'Réactiver'}
                          style={{ padding: '5px 10px', background: e.statut === 'actif' ? '#FFF7ED' : '#F0FDF4',
                            color: e.statut === 'actif' ? '#EA580C' : '#16A34A',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          {e.statut === 'actif' ? '📦' : '♻️'}
                        </button>
                        <button onClick={() => handleSupprimer(e.id)} title="Supprimer"
                          style={{ padding: '5px 10px', background: '#FEF2F2', color: '#DC2626',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
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
              gap: '8px', padding: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: page === 1 ? '#F8FAFC' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#CBD5E1' : '#1B3A6B', fontSize: '13px' }}>← Préc.</button>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Page {page} / {nbPages}</span>
              <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: page === nbPages ? '#F8FAFC' : '#fff', cursor: page === nbPages ? 'not-allowed' : 'pointer',
                  color: page === nbPages ? '#CBD5E1' : '#1B3A6B', fontSize: '13px' }}>Suiv. →</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal édition */}
      {modal && (
        <ModalEtudiant
          etudiant={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchEtudiants(); fetchStats() }}
        />
      )}

      {/* Modal solde */}
      {modalSolde && (
        <ModalSolde
          etudiant={modalSolde}
          onClose={() => setModalSolde(null)}
        />
      )}
    </div>
  )
}
