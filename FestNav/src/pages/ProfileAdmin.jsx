import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './ProfileAdmin.css'

function ProfileAdmin({ role = 'admin' }) {
  const navigate = useNavigate()
  const isEO = role === 'eo'

  // State Mode Edit (false = Preview Mode, true = Edit Mode)
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // State Data Profil (Menyesuaikan Role Admin / EO)
  const [profileData, setProfileData] = useState({
    displayName: isEO ? 'EO Esai' : 'Admin Esai',
    username: isEO ? 'EO_Esai' : 'Adm_esai',
    organization: 'Universitas Udayana',
    password: 'password123'
  })

  // State Avatar Image Preview
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Handle Input Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle Upload Foto Avatar Baru
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  // Handle Tombol Edit / Update Profile
  const handleProfileSubmit = (e) => {
    e.preventDefault()
    if (isEditing) {
      console.log(`Update Profil (${role}):`, profileData)
      alert('Profil berhasil diperbarui!')
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  return (
    <div className="profile-container">
      {/* Navbar Dinamis sesuai Role */}
      {isEO ? <NavbarEO /> : <NavbarAdmin />}

      {/* Hero Content Area */}
      <main className="profile-content">
        <div className="profile-card">
          {/* Top Right Logout Button Icon */}
          <button
            type="button"
            className="card-logout-icon"
            title="Logout"
            onClick={() => setShowLogoutModal(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>

          {/* Title Header (Untuk Admin berada di atas tengah) */}
          {!isEO && <h1 className="profile-title">Profile Admin</h1>}

          <form onSubmit={handleProfileSubmit} className="profile-form-grid">
            {/* Left Side: Avatar Box (+ Tombol Edit/Update khusus layout EO) */}
            <div className="profile-avatar-wrapper">
              <div className="avatar-circle">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder-lg">👤</div>
                )}

                {/* Translucent Camera Overlay (Hanya muncul saat Mode Edit) */}
                {isEditing && (
                  <label htmlFor="avatar-file-input" className="avatar-overlay">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span className="overlay-text">
                      {isEO ? 'Unggah Foto Disini' : 'Unggah Foto Baru'}
                    </span>
                  </label>
                )}

                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  disabled={!isEditing}
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Tombol Edit / Update di bawah Avatar (Khusus EO) */}
              {isEO && (
                <button type="submit" className="btn-cyan-profile btn-avatar-bottom">
                  {isEditing ? 'Update Profile' : 'Edit Profile'}
                </button>
              )}
            </div>

            {/* Right Side: Title EO & Input Fields */}
            <div className="profile-fields-wrapper">
              {isEO && <h1 className="profile-title-eo">Profile EO</h1>}

              <div className="profile-field-group">
                <label>Display name</label>
                <input
                  type="text"
                  name="displayName"
                  value={profileData.displayName}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  className={`profile-input ${!isEditing ? 'readonly-input' : ''}`}
                />
              </div>

              <div className="profile-field-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  className={`profile-input ${!isEditing ? 'readonly-input' : ''}`}
                />
              </div>

              {/* Field Tambahan Khusus EO: Organization */}
              {isEO && (
                <div className="profile-field-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={profileData.organization}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={`profile-input ${!isEditing ? 'readonly-input' : ''}`}
                  />
                </div>
              )}

              <div className="profile-field-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={profileData.password}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    className={`profile-input ${!isEditing ? 'readonly-input' : ''}`}
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Action Button di bawah Form (Khusus Admin) */}
              {!isEO && (
                <div className="profile-btn-row">
                  <button type="submit" className="btn-cyan-profile">
                    {isEditing ? 'Update Profile' : 'Edit Profile'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* OVERLAY MODAL KONFIRMASI LOG OUT */}
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
                onClick={() => {
                  setShowLogoutModal(false)
                  navigate('/login')
                }}
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileAdmin