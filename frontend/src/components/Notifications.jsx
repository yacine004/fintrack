import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const PRIORITE_BADGE = {
  critique: { dot: '#DC2626', bg: '#FEF2F2', color: '#DC2626', label: 'Critique' },
  haute:    { dot: '#EA580C', bg: '#FFF7ED', color: '#EA580C', label: 'Haute' },
  normale:  { dot: '#2563EB', bg: '#EFF6FF', color: '#2563EB', label: 'Normale' },
  basse:    { dot: '#94A3B8', bg: '#F8FAFC', color: '#64748B', label: 'Basse' },
}

const TYPE_ICONS = {
  alerte_budget: '🚨',
  message:       '✉️',
  paiement:      '💳',
  depense:       '💸',
  info:          'ℹ️',
}

export default function Notifications() {
  const [notifs, setNotifs]       = useState([])
  const [nbNonLues, setNbNonLues] = useState(0)
  const [open, setOpen]           = useState(false)
  const ref                       = useRef(null)
  const navigate                  = useNavigate()

  const fetchNotifs = async () => {
    try {
      const res  = await fetch(`${API}/notifications?limit=10`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) {
        setNotifs(data.notifications)
        setNbNonLues(data.nb_non_lues)
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarquerLu = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/lu`, { method: 'PUT', headers: getHeaders() })
      fetchNotifs()
    } catch {}
  }

  const handleToutLire = async () => {
    try {
      await fetch(`${API}/notifications/tout-lire`, { method: 'PUT', headers: getHeaders() })
      fetchNotifs()
    } catch {}
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const notifPath = user.role === 'raf' ? '/raf/notifications' : '/comptable/notifications'

  const hasCritique = notifs.some(n => n.priorite === 'critique' && !n.lu)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bouton cloche */}
      <button onClick={() => setOpen(!open)}
        style={{ position: 'relative', border: 'none', cursor: 'pointer', padding: '8px',
          borderRadius: '8px', fontSize: '22px', lineHeight: 1,
          background: open ? '#EFF6FF' : 'transparent' }}>
        🔔
        {nbNonLues > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: hasCritique ? '#DC2626' : '#2563EB',
            color: '#fff', borderRadius: '50%',
            width: '18px', height: '18px', fontSize: '10px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff'
          }}>
            {nbNonLues > 9 ? '9+' : nbNonLues}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '48px',
          width: '380px', background: '#fff', borderRadius: '14px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000,
          border: '1px solid #E2E8F0', overflow: 'hidden'
        }}>
          {/* En-tête */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#F8FAFC' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1B3A6B' }}>
              🔔 Notifications {nbNonLues > 0 && (
                <span style={{ background: hasCritique ? '#DC2626' : '#2563EB',
                  color: '#fff', borderRadius: '20px', padding: '1px 7px',
                  fontSize: '11px', marginLeft: '6px' }}>
                  {nbNonLues}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {nbNonLues > 0 && (
                <button onClick={handleToutLire}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: '#2563EB', fontWeight: '600' }}>
                  Tout lire
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                Aucune notification
              </div>
            ) : notifs.map(n => {
              const pCfg = PRIORITE_BADGE[n.priorite] || PRIORITE_BADGE.normale
              return (
                <div key={n.id} onClick={() => !n.lu && handleMarquerLu(n.id)}
                  style={{
                    padding: '11px 18px', borderBottom: '1px solid #F8FAFC',
                    background: n.lu ? '#fff' : '#EFF6FF',
                    cursor: n.lu ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    borderLeft: `3px solid ${n.lu ? 'transparent' : pCfg.dot}`
                  }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>
                    {TYPE_ICONS[n.type] || 'ℹ️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badge priorité */}
                    {!n.lu && (
                      <span style={{
                        background: pCfg.bg, color: pCfg.color,
                        fontSize: '10px', fontWeight: '700', padding: '1px 7px',
                        borderRadius: '20px', marginBottom: '4px', display: 'inline-block'
                      }}>
                        {n.priorite === 'critique' ? '🔴' : n.priorite === 'haute' ? '🟠' : '🔵'} {pCfg.label}
                      </span>
                    )}
                    <div style={{ fontSize: '13px', color: '#1E293B',
                      fontWeight: n.lu ? '400' : '600', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                      {n.date_creation}
                    </div>
                  </div>
                  {!n.lu && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                      background: pCfg.dot, flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Pied — voir tout */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9',
            background: '#F8FAFC', textAlign: 'center' }}>
            <button onClick={() => { setOpen(false); navigate(notifPath) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', color: '#2563EB', fontWeight: '600' }}>
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
