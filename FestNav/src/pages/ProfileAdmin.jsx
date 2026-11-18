import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './ProfileAdmin.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

const MASKED_PASSWORD = '••••••••'

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  const h = {}
  if (withJson) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function ProfileAdmin({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const storedUser = getStoredUser()

  // Tentukan role awal dari prop, state navigasi, atau data user login
  const initialIsEO =
    role === 'eo' ||
    location.state?.fromEO === true ||
    storedUser?.peran === 'event_organizer'

  const [detectedPeran, setDetectedPeran] = useState(
    initialIsEO ? 'event_organizer' : 'admin'
  )
  const [pengelolaId, setPengelolaId] = useState(
    storedUser?.id_pengelola || null
  )

  const isEO = detectedPeran === 'event_organizer'
  const useEONavbar = isEO || location.state?.fromEO === true

  // State Mode Edit (false = Preview Mode / Terkunci, true = Edit Mode)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // State Data Profil dari PostgreSQL
  const [profileData, setProfileData] = useState({
    displayName: storedUser?.nama || '',
    username: storedUser?.username || '',
    organization: storedUser?.nama_organisasi || '',
    password: MASKED_PASSWORD
  })

  // State Avatar Image Preview (disimpan per id_pengelola)
  const [avatarPreview, setAvatarPreview] = useState(() => {
    if (!storedUser?.id_pengelola) return null
    return localStorage.getItem(`festnav_avatar_${storedUser.id_pengelola}`) || null
  })

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: getAuthHeaders()
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal memuat profil pengguna')
      }

      setDetectedPeran(data.peran || 'admin')
      setPengelolaId(data.id_pengelola)
      setProfileData({
        displayName: data.nama || '',
        username: data.username || '',
        organization: data.nama_organisasi || '',
        password: MASKED_PASSWORD
      })

      if (data.id_pengelola) {
        const savedAvatar = localStorage.getItem(
          `festnav_avatar_${data.id_pengelola}`
        )
        setAvatarPreview(savedAvatar || null)
      }

      // Sinkronkan localStorage user agar Navbar & halaman lain ikut terupdate
      try {
        const prevUser = getStoredUser() || {}
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...prevUser,
            id_pengelola: data.id_pengelola,
            peran: data.peran,
            nama: data.nama,
            username: data.username,
            nama_organisasi: data.nama_organisasi
          })
        )
      } catch {
        // Abaikan error storage
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat profil dari server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsEditing(false)
    setShowPassword(false)
    loadProfile()
  }, [loadProfile])

  // Handle Input Form Change (Hanya berjalan saat isEditing === true)
  const handleInputChange = (e) => {
    if (!isEditing) return
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle Upload Foto Avatar Baru (Hanya berjalan saat isEditing === true)
  const handleAvatarChange = (e) => {
    if (!isEditing) return
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Masuk ke Edit Mode -> kosongkan field password agar user bisa isi password baru jika mau
  const handleEnterEditMode = () => {
    setErrorMsg('')
    setShowPassword(false)
    setProfileData((prev) => ({
      ...prev,
      password: ''
    }))
    setIsEditing(true)
  }

  // Handle Tombol Edit / Update Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!isEditing) {
      handleEnterEditMode()
      return
    }

    if (isSaving) return

    const namaClean = profileData.displayName.trim()
    const usernameClean = profileData.username.trim()
    const orgClean = profileData.organization.trim()
    const newPassword = profileData.password

    if (namaClean.length < 2) {
      alert('Display name minimal 2 karakter.')
      return
    }
    if (usernameClean.length < 3) {
      alert('Username minimal 3 karakter.')
      return
    }
    if (newPassword && newPassword.length < 6) {
      alert('Password baru minimal 6 karakter.')
      return
    }

    const payload = {
      nama: namaClean,
      username: usernameClean
    }

    if (isEO) {
      payload.nama_organisasi = orgClean || null
    }

    if (newPassword) {
      payload.password = newPassword
    }

    setIsSaving(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(updated.detail || 'Gagal memperbarui profil')
      }

      if (pengelolaId && avatarPreview) {
        try {
          localStorage.setItem(
            `festnav_avatar_${pengelolaId}`,
            avatarPreview
          )
        } catch {
          // Abaikan jika ukuran gambar melebihi kuota storage
        }
      }

      setProfileData({
        displayName: updated.nama || namaClean,
        username: updated.username || usernameClean,
        organization: updated.nama_organisasi || '',
        password: MASKED_PASSWORD
      })

      try {
        const prevUser = getStoredUser() || {}
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...prevUser,
            id_pengelola: updated.id_pengelola,
            peran: updated.peran,
            nama: updated.nama,
            username: updated.username,
            nama_organisasi: updated.nama_organisasi
          })
        )
      } catch {
        // Abaikan error storage
      }

      setShowPassword(false)
      setIsEditing(false)
      alert('Profil berhasil diperbarui!')
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui profil.')
      alert(err.message || 'Gagal memperbarui profil.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('festnav_editor_ctx')
    setShowLogoutModal(false)
    navigate('/login')
  }

  // Style pengunci agar teks tetap tajam & tidak pudar saat input disabled
  const lockedInputStyle = !isEditing
    ? {
        pointerEvents: 'none',
        cursor: 'default',
        color: '#1e293b',
        WebkitTextFillColor: '#1e293b',
        opacity: 1
      }
    : undefined

  return (
    <div className="profile-container">
      {/* Navbar Dinamis: Tetap memakai NavbarEO jika akun berstatus EO */}
      {useEONavbar ? <NavbarEO /> : <NavbarAdmin />}

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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>

          {/* Title Header (Untuk Admin berada di atas tengah) */}
          {!isEO && <h1 className="profile-title">Profile Admin</h1>}

          {errorMsg && (
            <p
              style={{
                color: '#dc2626',
                textAlign: 'center',
                fontWeight: 600,
                marginBottom: '12px'
              }}
            >
              {errorMsg}
            </p>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
              Memuat data profil...
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="profile-form-grid">
              {/* Left Side: Avatar Box (+ Tombol Edit/Update khusus layout EO) */}
              <div className="profile-avatar-wrapper">
                <div className="avatar-circle">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="avatar-img"
                    />
                  ) : (
                    <div className="avatar-placeholder-lg">👤</div>
                  )}

                  {/* Translucent Camera Overlay (Hanya muncul saat Mode Edit) */}
                  {isEditing && (
                    <label htmlFor="avatar-file-input" className="avatar-overlay">
                      <svg
                        width="38"
                        height="38"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                      >
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
                  <button
                    type="submit"
                    className="btn-cyan-profile btn-avatar-bottom"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Menyimpan...'
                      : isEditing
                      ? 'Update Profile'
                      : 'Edit Profile'}
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
                    disabled={!isEditing}
                    tabIndex={isEditing ? 0 : -1}
                    style={lockedInputStyle}
                    className={`profile-input ${
                      !isEditing ? 'readonly-input' : ''
                    }`}
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
                    disabled={!isEditing}
                    tabIndex={isEditing ? 0 : -1}
                    style={lockedInputStyle}
                    className={`profile-input ${
                      !isEditing ? 'readonly-input' : ''
                    }`}
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
                      disabled={!isEditing}
                      tabIndex={isEditing ? 0 : -1}
                      style={lockedInputStyle}
                      className={`profile-input ${
                        !isEditing ? 'readonly-input' : ''
                      }`}
                    />
                  </div>
                )}

                <div className="profile-field-group">
                  <label>Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword && isEditing ? 'text' : 'password'}
                      name="password"
                      value={profileData.password}
                      placeholder={
                        isEditing
                          ? 'Kosongkan jika tidak mengubah password'
                          : undefined
                      }
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      tabIndex={isEditing ? 0 : -1}
                      style={lockedInputStyle}
                      className={`profile-input ${
                        !isEditing ? 'readonly-input' : ''
                      }`}
                    />
                    {isEditing && (
                      <button
                        type="button"
                        className="eye-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        title={
                          showPassword
                            ? 'Sembunyikan Password'
                            : 'Tampilkan Password'
                        }
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Button di bawah Form (Khusus Admin) */}
                {!isEO && (
                  <div className="profile-btn-row">
                    <button
                      type="submit"
                      className="btn-cyan-profile"
                      disabled={isSaving}
                    >
                      {isSaving
                        ? 'Menyimpan...'
                        : isEditing
                        ? 'Update Profile'
                        : 'Edit Profile'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* OVERLAY MODAL KONFIRMASI LOG OUT */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-card">
            <h2 className="logout-modal-title">
              Apakah anda yakin ingin log out?
            </h2>
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
    </div>
  )
}

export default ProfileAdmin