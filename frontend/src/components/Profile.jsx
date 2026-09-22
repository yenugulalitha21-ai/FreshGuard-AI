function Profile({ user, historyCount, onLogout, onNavigate }) {
  if (!user) return null

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'FG'
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const isEmail = user.identifier && user.identifier.includes('@')

  return (
    <div className="profile-page">
      <div className="content-wrapper">
        <div className="profile-wrapper">
          <div className="profile-card">
            {/* User Info Header */}
            <div className="profile-header">
              <div className="profile-avatar">
                {getInitials(user.name)}
              </div>
              <div className="profile-user-info">
                <h1 className="profile-name">{user.name}</h1>
                <div className="profile-identifier">
                  {isEmail ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  )}
                  <span>{user.identifier}</span>
                </div>
                <div className="profile-session-pill">
                  <span className="pill-dot"></span>
                  Active Session
                </div>
              </div>
            </div>

            {/* Profile Statistics */}
            <div className="profile-metrics">
              <div className="metric-box">
                <span className="metric-label">Analyses Performed</span>
                <span className="metric-val">{historyCount}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Account Type</span>
                <span className="metric-val">Standard User</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Session Storage</span>
                <span className="metric-val">Browser Local</span>
              </div>
            </div>

            {/* Navigation & Logout Actions */}
            <div className="profile-actions">
              <button
                type="button"
                className="btn-profile-nav"
                onClick={() => onNavigate('history')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                View Prediction History
              </button>

              <button
                type="button"
                className="btn-profile-nav"
                onClick={() => onNavigate('home')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Back to Dashboard
              </button>

              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
