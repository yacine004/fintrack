import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate(res.data.user.role === 'raf' ? '/raf/dashboard' : '/comptable/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'Inter, sans-serif' }}>

      {/* GAUCHE */}
      <div style={{ width:'45%', background:'#1B3A6B', display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px' }}>
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <div style={{ background:'#2D8CFF', borderRadius:'16px', width:'68px',
            height:'68px', display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 20px', fontSize:'32px' }}>📈</div>
          <h1 style={{ color:'#fff', fontSize:'38px', fontWeight:'800', margin:0 }}>
            Fin<span style={{ color:'#2D8CFF' }}>Track</span>
          </h1>
          <p style={{ color:'#93C5FD', letterSpacing:'3px', fontSize:'11px', marginTop:'6px' }}>
            GESTION FINANCIÈRE SCOLAIRE
          </p>
        </div>
        {[
          ['✓', 'Suivi des paiements en temps réel'],
          ['✓', 'Contrôle budgétaire automatique'],
          ['✓', 'Rapports financiers en un clic'],
          ['✓', 'Traçabilité complète des opérations'],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px',
            marginBottom:'18px', color:'#E2E8F0', fontSize:'15px', width:'100%', maxWidth:'320px' }}>
            <span style={{ color:'#10B981', fontSize:'20px', fontWeight:'700' }}>{icon}</span>
            {text}
          </div>
        ))}
      </div>

      {/* DROITE */}
      <div style={{ flex:1, display:'flex', alignItems:'center',
        justifyContent:'center', background:'#fff' }}>
        <div style={{ width:'400px', padding:'0 20px' }}>
          <h2 style={{ fontSize:'28px', fontWeight:'700', color:'#1B3A6B', marginBottom:'8px' }}>
            Connexion
          </h2>
          <p style={{ color:'#64748B', marginBottom:'36px', fontSize:'14px' }}>
            Accédez à votre espace FinTrack
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600',
                color:'#374151', marginBottom:'6px' }}>Adresse email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com" required
                style={{ width:'100%', padding:'11px 14px', borderRadius:'8px',
                  border:'1.5px solid #E2E8F0', fontSize:'14px', outline:'none',
                  boxSizing:'border-box', transition:'border 0.2s' }}
                onFocus={e => e.target.style.border='1.5px solid #2D8CFF'}
                onBlur={e => e.target.style.border='1.5px solid #E2E8F0'}/>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'600',
                color:'#374151', marginBottom:'6px' }}>Mot de passe</label>
              <div style={{ position:'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width:'100%', padding:'11px 44px 11px 14px', borderRadius:'8px',
                    border:'1.5px solid #E2E8F0', fontSize:'14px', outline:'none',
                    boxSizing:'border-box' }}
                  onFocus={e => e.target.style.border='1.5px solid #2D8CFF'}
                  onBlur={e => e.target.style.border='1.5px solid #E2E8F0'}/>
                <span onClick={() => setShowPwd(!showPwd)}
                  style={{ position:'absolute', right:'14px', top:'50%',
                    transform:'translateY(-50%)', cursor:'pointer', fontSize:'18px' }}>
                  {showPwd ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEE2E2', border:'1px solid #FECACA',
                borderRadius:'8px', padding:'10px 14px', marginBottom:'16px',
                color:'#991B1B', fontSize:'13px' }}>
                ⚠️ {error}
              </div>
            )}

            <p style={{ textAlign:'right', fontSize:'13px', color:'#2D8CFF',
              cursor:'pointer', marginBottom:'28px', fontWeight:'500' }}>
              Mot de passe oublié ?
            </p>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'13px', background: loading ? '#93C5FD' : '#1B3A6B',
                color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px',
                fontWeight:'600', cursor: loading ? 'not-allowed' : 'pointer',
                transition:'background 0.2s' }}>
              {loading ? '⏳ Connexion en cours...' : 'Se connecter →'}
            </button>
          </form>

          <p style={{ textAlign:'center', color:'#94A3B8', fontSize:'12px', marginTop:'32px' }}>
            FinTrack © 2026 — ISM École d'Ingénieur
          </p>
        </div>
      </div>
    </div>
  )
}