import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../../components/Sidebar'

const api = () => axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const EMPTY_FORM = { nom:'', prenom:'', email:'', contact:'', role:'comptable', password:'' }

export default function Utilisateurs() {
  const navigate = useNavigate()
  const [users, setUsers]           = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [nbPages, setNbPages]       = useState(1)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtreRole, setFiltreRole] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [modal, setModal]           = useState(null) // null | 'creer' | 'modifier' | 'supprimer' | 'role'
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState('')
  const [credentials, setCredentials] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api().get('/utilisateurs', {
        params: { search, role: filtreRole, statut: filtreStatut, page, limit: 10 }
      })
      setUsers(res.data.utilisateurs)
      setTotal(res.data.total)
      setNbPages(res.data.nb_pages)
    } catch { navigate('/') }
    finally { setLoading(false) }
  }, [search, filtreRole, filtreStatut, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const openModal = (type, user = null) => {
    setFormError('')
    setSelected(user)
    setForm(user ? {
      nom: user.nom, prenom: user.prenom, email: user.email,
      contact: user.contact, role: user.role, password: ''
    } : EMPTY_FORM)
    setModal(type)
  }

  const closeModal = () => { setModal(null); setSelected(null); setFormError('') }

  const handleCreer = async () => {
    setFormError('')
    if (!form.nom || !form.prenom || !form.email || !form.password)
      return setFormError('Tous les champs obligatoires doivent être remplis')
    setSaving(true)
    try {
      await api().post('/utilisateurs', form)
      fetchUsers()
      closeModal()
      setCredentials({ nom: form.prenom + ' ' + form.nom, email: form.email, password: form.password, role: form.role })
    } catch (e) { setFormError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleModifier = async () => {
    setFormError('')
    if (!form.nom || !form.prenom) return setFormError('Nom et prénom obligatoires')
    setSaving(true)
    try {
      await api().put(`/utilisateurs/${selected.id}`, form)
      closeModal(); fetchUsers()
      showSuccess('Utilisateur modifié avec succès !')
    } catch (e) { setFormError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleToggle = async (user) => {
    try {
      await api().put(`/utilisateurs/${user.id}/toggle`)
      fetchUsers()
      showSuccess(`Compte ${user.actif ? 'désactivé' : 'activé'} !`)
    } catch (e) { alert(e.response?.data?.message || 'Erreur') }
  }

  const handleRole = async () => {
    setSaving(true)
    try {
      await api().put(`/utilisateurs/${selected.id}/role`, { role: form.role })
      closeModal(); fetchUsers()
      showSuccess('Rôle modifié avec succès !')
    } catch (e) { setFormError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleSupprimer = async () => {
    setSaving(true)
    try {
      await api().delete(`/utilisateurs/${selected.id}`)
      closeModal(); fetchUsers()
      showSuccess('Utilisateur supprimé !')
    } catch (e) { setFormError(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const actifs   = users.filter(u => u.actif).length
  const inactifs = users.filter(u => !u.actif).length

  const inputStyle = {
    width:'100%', padding:'10px 12px', borderRadius:'8px',
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
        <div style={{ background:'#fff', padding:'14px 28px', borderBottom:'1px solid #E2E8F0',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, color:'#1B3A6B', fontWeight:'700', fontSize:'18px' }}>
              Gestion des utilisateurs
            </h2>
            <p style={{ margin:0, color:'#64748B', fontSize:'12px' }}>
              {total} utilisateur{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => openModal('creer')}
            style={{ background:'#1B3A6B', color:'#fff', border:'none',
              borderRadius:'8px', padding:'10px 20px', fontSize:'13px',
              fontWeight:'600', cursor:'pointer' }}>
            ➕ Nouvel utilisateur
          </button>
        </div>

        <div style={{ padding:'24px 28px', flex:1 }}>

          {/* Message succès */}
          {success && (
            <div style={{ background:'#D1FAE5', border:'1px solid #6EE7B7',
              borderRadius:'8px', padding:'10px 16px', marginBottom:'16px',
              color:'#065F46', fontWeight:'600', fontSize:'13px' }}>
              ✅ {success}
            </div>
          )}

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
            gap:'16px', marginBottom:'24px' }}>
            {[
              { label:'Total',    value: total,   icon:'👥', bg:'#EFF6FF', color:'#1B3A6B' },
              { label:'Actifs',   value: actifs,  icon:'✅', bg:'#D1FAE5', color:'#065F46' },
              { label:'Inactifs', value: inactifs,icon:'🚫', bg:'#FEE2E2', color:'#991B1B' },
              { label:'RAF',      value: users.filter(u=>u.role==='raf').length,
                icon:'🏛️', bg:'#FEF3C7', color:'#92400E' },
            ].map((k,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:'10px',
                border:'1px solid #E2E8F0', padding:'16px 20px',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#64748B', marginBottom:'4px' }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize:'28px', fontWeight:'800', color:'#1B3A6B' }}>
                    {k.value}
                  </div>
                </div>
                <div style={{ background:k.bg, borderRadius:'10px', width:'44px',
                  height:'44px', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:'20px' }}>
                  {k.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Filtres + Recherche */}
          <div style={{ background:'#fff', borderRadius:'10px',
            border:'1px solid #E2E8F0', padding:'16px 20px', marginBottom:'16px',
            display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
            <input
              placeholder="🔍 Rechercher par nom, prénom ou email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ ...inputStyle, flex:1, minWidth:'220px' }}
            />
            <select value={filtreRole}
              onChange={e => { setFiltreRole(e.target.value); setPage(1) }}
              style={{ ...inputStyle, width:'140px' }}>
              <option value="">Tous les rôles</option>
              <option value="raf">RAF</option>
              <option value="comptable">Comptable</option>
            </select>
            <select value={filtreStatut}
              onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
              style={{ ...inputStyle, width:'140px' }}>
              <option value="">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
            {(search || filtreRole || filtreStatut) && (
              <button onClick={() => { setSearch(''); setFiltreRole('');
                setFiltreStatut(''); setPage(1) }}
                style={{ padding:'10px 14px', background:'#F1F5F9', border:'1.5px solid #E2E8F0',
                  borderRadius:'8px', fontSize:'12px', cursor:'pointer', color:'#64748B' }}>
                ✕ Réinitialiser
              </button>
            )}
          </div>

          {/* Tableau */}
          <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #E2E8F0' }}>
            {loading ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#64748B' }}>
                ⏳ Chargement...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#64748B' }}>
                Aucun utilisateur trouvé
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ background:'#F8FAFC' }}>
                    {['Utilisateur','Email','Contact','Rôle','Statut','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left',
                        color:'#64748B', fontWeight:'600', fontSize:'11px',
                        textTransform:'uppercase', letterSpacing:'0.5px',
                        borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom:'1px solid #F1F5F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'34px', height:'34px', borderRadius:'50%',
                            background:'#1B3A6B', display:'flex', alignItems:'center',
                            justifyContent:'center', color:'#fff', fontWeight:'700',
                            fontSize:'11px', flexShrink:0 }}>
                            {u.prenom?.[0]}{u.nom?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight:'600', color:'#1E293B' }}>
                              {u.prenom} {u.nom}
                            </div>
                            <div style={{ fontSize:'11px', color:'#94A3B8' }}>
                              Depuis {u.date_creation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', color:'#64748B' }}>{u.email}</td>
                      <td style={{ padding:'12px 16px', color:'#64748B' }}>
                        {u.contact || '—'}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          background: u.role === 'raf' ? '#FEF3C7' : '#EFF6FF',
                          color:      u.role === 'raf' ? '#92400E' : '#1B3A6B',
                          borderRadius:'20px', padding:'3px 10px',
                          fontSize:'11px', fontWeight:'600', textTransform:'uppercase'
                        }}>{u.role}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          background: u.actif ? '#D1FAE5' : '#FEE2E2',
                          color:      u.actif ? '#065F46' : '#991B1B',
                          borderRadius:'20px', padding:'3px 10px',
                          fontSize:'11px', fontWeight:'600'
                        }}>{u.actif ? '● Actif' : '● Inactif'}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button onClick={() => openModal('modifier', u)}
                            style={{ padding:'5px 10px', background:'#EFF6FF',
                              color:'#1B3A6B', border:'none', borderRadius:'6px',
                              fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                            ✏️ Modifier
                          </button>
                          <button onClick={() => handleToggle(u)}
                            style={{ padding:'5px 10px',
                              background: u.actif ? '#FEE2E2' : '#D1FAE5',
                              color:      u.actif ? '#991B1B' : '#065F46',
                              border:'none', borderRadius:'6px',
                              fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                            {u.actif ? '🚫 Désactiver' : '✅ Activer'}
                          </button>
                          <button onClick={() => openModal('role', u)}
                            style={{ padding:'5px 10px', background:'#FEF3C7',
                              color:'#92400E', border:'none', borderRadius:'6px',
                              fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                            🔑 Rôle
                          </button>
                          <button onClick={() => openModal('supprimer', u)}
                            style={{ padding:'5px 10px', background:'#FEE2E2',
                              color:'#991B1B', border:'none', borderRadius:'6px',
                              fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {nbPages > 1 && (
              <div style={{ padding:'14px 20px', borderTop:'1px solid #E2E8F0',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'12px', color:'#64748B' }}>
                  Page {page} sur {nbPages}
                </span>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))}
                    disabled={page === 1}
                    style={{ padding:'6px 12px', background: page===1?'#F1F5F9':'#1B3A6B',
                      color: page===1?'#94A3B8':'#fff', border:'none',
                      borderRadius:'6px', fontSize:'12px', cursor: page===1?'not-allowed':'pointer' }}>
                    ← Précédent
                  </button>
                  <button onClick={() => setPage(p => Math.min(nbPages, p+1))}
                    disabled={page === nbPages}
                    style={{ padding:'6px 12px', background: page===nbPages?'#F1F5F9':'#1B3A6B',
                      color: page===nbPages?'#94A3B8':'#fff', border:'none',
                      borderRadius:'6px', fontSize:'12px', cursor: page===nbPages?'not-allowed':'pointer' }}>
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'28px',
            width:'460px', maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* En-tête modal */}
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:'22px' }}>
              <h3 style={{ margin:0, color:'#1B3A6B', fontSize:'16px', fontWeight:'700' }}>
                { modal === 'creer'     ? '➕ Nouvel utilisateur'
                : modal === 'modifier'  ? '✏️ Modifier l\'utilisateur'
                : modal === 'role'      ? '🔑 Modifier le rôle'
                : '🗑️ Supprimer l\'utilisateur' }
              </h3>
              <span onClick={closeModal}
                style={{ cursor:'pointer', color:'#64748B', fontSize:'20px',
                  lineHeight:1, padding:'4px' }}>✕</span>
            </div>

            {/* Formulaire Créer / Modifier */}
            {(modal === 'creer' || modal === 'modifier') && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
                  {[
                    { label:'Nom *',    key:'nom',    type:'text',  ph:'Ex: Diallo' },
                    { label:'Prénom *', key:'prenom', type:'text',  ph:'Ex: Moussa' },
                  ].map(({ label, key, type, ph }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input type={type} value={form[key]} placeholder={ph}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        style={inputStyle}/>
                    </div>
                  ))}
                </div>
                {[
                  { label:'Email *',   key:'email',   type:'email',    ph:'user@fintrack.sn' },
                  { label:'Contact',   key:'contact', type:'text',     ph:'Ex: 77 123 45 67' },
                ].map(({ label, key, type, ph }) => (
                  <div key={key} style={{ marginBottom:'14px' }}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} value={form[key]} placeholder={ph}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      style={inputStyle}/>
                  </div>
                ))}
                <div style={{ marginBottom:'14px' }}>
                  <label style={labelStyle}>Rôle *</label>
                  <select value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    style={{ ...inputStyle, background:'#fff' }}>
                    <option value="comptable">Comptable</option>
                    <option value="raf">RAF</option>
                  </select>
                </div>
                {modal === 'creer' && (
                  <div style={{ marginBottom:'14px' }}>
                    <label style={labelStyle}>Mot de passe * (min. 6 caractères)</label>
                    <input type="password" value={form.password}
                      placeholder="••••••••"
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      style={inputStyle}/>
                  </div>
                )}
              </>
            )}

            {/* Formulaire Rôle */}
            {modal === 'role' && (
              <div style={{ marginBottom:'14px' }}>
                <p style={{ color:'#64748B', fontSize:'13px', marginBottom:'14px' }}>
                  Modifier le rôle de <strong>{selected?.prenom} {selected?.nom}</strong>
                </p>
                <label style={labelStyle}>Nouveau rôle</label>
                <select value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ ...inputStyle, background:'#fff' }}>
                  <option value="comptable">Comptable</option>
                  <option value="raf">RAF</option>
                </select>
              </div>
            )}

            {/* Confirmation suppression */}
            {modal === 'supprimer' && (
              <div style={{ marginBottom:'20px', padding:'14px',
                background:'#FEF2F2', borderRadius:'8px',
                border:'1px solid #FECACA', color:'#991B1B', fontSize:'13px' }}>
                ⚠️ Êtes-vous sûr de vouloir supprimer le compte de{' '}
                <strong>{selected?.prenom} {selected?.nom}</strong> ?
                Cette action est irréversible.
              </div>
            )}

            {/* Erreur */}
            {formError && (
              <div style={{ background:'#FEE2E2', border:'1px solid #FECACA',
                borderRadius:'8px', padding:'10px 14px', marginBottom:'16px',
                color:'#991B1B', fontSize:'12px' }}>
                ⚠️ {formError}
              </div>
            )}

            {/* Boutons */}
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={closeModal}
                style={{ padding:'10px 20px', background:'#F1F5F9',
                  color:'#64748B', border:'none', borderRadius:'8px',
                  fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                Annuler
              </button>
              <button
                onClick={
                  modal === 'creer'      ? handleCreer
                : modal === 'modifier'   ? handleModifier
                : modal === 'role'       ? handleRole
                : handleSupprimer
                }
                disabled={saving}
                style={{ padding:'10px 22px',
                  background: modal === 'supprimer' ? '#EF4444'
                            : saving ? '#93C5FD' : '#1B3A6B',
                  color:'#fff', border:'none', borderRadius:'8px',
                  fontSize:'13px', fontWeight:'600',
                  cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳...'
                : modal === 'creer'     ? '✅ Créer'
                : modal === 'modifier'  ? '✅ Enregistrer'
                : modal === 'role'      ? '✅ Modifier le rôle'
                : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal identifiants créés */}
      {credentials && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '36px',
            width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#1B3A6B' }}>
              Compte créé avec succès
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748B' }}>
              Communiquez ces identifiants à <strong>{credentials.nom}</strong>
            </p>

            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0',
              borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Rôle</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B', textTransform: 'capitalize' }}>
                  {credentials.role}
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1B3A6B',
                  background: '#EFF6FF', padding: '8px 12px', borderRadius: '8px',
                  fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                  {credentials.email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Mot de passe</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#DC2626',
                  background: '#FEF2F2', padding: '8px 12px', borderRadius: '8px',
                  fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {credentials.password}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#F59E0B', marginBottom: '20px',
              background: '#FFF7ED', borderRadius: '8px', padding: '10px',
              border: '1px solid #FCD34D' }}>
              ⚠️ Ce mot de passe ne sera plus affiché. Notez-le avant de fermer.
            </p>

            <button onClick={() => setCredentials(null)}
              style={{ width: '100%', padding: '12px', background: '#1B3A6B', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px',
                fontWeight: '700', cursor: 'pointer' }}>
              J'ai noté les identifiants — Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
