import Sidebar from '../../components/Sidebar'
import KpiCard from '../../components/KpiCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const barData = [
  { mois:'Déc', paiements:1100000, depenses:380000 },
  { mois:'Jan', paiements:1250000, depenses:420000 },
  { mois:'Fév', paiements:980000,  depenses:310000 },
  { mois:'Mar', paiements:1400000, depenses:500000 },
  { mois:'Avr', paiements:1180000, depenses:390000 },
  { mois:'Mai', paiements:1320000, depenses:380000 },
]

const pieData = [
  { name:'Personnel', value:40 },
  { name:'Matériel', value:26 },
  { name:'Entretien', value:16 },
  { name:'Autre', value:18 },
]
const PIE_COLORS = ['#1B3A6B','#2D8CFF','#10B981','#F59E0B']

const operations = [
  { date:'13/05/2026', etudiant:'Diallo Amadou', type:'Paiement scolarité', montant:'+250 000', statut:'Validé', color:'#D1FAE5', textColor:'#065F46' },
  { date:'13/05/2026', etudiant:'Ba Fatou', type:'Dépense entretien', montant:'-45 000', statut:'Dépassement', color:'#FEE2E2', textColor:'#991B1B' },
  { date:'12/05/2026', etudiant:'Koné Ibrahima', type:'Paiement partiel', montant:'+125 000', statut:'Partiel', color:'#FEF3C7', textColor:'#92400E' },
  { date:'12/05/2026', etudiant:'Sow Mariama', type:'Paiement scolarité', montant:'+250 000', statut:'Validé', color:'#D1FAE5', textColor:'#065F46' },
  { date:'11/05/2026', etudiant:'Ndiaye Omar', type:'Dépense matériel', montant:'-78 000', statut:'Validé', color:'#D1FAE5', textColor:'#065F46' },
]

export default function RafDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F8FAFC',
      fontFamily:'Inter, sans-serif' }}>
      <Sidebar />

      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'#fff', padding:'14px 28px',
          borderBottom:'1px solid #E2E8F0', display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, color:'#1B3A6B', fontWeight:'700', fontSize:'18px' }}>
              Tableau de bord
            </h2>
            <p style={{ margin:0, color:'#64748B', fontSize:'12px' }}>
              Bienvenue, {user.prenom} {user.nom} — Mercredi 13 mai 2026
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ position:'relative' }}>
              <div style={{ background:'#F1F5F9', borderRadius:'8px',
                padding:'8px 12px', fontSize:'20px', cursor:'pointer' }}>🔔</div>
              <div style={{ position:'absolute', top:'-4px', right:'-4px',
                background:'#EF4444', borderRadius:'50%', width:'16px',
                height:'16px', display:'flex', alignItems:'center',
                justifyContent:'center', color:'#fff', fontSize:'10px',
                fontWeight:'700' }}>3</div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ padding:'24px 28px', flex:1 }}>

          {/* KPI */}
          <div style={{ display:'flex', gap:'16px', marginBottom:'24px' }}>
            <KpiCard title="Solde global" value="4 250 000 FCFA"
              change="+12% vs mois dernier" changeType="up" color="blue"/>
            <KpiCard title="Paiements du mois" value="1 320 000 FCFA"
              change="48 paiements" changeType="up" color="green"/>
            <KpiCard title="Dépenses du mois" value="380 000 FCFA"
              change="5 dépassements" changeType="down" color="red"/>
            <KpiCard title="Impayés" value="12 étudiants"
              change="À relancer" changeType="warn" color="orange"/>
          </div>

          {/* Graphiques */}
          <div style={{ display:'flex', gap:'16px', marginBottom:'24px' }}>

            <div style={{ flex:2, background:'#fff', borderRadius:'10px',
              border:'1px solid #E2E8F0', padding:'20px' }}>
              <h3 style={{ margin:'0 0 16px', color:'#1B3A6B', fontSize:'14px',
                fontWeight:'600' }}>Paiements vs Dépenses (6 mois)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="mois" tick={{ fontSize:11 }}/>
                  <YAxis tick={{ fontSize:10 }}
                    tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                  <Tooltip formatter={v => `${v.toLocaleString()} FCFA`}/>
                  <Bar dataKey="paiements" fill="#1B3A6B" radius={[4,4,0,0]} name="Paiements"/>
                  <Bar dataKey="depenses" fill="#2D8CFF" radius={[4,4,0,0]} name="Dépenses"/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex:1, background:'#fff', borderRadius:'10px',
              border:'1px solid #E2E8F0', padding:'20px' }}>
              <h3 style={{ margin:'0 0 16px', color:'#1B3A6B', fontSize:'14px',
                fontWeight:'600' }}>Répartition des dépenses</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55}
                    outerRadius={80} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]}/>
                    ))}
                  </Pie>
                  <Legend iconSize={10} wrapperStyle={{ fontSize:'11px' }}/>
                  <Tooltip formatter={v => `${v}%`}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau opérations */}
          <div style={{ background:'#fff', borderRadius:'10px',
            border:'1px solid #E2E8F0', padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ margin:0, color:'#1B3A6B', fontSize:'14px', fontWeight:'600' }}>
                Dernières opérations
              </h3>
              <button style={{ background:'#1B3A6B', color:'#fff', border:'none',
                borderRadius:'6px', padding:'8px 16px', fontSize:'12px',
                fontWeight:'600', cursor:'pointer' }}>
                Voir tout →
              </button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Date','Étudiant','Type','Montant','Statut'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left',
                      color:'#64748B', fontWeight:'600', fontSize:'11px',
                      textTransform:'uppercase', letterSpacing:'0.5px',
                      borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F1F5F9',
                    background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding:'12px 14px', color:'#64748B' }}>{op.date}</td>
                    <td style={{ padding:'12px 14px', fontWeight:'500', color:'#1E293B' }}>
                      {op.etudiant}
                    </td>
                    <td style={{ padding:'12px 14px', color:'#64748B' }}>{op.type}</td>
                    <td style={{ padding:'12px 14px', fontWeight:'700',
                      color: op.montant.startsWith('+') ? '#10B981' : '#EF4444' }}>
                      {op.montant} FCFA
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ background:op.color, color:op.textColor,
                        borderRadius:'20px', padding:'4px 12px', fontSize:'11px',
                        fontWeight:'600' }}>{op.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}