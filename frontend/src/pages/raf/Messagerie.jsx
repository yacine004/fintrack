import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

const API = 'http://localhost:5000/api'
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

function ModalNouveauMessage({ destinataires, onClose, onSave }) {
  const [form, setForm]       = useState({ id_destinataire: '', objet: '', contenu: '' })
  const [erreur, setErreur]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.id_destinataire || !form.objet || !form.contenu) {
      setErreur('Destinataire, objet et contenu sont obligatoires')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`${API}/messages`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.message); return }
      onSave()
      onClose()
    } catch { setErreur('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '540px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700' }}>✉️ Nouveau message</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        {erreur && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
            ⚠️ {erreur}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Destinataire *</label>
            <select name="id_destinataire" value={form.id_destinataire} onChange={handleChange} style={inputStyle}>
              <option value="">Sélectionner</option>
              {destinataires.map(u => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} — {u.role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Objet *</label>
            <input name="objet" value={form.objet} onChange={handleChange}
              placeholder="Objet du message" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Message *</label>
            <textarea name="contenu" value={form.contenu} onChange={handleChange}
              placeholder="Rédigez votre message..." rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid #E2E8F0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '10px 24px', background: loading ? '#94A3B8' : '#1B3A6B',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {loading ? '⏳...' : '📤 Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailMessage({ message, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '32px',
        width: '580px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1B3A6B', fontWeight: '700', flex: 1, marginRight: '16px' }}>
            {message.objet}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
            <strong>De :</strong> {message.expediteur} ({message.expediteur_role})
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
            <strong>À :</strong> {message.destinataire}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            {message.date_envoi}
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {message.contenu}
        </div>
      </div>
    </div>
  )
}

export default function RafMessagerie() {
  const [onglet, setOnglet]           = useState('recus')
  const [messages, setMessages]       = useState([])
  const [nbNonLus, setNbNonLus]       = useState(0)
  const [destinataires, setDestinataires] = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [detail, setDetail]           = useState(null)
  const [page, setPage]               = useState(1)
  const [nbPages, setNbPages]         = useState(1)
  const [total, setTotal]             = useState(0)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = onglet === 'recus' ? 'recus' : 'envoyes'
      const res      = await fetch(`${API}/messages/${endpoint}?page=${page}&limit=10`, { headers: getHeaders() })
      const data     = await res.json()
      if (res.ok) {
        setMessages(data.messages)
        setTotal(data.total)
        setNbPages(data.nb_pages)
        if (onglet === 'recus') setNbNonLus(data.nb_non_lus || 0)
      }
    } catch {}
    finally { setLoading(false) }
  }, [onglet, page])

  const fetchDestinataires = async () => {
    try {
      const res  = await fetch(`${API}/messages/destinataires`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setDestinataires(data.utilisateurs)
    } catch {}
  }

  useEffect(() => { fetchMessages() }, [fetchMessages])
  useEffect(() => { fetchDestinataires() }, [])

  const handleOuvrir = async (msg) => {
    setDetail(msg)
    if (!msg.lu && onglet === 'recus') {
      try {
        await fetch(`${API}/messages/${msg.id}/lu`, { method: 'PUT', headers: getHeaders() })
        fetchMessages()
      } catch {}
    }
  }

  const tabStyle = (active) => ({
    padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600',
    background: active ? '#1B3A6B' : 'transparent',
    color: active ? '#fff' : '#64748B'
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#1B3A6B' }}>✉️ Messagerie</h1>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '14px' }}>
              Communication interne FinTrack
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '11px 22px', background: '#1B3A6B', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ✏️ Nouveau message
          </button>
        </div>

        {/* Onglets */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '8px',
          marginBottom: '20px', display: 'inline-flex', gap: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button style={tabStyle(onglet === 'recus')} onClick={() => { setOnglet('recus'); setPage(1) }}>
            📥 Reçus {nbNonLus > 0 && (
              <span style={{ background: '#DC2626', color: '#fff', borderRadius: '20px',
                padding: '1px 7px', fontSize: '11px', marginLeft: '6px' }}>
                {nbNonLus}
              </span>
            )}
          </button>
          <button style={tabStyle(onglet === 'envoyes')} onClick={() => { setOnglet('envoyes'); setPage(1) }}>
            📤 Envoyés
          </button>
        </div>

        {/* Liste messages */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>⏳ Chargement...</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✉️</div>
              {onglet === 'recus' ? 'Aucun message reçu' : 'Aucun message envoyé'}
            </div>
          ) : messages.map((msg, i) => (
            <div key={msg.id} onClick={() => handleOuvrir(msg)}
              style={{
                padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
                background: (!msg.lu && onglet === 'recus') ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#FAFBFC',
                cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'flex-start',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F7FF'}
              onMouseLeave={e => e.currentTarget.style.background = (!msg.lu && onglet === 'recus') ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#FAFBFC'}>

              {/* Avatar */}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: '#1B3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                {(onglet === 'recus' ? msg.expediteur : msg.destinataire)?.[0]?.toUpperCase() || '?'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontSize: '14px', fontWeight: (!msg.lu && onglet === 'recus') ? '700' : '600',
                    color: '#1E293B' }}>
                    {onglet === 'recus' ? msg.expediteur : msg.destinataire}
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400', marginLeft: '6px' }}>
                      ({onglet === 'recus' ? msg.expediteur_role : ''})
                    </span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8', flexShrink: 0 }}>{msg.date_envoi}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: (!msg.lu && onglet === 'recus') ? '600' : '500',
                  color: '#374151', marginBottom: '2px' }}>{msg.objet}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', overflow: 'hidden',
                  whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {msg.contenu}
                </div>
              </div>

              {!msg.lu && onglet === 'recus' && (
                <div style={{ width: '10px', height: '10px', borderRadius: '50%',
                  background: '#2563EB', flexShrink: 0, marginTop: '6px' }} />
              )}
            </div>
          ))}

          {nbPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← Préc.</button>
              <span style={{ fontSize: '13px', color: '#64748B', alignSelf: 'center' }}>Page {page} / {nbPages}</span>
              <button onClick={() => setPage(p => Math.min(nbPages, p + 1))} disabled={page === nbPages}
                style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: '6px',
                  background: '#fff', cursor: page === nbPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>Suiv. →</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ModalNouveauMessage destinataires={destinataires}
          onClose={() => setShowModal(false)} onSave={() => fetchMessages()} />
      )}
      {detail && <DetailMessage message={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
