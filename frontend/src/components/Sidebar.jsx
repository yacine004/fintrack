import { useNavigate, useLocation } from 'react-router-dom'

const menuRAF = [
  { icon: '📊', label: 'Tableau de bord',  path: '/raf/dashboard' },
  { icon: '👥', label: 'Utilisateurs',     path: '/raf/utilisateurs' },
  { icon: '🏦', label: 'Caisses',          path: '/raf/caisses' },
  { icon: '🎓', label: 'Étudiants',        path: '/raf/etudiants' },
  { icon: '💳', label: 'Paiements',        path: '/raf/paiements' },
  { icon: '💰', label: 'Dépenses',         path: '/raf/depenses' },
  { icon: '📋', label: 'Budget',           path: '/raf/budgets' },
  { icon: '📈', label: 'Rapports',         path: '/raf/rapports' },
  { icon: '💬', label: 'Messagerie',       path: '/raf/messagerie' },
]

const menuComptable = [
  { icon: '📊', label: 'Tableau de bord',  path: '/comptable/dashboard' },
  { icon: '🎓', label: 'Étudiants',        path: '/comptable/etudiants' },
  { icon: '💳', label: 'Paiements',        path: '/comptable/paiements' },
  { icon: '💰', label: 'Dépenses',         path: '/comptable/depenses' },
  { icon: '💬', label: 'Messagerie',       path: '/comptable/messagerie' },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')
  const menu      = user.role === 'raf' ? menuRAF : menuComptable
  const profilPath = user.role === 'raf' ? '/raf/profil' : '/comptable/profil'

  const logout = () => { localStorage.clear(); navigate('/') }

  return (
    <div style={{ width:'210px', minHeight:'100vh', background:'#1B3A6B',
      display:'flex', flexDirection:'column', flexShrink:0 }}>

      {/* Logo */}
      <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ background:'#2D8CFF', borderRadius:'8px', width:'36px',
            height:'36px', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'18px' }}>📈</div>
          <div>
            <div style={{ color:'#fff', fontWeight:'800', fontSize:'16px' }}>
              Fin<span style={{ color:'#2D8CFF' }}>Track</span>
            </div>
            <div style={{ color:'#93C5FD', fontSize:'9px', letterSpacing:'1px' }}>
              GESTION FINANCIÈRE
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
        {menu.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <div key={item.path} onClick={() => navigate(item.path)}
              style={{ display:'flex', alignItems:'center', gap:'10px',
                padding:'9px 12px', borderRadius:'8px', marginBottom:'2px',
                cursor:'pointer',
                background: isActive ? 'rgba(45,140,255,0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #2D8CFF' : '3px solid transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize:'13px', fontWeight: isActive ? '600' : '400' }}>
              <span style={{ fontSize:'15px' }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Profil + déconnexion */}
      <div style={{ padding:'16px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
        <div onClick={() => navigate(profilPath)}
          style={{ display:'flex', alignItems:'center', gap:'10px',
            marginBottom:'12px', cursor:'pointer', padding:'6px 8px',
            borderRadius:'8px', transition:'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <div style={{ width:'36px', height:'36px', borderRadius:'50%',
            background:'#2D8CFF', display:'flex', alignItems:'center',
            justifyContent:'center', color:'#fff', fontWeight:'700',
            fontSize:'12px', flexShrink:0 }}>
            {user.prenom?.[0]}{user.nom?.[0]}
          </div>
          <div>
            <div style={{ color:'#fff', fontSize:'12px', fontWeight:'600' }}>
              {user.prenom} {user.nom}
            </div>
            <div style={{ color:'#93C5FD', fontSize:'10px', textTransform:'capitalize' }}>
              {user.role} · Mon profil
            </div>
          </div>
        </div>
        <button onClick={logout}
          style={{ width:'100%', padding:'8px', background:'rgba(239,68,68,0.15)',
            color:'#FCA5A5', border:'1px solid rgba(239,68,68,0.3)',
            borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>
          🚪 Déconnexion
        </button>
      </div>
    </div>
  )
}
