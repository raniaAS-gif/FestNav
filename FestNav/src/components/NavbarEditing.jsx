import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './NavbarEditing.css';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function getEditorContext(locationState) {
  if (locationState && (locationState.id_map || locationState.eventId)) {
    try {
      sessionStorage.setItem('festnav_editor_ctx', JSON.stringify(locationState));
    } catch {
      // Abaikan jika storage penuh
    }
    return locationState;
  }
  try {
    return JSON.parse(sessionStorage.getItem('festnav_editor_ctx') || 'null') || locationState || {};
  } catch {
    return locationState || {};
  }
}

export default function Navbar({ userName, avatarUrl, onLogout, onBrandClick }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = getStoredUser();
  const displayName = userName || storedUser?.nama || storedUser?.username || '';
  const editorState = getEditorContext(location.state);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('peran');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    sessionStorage.removeItem('festnav_editor_ctx');
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="editing-navbar">
        {/* Kiri: Brand */}
        <div
          className="nav-brand"
          onClick={() => (onBrandClick ? onBrandClick() : navigate('/dashboard'))}
        >
          FestNav
        </div>

        {/* Tengah: 3 Menu Navigasi Pages (meneruskan state id_map & eventId) */}
        <div className="nav-menu-links">
          <NavLink
            to="/map-editor"
            state={editorState}
            className={({ isActive }) => `nav-menu-link ${isActive ? 'active' : ''}`}
          >
            Map Editor
          </NavLink>
          <NavLink
            to="/galeri"
            state={editorState}
            className={({ isActive }) => `nav-menu-link ${isActive ? 'active' : ''}`}
          >
            Galeri Gambar Event
          </NavLink>
          <NavLink
            to="/fasilitas"
            state={editorState}
            className={({ isActive }) => `nav-menu-link ${isActive ? 'active' : ''}`}
          >
            Manajemen Fasilitas
          </NavLink>
        </div>

        {/* Kanan: Profil & Logout */}
        <div className="user-profile">
          <div className="user-info-clickable" onClick={() => navigate('/profile-admin')}>
            <div className="avatar-placeholder">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : '👤'}
            </div>
            {displayName && <span className="user-name">{displayName}</span>}
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

      {/* Modal Overlay Logout */}
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