import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

const menuRAF = [
  { icon: '📊', label: 'Tableau de bord',  path: '/raf/dashboard' },
  { icon: '👥', label: 'Utilisateurs',     path: '/raf/utilisateurs' },
  { icon: '🏦', label: 'Caisses',          path: '/raf/caisses' },
  { icon: '🎓', label: 'Étudiants',        path: '/raf/etudiants' },
  { icon: '📝', label: 'Inscriptions',     path: '/raf/inscriptions' },
  { icon: '💳', label: 'Paiements',        path: '/raf/paiements' },
  { icon: '🧾', label: 'Frais annexes',    path: '/raf/frais-annexes' },
  { icon: '💰', label: 'Dépenses',         path: '/raf/depenses' },
  { icon: '📋', label: 'Budget',           path: '/raf/budgets' },
  { icon: '📈', label: 'Rapports',         path: '/raf/rapports' },
  { icon: '🚨', label: 'Alertes',           path: '/raf/alertes' },
  { icon: '🎓', label: 'Autorisations',    path: '/raf/autorisations' },
  { icon: '💬', label: 'Messagerie',       path: '/raf/messagerie' },
  { icon: '🔍', label: "Journal d'audit",  path: '/raf/audit' },
  { icon: '🔔', label: 'Notifications',    path: '/raf/notifications' },
  { icon: '⚙️', label: 'Paramétrage',      path: '/raf/parametrage' },
]

const menuComptable = [
  { icon: '📊', label: 'Tableau de bord',  path: '/comptable/dashboard' },
  { icon: '🏦', label: 'Caisses',          path: '/comptable/caisses' },
  { icon: '🎓', label: 'Étudiants',        path: '/comptable/etudiants' },
  { icon: '💳', label: 'Paiements',        path: '/comptable/paiements' },
  { icon: '🧾', label: 'Frais annexes',    path: '/comptable/frais-annexes' },
  { icon: '💰', label: 'Dépenses',         path: '/comptable/depenses' },
  { icon: '💬', label: 'Messagerie',       path: '/comptable/messagerie' },
  { icon: '🔔', label: 'Notifications',    path: '/comptable/notifications' },
]

