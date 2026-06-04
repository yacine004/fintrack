import Sidebar from '../../components/Sidebar'
import KpiCard from '../../components/KpiCard'

const paiements = [
  { heure:'10h32', etudiant:'Diallo Amadou', montant:'+250 000', mode:'Espèces', statut:'Validé' },
  { heure:'09h15', etudiant:'Ba Yacine', montant:'+125 000', mode:'Wave', statut:'Validé' },
  { heure:'08h50', etudiant:'Koné Bakary', montant:'+250 000', mode:'Orange Money', statut:'Validé' },
]

export default function ComptableDashboard() {
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
              Tableau de bord — Comptable
            </h2>
            <p style={{ margin:0, color:'#64748B', fontSize:'12px' }}>
              {user.prenom} {user.nom} — Caisse principale active
            </p>
          </div>
          <button style={{ background:'#1B3A6B', color:'#fff', border:'none',
            borderRadius:'8px', padding:'10px 20px', fontSize:'13px',
            fontWeight:'600', cursor:'pointer' }}>
            + Nouveau paiement
          </button>
        </div>

        <div style={{ padding:'24px 28px' }}>

          {/* KPI */}
          <div style={{ display:'flex', gap:'16px', marginBottom:'24px' }}>
            <KpiCard title="Paiements aujourd'hui" value="8"
              change="2 000 000 FCFA encaissés" changeType="up" color="green"/>
            <KpiCard title="Solde caisse active" value="4 250 000 FCFA"
              change="Caisse principale" changeType="up" color="blue"/>
            <KpiCard title="Dépenses du jour" value="3"
              change="123 000 FCFA" changeType="down" color="red"/>
          </div>

          {/* Liste paiements */}
          <div style={{ background:'#fff', borderRadius:'10px',
            border:'1px solid #E2E8F0', padding:'20px' }}>
            <h3 style={{ margin:'0 0 16px', color:'#1B3A6B', fontSize:'14px', fontWeight:'600' }}>
              Paiements enregistrés aujourd'hui
            </h3>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Heure','Étudiant','Montant','Mode','Statut'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left',
                      color:'#64748B', fontWeight:'600', fontSize:'11px',
                      textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paiements.map((p, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F1F5F9' }}>
                    <td style={{ padding:'12px 14px', color:'#64748B' }}>{p.heure}</td>
                    <td style={{ padding:'12px 14px', fontWeight:'500' }}>{p.etudiant}</td>
                    <td style={{ padding:'12px 14px', fontWeight:'700', color:'#10B981' }}>
                      {p.montant} FCFA
                    </td>
                    <td style={{ padding:'12px 14px', color:'#64748B' }}>{p.mode}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ background:'#D1FAE5', color:'#065F46',
                        borderRadius:'20px', padding:'4px 12px',
                        fontSize:'11px', fontWeight:'600' }}>✓ {p.statut}</span>
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