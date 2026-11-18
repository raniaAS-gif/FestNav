import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './NavbarAdmin.css'

function NavbarAdmin() {
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    navigate('/login')
  }

  return (
    <>
      <header className="admin-navbar">
        {/* Klik FestNav -> Redirect ke Dashboard Admin */}
        <div
          className="nav-brand"
          onClick={() => navigate('/dashboard')}
          title="Ke Dashboard"
        >
          FestNav
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="btn-cyan"
            onClick={() => navigate('/daftar-event')}
          >
            Lihat Daftar Event
          </button>
          <button
            type="button"
            className="btn-cyan"
            onClick={() => navigate('/tambah-event')}
          >
            + Tambah Peta baru
          </button>

          {/* User Profile & Logout */}
          <div className="user-profile">
            <div
              className="user-info-clickable"
              onClick={() => navigate('/profile-admin')}
              title="Lihat Profil Admin"
            >
              <span className="user-name">Admin Esai</span>
              <div className="avatar-placeholder">👤</div>
            </div>

            {/* Tombol Icon Logout */}
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

      {/* OVERLAY MODAL PERINGATAN LOG OUT */}
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

export default NavbarAdmin