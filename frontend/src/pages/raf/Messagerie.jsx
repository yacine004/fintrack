import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
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
// Parse "DD/MM/YYYY HH:MM" → timestamp (new Date() ne gère pas ce format)
const parseDate = s => { if (!s) return 0; const [dmy, hm='00:00'] = s.split(' '); const [d,m,y] = dmy.split('/'); return new Date(`${y}-${m}-${d}T${hm}`).getTime() }

// Extrait la citation et le corps d'un message (format : ↩ «...»\n\nrépons)
const parseQuote = (contenu) => {
  if (!contenu?.startsWith('↩ «')) return { quote: null, body: contenu }
  const end = contenu.indexOf('»\n\n')
  if (end === -1) return { quote: null, body: contenu }
  return { quote: contenu.slice(3, end), body: contenu.slice(end + 4) }
}

const TEMPLATES = [
  { icon: '💰', label: 'Rappel de paiement',      text: 'Bonjour,\n\nNous vous rappelons que votre dossier financier présente un montant impayé. Merci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\nService RAF – ISM' },
  { icon: '✅', label: 'Confirmation de paiement', text: 'Bonjour,\n\nNous confirmons la bonne réception de votre paiement. Votre dossier financier est désormais à jour.\n\nCordialement,\nService RAF – ISM' },
  { icon: '📅', label: "Notification d'échéance",  text: "Bonjour,\n\nNous vous informons que la prochaine échéance de vos frais de scolarité approche. Merci de procéder au règlement avant la date limite.\n\nCordialement,\nService RAF – ISM" },
  { icon: '🏢', label: 'Convocation bureau RAF',   text: 'Bonjour,\n\nNous vous prions de bien vouloir vous présenter au bureau du RAF afin de traiter une question relative à votre dossier financier.\n\nCordialement,\nService RAF – ISM' },
  { icon: '📎', label: 'Demande de justificatif',  text: 'Bonjour,\n\nAfin de finaliser votre dossier, merci de nous transmettre un justificatif de paiement (reçu ou relevé de virement).\n\nCordialement,\nService RAF – ISM' },
  { icon: '🚫', label: 'Accès suspendu',           text: "Bonjour,\n\nEn raison d'un solde impayé, votre accès aux services académiques a été temporairement suspendu. Merci de régulariser votre situation pour un rétablissement rapide.\n\nCordialement,\nService RAF – ISM" },
]

