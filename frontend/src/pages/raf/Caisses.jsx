import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const TYPE_INFO = {
  principale: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Principale' },
  secondaire:  { bg: '#F0FDF4', color: '#16A34A', label: 'Secondaire' },
  projet:      { bg: '#F5F3FF', color: '#7C3AED', label: 'Projet'     },
}

const fmt = n => Number(n || 0).toLocaleString('fr-FR')

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
  borderRadius: '8px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', background: '#fff',
}
const lbl = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
}

/* ── Modal Caisse ────────────────────────────────────────────────────────── */
function ModalCaisse({ caisse, onClose, onSave }) {
  const [form, setForm]       = useState({ nom: '', description: '', type_caisse: 'principale', solde_initial: 0, ...caisse })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nom || !form.type_caisse) { setErreur('Nom et type sont obligatoires'); return }
    setLoading(true); setErreur('')
    try {
      const url    = caisse ? `${API}/caisses/${caisse.id}` : `${API}/caisses`
      const method = caisse ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
            {caisse ? 'Modifier la caisse' : 'Nouvelle caisse'}
          </h2>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '16px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Nom de la caisse *</label>
            <input name="nom" value={form.nom} onChange={handleChange}
              placeholder="Ex: Caisse Scolarité L3" style={inp} />
          </div>
          <div>
            <label style={lbl}>Type *</label>
            <select name="type_caisse" value={form.type_caisse} onChange={handleChange} style={inp}>
              <option value="principale">Principale</option>
              <option value="secondaire">Secondaire</option>
              <option value="projet">Projet</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Description optionnelle…" rows={3}
              style={{ ...inp, resize: 'vertical' }} />
          </div>
          {!caisse && (
            <div>
              <label style={lbl}>Solde initial (FCFA)</label>
              <input name="solde_initial" type="number" value={form.solde_initial}
                onChange={handleChange} min="0" step="100" style={inp} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Enregistrement…' : caisse ? 'Enregistrer' : 'Créer la caisse'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal Affectation ───────────────────────────────────────────────────── */
function ModalAffectation({ caisses, comptables, onClose, onSave }) {
  const [form, setForm] = useState({
    id_utilisateur: '', id_caisse: '',
    date_debut: new Date().toISOString().split('T')[0], date_fin: ''
  })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.id_utilisateur || !form.id_caisse || !form.date_debut) {
      setErreur('Caissier, caisse et date de début sont obligatoires'); return
    }
    setLoading(true); setErreur('')
    try {
      const res  = await fetch(`${API}/affectations`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...form, date_fin: form.date_fin || null })
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
    } catch { setErreur('Erreur de connexion') }
    finally   { setLoading(false) }
  }

  return (
    <div className="ft-backdrop">
      <div className="ft-modal" style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '800' }}>
            Affecter un caissier
          </h2>
          <button onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {erreur && (
          <div className="ft-alert ft-alert-danger" style={{ marginBottom: '16px' }}>
            <span>⚠️</span><span>{erreur}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Caissier *</label>
            <select value={form.id_utilisateur}
              onChange={e => setForm(f => ({ ...f, id_utilisateur: e.target.value }))} style={inp}>
              <option value="">Sélectionner un caissier</option>
              {comptables.map(c => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Caisse *</label>
            <select value={form.id_caisse}
              onChange={e => setForm(f => ({ ...f, id_caisse: e.target.value }))} style={inp}>
              <option value="">Sélectionner une caisse</option>
              {caisses.filter(c => c.statut === 'active').map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Date de début *</label>
              <input type="date" value={form.date_debut}
                onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Date de fin (optionnel)</label>
              <input type="date" value={form.date_fin} min={form.date_debut}
                onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} style={inp} />
            </div>
          </div>
          <div className="ft-alert ft-alert-warning">
            <span>ℹ️</span>
            <span>Si le caissier a déjà une affectation active, elle sera automatiquement clôturée.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748B' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: '#7C3AED', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Affectation…' : 'Affecter'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Transactions inline ─────────────────────────────────────────────────── */
function TransactionsList({ caisse }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const typeInfo              = TYPE_INFO[caisse.type_caisse] || TYPE_INFO.secondaire

  useEffect(() => { setPage(1) }, [caisse.id])

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
    <div className="ft-card" style={{
      padding: '22px 26px', marginTop: '24px',
      borderTop: `3px solid ${typeInfo.color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Transactions — {caisse.nom}
          </h3>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
            {data?.total ?? '—'} opération{(data?.total ?? 0) > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '10px 18px', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px',
            textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solde actuel</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#16A34A' }}>
            {fmt(caisse.solde_actuel)} <span style={{ fontSize: '12px', fontWeight: '500', color: '#94A3B8' }}>FCFA</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
          <div className="ft-spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>Chargement…</span>
        </div>
      ) : !data?.transactions?.length ? (
        <div className="ft-empty" style={{ padding: '30px 0' }}>
          <span className="ft-empty-icon" style={{ fontSize: '32px' }}>📋</span>
          <span className="ft-empty-sub">Aucune transaction pour cette caisse</span>
        </div>
      ) : (
        <table>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              {['Type', 'Motif', 'Montant', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                  fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.transactions.map((t, i) => (
              <tr key={i} className="ft-tr"
                style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: t.type === 'entree' ? '#F0FDF4' : '#FEF2F2',
                    color: t.type === 'entree' ? '#16A34A' : '#DC2626',
                    padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700'
                  }}>
                    <span style={{ fontSize: '10px' }}>{t.type === 'entree' ? '▲' : '▼'}</span>
                    {t.type === 'entree' ? 'Entrée' : 'Sortie'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: '#374151' }}>{t.motif || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: '800',
                  color: t.type === 'entree' ? '#16A34A' : '#DC2626' }}>
                  {t.type === 'entree' ? '+' : '−'} {fmt(t.montant)}
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#94A3B8', marginLeft: '3px' }}>FCFA</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#94A3B8' }}>{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data?.nb_pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
              background: '#fff', fontSize: '13px', fontWeight: '600',
              color: page === 1 ? '#CBD5E1' : '#1B3A6B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            ← Préc.
          </button>
          <span style={{ fontSize: '13px', color: '#64748B' }}>Page {page} / {data.nb_pages}</span>
          <button onClick={() => setPage(p => Math.min(data.nb_pages, p + 1))} disabled={page === data.nb_pages}
            style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '7px',
              background: '#fff', fontSize: '13px', fontWeight: '600',
              color: page === data.nb_pages ? '#CBD5E1' : '#1B3A6B',
              cursor: page === data.nb_pages ? 'not-allowed' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Sessions panel (RAF — lecture seule) ───────────────────────────────── */
function SessionsPanel({ caisse }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [nbPages, setNbPages]   = useState(1)
  const [rapport, setRapport]   = useState(null)  // session sélectionnée pour rapport
  const [rapportData, setRapportData] = useState(null)

  useEffect(() => { setPage(1); setRapport(null); setRapportData(null) }, [caisse.id])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`${API}/caisses/${caisse.id}/sessions?page=${page}&limit=10`, { headers: getHeaders() })
        const data = await res.json()
        if (res.ok) { setSessions(data.sessions); setNbPages(data.nb_pages) }
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [caisse.id, page])

  const loadRapport = async (s) => {
    setRapport(s)
    setRapportData(null)
    try {
      const res  = await fetch(`${API}/caisses/${caisse.id}/sessions/${s.id}/rapport`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setRapportData(data)
    } catch {}
  }

  const STATUT_S = {
    ouverte:   { bg: '#F0FDF4', color: '#16A34A', label: 'Ouverte' },
    cloturee:  { bg: '#F1F5F9', color: '#64748B', label: 'Clôturée' },
  }

  return (
    <div className="ft-card" style={{ padding: '22px 26px', marginTop: '16px', borderTop: '3px solid #7C3AED' }}>
      <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B',
        display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📅</span> Sessions de caisse — {caisse.nom}
      </h3>

      {loading ? (
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
          <div className="ft-spinner" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="ft-empty" style={{ padding: '24px 0' }}>
          <span className="ft-empty-sub">Aucune session enregistrée pour cette caisse</span>
        </div>
      ) : (
        <table>
          <thead>
            <tr style={{ background: '#F5F3FF', borderBottom: '2px solid #DDD6FE' }}>
              {['Date', 'Statut', 'Entrées', 'Sorties', 'Solde jour', 'Déposé banque', 'Caissier', 'Rapport'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                  fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase',
                  letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const st = STATUT_S[s.statut] || STATUT_S.cloturee
              return (
                <tr key={s.id} className="ft-tr"
                  style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap' }}>
                    {s.date_session}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: st.bg, color: st.color, padding: '3px 10px',
                      borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>
                    +{fmt(s.total_entrees)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>
                    -{fmt(s.total_sorties)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: '800',
                    color: s.solde_jour >= 0 ? '#16A34A' : '#DC2626' }}>
                    {fmt(s.solde_jour)} FCFA
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: '#64748B' }}>
                    {s.montant_depose_banque != null ? `${fmt(s.montant_depose_banque)} FCFA` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                    {s.caissier_ouverture || '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => loadRapport(s)}
                      style={{ padding: '4px 10px', background: '#F5F3FF', color: '#7C3AED',
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: '700' }}>
                      Voir →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {nbPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '5px 12px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
              background: '#fff', fontSize: '12px', fontWeight: '600',
              color: page === 1 ? '#CBD5E1' : '#1B3A6B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            ← Préc.
          </button>
          <span style={{ fontSize: '12px', color: '#64748B', padding: '5px' }}>
            {page} / {nbPages}
          </span>
          <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
            style={{ padding: '5px 12px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
              background: '#fff', fontSize: '12px', fontWeight: '600',
              color: page === nbPages ? '#CBD5E1' : '#1B3A6B', cursor: page === nbPages ? 'not-allowed' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}

      {/* Rapport détaillé */}
      {rapport && (
        <div style={{ marginTop: '20px', border: '1.5px solid #DDD6FE', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#7C3AED' }}>
              Rapport — {rapport.date_session}
            </h4>
            <button onClick={() => { setRapport(null); setRapportData(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px' }}>
              ✕
            </button>
          </div>
          {!rapportData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="ft-spinner" />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Entrées', value: rapportData.recap.total_entrees, color: '#16A34A', bg: '#F0FDF4' },
                  { label: 'Sorties', value: rapportData.recap.total_sorties, color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Solde jour', value: rapportData.recap.solde_jour, color: '#7C3AED', bg: '#F5F3FF' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ flex: 1, background: bg, borderRadius: '8px',
                    padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600',
                      textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color }}>
                      {fmt(value)} FCFA
                    </div>
                  </div>
                ))}
              </div>
              {rapportData.paiements.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A',
                    marginBottom: '8px', textTransform: 'uppercase' }}>
                    Encaissements ({rapportData.paiements.length})
                  </div>
                  {rapportData.paiements.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                      <span style={{ color: '#475569' }}>{p.reference} — {p.motif || 'Paiement'}</span>
                      <span style={{ fontWeight: '700', color: '#16A34A' }}>+{fmt(p.montant)} FCFA</span>
                    </div>
                  ))}
                </div>
              )}
              {rapportData.depenses.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626',
                    marginBottom: '8px', textTransform: 'uppercase' }}>
                    Décaissements ({rapportData.depenses.length})
                  </div>
                  {rapportData.depenses.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                      <span style={{ color: '#475569' }}>{d.motif}</span>
                      <span style={{ fontWeight: '700', color: '#DC2626' }}>-{fmt(d.montant)} FCFA</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Page principale
   ══════════════════════════════════════════════════════════ */
export default function RafCaisses() {
  const [caisses, setCaisses]           = useState([])
  const [kpis, setKpis]                 = useState({ solde_total: 0, nb_actives: 0, nb_total: 0 })
  const [loading, setLoading]           = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreType, setFiltreType]     = useState('')
  const [modal, setModal]               = useState(null)
  const [selectedCaisse, setSelectedCaisse] = useState(null)
  const [affectations, setAffectations]     = useState([])
  const [comptables, setComptables]         = useState([])
  const [showAffModal, setShowAffModal]     = useState(false)
  const [filtreAff, setFiltreAff]           = useState('actif')

  const fetchAffectations = useCallback(async () => {
    try {
      const params = filtreAff === 'actif' ? '?actif=true' : ''
      const res    = await fetch(`${API}/affectations${params}`, { headers: getHeaders() })
      const data   = await res.json()
      if (res.ok) setAffectations(data.affectations || [])
    } catch {}
  }, [filtreAff])

  const fetchComptables = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/utilisateurs?role=comptable`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setComptables(data.utilisateurs || [])
    } catch {}
  }, [])

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
        setSelectedCaisse(prev => {
          if (prev) { const found = data.caisses.find(c => c.id === prev.id); if (found) return found }
          return data.caisses.find(c => c.type_caisse === 'principale') || data.caisses[0] || null
        })
      }
    } catch {}
    finally { setLoading(false) }
  }, [filtreStatut, filtreType])

  useEffect(() => { fetchCaisses() },      [fetchCaisses])
  useEffect(() => { fetchAffectations() }, [fetchAffectations])
  useEffect(() => { fetchComptables() },   [fetchComptables])

  const handleToggle = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Activer / désactiver cette caisse ?')) return
    try {
      const res = await fetch(`${API}/caisses/${id}/toggle`, { method: 'PUT', headers: getHeaders() })
      if (res.ok) fetchCaisses()
    } catch {}
  }

  const handleSupprimer = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette caisse ? (solde doit être à 0)')) return
    try {
      const res  = await fetch(`${API}/caisses/${id}`, { method: 'DELETE', headers: getHeaders() })
      const data = await res.json()
      if (!res.ok) { alert(data.message); return }
      fetchCaisses()
    } catch {}
  }

  const handleTerminerAff = async (id) => {
    if (!confirm('Terminer cette affectation ?')) return
    try {
      const res = await fetch(`${API}/affectations/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (res.ok) fetchAffectations()
      else { const d = await res.json(); alert(d.message) }
    } catch {}
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #2563EB 100%)',
          padding: '28px 32px 24px', color: '#fff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>Gestion des Caisses</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                {kpis.nb_actives} caisse{kpis.nb_actives !== 1 ? 's' : ''} active{kpis.nb_actives !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => setModal('creer')}
              style={{ padding: '9px 20px', background: '#fff', color: '#1D4ED8',
                border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              + Nouvelle caisse
            </button>
          </div>
        </div>

        <div className="ft-page" style={{ padding: '28px 32px' }}>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Solde total',     value: `${fmt(kpis.solde_total)} FCFA`, color: '#16A34A', bg: '#F0FDF4', icon: '💰' },
              { label: 'Caisses actives', value: kpis.nb_actives,                  color: '#1D4ED8', bg: '#EFF6FF', icon: '✅' },
              { label: 'Total caisses',  value: kpis.nb_total,                    color: '#64748B', bg: '#F8FAFC', icon: '🏦' },
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
                <div style={{ fontSize: typeof value === 'string' ? '17px' : '28px',
                  fontWeight: '800', color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="ft-card" style={{ padding: '14px 18px', marginBottom: '20px',
            display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', background: '#fff' }}>
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
            <select value={filtreType} onChange={e => setFiltreType(e.target.value)}
              style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', background: '#fff' }}>
              <option value="">Tous les types</option>
              <option value="principale">Principale</option>
              <option value="secondaire">Secondaire</option>
              <option value="projet">Projet</option>
            </select>
          </div>

          {/* Cartes Caisses */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {[1,2,3].map(i => (
                <div key={i} className="ft-skeleton" style={{ height: '160px', borderRadius: '14px' }} />
              ))}
            </div>
          ) : caisses.length === 0 ? (
            <div className="ft-empty ft-card" style={{ padding: '60px 20px' }}>
              <span className="ft-empty-icon">🏦</span>
              <span className="ft-empty-title">Aucune caisse trouvée</span>
              <span className="ft-empty-sub">Créez une première caisse pour commencer</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {caisses.map(c => {
                  const ti = TYPE_INFO[c.type_caisse] || TYPE_INFO.secondaire
                  const isSelected = selectedCaisse?.id === c.id
                  return (
                    <div key={c.id} onClick={() => setSelectedCaisse(c)}
                      style={{
                        background: '#fff', borderRadius: '14px', padding: '20px 22px',
                        boxShadow: isSelected
                          ? `0 0 0 2.5px ${ti.color}, 0 4px 16px rgba(0,0,0,0.08)`
                          : '0 1px 4px rgba(0,0,0,0.06)',
                        border: `1px solid ${isSelected ? ti.color : '#F1F5F9'}`,
                        borderTop: `4px solid ${ti.color}`,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.18s, border-color 0.18s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{c.nom}</span>
                            {isSelected && (
                              <span style={{ background: ti.bg, color: ti.color,
                                fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px' }}>
                                ✓
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {c.description || 'Pas de description'}
                          </div>
                        </div>
                        <span style={{ background: ti.bg, color: ti.color, padding: '3px 8px',
                          borderRadius: '6px', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                          {ti.label}
                        </span>
                      </div>

                      <div style={{ background: '#F8FAFC', borderRadius: '9px', padding: '11px 14px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600',
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Solde actuel</div>
                        <div style={{ fontSize: '20px', fontWeight: '800',
                          color: c.solde_actuel > 0 ? '#16A34A' : '#DC2626' }}>
                          {fmt(c.solde_actuel)}
                          <span style={{ fontSize: '12px', fontWeight: '500', color: '#94A3B8', marginLeft: '4px' }}>FCFA</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: c.statut === 'active' ? '#F0FDF4' : '#FEF2F2',
                          color: c.statut === 'active' ? '#16A34A' : '#DC2626',
                          padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                          <span className="ft-dot" style={{
                            background: c.statut === 'active' ? '#16A34A' : '#DC2626',
                            animationPlayState: c.statut === 'active' ? 'running' : 'paused'
                          }} />
                          {c.statut === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={e => { e.stopPropagation(); setModal(c) }} title="Modifier"
                            style={{ padding: '5px 8px', background: '#EFF6FF', border: 'none',
                              borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                          <button onClick={e => handleToggle(e, c.id)} title="Activer/Désactiver"
                            style={{ padding: '5px 8px', background: '#FFF7ED', border: 'none',
                              borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            {c.statut === 'active' ? '⏸' : '▶'}
                          </button>
                          <button onClick={e => handleSupprimer(e, c.id)} title="Supprimer"
                            style={{ padding: '5px 8px', background: '#FEF2F2', border: 'none',
                              borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Transactions + Sessions de la caisse sélectionnée */}
              {selectedCaisse && (
                <>
                  <TransactionsList caisse={selectedCaisse} />
                  <SessionsPanel caisse={selectedCaisse} />
                </>
              )}
            </>
          )}

          {/* ── Affectations ── */}
          <div style={{ marginTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1B3A6B' }}>
                  Affectations des caissiers
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                  Planifiez quel caissier travaille sur quelle caisse
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select value={filtreAff} onChange={e => setFiltreAff(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', background: '#fff' }}>
                  <option value="actif">Actives seulement</option>
                  <option value="tout">Toutes</option>
                </select>
                <button onClick={() => setShowAffModal(true)}
                  style={{ padding: '9px 18px', background: '#7C3AED', color: '#fff',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  + Nouvelle affectation
                </button>
              </div>
            </div>

            <div className="ft-card" style={{ overflow: 'hidden' }}>
              {affectations.length === 0 ? (
                <div className="ft-empty">
                  <span className="ft-empty-icon">👤</span>
                  <span className="ft-empty-title">Aucune affectation{filtreAff === 'actif' ? ' active' : ''}</span>
                  <span className="ft-empty-sub">Cliquez sur « Nouvelle affectation » pour commencer</span>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      {['Caissier', 'Caisse assignée', 'Début', 'Fin', 'Statut', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                          fontWeight: '700', color: '#64748B', textTransform: 'uppercase',
                          letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affectations.map((a, i) => (
                      <tr key={a.id} className="ft-tr"
                        style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{a.caissier}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{a.caissier_email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px',
                            borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>
                            🏦 {a.caisse}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{a.date_debut}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {a.date_fin || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Illimitée</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: a.actif ? '#F0FDF4' : '#F8FAFC',
                            color: a.actif ? '#16A34A' : '#94A3B8',
                            padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%',
                              background: a.actif ? '#16A34A' : '#CBD5E1' }} />
                            {a.actif ? 'Active' : 'Terminée'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {a.actif && (
                            <button onClick={() => handleTerminerAff(a.id)}
                              style={{ padding: '5px 12px', background: '#FEF2F2', color: '#DC2626',
                                border: 'none', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '700' }}>
                              ⏹ Terminer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <ModalCaisse
          caisse={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchCaisses() }}
        />
      )}

      {showAffModal && (
        <ModalAffectation
          caisses={caisses} comptables={comptables}
          onClose={() => setShowAffModal(false)}
          onSave={() => { setShowAffModal(false); fetchAffectations() }}
        />
      )}
    </div>
  )
}
