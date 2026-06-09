import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const TYPE_COLORS = {
  principale: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Principale' },
  secondaire:  { bg: '#F0FDF4', color: '#16A34A', label: 'Secondaire' },
  projet:      { bg: '#FFF7ED', color: '#EA580C', label: 'Projet' },
}

// ── Modal Caisse ──────────────────────────────────────────────────────────
function ModalCaisse({ caisse, onClose, onSave }) {
  const [form, setForm] = useState({
    nom: '', description: '', type_caisse: 'principale', solde_initial: 0, ...caisse
  })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nom || !form.type_caisse) {
      setErreur('Nom et type de caisse sont obligatoires')
      return
    }
    setLoading(true)
    setErreur('')
    try {
      const url    = caisse ? `${API}/caisses/${caisse.id}` : `${API}/caisses`
      const method = caisse ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
    } catch { setErreur('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1B3A6B', fontWeight: '700' }}>
            {caisse ? '✏️ Modifier la caisse' : '🏦 Nouvelle caisse'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nom de la caisse *</label>
            <input name="nom" value={form.nom} onChange={handleChange}
              placeholder="Ex: Caisse Scolarité L3" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type *</label>
            <select name="type_caisse" value={form.type_caisse} onChange={handleChange} style={inputStyle}>
              <option value="principale">Principale</option>
              <option value="secondaire">Secondaire</option>
              <option value="projet">Projet</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Description optionnelle..." rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          {!caisse && (
            <div>
              <label style={labelStyle}>Solde initial (FCFA)</label>
              <input name="solde_initial" type="number" value={form.solde_initial}
                onChange={handleChange} min="0" step="100" style={inputStyle} />
            </div>
          )}
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
            {loading ? '⏳...' : caisse ? '✅ Modifier' : '✅ Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Transactions ────────────────────────────────────────────────────
function ModalTransactions({ caisse, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`${API}/caisses/${caisse.id}/transactions?page=${page}&limit=10`, { headers: getHeaders() })
        const json = await res.json()
        if (res.ok) setData(json)
      } catch {}
      finally { setLoading(false) }
    }
    fetch_()
  }, [caisse.id, page])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '640px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700' }}>
            📋 Transactions — {caisse.nom}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748B' }}>Solde actuel : </span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>
            {caisse.solde_actuel.toLocaleString('fr-FR')} FCFA
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>⏳ Chargement...</div>
        ) : data?.transactions?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>Aucune transaction</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Type', 'Motif', 'Montant (FCFA)', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px',
                    fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                    borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.transactions?.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: t.type === 'entree' ? '#F0FDF4' : '#FEF2F2',
                      color: t.type === 'entree' ? '#16A34A' : '#DC2626',
                      padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600'
                    }}>
                      {t.type === 'entree' ? '↑ Entrée' : '↓ Sortie'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#374151' }}>{t.motif}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700',
                    color: t.type === 'entree' ? '#16A34A' : '#DC2626' }}>
                    {t.type === 'entree' ? '+' : '-'} {Number(t.montant).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#94A3B8' }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data?.nb_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Préc.</button>
            <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>
              {page} / {data.nb_pages}
            </span>
            <button onClick={() => setPage(p => Math.min(data.nb_pages, p + 1))} disabled={page === data.nb_pages}
              style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                background: '#fff', cursor: page === data.nb_pages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suiv. →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page principale Caisses ────────────────────────────────────────────────
export default function RafCaisses() {
  const [caisses, setCaisses]   = useState([])
  const [kpis, setKpis]         = useState({ solde_total: 0, nb_actives: 0, nb_total: 0 })
  const [loading, setLoading]   = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreType, setFiltreType]     = useState('')
  const [modal, setModal]       = useState(null)
  const [modalTx, setModalTx]   = useState(null)

  const fetchCaisses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtreStatut) params.set('statut', filtreStatut)
      if (filtreType)   params.set('type', filtreType)
      const res  = await fetch(`${API}/caisses?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setCaisses(data.caisses)
        setKpis(data.kpis)
      }
    } catch {}
    finally { setLoading(false) }
  }, [filtreStatut, filtreType])

  useEffect(() => { fetchCaisses() }, [fetchCaisses])

  const handleToggle = async (id) => {
    if (!confirm('Activer / désactiver cette caisse ?')) return
    try {
      const res = await fetch(`${API}/caisses/${id}/toggle`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) fetchCaisses()
    } catch {}
  }

  const handleSupprimer = async (id) => {
    if (!confirm('Supprimer cette caisse ? (solde doit être à 0)')) return
    try {
      const res  = await fetch(`${API}/caisses/${id}`, { method: 'DELETE', headers: getHeaders() })
      const data = await res.json()
      if (!res.ok) { alert(data.message); return }
      fetchCaisses()
    } catch {}
  }

  const cardStyle = (bg) => ({
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
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>🏦 Gestion des Caisses</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {kpis.nb_actives} caisse{kpis.nb_actives > 1 ? 's' : ''} active{kpis.nb_actives > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setModal('creer')}
            style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ＋ Nouvelle caisse
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={cardStyle('#F0FDF4')}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#16A34A' }}>
              {kpis.solde_total.toLocaleString('fr-FR')} FCFA
            </span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Solde total toutes caisses</span>
          </div>
          <div style={cardStyle('#EFF6FF')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#1D4ED8' }}>{kpis.nb_actives}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Caisses actives</span>
          </div>
          <div style={cardStyle('#F8FAFC')}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#64748B' }}>{kpis.nb_total}</span>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Total caisses</span>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 20px',
          marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="inactive">Inactives</option>
          </select>
          <select value={filtreType} onChange={e => setFiltreType(e.target.value)}
            style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            <option value="">Tous les types</option>
            <option value="principale">Principale</option>
            <option value="secondaire">Secondaire</option>
            <option value="projet">Projet</option>
          </select>
        </div>

        {/* Cartes Caisses */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>⏳ Chargement...</div>
        ) : caisses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', background: '#fff', borderRadius: '12px' }}>
            🏦 Aucune caisse trouvée
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {caisses.map(c => {
              const typeInfo = TYPE_COLORS[c.type_caisse] || TYPE_COLORS.secondaire
              return (
                <div key={c.id} style={{ background: '#fff', borderRadius: '14px', padding: '22px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9',
                  borderTop: `4px solid ${typeInfo.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>{c.nom}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{c.description || 'Pas de description'}</div>
                    </div>
                    <span style={{ background: typeInfo.bg, color: typeInfo.color, padding: '3px 8px',
                      borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                      {typeInfo.label}
                    </span>
                  </div>

                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '2px' }}>SOLDE ACTUEL</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: c.solde_actuel > 0 ? '#16A34A' : '#DC2626' }}>
                      {Number(c.solde_actuel).toLocaleString('fr-FR')} <span style={{ fontSize: '13px', fontWeight: '600' }}>FCFA</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: c.statut === 'active' ? '#F0FDF4' : '#FEF2F2',
                      color: c.statut === 'active' ? '#16A34A' : '#DC2626',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
                    }}>
                      {c.statut === 'active' ? '● Active' : '● Inactive'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setModalTx(c)} title="Voir transactions"
                        style={{ padding: '6px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>📋</button>
                      <button onClick={() => setModal(c)} title="Modifier"
                        style={{ padding: '6px 10px', background: '#EFF6FF', border: 'none',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#2563EB' }}>✏️</button>
                      <button onClick={() => handleToggle(c.id)} title="Activer / Désactiver"
                        style={{ padding: '6px 10px', background: '#FFF7ED', border: 'none',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        {c.statut === 'active' ? '⏸️' : '▶️'}
                      </button>
                      <button onClick={() => handleSupprimer(c.id)} title="Supprimer"
                        style={{ padding: '6px 10px', background: '#FEF2F2', border: 'none',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <ModalCaisse
          caisse={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchCaisses() }}
        />
      )}
      {modalTx && <ModalTransactions caisse={modalTx} onClose={() => setModalTx(null)} />}
    </div>
  )
}
