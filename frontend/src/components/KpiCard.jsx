export default function KpiCard({ title, value, change, changeType, color }) {
  const colors = {
    blue: '#1B3A6B', green: '#10B981',
    red: '#EF4444', orange: '#F59E0B'
  }
  return (
    <div style={{ background:'#fff', borderRadius:'10px',
      border:'1px solid #E2E8F0', padding:'20px',
      borderTop:`4px solid ${colors[color] || colors.blue}`, flex:1 }}>
      <p style={{ color:'#64748B', fontSize:'12px', margin:'0 0 8px',
        fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>
        {title}
      </p>
      <p style={{ color:'#1B3A6B', fontSize:'24px', fontWeight:'700', margin:'0 0 6px' }}>
        {value}
      </p>
      {change && (
        <p style={{ fontSize:'12px', margin:0,
          color: changeType === 'up' ? '#10B981' : changeType === 'down' ? '#EF4444' : '#F59E0B' }}>
          {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '⚠'} {change}
        </p>
      )}
    </div>
  )
}