import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const MODE_LABELS = {
  especes:  'Espèces',
  virement: 'Virement bancaire',
  cheque:   'Chèque',
  wave:     'Wave / Mobile Money',
}

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

export default function SuiviPaiements() {
  const [matricule, setMatricule] = useState('')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const rechercher = async (e) => {
    e.preventDefault()
    if (!matricule.trim()) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await axios.get(`${API}/etudiants/suivi`, {
        params: { matricule: matricule.trim().toUpperCase() }
      })
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Étudiant introuvable. Vérifiez le matricule.')
    } finally {
      setLoading(false)
    }
  }

  const aJour    = data?.resume?.a_jour
  const pct      = data ? Math.min(100, Math.round((data.resume.total_paye / data.resume.tarif_annuel) * 100)) : 0

  return (
    <div style={{
      minHeight: '100dvh', background: '#F0F4F8',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        background: '#1B3A6B', color: '#fff',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          background: '#2D8CFF', borderRadius: '10px',
          width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
        }}>📈</div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '18px', lineHeight: 1.2 }}>
            Fin<span style={{ color: '#2D8CFF' }}>Track</span>
          </div>
          <div style={{ fontSize: '10px', color: '#93C5FD', letterSpacing: '1px' }}>
            ISM DAKAR — ÉCOLE D'INGÉNIEURS ET DIGITAL CAMPUS
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#93C5FD', textAlign: 'right' }}>
          Portail Étudiant
        </div>
      </header>

      {/* Corps */}
      <main style={{ flex: 1, padding: '32px 16px', maxWidth: '820px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1B3A6B', margin: '0 0 8px' }}>
            Suivi de vos paiements
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Entrez votre numéro de matricule pour consulter l'historique de vos paiements et votre situation financière.
          </p>
        </div>

        {/* Formulaire de recherche */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          padding: '28px', marginBottom: '28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        }}>
          <form onSubmit={rechercher} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex : ISM2526/DK-00001"
              required
              style={{
                flex: 1, minWidth: '200px', padding: '13px 16px',
                border: '1.5px solid #E2E8F0', borderRadius: '10px',
                fontSize: '15px', outline: 'none',
                fontFamily: 'Inter, sans-serif', letterSpacing: '1px',
              }}
              onFocus={(e) => { e.target.style.border = '1.5px solid #2D8CFF' }}
              onBlur={(e)  => { e.target.style.border = '1.5px solid #E2E8F0' }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '13px 28px', background: loading ? '#93C5FD' : '#1B3A6B',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}>
              {loading ? 'Recherche...' : '🔍 Consulter'}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '16px', padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', color: '#991B1B', fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Résultats */}
        {data && (
          <>
            {/* Carte étudiant + statut */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px',
              marginBottom: '20px', alignItems: 'start',
            }}>
              {/* Info étudiant */}
              <div style={{
                background: '#fff', borderRadius: '14px',
                padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: '#1B3A6B', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '16px',
                    flexShrink: 0,
                  }}>
                    {data.etudiant.prenom?.[0]}{data.etudiant.nom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: '#1B3A6B' }}>
                      {data.etudiant.prenom} {data.etudiant.nom}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      {data.etudiant.classe} — {data.etudiant.filiere} | {data.etudiant.annee_academique}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                  <span><b style={{ color: '#1B3A6B' }}>Matricule :</b> {data.etudiant.matricule}</span>
                  {data.etudiant.email && (
                    <span><b style={{ color: '#1B3A6B' }}>Email :</b> {data.etudiant.email}</span>
                  )}
                </div>
              </div>

              {/* Statut badge */}
              <div style={{
                background: aJour ? '#F0FDF4' : '#FEF2F2',
                border: `2px solid ${aJour ? '#16A34A' : '#DC2626'}`,
                borderRadius: '14px', padding: '20px 24px',
                textAlign: 'center', minWidth: '130px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>
                  {aJour ? '✅' : '⚠️'}
                </div>
                <div style={{
                  fontWeight: '800', fontSize: '13px',
                  color: aJour ? '#16A34A' : '#DC2626',
                }}>
                  {aJour ? 'À JOUR' : 'EN RETARD'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  {aJour ? 'Aucun impayé' : `${fmt(data.resume.solde_restant)} restant`}
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '14px', marginBottom: '24px',
            }}>
              {[
                { label: 'Frais annuels',     val: fmt(data.resume.tarif_annuel),  color: '#1B3A6B', bg: '#EFF6FF' },
                { label: 'Total payé',         val: fmt(data.resume.total_paye),    color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Solde restant',      val: fmt(data.resume.solde_restant), color: data.resume.solde_restant > 0 ? '#DC2626' : '#16A34A', bg: data.resume.solde_restant > 0 ? '#FEF2F2' : '#F0FDF4' },
                { label: 'Nb. paiements',      val: data.resume.nb_paiements,       color: '#64748B', bg: '#F1F5F9' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={{
                  background: bg, borderRadius: '12px', padding: '16px',
                  textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Barre de progression */}
            <div style={{
              background: '#fff', borderRadius: '14px', padding: '20px 24px',
              marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B' }}>
                  Progression des paiements
                </span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: pct >= 100 ? '#16A34A' : '#DC2626' }}>
                  {pct}%
                </span>
              </div>
              <div style={{
                height: '12px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: pct >= 100 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626',
                  borderRadius: '99px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '8px', fontSize: '11px', color: '#94A3B8',
              }}>
                <span>S1 : {fmt(data.resume.total_s1)}</span>
                <span>S2 : {fmt(data.resume.total_s2)}</span>
              </div>
            </div>

            {/* Tableau des paiements */}
            <div style={{
              background: '#fff', borderRadius: '14px',
              overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}>
              <div style={{
                background: '#1B3A6B', color: '#fff',
                padding: '14px 20px', fontWeight: '700', fontSize: '14px',
              }}>
                Historique des paiements ({data.paiements.length})
              </div>

              {data.paiements.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  Aucun paiement enregistré pour cette année académique.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9' }}>
                        {['Référence', 'Motif', 'Montant', 'Mode', 'Caisse', 'Semestre', 'Date'].map((h) => (
                          <th key={h} style={{
                            padding: '11px 14px', textAlign: 'left',
                            fontWeight: '700', color: '#1B3A6B',
                            borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.paiements.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '11px 14px', fontWeight: '600', color: '#1B3A6B', whiteSpace: 'nowrap' }}>
                            {p.reference}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#374151' }}>{p.motif || '—'}</td>
                          <td style={{ padding: '11px 14px', fontWeight: '700', color: '#16A34A', whiteSpace: 'nowrap' }}>
                            {fmt(p.montant)}
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: '#EFF6FF', color: '#1B3A6B',
                              padding: '3px 8px', borderRadius: '20px',
                              fontSize: '11px', fontWeight: '600',
                            }}>
                              {MODE_LABELS[p.mode_paiement] || p.mode_paiement}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{p.caisse}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{
                              background: p.semestre === 'S1' ? '#EFF6FF' : '#F0FDF4',
                              color: p.semestre === 'S1' ? '#1D4ED8' : '#15803D',
                              padding: '2px 8px', borderRadius: '20px',
                              fontSize: '11px', fontWeight: '700',
                            }}>
                              {p.semestre}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {p.date_paiement}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F1F5F9', borderTop: '2px solid #E2E8F0' }}>
                        <td colSpan={2} style={{ padding: '12px 14px', fontWeight: '700', color: '#1B3A6B' }}>
                          TOTAL PAYÉ
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#16A34A' }}>
                          {fmt(data.resume.total_paye)}
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Message d'information */}
            <div style={{
              marginTop: '20px', padding: '14px 18px',
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
              fontSize: '12px', color: '#64748B',
            }}>
              ℹ️ Pour toute réclamation ou demande de reçu, contactez la Direction Administrative et Financière — DAF de l'ISM Dakar École d'Ingénieurs et Digital Campus.
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#1B3A6B', color: '#93C5FD',
        textAlign: 'center', padding: '14px',
        fontSize: '12px',
      }}>
        FinTrack © 2026 — ISM Dakar École d'Ingénieurs et Digital Campus | Portail Étudiant
      </footer>
    </div>
  )
}
