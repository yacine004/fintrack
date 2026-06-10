import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../../components/Sidebar'

const api = () => axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

export default function Profil() {
  const navigate  = useNavigate()
  const [user, setUser]         = useState(null)
  const [tab, setTab]           = useState('profil')
  const [form, setForm]         = useState({ nom:'', prenom:'', contact:'' })
  const [mdp, setMdp]           = useState({ ancien:'', nouveau:'', confirmation:'' })
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    api().get('/auth/me').then(res => {
      setUser(res.data)
      setForm({ nom: res.data.nom, prenom: res.data.prenom, contact: res.data.contact || '' })
    }).catch(() => navigate('/'))
  }, [])

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000) }
  const showError   = (msg) => { setError(msg);   setSuccess('') }

  const saveProfil = async () => {
    if (!form.nom || !form.prenom) return showError('Nom et prénom obligatoires')
    setSaving(true)
    try {
      const res = await api().put('/auth/profil', form)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setUser(res.data.user)
      showSuccess('Profil mis à jour avec succès !')
    } catch (e) { showError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const savePassword = async () => {
    if (!mdp.ancien || !mdp.nouveau || !mdp.confirmation)
      return showError('Tous les champs sont obligatoires')
    setSaving(true)
    try {
      await api().put('/auth/change-password', {
        ancien_mot_de_passe:   mdp.ancien,
        nouveau_mot_de_passe:  mdp.nouveau,
        confirmation:          mdp.confirmation
      })
      setMdp({ ancien:'', nouveau:'', confirmation:'' })
      showSuccess('Mot de passe modifié avec succès !')
    } catch (e) { showError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  if (!user) return null

  const inputStyle = {
    width:'100%', padding:'11px 14px', borderRadius:'8px',
    border:'1.5px solid #E2E8F0', fontSize:'13px', outline:'none',
    boxSizing:'border-box', fontFamily:'Inter, sans-serif'
  }
  const labelStyle = {
    display:'block', fontSize:'12px', fontWeight:'600',
    color:'#374151', marginBottom:'6px'
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F8FAFC',
      fontFamily:'Inter, sans-serif' }}>
      <Sidebar />

      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'#fff', padding:'14px 28px',
          borderBottom:'1px solid #E2E8F0' }}>
          <h2 style={{ margin:0, color:'#1B3A6B', fontWeight:'700', fontSize:'18px' }}>
            Mon profil
          </h2>
          <p style={{ margin:0, color:'#64748B', fontSize:'12px' }}>
            Gérez vos informations personnelles et votre sécurité
          </p>
        </div>

        <div style={{ padding:'32px 28px', flex:1 }}>
          <div style={{ maxWidth:'640px', margin:'0 auto' }}>

            {/* Avatar + infos */}
            <div style={{ background:'#fff', borderRadius:'12px',
              border:'1px solid #E2E8F0', padding:'28px',
              display:'flex', alignItems:'center', gap:'24px', marginBottom:'24px' }}>
              <div style={{ width:'72px', height:'72px', borderRadius:'50%',
                background:'#1B3A6B', display:'flex', alignItems:'center',
                justifyContent:'center', color:'#fff', fontWeight:'700',
                fontSize:'24px', flexShrink:0 }}>
                {user.prenom?.[0]}{user.nom?.[0]}
              </div>
              <div>
                <h3 style={{ margin:'0 0 4px', color:'#1B3A6B', fontSize:'18px',
                  fontWeight:'700' }}>
                  {user.prenom} {user.nom}
                </h3>
                <p style={{ margin:'0 0 8px', color:'#64748B', fontSize:'13px' }}>
                  {user.email}
                </p>
                <span style={{
                  background: user.role === 'raf' ? '#FEF3C7' : '#EFF6FF',
                  color:      user.role === 'raf' ? '#92400E' : '#1B3A6B',
                  borderRadius:'20px', padding:'4px 12px',
                  fontSize:'12px', fontWeight:'600', textTransform:'uppercase'
                }}>{user.role}</span>
              </div>
            </div>

            {/* Onglets */}
            <div style={{ display:'flex', gap:'4px', marginBottom:'20px',
              borderBottom:'1px solid #E2E8F0' }}>
              {[
                { key:'profil',   label:'👤 Informations personnelles' },
                { key:'securite', label:'🔒 Sécurité' },
              ].map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess('') }}
                  style={{ padding:'10px 18px', background:'none',
                    border:'none', borderBottom: tab===t.key ? '2px solid #1B3A6B' : '2px solid transparent',
                    color: tab===t.key ? '#1B3A6B' : '#64748B',
                    fontSize:'13px', fontWeight: tab===t.key ? '600' : '400',
                    cursor:'pointer', marginBottom:'-1px' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            {success && (
              <div style={{ background:'#D1FAE5', border:'1px solid #6EE7B7',
                borderRadius:'8px', padding:'10px 16px', marginBottom:'16px',
                color:'#065F46', fontSize:'13px', fontWeight:'600' }}>
                ✅ {success}
              </div>
            )}
            {error && (
              <div style={{ background:'#FEE2E2', border:'1px solid #FECACA',
                borderRadius:'8px', padding:'10px 16px', marginBottom:'16px',
                color:'#991B1B', fontSize:'13px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Tab Profil */}
            {tab === 'profil' && (
              <div style={{ background:'#fff', borderRadius:'12px',
                border:'1px solid #E2E8F0', padding:'28px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                  gap:'16px', marginBottom:'16px' }}>
                  {[
                    { label:'Nom',    key:'nom',     ph:'Votre nom' },
                    { label:'Prénom', key:'prenom',  ph:'Votre prénom' },
                  ].map(({ label, key, ph }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input value={form[key]} placeholder={ph}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        style={inputStyle}/>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:'16px' }}>
                  <label style={labelStyle}>Email</label>
                  <input value={user.email} disabled
                    style={{ ...inputStyle, background:'#F8FAFC', color:'#94A3B8',
                      cursor:'not-allowed' }}/>
                  <p style={{ fontSize:'11px', color:'#94A3B8', marginTop:'4px' }}>
                    L'email ne peut pas être modifié
                  </p>
                </div>
                <div style={{ marginBottom:'24px' }}>
                  <label style={labelStyle}>Contact</label>
                  <input value={form.contact} placeholder="Ex: 77 123 45 67"
                    onChange={e => setForm({ ...form, contact: e.target.value })}
                    style={inputStyle}/>
                </div>
                <button onClick={saveProfil} disabled={saving}
                  style={{ padding:'11px 28px',
                    background: saving ? '#93C5FD' : '#1B3A6B',
                    color:'#fff', border:'none', borderRadius:'8px',
                    fontSize:'13px', fontWeight:'600',
                    cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
                </button>
              </div>
            )}

            {/* Tab Sécurité */}
            {tab === 'securite' && (
              <div style={{ background:'#fff', borderRadius:'12px',
                border:'1px solid #E2E8F0', padding:'28px' }}>
                {[
                  { label:'Ancien mot de passe', key:'ancien',       type:'password' },
                  { label:'Nouveau mot de passe (min. 6 caractères)', key:'nouveau', type:'password' },
                  { label:'Confirmer le nouveau mot de passe', key:'confirmation', type:'password' },
                ].map(({ label, key, type }) => (
                  <div key={key} style={{ marginBottom:'16px' }}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} value={mdp[key]}
                      placeholder="••••••••"
                      onChange={e => setMdp({ ...mdp, [key]: e.target.value })}
                      style={inputStyle}/>
                  </div>
                ))}
                <button onClick={savePassword} disabled={saving}
                  style={{ padding:'11px 28px',
                    background: saving ? '#93C5FD' : '#1B3A6B',
                    color:'#fff', border:'none', borderRadius:'8px',
                    fontSize:'13px', fontWeight:'600',
                    cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? '⏳ Modification...' : '🔒 Modifier le mot de passe'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
