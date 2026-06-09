import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Sprint 1
import Login              from './pages/Login'
import RafDashboard       from './pages/raf/Dashboard'
import RafUtilisateurs    from './pages/raf/Utilisateurs'
import RafProfil          from './pages/raf/Profil'
import ComptableDashboard from './pages/comptable/Dashboard'
import ComptableProfil    from './pages/comptable/Profil'

// Sprint 2
import RafEtudiants       from './pages/raf/Etudiants'
import RafCaisses         from './pages/raf/Caisses'
import ComptableEtudiants from './pages/comptable/Etudiants'

// Sprint 3
import RafPaiements       from './pages/raf/Paiements'
import RafImpayes         from './pages/raf/Impayes'
import ComptablePaiements from './pages/comptable/Paiements'

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

        {/* ── RAF ── */}
        <Route path="/raf/dashboard"    element={<PrivateRoute role="raf"><RafDashboard /></PrivateRoute>} />
        <Route path="/raf/utilisateurs" element={<PrivateRoute role="raf"><RafUtilisateurs /></PrivateRoute>} />
        <Route path="/raf/profil"       element={<PrivateRoute role="raf"><RafProfil /></PrivateRoute>} />
        <Route path="/raf/etudiants"    element={<PrivateRoute role="raf"><RafEtudiants /></PrivateRoute>} />
        <Route path="/raf/caisses"      element={<PrivateRoute role="raf"><RafCaisses /></PrivateRoute>} />
        <Route path="/raf/paiements"    element={<PrivateRoute role="raf"><RafPaiements /></PrivateRoute>} />
        <Route path="/raf/impayes"      element={<PrivateRoute role="raf"><RafImpayes /></PrivateRoute>} />

        {/* ── COMPTABLE ── */}
        <Route path="/comptable/dashboard"  element={<PrivateRoute role="comptable"><ComptableDashboard /></PrivateRoute>} />
        <Route path="/comptable/profil"     element={<PrivateRoute role="comptable"><ComptableProfil /></PrivateRoute>} />
        <Route path="/comptable/etudiants"  element={<PrivateRoute role="comptable"><ComptableEtudiants /></PrivateRoute>} />
        <Route path="/comptable/paiements"  element={<PrivateRoute role="comptable"><ComptablePaiements /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
