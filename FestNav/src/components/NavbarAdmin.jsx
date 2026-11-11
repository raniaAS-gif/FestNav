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
        {/* 1. Klik FestNav -> Redirect ke Dashboard */}
        <div 
          className="nav-brand" 
          onClick={() => navigate('/dashboard')}
          title="Ke Dashboard"
        >
          FestNav
        </div>

        <div className="nav-actions">
          {/* Tombol Navigasi Event */}
          <button className="btn-cyan" onClick={() => navigate('/daftar-event')}>
            Lihat Daftar Event
          </button>
          <button className="btn-cyan" onClick={() => navigate('/tambah-event')}>
            + Tambah Peta baru
          </button>

          {/* User Profile Container */}
          <div className="user-profile">
            {/* 2. Klik Nama atau Foto Profil -> Redirect ke Profile Admin */}
            <div 
              className="user-info-clickable"
              onClick={() => navigate('/profile-admin')}
              title="Lihat Profil Admin"
            >
              <span className="user-name">Admin Esai</span>
              <div className="avatar-placeholder">👤</div>
            </div>

            {/* 3. Klik Icon Logout -> Trigger Modal Overlay */}
            <button 
              className="logout-btn" 
              title="Logout"
              onClick={() => setShowLogoutModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* OVERLAY MODAL LOG OUT */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-card">
            <h2 className="logout-modal-title">Apakah anda yakin ingin log out?</h2>
            <div className="logout-modal-btn-row">
              <button 
                className="btn-cyan-modal" 
                onClick={() => setShowLogoutModal(false)}
              >
                Tidak
              </button>
              <button 
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