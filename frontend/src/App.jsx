import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Sprint 1
import Login              from './pages/Login'
import RafUtilisateurs    from './pages/raf/Utilisateurs'
import RafProfil          from './pages/raf/Profil'
import ComptableProfil    from './pages/comptable/Profil'

// Sprint 2
import RafEtudiants       from './pages/raf/Etudiants'
import RafCaisses         from './pages/raf/Caisses'
import ComptableEtudiants from './pages/comptable/Etudiants'

// Sprint 3
import RafPaiements       from './pages/raf/Paiements'
import RafImpayes         from './pages/raf/Impayes'
import ComptablePaiements from './pages/comptable/Paiements'

// Sprint 4
import RafDepenses        from './pages/raf/Depenses'
import RafBudgets         from './pages/raf/Budgets'
import ComptableDepenses  from './pages/comptable/Depenses'
import ComptableCaisses   from './pages/comptable/Caisses'

// Sprint 5
import RafDashboard       from './pages/raf/Dashboard'
import RafRapports        from './pages/raf/Rapports'
import ComptableDashboard from './pages/comptable/Dashboard'

// Sprint 7 — Inscriptions (RAF uniquement)
import RafInscriptions        from './pages/raf/Inscriptions'

// Sprint 8 — Alertes, Autorisations, Paramétrage
import RafAlertes             from './pages/raf/Alertes'
import RafAutorisations       from './pages/raf/Autorisations'
import RafParametrage         from './pages/raf/Parametrage'

// Sprint 9 — Frais annexes
import RafFraisAnnexes        from './pages/raf/FraisAnnexes'
import ComptableFraisAnnexes  from './pages/comptable/FraisAnnexes'

// Sprint 6
import RafMessagerie         from './pages/raf/Messagerie'
import RafAuditLog           from './pages/raf/AuditLog'
import RafNotifications      from './pages/raf/Notifications'
import ComptableMessagerie   from './pages/comptable/Messagerie'
import ComptableNotifications from './pages/raf/Notifications'

// Public
import SuiviPaiements from './pages/SuiviPaiements'

function PrivateRoute({ children, role }) {
  const user  = JSON.parse(localStorage.getItem('user') || 'null')
  const token = localStorage.getItem('token')
  if (!token || !user) return <Navigate to="/" />
  if (role && user.role !== role) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/suivi-paiements" element={<SuiviPaiements />} />

        {/* ── RAF ── */}
        <Route path="/raf/dashboard"    element={<PrivateRoute role="raf"><RafDashboard /></PrivateRoute>} />
        <Route path="/raf/utilisateurs" element={<PrivateRoute role="raf"><RafUtilisateurs /></PrivateRoute>} />
        <Route path="/raf/profil"       element={<PrivateRoute role="raf"><RafProfil /></PrivateRoute>} />
        <Route path="/raf/etudiants"    element={<PrivateRoute role="raf"><RafEtudiants /></PrivateRoute>} />
        <Route path="/raf/caisses"      element={<PrivateRoute role="raf"><RafCaisses /></PrivateRoute>} />
        <Route path="/raf/paiements"    element={<PrivateRoute role="raf"><RafPaiements /></PrivateRoute>} />
        <Route path="/raf/impayes"      element={<PrivateRoute role="raf"><RafImpayes /></PrivateRoute>} />
        <Route path="/raf/depenses"     element={<PrivateRoute role="raf"><RafDepenses /></PrivateRoute>} />
        <Route path="/raf/budgets"      element={<PrivateRoute role="raf"><RafBudgets /></PrivateRoute>} />
        <Route path="/raf/rapports"     element={<PrivateRoute role="raf"><RafRapports /></PrivateRoute>} />
        <Route path="/raf/messagerie"   element={<PrivateRoute role="raf"><RafMessagerie /></PrivateRoute>} />
        <Route path="/raf/audit"          element={<PrivateRoute role="raf"><RafAuditLog /></PrivateRoute>} />
        <Route path="/raf/notifications"   element={<PrivateRoute role="raf"><RafNotifications /></PrivateRoute>} />
        <Route path="/raf/inscriptions"    element={<PrivateRoute role="raf"><RafInscriptions /></PrivateRoute>} />
        <Route path="/raf/alertes"         element={<PrivateRoute role="raf"><RafAlertes /></PrivateRoute>} />
        <Route path="/raf/autorisations"   element={<PrivateRoute role="raf"><RafAutorisations /></PrivateRoute>} />
        <Route path="/raf/parametrage"     element={<PrivateRoute role="raf"><RafParametrage /></PrivateRoute>} />
        <Route path="/raf/frais-annexes"   element={<PrivateRoute role="raf"><RafFraisAnnexes /></PrivateRoute>} />

        {/* ── COMPTABLE ── */}
        <Route path="/comptable/dashboard"   element={<PrivateRoute role="comptable"><ComptableDashboard /></PrivateRoute>} />
        <Route path="/comptable/profil"      element={<PrivateRoute role="comptable"><ComptableProfil /></PrivateRoute>} />
        <Route path="/comptable/etudiants"   element={<PrivateRoute role="comptable"><ComptableEtudiants /></PrivateRoute>} />
        <Route path="/comptable/paiements"   element={<PrivateRoute role="comptable"><ComptablePaiements /></PrivateRoute>} />
        <Route path="/comptable/depenses"    element={<PrivateRoute role="comptable"><ComptableDepenses /></PrivateRoute>} />
        <Route path="/comptable/caisses"    element={<PrivateRoute role="comptable"><ComptableCaisses /></PrivateRoute>} />
        <Route path="/comptable/frais-annexes" element={<PrivateRoute role="comptable"><ComptableFraisAnnexes /></PrivateRoute>} />
        <Route path="/comptable/messagerie"     element={<PrivateRoute role="comptable"><ComptableMessagerie /></PrivateRoute>} />
        <Route path="/comptable/notifications"  element={<PrivateRoute role="comptable"><ComptableNotifications /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
