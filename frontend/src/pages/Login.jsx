import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useIsMobile } from '../hooks/useIsMobile'

function FinTrackLogo({ size = 56 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      {/* Icon */}
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#2D8CFF"/>
        <polyline
          points="14,78 30,58 46,64 64,36 80,22"
          fill="none" stroke="white" strokeWidth="7"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="80" cy="22" r="10" fill="#10B981"/>
      </svg>
      {/* Text */}
      <div>
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontSize: size * 0.57, fontWeight: '800', color: '#1B3A6B', fontFamily: 'Inter, sans-serif' }}>Fin</span>
          <span style={{ fontSize: size * 0.57, fontWeight: '800', color: '#2D8CFF', fontFamily: 'Inter, sans-serif' }}>Track</span>
        </div>
        <div style={{ fontSize: size * 0.19, color: '#94A3B8', letterSpacing: '2.5px', fontWeight: '600', marginTop: '3px', fontFamily: 'Inter, sans-serif' }}>
          GESTION FINANCIÈRE
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`,
        { email, password }
      )
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate(res.data.user.role === 'raf' ? '/raf/dashboard' : '/comptable/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #E2E8F0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
    background: '#F8FAFC', color: '#1E293B',
    transition: 'border-color 0.2s',
  }

  // ── Card with form ───────────────────────────────────────────────────
  const formCard = (
    <div style={{
      background: '#fff', borderRadius: '20px',
      padding: isMobile ? '32px 24px' : '44px 40px',
      width: '100%', maxWidth: '460px',
      boxShadow: '0 8px 40px rgba(15,23,42,0.12)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
        <FinTrackLogo size={52} />
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: '700',
            color: '#64748B', marginBottom: '8px', letterSpacing: '1px',
          }}>
            ADRESSE E-MAIL
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@ism.sn" required
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2D8CFF'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: '700',
            color: '#64748B', marginBottom: '8px', letterSpacing: '1px',
          }}>
            MOT DE PASSE
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ ...inputStyle, paddingRight: '48px' }}
              onFocus={e => e.target.style.borderColor = '#2D8CFF'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
            <button
              type="button" onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute', right: '14px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
                color: '#94A3B8', display: 'flex', alignItems: 'center',
              }}
            >
              {showPwd ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: '#2D8CFF', cursor: 'pointer', fontWeight: '500' }}>
            Mot de passe oublié ?
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#991B1B', fontSize: '13px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px',
          background: loading ? '#475569' : '#0F172A',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontSize: '15px', fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '12px',
        }}>
          {loading ? '⏳ Connexion en cours...' : 'Se connecter  →'}
        </button>

        {/* Student portal */}
        <Link to="/suivi-paiements" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%', padding: '14px',
          background: '#2D8CFF', color: '#fff',
          borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          textDecoration: 'none', boxSizing: 'border-box',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Consulter mes paiements (Portail Étudiant)
        </Link>
      </form>

      <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: '11px', marginTop: '28px', marginBottom: 0 }}>
        FinTrack © 2026 — ISM Dakar École d'Ingénieurs et Digital Campus
      </p>
    </div>
  )

  // ── Mobile ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: 'Inter, sans-serif',
      }}>
        {formCard}
      </div>
    )
  }

  // ── Desktop: two-column ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100dvh', fontFamily: 'Inter, sans-serif' }}>

      {/* Left panel — background image + dark overlay + centered text */}
      <div style={{
        width: '52%', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Background image — place login-bg.jpg in frontend/public/ */}
        <img
          src="/login-bg.jpg"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(8,14,35,0.78) 0%, rgba(11,30,75,0.72) 50%, rgba(6,20,55,0.80) 100%)',
        }} />
        {/* Soft glow */}
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,140,255,0.15) 0%, transparent 70%)',
        }} />

        {/* Centered text content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 52px', maxWidth: '560px' }}>
          <h1 style={{
            color: '#fff', fontSize: '40px', fontWeight: '800',
            lineHeight: '1.2', margin: '0 0 8px', letterSpacing: '-0.5px',
          }}>
            La finance scolaire,
          </h1>
          <h1 style={{
            fontSize: '40px', fontWeight: '800', lineHeight: '1.2',
            margin: '0 0 28px', letterSpacing: '-0.5px',
            background: 'linear-gradient(90deg, #2D8CFF, #38BDF8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            simplifiée et sécurisée.
          </h1>
          <p style={{
            color: 'rgba(226,232,240,0.80)', fontSize: '15px',
            lineHeight: '1.7', margin: 0, fontWeight: '400',
          }}>
            Plateforme de gestion financière dédiée à ISM École d'Ingénieurs.
            Suivez les paiements, gérez les budgets et générez vos rapports en temps réel.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, background: '#EEF2F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
      }}>
        {formCard}
      </div>
    </div>
  )
}