export default function Messagerie() {
  const currentUser = getCurrentUser()
  const [conversations, setConversations] = useState([])
  const [activePartnerId, setActivePartnerId] = useState(null)
  const [allUsers, setAllUsers]   = useState([])
  const [text, setText]           = useState('')
  const [search, setSearch]       = useState('')
  const [showNewConv, setShowNewConv]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [replyTo, setReplyTo]             = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [hoveredMsgId, setHoveredMsgId]  = useState(null)
  const [contextMenu, setContextMenu]     = useState(null) // { x, y, msg }
  const [infoModal, setInfoModal]         = useState(null)
  const [important, setImportant]         = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ft_important') || '[]')) }
    catch { return new Set() }
  })
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
        c.messages.sort((a, b) => parseDate(a.date_envoi) - parseDate(b.date_envoi))
        c.last = c.messages.at(-1)
        return c
      })
      .sort((a, b) => parseDate(b.last?.date_envoi) - parseDate(a.last?.date_envoi))
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

  // Fermer le menu contextuel au clic extérieur
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [contextMenu])

  const activeConv = conversations.find(c => c.partnerId === activePartnerId) || null

  const handleSelectConv = async (conv) => {
    setActivePartnerId(conv.partnerId)
    setReplyTo(null)
    setShowTemplates(false)
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
    const excerpt = replyTo
      ? replyTo.contenu.replace(/\n/g, ' ').slice(0, 80) + (replyTo.contenu.length > 80 ? '…' : '')
      : null
    const contenu = replyTo ? `↩ «${excerpt}»\n\n${text.trim()}` : text.trim()
    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ id_destinataire: activePartnerId, objet: 'Message', contenu })
      })
      if (res.ok) { setText(''); setReplyTo(null); loadMessages() }
    } catch {}
    finally { setSending(false) }
  }

  const openContextMenu = (e, msg) => {
    e.preventDefault()
    const x = Math.min(e.clientX, window.innerWidth - 230)
    const y = Math.min(e.clientY, window.innerHeight - 300)
    setContextMenu({ x, y, msg })
  }

  const copyMsg = (contenu) => {
    const { body } = parseQuote(contenu)
    navigator.clipboard.writeText(body).catch(() => {})
    setContextMenu(null)
  }

  const toggleImportant = (id) => {
    setImportant(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('ft_important', JSON.stringify([...next]))
      return next
    })
    setContextMenu(null)
  }

  const handleDelete = async (id) => {
    try { await fetch(`${API}/messages/${id}`, { method: 'DELETE', headers: getHeaders() }) } catch {}
    setConversations(prev => prev.map(c => ({ ...c, messages: c.messages.filter(m => m.id !== id) })))
    setContextMenu(null)
  }

  const filtered = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', background: '#F1F5F9', overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #E2E8F0', background: '#fff' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', background: '#1B3A6B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: avatarColor(currentUser?.nom || ''),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                {initials(`${currentUser?.prenom || ''} ${currentUser?.nom || ''}`)}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                  {currentUser?.prenom} {currentUser?.nom}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'capitalize' }}>{currentUser?.role}</div>
              </div>
            </div>
            <button onClick={() => setShowNewConv(true)} title="Nouvelle conversation"
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', color: '#fff', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✏️
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Rechercher une conversation"
              style={{ width: '100%', padding: '9px 14px', background: '#fff', border: '1.5px solid #E2E8F0',
                borderRadius: '8px', color: '#1E293B', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
                <div style={{ fontSize: '14px' }}>Aucune conversation</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Cliquez sur ✏️ pour démarrer</div>
              </div>
            ) : filtered.map(conv => (
              <div key={conv.partnerId} onClick={() => handleSelectConv(conv)}
                style={{
                  display: 'flex', gap: '12px', padding: '12px 16px', cursor: 'pointer',
                  background: activePartnerId === conv.partnerId ? '#EFF6FF' : 'transparent',
                  borderBottom: '1px solid #F1F5F9', alignItems: 'center'
                }}
                onMouseEnter={e => { if (activePartnerId !== conv.partnerId) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (activePartnerId !== conv.partnerId) e.currentTarget.style.background = 'transparent' }}>

                <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(conv.partnerName),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '18px' }}>
                  {initials(conv.partnerName)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ color: '#1E293B', fontSize: '15px', fontWeight: '600',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {conv.partnerName}
                    </span>
                    <span style={{ color: conv.unread > 0 ? '#1B3A6B' : '#94A3B8', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
                      {conv.last?.date_envoi?.split(' ')[1] || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontSize: '13px', overflow: 'hidden',
                      whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                      {!conv.last?.isReceived && <span style={{ color: '#94A3B8' }}>✓ </span>}
                      {conv.last?.contenu || ''}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{ background: '#1B3A6B', color: '#fff', borderRadius: '50%',
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F1F5F9', overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%',
                background: avatarColor(activeConv.partnerName),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                {initials(activeConv.partnerName)}
              </div>
              <div>
                <div style={{ color: '#1E293B', fontSize: '15px', fontWeight: '600' }}>{activeConv.partnerName}</div>
                <div style={{ color: '#64748B', fontSize: '12px', textTransform: 'capitalize' }}>{activeConv.partnerRole}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 60px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

              {activeConv.messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '8px',
                    color: '#64748B', fontSize: '13px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    Démarrez la conversation avec {activeConv.partnerName}
                  </div>
                </div>
              )}

              {activeConv.messages.map((msg, i) => {
                const isSent = !msg.isReceived
                const prevMsg = activeConv.messages[i - 1]
                const showDateSep = i === 0 || msg.date_envoi?.split(' ')[0] !== prevMsg?.date_envoi?.split(' ')[0]
                const msgKey = msg.id || i
                const isHovered = hoveredMsgId === msgKey
                const { quote, body } = parseQuote(msg.contenu)

                const ReplyBtn = (
                  <button
                    onClick={() => { setReplyTo(msg); setShowTemplates(false) }}
                    title="Répondre"
                    style={{
                      opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s',
                      background: '#E2E8F0', border: 'none', borderRadius: '50%',
                      width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#64748B', flexShrink: 0, pointerEvents: isHovered ? 'auto' : 'none'
                    }}>
                    ↩
                  </button>
                )

                return (
                  <div key={msgKey}
                    onMouseEnter={() => setHoveredMsgId(msgKey)}
                    onMouseLeave={() => setHoveredMsgId(null)}>
                    {showDateSep && (
                      <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                        <span style={{ background: '#E2E8F0', color: '#64748B', fontSize: '12px',
                          padding: '4px 14px', borderRadius: '8px' }}>
                          {msg.date_envoi?.split(' ')[0]}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start',
                      alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {!isSent && ReplyBtn}
                      <div
                        onContextMenu={e => openContextMenu(e, msg)}
                        style={{
                          maxWidth: '62%', padding: '7px 12px 5px',
                          background: isSent ? '#1B3A6B' : '#fff',
                          borderRadius: isSent ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                          position: 'relative', cursor: 'context-menu'
                        }}>
                        {quote && (
                          <div style={{
                            borderLeft: `3px solid ${isSent ? 'rgba(255,255,255,0.4)' : '#1B3A6B'}`,
                            background: isSent ? 'rgba(255,255,255,0.12)' : '#F1F5F9',
                            borderRadius: '0 4px 4px 0', padding: '4px 8px', marginBottom: '6px',
                            fontSize: '12px', fontStyle: 'italic',
                            color: isSent ? 'rgba(255,255,255,0.75)' : '#64748B',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                          }}>
                            {quote}
                          </div>
                        )}
                        {msg.objet && msg.objet !== 'Message' && (
                          <div style={{ color: isSent ? '#93C5FD' : '#1B3A6B', fontSize: '12px', fontWeight: '600', marginBottom: '3px' }}>
                            {msg.objet}
                          </div>
                        )}
                        <div style={{ color: isSent ? '#fff' : '#1E293B', fontSize: '14px', lineHeight: '1.45',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {body}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: '4px', marginTop: '3px' }}>
                          {important.has(msg.id) && <span style={{ fontSize: '11px' }}>⭐</span>}
                          <span style={{ color: isSent ? 'rgba(255,255,255,0.6)' : '#94A3B8', fontSize: '11px' }}>{msg.date_envoi?.split(' ')[1]}</span>
                          {isSent && (
                            <span style={{ fontSize: '13px', color: msg.lu ? '#93C5FD' : 'rgba(255,255,255,0.6)', lineHeight: 1 }}>✓✓</span>
                          )}
                        </div>
                      </div>
                      {isSent && ReplyBtn}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 16px', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', flexShrink: 0 }}>
                <div style={{ width: '3px', background: '#1B3A6B', borderRadius: '2px', alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#1B3A6B', marginBottom: '1px' }}>En réponse à</div>
                  <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {replyTo.contenu.replace(/\n/g, ' ').slice(0, 100)}
                  </div>
                </div>
                <button onClick={() => setReplyTo(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px', padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            )}

            {/* Templates panel */}
            {showTemplates && (
              <div style={{ borderTop: '1px solid #E2E8F0', background: '#fff', maxHeight: '280px', overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #F1F5F9',
                  fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Modèles de messages
                </div>
                {TEMPLATES.map(t => (
                  <div key={t.label} onClick={() => { setText(t.text); setShowTemplates(false) }}
                    style={{ display: 'flex', gap: '12px', padding: '10px 16px', cursor: 'pointer',
                      alignItems: 'flex-start', borderBottom: '1px solid #F1F5F9', background: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{t.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B', marginBottom: '2px' }}>{t.label}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {t.text.replace(/\n/g, ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div style={{ padding: '10px 16px', background: '#fff', borderTop: '1px solid #E2E8F0',
              display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setShowTemplates(s => !s)} title="Modèles de messages"
                style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: showTemplates ? '#EFF6FF' : '#F1F5F9', border: `1.5px solid ${showTemplates ? '#BFDBFE' : '#E2E8F0'}`,
                  cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: showTemplates ? '#1B3A6B' : '#64748B', transition: 'all 0.15s' }}>
                📋
              </button>
              <textarea value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={replyTo ? 'Écrire une réponse…' : 'Écrivez un message…'}
                rows={1}
                style={{ flex: 1, padding: '10px 14px', background: '#F1F5F9', border: '1.5px solid #E2E8F0',
                  borderRadius: '10px', color: '#1E293B', fontSize: '14px', outline: 'none',
                  resize: 'none', maxHeight: '120px', fontFamily: 'inherit', lineHeight: '1.4' }} />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                style={{ width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                  background: text.trim() ? '#1B3A6B' : '#E2E8F0', border: 'none',
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
            justifyContent: 'center', background: '#F1F5F9', gap: '16px' }}>
            <div style={{ fontSize: '72px' }}>💬</div>
            <h2 style={{ color: '#1E293B', fontSize: '24px', fontWeight: '300', margin: 0 }}>FinTrack Messagerie</h2>
            <p style={{ color: '#64748B', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '380px', lineHeight: '1.6' }}>
              Sélectionnez une conversation à gauche ou cliquez sur ✏️ pour démarrer un nouveau message.
            </p>
            <div style={{ marginTop: '8px', padding: '8px 20px', background: '#fff',
              borderRadius: '20px', color: '#64748B', fontSize: '12px', border: '1px solid #E2E8F0' }}>
              Vos messages sont chiffrés de bout en bout
            </div>
          </div>
        )}
      </div>

      {/* ── CONTEXT MENU ── */}
      {contextMenu && (
        <div onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999,
            background: '#fff', borderRadius: '12px', minWidth: '220px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0', fontFamily: 'Inter, sans-serif'
          }}>
          {[
            { icon: 'ℹ️',  label: 'Infos du message',         action: () => { setInfoModal(contextMenu.msg); setContextMenu(null) } },
            { icon: '↩',   label: 'Répondre',                  action: () => { setReplyTo(contextMenu.msg); setShowTemplates(false); setContextMenu(null) } },
            { icon: '📋',  label: 'Copier',                    action: () => copyMsg(contextMenu.msg.contenu) },
            null,
            { icon: important.has(contextMenu.msg.id) ? '⭐' : '☆',
              label: important.has(contextMenu.msg.id) ? "Retirer l'importance" : 'Marquer comme important',
              action: () => toggleImportant(contextMenu.msg.id) },
            null,
            ...(!contextMenu.msg.isReceived ? [
              { icon: '🗑️', label: 'Supprimer', danger: true, action: () => handleDelete(contextMenu.msg.id) }
            ] : [])
          ].map((item, idx) =>
            item === null
              ? <div key={idx} style={{ height: '1px', background: '#F1F5F9', margin: '3px 0' }} />
              : (
                <div key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 16px', cursor: 'pointer',
                    color: item.danger ? '#DC2626' : '#1E293B', fontSize: '14px', fontWeight: '500' }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#FEF2F2' : '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </div>
              )
          )}
        </div>
      )}

      {/* ── INFO MODAL ── */}
      {infoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setInfoModal(null)}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '360px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1E293B', fontSize: '16px', fontWeight: '700' }}>Infos du message</h3>
              <button onClick={() => setInfoModal(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '30px', height: '30px',
                  cursor: 'pointer', color: '#64748B', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {[
              { label: infoModal.isReceived ? 'Expéditeur' : 'Destinataire', value: activeConv?.partnerName },
              { label: "Date d'envoi", value: infoModal.date_envoi || '—' },
              { label: 'Statut', value: infoModal.isReceived ? '✓ Reçu' : (infoModal.lu ? '✓✓ Lu' : '✓✓ Envoyé (non lu)') },
              { label: 'Important', value: important.has(infoModal.id) ? '⭐ Oui' : 'Non' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid #F1F5F9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>{label}</span>
                <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: '600' }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: '14px', padding: '12px', background: '#F8FAFC',
              borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Contenu</div>
              <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: '1.5',
                whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                {parseQuote(infoModal.contenu).body}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW CONVERSATION MODAL ── */}
      {showNewConv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1E293B', fontSize: '17px', fontWeight: '600' }}>
                Nouvelle conversation
              </h3>
              <button onClick={() => setShowNewConv(false)}
                style={{ background: '#F1F5F9', border: 'none', color: '#64748B', fontSize: '16px', cursor: 'pointer',
                  width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
              {allUsers.length === 0 && (
                <div style={{ color: '#94A3B8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  Aucun autre utilisateur disponible
                </div>
              )}
              {allUsers.map(u => (
                <div key={u.id} onClick={() => handleNewConv(u)}
                  style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '10px',
                    cursor: 'pointer', alignItems: 'center', background: '#F8FAFC', border: '1px solid #F1F5F9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(`${u.prenom} ${u.nom}`),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                    {initials(`${u.prenom} ${u.nom}`)}
                  </div>
                  <div>
                    <div style={{ color: '#1E293B', fontSize: '14px', fontWeight: '600' }}>{u.prenom} {u.nom}</div>
                    <div style={{ color: '#64748B', fontSize: '12px', textTransform: 'capitalize' }}>{u.role}</div>
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
