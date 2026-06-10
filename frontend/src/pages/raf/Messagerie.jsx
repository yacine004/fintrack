import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

function getCurrentUser() {
  try {
    const payload = JSON.parse(atob(localStorage.getItem('token').split('.')[1]))
    return payload.user
  } catch { return null }
}

const AVATAR_COLORS = ['#1B3A6B', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777']
const avatarColor = name => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
const initials    = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

export default function Messagerie() {
  const currentUser = getCurrentUser()
  const [conversations, setConversations] = useState([])
  const [activePartnerId, setActivePartnerId] = useState(null)
  const [allUsers, setAllUsers]   = useState([])
  const [text, setText]           = useState('')
  const [search, setSearch]       = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [sending, setSending]     = useState(false)
  const bottomRef = useRef(null)

  const buildConversations = useCallback((recus, envoyes) => {
    const map = {}
    const uid = currentUser?.id

    const process = (msg, isReceived) => {
      const partnerId   = isReceived ? msg.id_expediteur  : msg.id_destinataire
      const partnerName = isReceived ? msg.expediteur     : msg.destinataire
      const partnerRole = isReceived ? msg.expediteur_role : ''
      if (!map[partnerId]) map[partnerId] = { partnerId, partnerName, partnerRole, messages: [], unread: 0 }
      map[partnerId].messages.push({ ...msg, isReceived })
      if (isReceived && !msg.lu) map[partnerId].unread++
    }

    recus.forEach(m   => process(m, true))
    envoyes.forEach(m => process(m, false))

    return Object.values(map)
      .map(c => {
        c.messages.sort((a, b) => new Date(a.date_envoi) - new Date(b.date_envoi))
        c.last = c.messages.at(-1)
        return c
      })
      .sort((a, b) => new Date(b.last?.date_envoi || 0) - new Date(a.last?.date_envoi || 0))
  }, [currentUser?.id])

  const loadMessages = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/messages/recus?limit=200`,   { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API}/messages/envoyes?limit=200`, { headers: getHeaders() }).then(r => r.json()),
      ])
      setConversations(buildConversations(r1.messages || [], r2.messages || []))
    } catch {}
  }, [buildConversations])

  const loadUsers = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/messages/destinataires`, { headers: getHeaders() })
      const data = await res.json()
      setAllUsers(data.utilisateurs || [])
    } catch {}
  }, [])

  useEffect(() => { loadMessages(); loadUsers() }, [loadMessages, loadUsers])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activePartnerId, conversations])

  const activeConv = conversations.find(c => c.partnerId === activePartnerId) || null

  const handleSelectConv = async (conv) => {
    setActivePartnerId(conv.partnerId)
    const unread = conv.messages.filter(m => m.isReceived && !m.lu)
    await Promise.all(unread.map(m =>
      fetch(`${API}/messages/${m.id}/lu`, { method: 'PUT', headers: getHeaders() }).catch(() => {})
    ))
    if (unread.length > 0) loadMessages()
  }

  const handleNewConv = (user) => {
    setShowNewConv(false)
    const existing = conversations.find(c => c.partnerId === user.id)
    if (existing) { setActivePartnerId(user.id); return }
    setConversations(prev => [{
      partnerId: user.id, partnerName: `${user.prenom} ${user.nom}`,
      partnerRole: user.role, messages: [], unread: 0, last: null
    }, ...prev])
    setActivePartnerId(user.id)
  }

  const handleSend = async () => {
    if (!text.trim() || !activePartnerId || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ id_destinataire: activePartnerId, objet: 'Message', contenu: text.trim() })
      })
      if (res.ok) { setText(''); loadMessages() }
    } catch {}
    finally { setSending(false) }
  }

  const filtered = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', background: '#111B21', overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2A3942' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', background: '#202C33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: avatarColor(currentUser?.nom || ''),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                {initials(`${currentUser?.prenom || ''} ${currentUser?.nom || ''}`)}
              </div>
              <div>
                <div style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '600' }}>
                  {currentUser?.prenom} {currentUser?.nom}
                </div>
                <div style={{ color: '#8696A0', fontSize: '12px', textTransform: 'capitalize' }}>{currentUser?.role}</div>
              </div>
            </div>
            <button onClick={() => setShowNewConv(true)} title="Nouvelle conversation"
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#00A884',
                border: 'none', cursor: 'pointer', color: '#fff', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✏️
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', background: '#111B21' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Rechercher ou démarrer une discussion"
              style={{ width: '100%', padding: '9px 14px', background: '#202C33', border: 'none',
                borderRadius: '8px', color: '#E9EDEF', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#8696A0' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
                <div style={{ fontSize: '14px' }}>Aucune conversation</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Cliquez sur ✏️ pour démarrer</div>
              </div>
            ) : filtered.map(conv => (
              <div key={conv.partnerId} onClick={() => handleSelectConv(conv)}
                style={{
                  display: 'flex', gap: '12px', padding: '12px 16px', cursor: 'pointer',
                  background: activePartnerId === conv.partnerId ? '#2A3942' : 'transparent',
                  borderBottom: '1px solid #2A3942', alignItems: 'center'
                }}
                onMouseEnter={e => { if (activePartnerId !== conv.partnerId) e.currentTarget.style.background = '#1F2C34' }}
                onMouseLeave={e => { if (activePartnerId !== conv.partnerId) e.currentTarget.style.background = 'transparent' }}>

                <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(conv.partnerName),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '18px' }}>
                  {initials(conv.partnerName)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '600',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {conv.partnerName}
                    </span>
                    <span style={{ color: conv.unread > 0 ? '#00A884' : '#8696A0', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
                      {conv.last?.date_envoi?.split(' ')[1] || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8696A0', fontSize: '13px', overflow: 'hidden',
                      whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                      {!conv.last?.isReceived && <span style={{ color: '#8696A0' }}>✓ </span>}
                      {conv.last?.contenu || ''}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{ background: '#00A884', color: '#fff', borderRadius: '50%',
                        minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '11px', fontWeight: '700',
                        padding: '0 5px', marginLeft: '8px', flexShrink: 0 }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        {activeConv ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0B141A', overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{ padding: '10px 16px', background: '#202C33', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%',
                background: avatarColor(activeConv.partnerName),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                {initials(activeConv.partnerName)}
              </div>
              <div>
                <div style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '600' }}>{activeConv.partnerName}</div>
                <div style={{ color: '#8696A0', fontSize: '12px', textTransform: 'capitalize' }}>{activeConv.partnerRole}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 60px', display: 'flex', flexDirection: 'column', gap: '2px',
              backgroundImage: 'repeating-linear-gradient(45deg, #0d1a21 0px, #0d1a21 2px, transparent 2px, transparent 10px)' }}>

              {activeConv.messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#182229', padding: '10px 20px', borderRadius: '8px',
                    color: '#8696A0', fontSize: '13px', textAlign: 'center' }}>
                    Démarrez la conversation avec {activeConv.partnerName}
                  </div>
                </div>
              )}

              {activeConv.messages.map((msg, i) => {
                const isSent = !msg.isReceived
                const prevMsg = activeConv.messages[i - 1]
                const showDateSep = i === 0 || msg.date_envoi?.split(' ')[0] !== prevMsg?.date_envoi?.split(' ')[0]

                return (
                  <div key={msg.id || i}>
                    {showDateSep && (
                      <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                        <span style={{ background: '#182229', color: '#8696A0', fontSize: '12px',
                          padding: '4px 14px', borderRadius: '8px' }}>
                          {msg.date_envoi?.split(' ')[0]}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
                      <div style={{
                        maxWidth: '62%', padding: '7px 12px 5px',
                        background: isSent ? '#005C4B' : '#202C33',
                        borderRadius: isSent ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.4)'
                      }}>
                        {msg.objet && msg.objet !== 'Message' && (
                          <div style={{ color: '#00A884', fontSize: '12px', fontWeight: '600', marginBottom: '3px' }}>
                            {msg.objet}
                          </div>
                        )}
                        <div style={{ color: '#E9EDEF', fontSize: '14px', lineHeight: '1.45',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.contenu}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: '4px', marginTop: '3px' }}>
                          <span style={{ color: '#8696A0', fontSize: '11px' }}>{msg.date_envoi?.split(' ')[1]}</span>
                          {isSent && (
                            <span style={{ fontSize: '13px', color: msg.lu ? '#53BDEB' : '#8696A0', lineHeight: 1 }}>✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{ padding: '10px 16px', background: '#202C33', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Écrivez un message..."
                rows={1}
                style={{ flex: 1, padding: '10px 14px', background: '#2A3942', border: 'none',
                  borderRadius: '10px', color: '#E9EDEF', fontSize: '14px', outline: 'none',
                  resize: 'none', maxHeight: '120px', fontFamily: 'inherit', lineHeight: '1.4' }} />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                style={{ width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                  background: text.trim() ? '#00A884' : '#2A3942', border: 'none',
                  cursor: text.trim() ? 'pointer' : 'default', fontSize: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s' }}>
                📤
              </button>
            </div>
          </div>
        ) : (
          /* Welcome */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', background: '#0B141A', gap: '16px' }}>
            <div style={{ fontSize: '72px' }}>💬</div>
            <h2 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: '300', margin: 0 }}>FinTrack Messagerie</h2>
            <p style={{ color: '#8696A0', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '380px', lineHeight: '1.6' }}>
              Sélectionnez une conversation à gauche ou cliquez sur ✏️ pour démarrer un nouveau message.
            </p>
            <div style={{ marginTop: '8px', padding: '8px 20px', background: '#202C33',
              borderRadius: '20px', color: '#8696A0', fontSize: '12px' }}>
              Vos messages sont chiffrés de bout en bout
            </div>
          </div>
        )}
      </div>

      {/* ── NEW CONVERSATION MODAL ── */}
      {showNewConv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#202C33', borderRadius: '14px', padding: '24px', width: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#E9EDEF', fontSize: '17px', fontWeight: '600' }}>
                Nouvelle conversation
              </h3>
              <button onClick={() => setShowNewConv(false)}
                style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
              {allUsers.length === 0 && (
                <div style={{ color: '#8696A0', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  Aucun autre utilisateur disponible
                </div>
              )}
              {allUsers.map(u => (
                <div key={u.id} onClick={() => handleNewConv(u)}
                  style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '10px',
                    cursor: 'pointer', alignItems: 'center', background: '#2A3942' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                  onMouseLeave={e => e.currentTarget.style.background = '#2A3942'}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(`${u.prenom} ${u.nom}`),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                    {initials(`${u.prenom} ${u.nom}`)}
                  </div>
                  <div>
                    <div style={{ color: '#E9EDEF', fontSize: '14px', fontWeight: '600' }}>{u.prenom} {u.nom}</div>
                    <div style={{ color: '#8696A0', fontSize: '12px', textTransform: 'capitalize' }}>{u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
