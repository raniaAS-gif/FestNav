import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

function Login() {
  const navigate = useNavigate()

  // State Role ('admin' atau 'eo')
  const [role, setRole] = useState('eo')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const identifier = username.trim()
    if (!identifier || !password) {
      setErrorMsg('Harap isi Username/Email dan Password!')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/auth/pengelola/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.detail || 'Username/email atau password salah')
      }

      // Validasi kesesuaian tab role yang dipilih dengan peran akun di database
      const expectedPeran = role === 'admin' ? 'admin' : 'event_organizer'
      if (data.peran !== expectedPeran) {
        const labelAsli = data.peran === 'admin' ? 'Admin' : 'Event Organizer'
        throw new Error(
          `Akun ini terdaftar sebagai ${labelAsli}. Silakan pindah ke tab ${labelAsli} di atas.`
        )
      }

      // Simpan token & identitas pengelola ke localStorage
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_type', data.user_type || 'pengelola')
      localStorage.setItem('peran', data.peran)
      localStorage.setItem('role', data.peran === 'admin' ? 'admin' : 'eo')
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Arahkan ke dashboard sesuai peran dari backend
      if (data.peran === 'admin') {
        navigate('/dashboard')
      } else {
        navigate('/dashboard-eo')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal terhubung ke server backend')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Brand Title */}
        <h1 className="login-brand">FestNav</h1>
        <p className="login-subtitle">Festival Navigation</p>

        {/* Toggle Switch Admin / Event Organizer */}
        <div className="role-toggle-wrapper">
          <button
            type="button"
            className={`role-toggle-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setRole('admin')
              setErrorMsg('')
            }}
            disabled={isLoading}
          >
            Admin
          </button>
          <button
            type="button"
            className={`role-toggle-btn ${role === 'eo' ? 'active' : ''}`}
            onClick={() => {
              setRole('eo')
              setErrorMsg('')
            }}
            disabled={isLoading}
          >
            Event Organizer
          </button>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <label>Username atau Email</label>
            <input
              type="text"
              placeholder="Username atau email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="login-input-group">
            <label>Password</label>
            <div className="login-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                marginTop: '12px',
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="login-btn-container">
            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login