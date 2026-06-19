import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Cette page est fusionnée avec Alertes (calcul écheancier ISM réel)
export default function RafImpayes() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/raf/alertes', { replace: true }) }, [navigate])
  return null
}
