import { useState } from 'react'
import produceBg from '../assets/login-produce-bg.jpg'

function Login({ onLogin }) {
  const [fullName, setFullName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMessage('')

    const trimmedName = fullName.trim()
    const trimmedId = identifier.trim()

    // 1. Name validation
    if (!trimmedName) {
      setErrorMessage('Please enter your full name to continue.')
      return
    }

    if (trimmedName.length < 2) {
      setErrorMessage('Please enter a valid full name.')
      return
    }

    // 2. Identifier validation (Gmail or Phone)
    if (!trimmedId) {
      setErrorMessage('Please enter your Gmail address or phone number.')
      return
    }

    // Check if it's a Gmail address or a valid phone number
    const isGmail = /^[^\s@]+@gmail\.com$/i.test(trimmedId)
    // Clean phone number (allow +, spaces, hyphens, parentheses, but check for 7-15 digits)
    const phoneDigits = trimmedId.replace(/\D/g, '')
    const isPhone = /^(\+?[0-9\s\-()]{7,16})$/.test(trimmedId) && phoneDigits.length >= 7 && phoneDigits.length <= 15

    if (!isGmail && !isPhone) {
      setErrorMessage('Please enter a valid Gmail address (e.g. name@gmail.com) or phone number.')
      return
    }

    // Validation passed - pass user data up
    onLogin({
      name: trimmedName,
      identifier: trimmedId
    })
  }

  return (
    <div
      className="login-wrapper"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.42) 0%, rgba(6, 78, 59, 0.55) 100%), url(${produceBg})`
      }}
    >
      <div className="login-backdrop-blur" aria-hidden="true"></div>

      <div className="login-content-container">
        {/* Decorative Fresh Produce Showcase Header */}
        <div className="login-produce-showcase">
          <div className="login-produce-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            Natural Food Freshness Intelligence
          </div>
          <div className="login-produce-chips">
            <span className="produce-chip">🍎 Apples</span>
            <span className="produce-chip">🍌 Bananas</span>
            <span className="produce-chip">🍊 Oranges</span>
            <span className="produce-chip">🍅 Tomatoes</span>
            <span className="produce-chip">🥕 Carrots</span>
            <span className="produce-chip">🥦 Broccoli</span>
            <span className="produce-chip">🫑 Peppers</span>
            <span className="produce-chip">🍇 Grapes</span>
          </div>
        </div>

        {/* Translucent Glass Login Card */}
        <div className="login-card">
          {/* Logo and Welcome Branding */}
          <div className="login-header">
            <div className="login-logo-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A9.49 9.49 0 0 0 12 21c7 0 11-8 11-8s-2.5-3-6-5zm-5 11c-1.8 0-3.4-.8-4.5-2.1C9.2 13.3 12 11 15 10c0 3-1.5 6-3 9z" />
              </svg>
            </div>
            <h1 className="login-title">Welcome to FreshGuard AI</h1>
            <p className="login-subtitle">AI-powered fruit and vegetable quality analysis</p>
          </div>

          {/* Validation Error Notice */}
          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-name">
                Full Name <span className="required-dot">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="login-name"
                  type="text"
                  className="form-input login-input"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-identifier">
                Gmail / Phone Number <span className="required-dot">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-identifier"
                  type="text"
                  className="form-input login-input"
                  placeholder="e.g. yourname@gmail.com or 9876543210"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  autoComplete="username"
                  required
                />
              </div>
              <span className="form-hint">Accepts either your personal Gmail account or mobile number.</span>
            </div>

            <button type="submit" className="btn-analyze login-btn">
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>

          <div className="login-footer-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>No password required • FreshGuard AI session is saved locally</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
