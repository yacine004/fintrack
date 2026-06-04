import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import RafDashboard from './pages/raf/Dashboard'
import RafUtilisateurs from './pages/raf/Utilisateurs'
import RafProfil from './pages/raf/Profil'
import ComptableDashboard from './pages/comptable/Dashboard'
import ComptableProfil from './pages/comptable/Profil'

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

        {/* RAF */}
        <Route path="/raf/dashboard" element={
          <PrivateRoute role="raf"><RafDashboard /></PrivateRoute>
        }/>
        <Route path="/raf/utilisateurs" element={
          <PrivateRoute role="raf"><RafUtilisateurs /></PrivateRoute>
        }/>
        <Route path="/raf/profil" element={
          <PrivateRoute role="raf"><RafProfil /></PrivateRoute>
        }/>

        {/* COMPTABLE */}
        <Route path="/comptable/dashboard" element={
          <PrivateRoute role="comptable"><ComptableDashboard /></PrivateRoute>
        }/>
        <Route path="/comptable/profil" element={
          <PrivateRoute role="comptable"><ComptableProfil /></PrivateRoute>
        }/>
      </Routes>
    </BrowserRouter>
  )
}
