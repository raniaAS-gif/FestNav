import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './NavbarEO.css'

function NavbarEO() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  let displayName = 'Event Organizer'
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (u?.nama_organisasi || u?.nama) displayName = u.nama_organisasi || u.nama
  } catch {
    // Abaikan
  }

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    localStorage.removeItem('access_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user_type')
    localStorage.removeItem('peran')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    sessionStorage.removeItem('festnav_editor_ctx')
    navigate('/login')
  }

  return (
    <>
      <header className="eo-navbar">
        <div
          className="nav-brand"
          onClick={() => navigate('/dashboard-eo')}
          title="Ke Dashboard EO"
        >
          FestNav
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className={`btn-cyan ${location.pathname === '/daftar-event-eo' ? 'active-nav' : ''}`}
            onClick={() => navigate('/daftar-event-eo')}
          >
            Lihat Daftar Eventku
          </button>

          <button
            type="button"
            className={`btn-cyan ${location.pathname === '/tambah-event-eo' ? 'active-nav' : ''}`}
            onClick={() => navigate('/tambah-event-eo')}
          >
            + Tambah Peta baru
          </button>

          <div className="user-profile">
            <div
              className="user-info-clickable"
              onClick={() => navigate('/profile-admin', { state: { fromEO: true } })}
              title="Lihat Profil"
            >
              <span className="user-name">{displayName}</span>
              <div className="avatar-placeholder">👤</div>
            </div>

            <button
              type="button"
              className="logout-btn"
              title="Logout"
              onClick={() => setShowLogoutModal(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-card">
            <h2 className="logout-modal-title">Apakah anda yakin ingin log out?</h2>
            <div className="logout-modal-btn-row">
              <button
                type="button"
                className="btn-cyan-modal"
                onClick={() => setShowLogoutModal(false)}
              >
                Tidak
              </button>
              <button
                type="button"
                className="btn-cyan-modal"
                onClick={handleConfirmLogout}
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default NavbarEO