import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './NavbarEO.css'

function NavbarEO() {
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    navigate('/login')
  }

  return (
    <>
      <header className="eo-navbar">
        {/* Klik FestNav -> Redirect ke Dashboard EO */}
        <div 
          className="nav-brand" 
          onClick={() => navigate('/dashboard-eo')}
          title="Ke Dashboard EO"
        >
          FestNav
        </div>

        <div className="nav-actions">
          {/* Tombol Navigasi Khusus EO */}
          <button className="btn-cyan" onClick={() => navigate('/daftar-event-eo')}>
            Lihat Daftar Eventku
          </button>
          <button className="btn-cyan" onClick={() => navigate('/tambah-event-eo')}>
            + Tambah Peta baru
          </button>

          {/* User Profile Container */}
          <div className="user-profile">
            {/* Klik Nama atau Foto Profil -> Redirect ke Profile EO */}
            <div 
              className="user-info-clickable"
              onClick={() => navigate('/profile-eo')}
              title="Lihat Profil EO"
            >
              <span className="user-name">EO Esai</span>
              <div className="avatar-placeholder">👤</div>
            </div>

            {/* Klik Icon Logout -> Munculkan Overlay Konfirmasi */}
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

      {/* OVERLAY MODAL PERINGATAN LOG OUT */}
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

export default NavbarEO