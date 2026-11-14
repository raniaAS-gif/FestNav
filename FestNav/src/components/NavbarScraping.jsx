import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavbarScraping.css';

export default function AdminNavbar({ userName = 'Admin Esai', avatarUrl, onLogout }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="scraping-navbar">
        <div className="nav-brand" onClick={() => navigate('/admin')}>
          FestNav
        </div>

        <div className="user-profile">
          <div className="user-info-clickable" onClick={() => navigate('/profile')}>
            <span className="user-name">{userName}</span>
            <div className="avatar-placeholder">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : '👤'}
            </div>
          </div>

          <button
            type="button"
            className="logout-btn"
            aria-label="Logout"
            onClick={() => setShowLogoutModal(true)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
      </nav>

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="logout-modal-title">Apakah Anda yakin ingin keluar?</h3>
            <div className="logout-modal-btn-row">
              <button
                type="button"
                className="btn-cyan-modal"
                onClick={handleConfirmLogout}
              >
                Ya
              </button>
              <button
                type="button"
                className="btn-cyan-modal"
                style={{ backgroundColor: '#64748b' }}
                onClick={() => setShowLogoutModal(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}