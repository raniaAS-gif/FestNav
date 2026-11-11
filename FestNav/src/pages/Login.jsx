import { useState } from 'react'
import './Login.css'

function Login() {
  const [role, setRole] = useState('admin') // 'admin' atau 'eo'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login sebagai:', role)
    console.log('Username:', username)
    console.log('Password:', password)
    // Tambahkan logika autentikasi / API call Anda di sini
  }

  return (
    <div className="login-container">
      {/* Label kecil di pojok kiri atas */}
      <span className="login-header-label">
        Login {role === 'admin' ? 'Admin' : 'Event Organizer'}
      </span>

      <div className="login-card">
        {/* Brand Logo / Title */}
        <div className="brand-header">
          <h1 className="brand-title">FestNav</h1>
          <p className="brand-subtitle">Festival Navigation</p>
        </div>

        {/* Tab Switcher */}
        <div className="role-toggle">
          <button
            type="button"
            className={`toggle-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
          <button
            type="button"
            className={`toggle-btn ${role === 'eo' ? 'active' : ''}`}
            onClick={() => setRole('eo')}
          >
            Event Organizer
          </button>
        </div>

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="8 digit"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {/* SVG Icon Mata */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login