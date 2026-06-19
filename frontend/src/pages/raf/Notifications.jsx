import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const PRIORITE_CONFIG = {
  critique: { label: 'Critique', bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5', dot: '#DC2626', order: 1 },
  haute:    { label: 'Haute',    bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', dot: '#EA580C', order: 2 },
  normale:  { label: 'Normale',  bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#2563EB', order: 3 },
  basse:    { label: 'Basse',    bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', dot: '#94A3B8', order: 4 },
}

const TYPE_CONFIG = {
  alerte_budget: { icon: '🚨', label: 'Alerte budget' },
  message:       { icon: '✉️',  label: 'Message' },
  paiement:      { icon: '💳', label: 'Paiement' },
  depense:       { icon: '💸', label: 'Dépense' },
  info:          { icon: 'ℹ️',  label: 'Information' },
}

export default function CentreNotifications() {
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('user') || '{}')
  const [notifs, setNotifs]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtrePrio, setFiltrePrio] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [total, setTotal]           = useState(0)
  const [nbNonLues, setNbNonLues]   = useState(0)

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (filtreStatut === 'non_lues') params.set('non_lues', 'true')
      const res  = await fetch(`${API}/notifications?${params}`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setNotifs(data.notifications)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        setNbNonLues(data.nb_non_lues)
      }
    } catch {}
    finally { setLoading(false) }
  }, [page, filtreStatut])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const handleMarquerLu = async (id, type) => {
    await fetch(`${API}/notifications/${id}/lu`, { method: 'PUT', headers: getHeaders() }).catch(() => {})
    fetchNotifs()
    if (type === 'message') {
      navigate(user.role === 'raf' ? '/raf/messagerie' : '/comptable/messagerie')
    }
  }

  const handleToutLire = async () => {
    await fetch(`${API}/notifications/tout-lire`, { method: 'PUT', headers: getHeaders() }).catch(() => {})
    fetchNotifs()
  }

  const handleSupprimerLues = async () => {
    const nbLues = notifs.filter(n => n.lu).length
    if (nbLues === 0) return
    if (!window.confirm(`Supprimer définitivement les ${nbLues} notification(s) lue(s) ?`)) return
    await fetch(`${API}/notifications/lues`, { method: 'DELETE', headers: getHeaders() }).catch(() => {})
    fetchNotifs()
  }

  const filtered = notifs
    .filter(n => !filtrePrio || n.priorite === filtrePrio)
    .filter(n => !filtreType || n.type === filtreType)
    .sort((a, b) => {
      const pa = PRIORITE_CONFIG[a.priorite]?.order ?? 99
      const pb = PRIORITE_CONFIG[b.priorite]?.order ?? 99
      return pa - pb
    })

  const PrioriteBadge = ({ priorite }) => {
    const cfg = PRIORITE_CONFIG[priorite] || PRIORITE_CONFIG.normale
    return (
      <span style={{
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>
        {priorite === 'critique' ? '🔴' : priorite === 'haute' ? '🟠' : priorite === 'normale' ? '🔵' : '⚪'} {cfg.label}
      </span>
    )
  }

  const stats = {
    critique: notifs.filter(n => n.priorite === 'critique' && !n.lu).length,
    haute:    notifs.filter(n => n.priorite === 'haute'    && !n.lu).length,
    normale:  notifs.filter(n => n.priorite === 'normale'  && !n.lu).length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>
              🔔 Centre de Notifications
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              {nbNonLues} notification{nbNonLues > 1 ? 's' : ''} non lue{nbNonLues > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {nbNonLues > 0 && (
              <button onClick={handleToutLire}
                style={{ padding: '10px 20px', background: '#1B3A6B', color: '#fff',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                ✅ Tout marquer comme lu
              </button>
            )}
            {notifs.some(n => n.lu) && (
              <button onClick={handleSupprimerLues}
                style={{ padding: '10px 20px', background: '#fff', color: '#DC2626',
                  border: '1.5px solid #FECACA', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600' }}>
                🗑️ Supprimer les lues
              </button>
            )}
          </div>
        </div>

        {/* Cartes résumé priorité */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { key: 'critique', icon: '🔴', label: 'Critiques non lues', count: stats.critique },
            { key: 'haute',    icon: '🟠', label: 'Hautes non lues',    count: stats.haute },
            { key: 'normale',  icon: '🔵', label: 'Normales non lues',  count: stats.normale },
          ].map(s => {
            const cfg = PRIORITE_CONFIG[s.key]
            return (
              <div key={s.key} onClick={() => { setFiltrePrio(filtrePrio === s.key ? '' : s.key); setPage(1) }}
                style={{
                  background: '#fff', borderRadius: '12px', padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
                  border: `2px solid ${filtrePrio === s.key ? cfg.border : 'transparent'}`,
                  transition: 'border 0.15s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: cfg.color }}>{s.count}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{s.label}</div>
                  </div>
                  <span style={{ fontSize: '28px' }}>{s.icon}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filtres */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px',
          marginBottom: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
            style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
            <option value="">Toutes</option>
            <option value="non_lues">Non lues</option>
          </select>
          <select value={filtrePrio} onChange={e => { setFiltrePrio(e.target.value); setPage(1) }}
            style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
            <option value="">Toutes les priorités</option>
            {Object.entries(PRIORITE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filtreType} onChange={e => { setFiltreType(e.target.value); setPage(1) }}
            style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          {(filtrePrio || filtreType || filtreStatut) && (
            <button onClick={() => { setFiltrePrio(''); setFiltreType(''); setFiltreStatut(''); setPage(1) }}
              style={{ padding: '8px 12px', background: '#F1F5F9', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', color: '#64748B' }}>✕ Effacer</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#94A3B8' }}>
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              ⏳ Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
              Aucune notification correspondante
            </div>
          ) : filtered.map(n => {
            const pCfg = PRIORITE_CONFIG[n.priorite] || PRIORITE_CONFIG.normale
            const tCfg = TYPE_CONFIG[n.type] || { icon: 'ℹ️', label: n.type }
            return (
              <div key={n.id}
                style={{
                  background: '#fff', borderRadius: '12px', padding: '16px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${n.lu ? '#E2E8F0' : pCfg.dot}`,
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  opacity: n.lu ? 0.75 : 1, transition: 'opacity 0.2s'
                }}>

                {/* Icône type */}
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                  background: pCfg.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px' }}>
                  {tCfg.icon}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <PrioriteBadge priorite={n.priorite} />
                    <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 8px',
                      borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                      {tCfg.label}
                    </span>
                    {!n.lu && (
                      <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px',
                        borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                        Nouveau
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: n.lu ? '400' : '600',
                    lineHeight: 1.5, marginBottom: '4px' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{n.date_creation}</div>
                </div>

                {/* Action */}
                {!n.lu && (
                  <button onClick={() => handleMarquerLu(n.id, n.type)}
                    style={{ padding: '6px 14px',
                      background: n.type === 'message' ? '#EFF6FF' : '#F1F5F9',
                      border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '12px',
                      color: n.type === 'message' ? '#1B3A6B' : '#475569',
                      fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {n.type === 'message' ? '✉️ Voir le message' : '✓ Lu'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {nbPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Préc.</button>
            <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>Page {page} / {nbPages}</span>
            <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
              style={{ padding: '8px 16px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
                background: '#fff', cursor: page === nbPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suiv. →</button>
          </div>
        )}
      </div>
    </div>
  )
}
