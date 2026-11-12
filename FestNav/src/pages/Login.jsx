import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  // State Role ('admin' atau 'eo')
  const [role, setRole] = useState('eo')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()

    if (!username || !password) {
      alert('Harap isi Username dan Password!')
      return
    }

    // Simulasi redirect berdasarkan role yang dipilih
    if (role === 'admin') {
      console.log('Login sebagai Admin:', { username, password })
      navigate('/dashboard')
    } else {
      console.log('Login sebagai Event Organizer:', { username, password })
      navigate('/dashboard-eo')
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
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
          <button
            type="button"
            className={`role-toggle-btn ${role === 'eo' ? 'active' : ''}`}
            onClick={() => setRole('eo')}
          >
            Event Organizer
          </button>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
            />
          </div>

          <div className="login-input-group">
            <label>Password</label>
            <div className="login-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="8 digit"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
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

          <div className="login-btn-container">
            <button type="submit" className="btn-login-submit">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login