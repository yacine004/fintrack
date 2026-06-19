import { useState, useRef, useEffect } from 'react'

/* ── Drapeau bundlé via flag-icons (pas de requête réseau) ──────────────── */
function Flag({ code, size = 20 }) {
  return (
    <span
      className={`fi fi-${code.toLowerCase()}`}
      style={{
        width: `${size}px`,
        height: `${Math.round(size * 0.75)}px`,
        borderRadius: '2px',
        flexShrink: 0,
        display: 'inline-block',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
}

/* ── Base de données pays ──────────────────────────────────────────────────
   Chaque pays : { code, dial, name, placeholder, mask }
   ───────────────────────────────────────────────────────────────────────── */
export const COUNTRIES = [
  // ── Afrique de l'Ouest (priorité ISM) ────────────────────────────────
  { code: 'SN', dial: '+221', name: 'Sénégal',        placeholder: '77 123 45 67',    mask: '## ### ## ##' },
  { code: 'CI', dial: '+225', name: "Côte d'Ivoire",  placeholder: '07 12 34 56 78',  mask: '## ## ## ## ##' },
  { code: 'ML', dial: '+223', name: 'Mali',           placeholder: '20 23 45 67',     mask: '## ## ## ##' },
  { code: 'GN', dial: '+224', name: 'Guinée',         placeholder: '622 12 34 56',    mask: '### ## ## ##' },
  { code: 'MR', dial: '+222', name: 'Mauritanie',     placeholder: '22 12 34 56',     mask: '## ## ## ##' },
  { code: 'GM', dial: '+220', name: 'Gambie',         placeholder: '766 1234',        mask: '### ####' },
  { code: 'CV', dial: '+238', name: 'Cap-Vert',       placeholder: '912 34 56',       mask: '### ## ##' },
  { code: 'GW', dial: '+245', name: 'Guinée-Bissau',  placeholder: '955 12 34 56',    mask: '### ## ## ##' },
  { code: 'BF', dial: '+226', name: 'Burkina Faso',   placeholder: '70 12 34 56',     mask: '## ## ## ##' },
  { code: 'NE', dial: '+227', name: 'Niger',          placeholder: '93 12 34 56',     mask: '## ## ## ##' },
  { code: 'BJ', dial: '+229', name: 'Bénin',          placeholder: '97 12 34 56',     mask: '## ## ## ##' },
  { code: 'TG', dial: '+228', name: 'Togo',           placeholder: '90 12 34 56',     mask: '## ## ## ##' },
  // ── Afrique du Nord ───────────────────────────────────────────────────
  { code: 'MA', dial: '+212', name: 'Maroc',          placeholder: '06 12 34 56 78',  mask: '## ## ## ## ##' },
  { code: 'DZ', dial: '+213', name: 'Algérie',        placeholder: '0551 23 45 67',   mask: '#### ## ## ##' },
  { code: 'TN', dial: '+216', name: 'Tunisie',        placeholder: '20 123 456',      mask: '## ### ###' },
  // ── Afrique centrale / autres ─────────────────────────────────────────
  { code: 'CM', dial: '+237', name: 'Cameroun',       placeholder: '6 71 23 45 67',   mask: '# ## ## ## ##' },
  { code: 'GH', dial: '+233', name: 'Ghana',          placeholder: '24 123 4567',     mask: '## ### ####' },
  { code: 'NG', dial: '+234', name: 'Nigeria',        placeholder: '802 123 4567',    mask: '### ### ####' },
  { code: 'CG', dial: '+242', name: 'Congo',          placeholder: '06 123 4567',     mask: '## ### ####' },
  { code: 'CD', dial: '+243', name: 'RD Congo',       placeholder: '812 345 678',     mask: '### ### ###' },
  { code: 'GA', dial: '+241', name: 'Gabon',          placeholder: '06 12 34 56',     mask: '## ## ## ##' },
  // ── Europe ────────────────────────────────────────────────────────────
  { code: 'FR', dial: '+33',  name: 'France',         placeholder: '6 12 34 56 78',   mask: '# ## ## ## ##' },
  { code: 'BE', dial: '+32',  name: 'Belgique',       placeholder: '471 23 45 67',    mask: '### ## ## ##' },
  { code: 'PT', dial: '+351', name: 'Portugal',       placeholder: '912 345 678',     mask: '### ### ###' },
  { code: 'ES', dial: '+34',  name: 'Espagne',        placeholder: '612 34 56 78',    mask: '### ## ## ##' },
  { code: 'GB', dial: '+44',  name: 'Royaume-Uni',    placeholder: '7911 123456',     mask: '#### ######' },
  { code: 'CH', dial: '+41',  name: 'Suisse',         placeholder: '78 123 45 67',    mask: '## ### ## ##' },
  // ── Amérique du Nord ──────────────────────────────────────────────────
  { code: 'US', dial: '+1',   name: 'États-Unis',     placeholder: '(555) 123-4567',  mask: '(###) ###-####' },
  { code: 'CA', dial: '+1',   name: 'Canada',         placeholder: '(555) 123-4567',  mask: '(###) ###-####' },
]

const DEFAULT = COUNTRIES[0] // Sénégal par défaut

/* ── Parseur : détecter indicatif depuis une valeur stockée ─────────────── */
export function parsePhone(value) {
  if (!value) return { country: DEFAULT, local: '' }
  const clean = value.startsWith('+') ? value : `+${value}`
  const found = COUNTRIES.find(c => clean.startsWith(c.dial))
  if (found) return { country: found, local: clean.slice(found.dial.length).replace(/\s/g, '') }
  return { country: DEFAULT, local: value.replace(/\D/g, '') }
}

/* ── Formatage automatique du numéro local ──────────────────────────────── */
function formatLocal(digits, mask) {
  const d = digits.replace(/\D/g, '')
  let result = ''; let di = 0
  for (let i = 0; i < mask.length && di < d.length; i++) {
    const ch = mask[i]
    if (ch === '#') { result += d[di++] }
    else            { result += ch }
  }
  return result
}

/* ── Affichage lecture seule avec drapeau ───────────────────────────────── */
export function PhoneDisplay({ value, style = {} }) {
  if (!value) return <span style={{ color: '#94A3B8', ...style }}>—</span>
  const { country, local } = parsePhone(value)
  const formatted = local ? formatLocal(local, country.mask) : ''
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>
      <Flag code={country.code} size={18} />
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>{country.dial}</span>
      <span style={{ fontSize: '13px', color: '#1E293B', letterSpacing: '0.3px' }}>{formatted || local}</span>
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Composant PhoneInput
   Props :
     value    : string — valeur complète stockée (+221 77 123 45 67)
     onChange : fn(fullValue)
     disabled : bool
   ══════════════════════════════════════════════════════════════════════════ */
export default function PhoneInput({ value, onChange, disabled = false, style = {} }) {
  const parsed                = parsePhone(value)
  const [country, setCountry] = useState(parsed.country)
  const [local, setLocal]     = useState(parsed.local ? formatLocal(parsed.local, parsed.country.mask) : '')
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [focused, setFocused] = useState(false)
  const dropRef               = useRef(null)
  const searchRef             = useRef(null)

  // Sync depuis l'extérieur (mode édition)
  useEffect(() => {
    const p = parsePhone(value)
    setCountry(p.country)
    setLocal(p.local ? formatLocal(p.local, p.country.mask) : '')
  }, [value])

  // Fermer dropdown en cliquant ailleurs
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Focus barre de recherche à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const handleSelectCountry = (c) => {
    setCountry(c)
    setSearch('')
    setOpen(false)
    const digits = local.replace(/\D/g, '')
    const formatted = formatLocal(digits, c.mask)
    setLocal(formatted)
    onChange(digits ? `${c.dial} ${formatted}` : '')
  }

  const handleLocalChange = (e) => {
    const digits   = e.target.value.replace(/\D/g, '')
    const maxLen   = country.mask.replace(/[^#]/g, '').length
    const trimmed  = digits.slice(0, maxLen)
    const formatted = formatLocal(trimmed, country.mask)
    setLocal(formatted)
    onChange(trimmed ? `${country.dial} ${formatted}` : '')
  }

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  const ringColor = focused ? '#1B3A6B' : '#E2E8F0'

  return (
    <div style={{ position: 'relative', ...style }} ref={dropRef}>

      {/* Input combiné */}
      <div style={{
        display: 'flex', border: `1.5px solid ${ringColor}`,
        borderRadius: '9px', overflow: 'hidden',
        background: disabled ? '#F8FAFC' : '#fff',
        boxShadow: focused ? '0 0 0 3px rgba(27,58,107,0.10)' : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}>

        {/* Bouton indicatif */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '0 10px 0 12px', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? '#F1F5F9' : open ? '#F0F7FF' : '#F8FAFC',
            borderRight: `1.5px solid ${ringColor}`, flexShrink: 0,
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
            color: '#1E293B', transition: 'background 0.15s', minWidth: '92px',
          }}>
          <Flag code={country.code} size={20} />
          <span style={{ color: '#475569', letterSpacing: '0.2px' }}>{country.dial}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ marginLeft: '1px', transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="#94A3B8" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Numéro */}
        <input
          type="tel"
          value={local}
          onChange={handleLocalChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={country.placeholder}
          style={{
            flex: 1, padding: '9px 12px', border: 'none', outline: 'none',
            fontSize: '13px', fontFamily: 'Inter, sans-serif', background: 'transparent',
            color: disabled ? '#94A3B8' : '#1E293B', letterSpacing: '0.5px',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#fff', borderRadius: '12px', width: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #E2E8F0', overflow: 'hidden',
          animation: 'fadeInUp 0.15s ease both',
        }}>

          {/* Barre de recherche */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#94A3B8" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un pays ou indicatif…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px',
                fontFamily: 'Inter, sans-serif', background: 'transparent', color: '#1E293B' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94A3B8', fontSize: '14px', padding: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* Liste pays */}
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center',
                color: '#94A3B8', fontSize: '13px' }}>
                Aucun résultat
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: c.code === country.code ? '#EFF6FF' : 'transparent',
                    fontFamily: 'Inter, sans-serif', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (c.code !== country.code) e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={e => { if (c.code !== country.code) e.currentTarget.style.background = 'transparent' }}>
                  <Flag code={c.code} size={22} />
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: '500',
                    color: '#1E293B' }}>{c.name}</span>
                  <span style={{
                    fontSize: '12px', fontWeight: '700',
                    color: c.code === country.code ? '#1B3A6B' : '#94A3B8',
                    background: c.code === country.code ? '#BFDBFE' : '#F1F5F9',
                    padding: '2px 7px', borderRadius: '5px',
                  }}>{c.dial}</span>
                  {c.code === country.code && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#1B3A6B" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #F1F5F9',
            fontSize: '11px', color: '#CBD5E1', background: '#FAFBFC',
            display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flag code={country.code} size={14} />
            <span>{filtered.length} pays · {country.name} sélectionné</span>
          </div>
        </div>
      )}
    </div>
  )
}