export default function Sidebar() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const user       = JSON.parse(localStorage.getItem('user') || '{}')
  const menu       = user.role === 'raf' ? menuRAF : menuComptable
  const profilPath = user.role === 'raf' ? '/raf/profil' : '/comptable/profil'
  const isMobile   = useIsMobile()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const [nbMessages, setNbMessages]   = useState(0)
  const [nbNotifs,   setNbNotifs]     = useState(0)

  const logout = () => { localStorage.clear(); navigate('/') }

  // Compteurs non lus — rechargés à chaque navigation + toutes les 30s
  useEffect(() => {
    const charger = async () => {
      try {
        const [rMsg, rNotif] = await Promise.all([
          fetch(`${API}/messages/recus?limit=1`, { headers: H() }),
          fetch(`${API}/notifications?limit=1`,  { headers: H() }),
        ])
        if (rMsg.ok)   { const d = await rMsg.json();   setNbMessages(d.nb_non_lus  || 0) }
        if (rNotif.ok) { const d = await rNotif.json(); setNbNotifs(d.nb_non_lues   || 0) }
      } catch { /* réseau indisponible */ }
    }
    charger()
    const id = setInterval(charger, 30000)
    return () => clearInterval(id)
  }, [location.pathname])

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Add paddingTop to parent flex container on mobile so content clears the top bar.
  // box-sizing: border-box ensures the 56px is absorbed inside min-height (not added on top).
  // min-height: 100dvh uses dynamic viewport height (excludes browser chrome on iOS Safari).
  useEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    if (isMobile) {
      parent.style.paddingTop = '56px'
      parent.style.boxSizing = 'border-box'
      parent.style.minHeight = '100dvh'
    } else {
      parent.style.paddingTop = ''
      parent.style.boxSizing = ''
      parent.style.minHeight = ''
    }
    return () => {
      if (parent) {
        parent.style.paddingTop = ''
        parent.style.boxSizing = ''
        parent.style.minHeight = ''
      }
    }
  }, [isMobile])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && open) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  // Badge rouge générique
  const Badge = ({ count }) => count > 0 ? (
    <span style={{
      marginLeft: 'auto', background: '#EF4444', color: '#fff',
      borderRadius: '10px', fontSize: '10px', fontWeight: '700',
      padding: '1px 6px', minWidth: '18px', textAlign: 'center', lineHeight: '16px',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  ) : null

  // Shared: menu item list
  const menuItems = menu.map((item) => {
    const isActive  = location.pathname === item.path
    const isMsg     = item.path.endsWith('/messagerie')
    const isNotif   = item.path.endsWith('/notifications')
    const badgeCount = isMsg ? nbMessages : isNotif ? nbNotifs : 0
    return (
      <div key={item.path} onClick={() => navigate(item.path)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
          cursor: 'pointer',
          background: isActive ? 'rgba(45,140,255,0.2)' : 'transparent',
          borderLeft: isActive ? '3px solid #2D8CFF' : '3px solid transparent',
          color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
          fontSize: '13px', fontWeight: isActive ? '600' : '400',
        }}>
        <span style={{ fontSize: '15px' }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        <Badge count={badgeCount} />
      </div>
    )
  })

  // Shared: profile + logout block
  const profileBlock = (
    <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div onClick={() => navigate(profilPath)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '12px', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
        }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: '#2D8CFF', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: '700',
          fontSize: '12px', flexShrink: 0,
        }}>
          {user.prenom?.[0]}{user.nom?.[0]}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
            {user.prenom} {user.nom}
          </div>
          <div style={{ color: '#93C5FD', fontSize: '10px', textTransform: 'capitalize' }}>
            {user.role} · Mon profil
          </div>
        </div>
      </div>
      <button onClick={logout} style={{
        width: '100%', padding: '8px',
        background: 'rgba(239,68,68,0.15)', color: '#FCA5A5',
        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px',
        fontSize: '12px', cursor: 'pointer', fontWeight: '600',
      }}>
        🚪 Déconnexion
      </button>
    </div>
  )

  // ── MOBILE ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div ref={ref} style={{ width: 0, flexShrink: 0 }}>
        {/* Fixed top bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          background: '#1B3A6B', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          zIndex: 300, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          <button onClick={() => setOpen(!open)} style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: '22px', cursor: 'pointer', padding: '4px 8px',
            lineHeight: 1, display: 'flex', alignItems: 'center',
          }}>
            {open ? '✕' : '☰'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: '#2D8CFF', borderRadius: '6px', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>📈</div>
            <span style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>
              Fin<span style={{ color: '#2D8CFF' }}>Track</span>
            </span>
          </div>

          {/* Notifications bell (right side) */}
          <div style={{ width: '40px' }} />
        </div>

        {/* Overlay */}
        {open && (
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 298,
          }} />
        )}

        {/* Drawer */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
          background: '#1B3A6B', zIndex: 299, display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease', overflowY: 'auto',
        }}>
          {/* Logo in drawer */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: '#2D8CFF', borderRadius: '8px', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>📈</div>
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>
                  Fin<span style={{ color: '#2D8CFF' }}>Track</span>
                </div>
                <div style={{ color: '#93C5FD', fontSize: '9px', letterSpacing: '1px' }}>
                  GESTION FINANCIÈRE
                </div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            {menuItems}
          </nav>

          {profileBlock}
        </div>
      </div>
    )
  }

  // ── DESKTOP ─────────────────────────────────────────────
  return (
    <div style={{
      width: '210px', minHeight: '100dvh', background: '#1B3A6B',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#2D8CFF', borderRadius: '8px', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>📈</div>
          <div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>
              Fin<span style={{ color: '#2D8CFF' }}>Track</span>
            </div>
            <div style={{ color: '#93C5FD', fontSize: '9px', letterSpacing: '1px' }}>
              GESTION FINANCIÈRE
            </div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {menuItems}
      </nav>

      {profileBlock}
    </div>
  )
}
