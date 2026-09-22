import { useState, useRef, useEffect } from 'react'
import './App.css'
import Login from './components/Login'
import History from './components/History'
import Profile from './components/Profile'

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://freshguard-ai-4gbv.onrender.com').replace(/\/+$/, '')
const PREDICT_IMAGE_ENDPOINT = `${BACKEND_URL}/predict`
const PREDICT_MANUAL_ENDPOINT = `${BACKEND_URL}/predict-manual`
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Model-supported dropdown choices
const FRUIT_OPTIONS = [
  'Apple', 'Banana', 'Capsicum', 'Carrot', 'Cucumber', 'Grapes',
  'Guava', 'Mango', 'Orange', 'Papaya', 'Pineapple', 'Pomegranate',
  'Potato', 'Tomato', 'Watermelon'
]

const COLOR_OPTIONS = [
  'brown', 'dark green', 'dark red', 'green', 'light brown',
  'orange', 'purple', 'red', 'yellow'
]

const SIZE_OPTIONS = ['small', 'medium', 'large']
const FIRMNESS_OPTIONS = ['low', 'medium', 'high']
const TEXTURE_OPTIONS = ['damaged', 'firm', 'fresh', 'rough', 'smooth', 'soft', 'wrinkled']
const BINARY_OPTIONS = ['no', 'yes']

const INITIAL_MANUAL_FORM = {
  fruit: '',
  color: '',
  size: '',
  weight_g: '',
  firmness: '',
  sugar_brix: '',
  acidity_ph: '',
  texture: '',
  spots: '',
  bruises: '',
  wrinkles: '',
  days_after_harvest: '',
  storage_temperature_c: ''
}

const SAMPLE_MANUAL_DATA = {
  fruit: 'Apple',
  color: 'red',
  size: 'medium',
  weight_g: '150',
  firmness: 'high',
  sugar_brix: '12.5',
  acidity_ph: '3.8',
  texture: 'firm',
  spots: 'no',
  bruises: 'no',
  wrinkles: 'no',
  days_after_harvest: '3',
  storage_temperature_c: '4'
}

// Session & history helper utilities
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('freshguard_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getStoredHistory = (identifier) => {
  if (!identifier) return []
  try {
    const key = `freshguard_history_${identifier.toLowerCase().trim()}`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function App() {
  // User Session & History state
  const [currentUser, setCurrentUser] = useState(getStoredUser)
  const [activeNav, setActiveNav] = useState('home') // 'home' | 'history' | 'profile'
  const [history, setHistory] = useState(() => {
    const user = getStoredUser()
    return user ? getStoredHistory(user.identifier) : []
  })

  // Navigation / Mode state
  const [activeMode, setActiveMode] = useState('image') // 'image' | 'manual'
  const [backendOnline, setBackendOnline] = useState(true)

  // Image Analysis states
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageLoadingMessage, setImageLoadingMessage] = useState('')
  const [imageResult, setImageResult] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Manual Analysis states
  const [manualForm, setManualForm] = useState(INITIAL_MANUAL_FORM)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualResult, setManualResult] = useState(null)
  const [manualError, setManualError] = useState(null)

  const fileInputRef = useRef(null)
  const imageResultRef = useRef(null)
  const manualResultRef = useRef(null)

  // Add a record to user's isolated history
  const addToHistory = (record) => {
    if (!currentUser || !currentUser.identifier) return
    const key = `freshguard_history_${currentUser.identifier.toLowerCase().trim()}`
    setHistory((prev) => {
      const updated = [record, ...prev]
      try {
        localStorage.setItem(key, JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save prediction to history:', err)
      }
      return updated
    })
  }

  // Session handlers
  const handleLogin = (userData) => {
    try {
      localStorage.setItem('freshguard_user', JSON.stringify(userData))
    } catch (err) {
      console.error('Failed to save user session:', err)
    }
    setCurrentUser(userData)
    setHistory(getStoredHistory(userData.identifier))
    setActiveNav('home')
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('freshguard_user')
    } catch (err) {
      console.error('Failed to remove user session:', err)
    }
    setCurrentUser(null)
    setHistory([])
    setActiveNav('home')
  }

  const handleClearHistory = () => {
    if (!currentUser || !currentUser.identifier) return
    const key = `freshguard_history_${currentUser.identifier.toLowerCase().trim()}`
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error('Failed to clear user history:', err)
    }
    setHistory([])
  }

  const handleNavClick = (view) => {
    if (view === 'logout') {
      handleLogout()
      return
    }

    if (view === 'image') {
      setActiveNav('home')
      setActiveMode('image')
      setTimeout(() => {
        const scannerEl = document.querySelector('.scanner-container')
        if (scannerEl) scannerEl.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return
    }

    if (view === 'manual') {
      setActiveNav('home')
      setActiveMode('manual')
      setTimeout(() => {
        const scannerEl = document.querySelector('.scanner-container')
        if (scannerEl) scannerEl.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return
    }

    setActiveNav(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Check backend server availability with cold-start retry
  useEffect(() => {
    let timerId = null
    const checkBackend = () => {
      fetch(BACKEND_URL)
        .then((res) => {
          if (res.ok) {
            setBackendOnline(true)
          } else {
            setBackendOnline(false)
            timerId = setTimeout(checkBackend, 10000)
          }
        })
        .catch(() => {
          setBackendOnline(false)
          timerId = setTimeout(checkBackend, 10000)
        })
    }
    checkBackend()
    return () => {
      if (timerId) clearTimeout(timerId)
    }
  }, [])

  // Clean up object URLs when preview changes or unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // =========================================================================
  // Image Analysis Handlers
  // =========================================================================
  const handleFileChange = (file) => {
    setImageError(null)
    setImageResult(null)

    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setImageError('Invalid file format. Please upload a JPG, JPEG, or PNG image.')
      return
    }

    setSelectedFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setImageResult(null)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      setImageError('Please select or upload an image first.')
      return
    }

    setImageLoading(true)
    setImageLoadingMessage('Analyzing image...')
    setImageError(null)
    setImageResult(null)

    // Handle Render free-tier cold starts (informing user if backend is waking up)
    const coldStartTimer = setTimeout(() => {
      setImageLoadingMessage('Waking up FreshGuard AI... This may take up to 60 seconds.')
    }, 5000)

    // Prevent hanging indefinitely with a 90s AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 90000)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch(PREDICT_IMAGE_ENDPOINT, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      let data = null
      const rawText = await response.text()
      try {
        data = JSON.parse(rawText)
      } catch {
        // Handle non-JSON responses such as 502/503/504 gateway errors
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error(`Server gateway error (${response.status}). The FreshGuard AI backend is waking up from cold start. Please wait a moment and try again.`)
        }
        if (!response.ok) {
          throw new Error(`Server returned error status (${response.status}). The backend might still be spinning up.`)
        }
        throw new Error('Received non-JSON response from server.')
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Server returned error (${response.status})`)
      }

      if (!data || typeof data.prediction === 'undefined') {
        throw new Error('Invalid prediction format received from server.')
      }

      const formattedConfidence = Number(data.confidence) || 0

      setImageResult({
        prediction: data.prediction,
        confidence: formattedConfidence,
      })
      setBackendOnline(true)

      // Automatically add successful result to logged-in user's history
      const newRecord = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        analysisType: 'Image',
        fruit: 'Image Upload',
        prediction: data.prediction,
        confidence: formattedConfidence,
      }
      addToHistory(newRecord)

      setTimeout(() => {
        if (imageResultRef.current) {
          imageResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    } catch (err) {
      if (err.name === 'AbortError') {
        setImageError('Request timed out. The Render server took longer than 90 seconds to respond. Please click Analyze Image again as the server finishes waking up.')
        setBackendOnline(false)
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        setImageError('Unable to connect to FreshGuard AI backend at Render. The server may still be spinning up. Please wait a moment and try again.')
        setBackendOnline(false)
      } else {
        setImageError(err.message || 'Prediction failed. Please try again with another image.')
      }
    } finally {
      clearTimeout(coldStartTimer)
      clearTimeout(timeoutId)
      setImageLoading(false)
      setImageLoadingMessage('')
    }
  }

  // =========================================================================
  // Manual Analysis Handlers
  // =========================================================================
  const handleManualInputChange = (field, value) => {
    setManualForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLoadSampleData = () => {
    setManualForm(SAMPLE_MANUAL_DATA)
    setManualError(null)
    setManualResult(null)
  }

  const handleResetManual = () => {
    setManualForm(INITIAL_MANUAL_FORM)
    setManualResult(null)
    setManualError(null)
  }

  const handleAnalyzeManual = async (e) => {
    e.preventDefault()

    // 1. Validation: Require all 13 fields
    const requiredFields = [
      'fruit', 'color', 'size', 'weight_g', 'firmness', 'sugar_brix',
      'acidity_ph', 'texture', 'spots', 'bruises', 'wrinkles',
      'days_after_harvest', 'storage_temperature_c'
    ]

    const emptyFields = requiredFields.filter(
      (key) => manualForm[key] === '' || manualForm[key] === null || manualForm[key] === undefined
    )

    if (emptyFields.length > 0) {
      setManualError('Please fill out all 13 food quality parameters before submitting.')
      return
    }

    // Validate numeric fields
    const numericFields = ['weight_g', 'sugar_brix', 'acidity_ph', 'days_after_harvest', 'storage_temperature_c']
    for (const numField of numericFields) {
      const val = Number(manualForm[numField])
      if (isNaN(val)) {
        setManualError(`Please enter a valid numeric value for ${numField.replace('_', ' ')}.`)
        return
      }
    }

    setManualLoading(true)
    setManualError(null)
    setManualResult(null)

    try {
      const payload = {
        fruit: manualForm.fruit,
        color: manualForm.color,
        size: manualForm.size,
        weight_g: Number(manualForm.weight_g),
        firmness: manualForm.firmness,
        sugar_brix: Number(manualForm.sugar_brix),
        acidity_ph: Number(manualForm.acidity_ph),
        texture: manualForm.texture,
        spots: manualForm.spots,
        bruises: manualForm.bruises,
        wrinkles: manualForm.wrinkles,
        days_after_harvest: Number(manualForm.days_after_harvest),
        storage_temperature_c: Number(manualForm.storage_temperature_c)
      }

      const response = await fetch(PREDICT_MANUAL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `Validation error (${response.status})`)
      }

      setManualResult(data)
      setBackendOnline(true)

      // Automatically add successful result to logged-in user's history
      const newRecord = {
        id: `man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        analysisType: 'Manual',
        fruit: manualForm.fruit || 'Manual Entry',
        prediction: data.prediction,
        confidence: Number(data.confidence)
      }
      addToHistory(newRecord)

      setTimeout(() => {
        if (manualResultRef.current) {
          manualResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setManualError('Unable to connect to FreshGuard AI. Please make sure the backend is running.')
        setBackendOnline(false)
      } else {
        setManualError(err.message || 'Prediction failed. Please check your inputs and try again.')
      }
    } finally {
      setManualLoading(false)
    }
  }

  const isImagePositive = imageResult && imageResult.prediction === 'Good to Eat'
  const isManualPositive = manualResult && manualResult.prediction === 'Good to Eat'

  // If user is not logged in, render the professional Login page
  if (!currentUser) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="content-wrapper nav-content">
            <div className="nav-brand">
              <div className="nav-logo-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A9.49 9.49 0 0 0 12 21c7 0 11-8 11-8s-2.5-3-6-5zm-5 11c-1.8 0-3.4-.8-4.5-2.1C9.2 13.3 12 11 15 10c0 3-1.5 6-3 9z" />
                </svg>
              </div>
              <span className="nav-brand-text">
                FreshGuard <span>AI</span>
              </span>
            </div>
            <div className="nav-badge" title={`Backend Server: ${BACKEND_URL}`}>
              <span
                className="nav-badge-dot"
                style={{
                  backgroundColor: backendOnline ? '#10B981' : '#EF4444',
                }}
              ></span>
              {backendOnline ? 'AI Model Online' : 'Server Offline'}
            </div>
          </div>
        </header>

        <Login onLogin={handleLogin} />

        <footer className="footer">
          <div className="content-wrapper">
            <div className="footer-bottom">
              <p>© {new Date().getFullYear()} FreshGuard AI. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Logged-In Navigation Bar */}
      <header className="navbar">
        <div className="content-wrapper nav-content">
          <button
            type="button"
            className="nav-brand"
            onClick={() => handleNavClick('home')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="nav-logo-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A9.49 9.49 0 0 0 12 21c7 0 11-8 11-8s-2.5-3-6-5zm-5 11c-1.8 0-3.4-.8-4.5-2.1C9.2 13.3 12 11 15 10c0 3-1.5 6-3 9z" />
              </svg>
            </div>
            <span className="nav-brand-text">
              FreshGuard <span>AI</span>
            </span>
          </button>

          <nav>
            <ul className="nav-links">
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activeNav === 'home' ? 'active' : ''}`}
                  onClick={() => handleNavClick('home')}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activeNav === 'home' && activeMode === 'image' ? 'active' : ''}`}
                  onClick={() => handleNavClick('image')}
                >
                  Image Analysis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activeNav === 'home' && activeMode === 'manual' ? 'active' : ''}`}
                  onClick={() => handleNavClick('manual')}
                >
                  Manual Analysis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activeNav === 'history' ? 'active' : ''}`}
                  onClick={() => handleNavClick('history')}
                >
                  History
                  {history.length > 0 && (
                    <span className="nav-counter-pill">{history.length}</span>
                  )}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activeNav === 'profile' ? 'active' : ''}`}
                  onClick={() => handleNavClick('profile')}
                >
                  Profile
                </button>
              </li>
              <li>
                <div className="nav-badge" title={`Backend Server: ${BACKEND_URL}`}>
                  <span
                    className="nav-badge-dot"
                    style={{
                      backgroundColor: backendOnline ? '#10B981' : '#EF4444',
                    }}
                  ></span>
                  {backendOnline ? 'AI Model Online' : 'Server Offline'}
                </div>
              </li>
            </ul>
          </nav>

          <div className="nav-user-cluster">
            <div className="nav-user-greeting">
              <span className="user-avatar-mini">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </span>
              <span>Welcome, {currentUser.name}</span>
            </div>
            <button
              type="button"
              className="btn-nav-logout"
              onClick={handleLogout}
              title="Logout from FreshGuard AI"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* History View */}
      {activeNav === 'history' && (
        <History
          history={history}
          onClearHistory={handleClearHistory}
          onStartAnalysis={(mode) => handleNavClick(mode)}
        />
      )}

      {/* Profile View */}
      {activeNav === 'profile' && (
        <Profile
          user={currentUser}
          historyCount={history.length}
          onLogout={handleLogout}
          onNavigate={handleNavClick}
        />
      )}

      {/* Home / Analysis View */}
      {activeNav === 'home' && (
        <>
          {/* Hero Section */}
          <section id="home" className="hero-section">
            <div className="content-wrapper">
              <div className="hero-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Welcome, {currentUser.name} • Intelligent Food Freshness Inspection
              </div>

              <h1 className="hero-title">
                Check Your Food <span className="highlight">Before You Eat</span>
              </h1>

              <p className="hero-subtitle">
                Use AI to check the visible freshness condition of your fruits and vegetables.
              </p>
            </div>
      </section>

      {/* Mode Switcher Tabs */}
      <div className="content-wrapper">
        <div className="mode-switch-wrapper">
          <div className="mode-toggle" role="tablist" aria-label="Analysis Modes">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'image'}
              className={`mode-btn ${activeMode === 'image' ? 'active' : ''}`}
              onClick={() => setActiveMode('image')}
            >
              <span aria-hidden="true">🖼️</span> Image Analysis
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'manual'}
              className={`mode-btn ${activeMode === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveMode('manual')}
            >
              <span aria-hidden="true">📊</span> Manual Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <main className="app-main">
        <div className="content-wrapper">
          <div className="scanner-container">
            {/* ============================================================= */}
            {/* TAB 1: IMAGE ANALYSIS                                         */}
            {/* ============================================================= */}
            {activeMode === 'image' && (
              <div className="scanner-card">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleInputChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                />

                {!previewUrl ? (
                  /* Upload Card / Dropzone */
                  <div
                    className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') triggerFileInput()
                    }}
                    aria-label="Upload a fruit or vegetable image"
                  >
                    <div className="dropzone-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>

                    <h3 className="dropzone-title">Upload a fruit or vegetable image</h3>
                    <p className="dropzone-hint">JPG, JPEG or PNG</p>

                    <button
                      type="button"
                      className="btn-choose"
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerFileInput()
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Choose Image
                    </button>
                  </div>
                ) : (
                  /* Preview Section */
                  <div className="preview-container">
                    <div className="image-preview-wrapper">
                      <img src={previewUrl} alt="Selected food item" className="image-preview" />
                    </div>

                    <div className="preview-details">
                      <div className="preview-info">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="preview-filename" title={selectedFile?.name}>
                          {selectedFile?.name}
                        </span>
                        <span className="preview-size">
                          ({selectedFile ? formatFileSize(selectedFile.size) : ''})
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-remove"
                        onClick={handleRemoveImage}
                        disabled={imageLoading}
                        title="Remove image"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Remove image
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {imageError && (
                  <div className="error-banner" role="alert">
                    <div className="error-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                    </div>
                    <div className="error-content">
                      <div className="error-title">Notice</div>
                      <div>{imageError}</div>
                    </div>
                    <button
                      type="button"
                      className="btn-dismiss-error"
                      onClick={() => setImageError(null)}
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Action Button */}
                {previewUrl && !imageResult && (
                  <div className="action-area">
                    <button
                      type="button"
                      className="btn-analyze"
                      onClick={handleAnalyzeImage}
                      disabled={imageLoading || !selectedFile}
                    >
                      {imageLoading ? (
                        <>
                          <span className="spinner" aria-hidden="true"></span>
                          {imageLoadingMessage || 'Analyzing image...'}
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                          </svg>
                          Analyze Image
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Image Result Card */}
                {imageResult && (
                  <div
                    ref={imageResultRef}
                    className={`result-card ${isImagePositive ? 'positive' : 'warning'}`}
                  >
                    <div className="result-header">
                      <div className="result-badge">
                        {isImagePositive ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                            Fresh & Healthy
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                            </svg>
                            Spoilage Detected
                          </>
                        )}
                      </div>
                    </div>

                    <div className="verdict-box">
                      <h2 className="verdict-title">{imageResult.prediction}</h2>
                      <p className="verdict-desc">
                        {isImagePositive
                          ? 'Visual features and surface condition indicate good freshness and safe consumption quality.'
                          : 'Visible signs of spoilage, discoloration, or decay detected. Not recommended for eating.'}
                      </p>
                    </div>

                    <div className="confidence-section">
                      <div className="confidence-header">
                        <span className="confidence-label">AI Confidence Score</span>
                        <span className="confidence-value">{imageResult.confidence}%</span>
                      </div>

                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-valuenow={imageResult.confidence}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(Math.max(imageResult.confidence, 5), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <button type="button" className="btn-reset" onClick={handleRemoveImage}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <polyline points="23 20 23 14 17 14" />
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                      </svg>
                      Check Another Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: MANUAL ANALYSIS (Structured Data)                      */}
            {/* ============================================================= */}
            {activeMode === 'manual' && (
              <div className="scanner-card">
                <div className="manual-card-header">
                  <div className="manual-header-text">
                    <h3>Manual Quality Form</h3>
                    <p>Enter 13 physical & biological attributes for structured Random Forest analysis.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-sample"
                    onClick={handleLoadSampleData}
                    title="Fill form with sample data for quick testing"
                  >
                    <span aria-hidden="true">✨</span> Fill Sample
                  </button>
                </div>

                <form onSubmit={handleAnalyzeManual}>
                  <div className="form-grid">
                    {/* 1. Fruit */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-fruit">
                        Fruit <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-fruit"
                        className="form-select"
                        value={manualForm.fruit}
                        onChange={(e) => handleManualInputChange('fruit', e.target.value)}
                        required
                      >
                        <option value="">-- Select Fruit --</option>
                        {FRUIT_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Color */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-color">
                        Color <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-color"
                        className="form-select"
                        value={manualForm.color}
                        onChange={(e) => handleManualInputChange('color', e.target.value)}
                        required
                      >
                        <option value="">-- Select Color --</option>
                        {COLOR_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Size */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-size">
                        Size <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-size"
                        className="form-select"
                        value={manualForm.size}
                        onChange={(e) => handleManualInputChange('size', e.target.value)}
                        required
                      >
                        <option value="">-- Select Size --</option>
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Weight (g) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-weight">
                        Weight (g) <span className="required-dot">*</span>
                      </label>
                      <input
                        id="field-weight"
                        type="number"
                        step="any"
                        placeholder="e.g. 150"
                        className="form-input"
                        value={manualForm.weight_g}
                        onChange={(e) => handleManualInputChange('weight_g', e.target.value)}
                        required
                      />
                    </div>

                    {/* 5. Firmness */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-firmness">
                        Firmness <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-firmness"
                        className="form-select"
                        value={manualForm.firmness}
                        onChange={(e) => handleManualInputChange('firmness', e.target.value)}
                        required
                      >
                        <option value="">-- Select Firmness --</option>
                        {FIRMNESS_OPTIONS.map((fm) => (
                          <option key={fm} value={fm}>{fm}</option>
                        ))}
                      </select>
                    </div>

                    {/* 6. Sugar Level (Brix) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-sugar">
                        Sugar Level (Brix) <span className="required-dot">*</span>
                      </label>
                      <input
                        id="field-sugar"
                        type="number"
                        step="any"
                        placeholder="e.g. 12.5"
                        className="form-input"
                        value={manualForm.sugar_brix}
                        onChange={(e) => handleManualInputChange('sugar_brix', e.target.value)}
                        required
                      />
                      <span className="form-hint">Typical range: 4.0 - 25.0</span>
                    </div>

                    {/* 7. Acidity (pH) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-acidity">
                        Acidity (pH) <span className="required-dot">*</span>
                      </label>
                      <input
                        id="field-acidity"
                        type="number"
                        step="any"
                        placeholder="e.g. 3.8"
                        className="form-input"
                        value={manualForm.acidity_ph}
                        onChange={(e) => handleManualInputChange('acidity_ph', e.target.value)}
                        required
                      />
                      <span className="form-hint">Typical range: 2.0 - 7.0</span>
                    </div>

                    {/* 8. Texture */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-texture">
                        Texture <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-texture"
                        className="form-select"
                        value={manualForm.texture}
                        onChange={(e) => handleManualInputChange('texture', e.target.value)}
                        required
                      >
                        <option value="">-- Select Texture --</option>
                        {TEXTURE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* 9. Spots */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-spots">
                        Spots <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-spots"
                        className="form-select"
                        value={manualForm.spots}
                        onChange={(e) => handleManualInputChange('spots', e.target.value)}
                        required
                      >
                        <option value="">-- Select Spots --</option>
                        {BINARY_OPTIONS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* 10. Bruises */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-bruises">
                        Bruises <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-bruises"
                        className="form-select"
                        value={manualForm.bruises}
                        onChange={(e) => handleManualInputChange('bruises', e.target.value)}
                        required
                      >
                        <option value="">-- Select Bruises --</option>
                        {BINARY_OPTIONS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* 11. Wrinkles */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-wrinkles">
                        Wrinkles <span className="required-dot">*</span>
                      </label>
                      <select
                        id="field-wrinkles"
                        className="form-select"
                        value={manualForm.wrinkles}
                        onChange={(e) => handleManualInputChange('wrinkles', e.target.value)}
                        required
                      >
                        <option value="">-- Select Wrinkles --</option>
                        {BINARY_OPTIONS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* 12. Days After Harvest */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-days">
                        Days After Harvest <span className="required-dot">*</span>
                      </label>
                      <input
                        id="field-days"
                        type="number"
                        step="any"
                        placeholder="e.g. 3"
                        className="form-input"
                        value={manualForm.days_after_harvest}
                        onChange={(e) => handleManualInputChange('days_after_harvest', e.target.value)}
                        required
                      />
                    </div>

                    {/* 13. Storage Temperature (°C) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="field-temp">
                        Storage Temperature (°C) <span className="required-dot">*</span>
                      </label>
                      <input
                        id="field-temp"
                        type="number"
                        step="any"
                        placeholder="e.g. 4"
                        className="form-input"
                        value={manualForm.storage_temperature_c}
                        onChange={(e) => handleManualInputChange('storage_temperature_c', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Manual Error Banner */}
                  {manualError && (
                    <div className="error-banner" role="alert">
                      <div className="error-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                      </div>
                      <div className="error-content">
                        <div className="error-title">Validation Error</div>
                        <div>{manualError}</div>
                      </div>
                      <button
                        type="button"
                        className="btn-dismiss-error"
                        onClick={() => setManualError(null)}
                        title="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="action-area">
                    <button
                      type="submit"
                      className="btn-analyze"
                      disabled={manualLoading}
                    >
                      {manualLoading ? (
                        <>
                          <span className="spinner" aria-hidden="true"></span>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                          Analyze Manually
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Manual Result Card */}
                {manualResult && (
                  <div
                    ref={manualResultRef}
                    className={`result-card ${isManualPositive ? 'positive' : 'warning'}`}
                  >
                    <div className="result-header">
                      <div className="result-badge">
                        {isManualPositive ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                            Fresh & Healthy
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                            </svg>
                            Spoilage Detected
                          </>
                        )}
                      </div>
                    </div>

                    <div className="verdict-box">
                      <h2 className="verdict-title">{manualResult.prediction}</h2>
                      <p className="verdict-desc">
                        {isManualPositive
                          ? 'Measured physical and biochemical values fall within acceptable fresh produce standards.'
                          : 'Feature values indicate spoilage, structural damage, or advanced shelf decay. Not recommended for eating.'}
                      </p>
                    </div>

                    <div className="confidence-section">
                      <div className="confidence-header">
                        <span className="confidence-label">Model Confidence</span>
                        <span className="confidence-value">{manualResult.confidence}%</span>
                      </div>

                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-valuenow={manualResult.confidence}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(Math.max(manualResult.confidence, 5), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <button type="button" className="btn-reset" onClick={handleResetManual}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <polyline points="23 20 23 14 17 14" />
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                      </svg>
                      Check Another
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="section">
        <div className="content-wrapper">
          <div className="section-header">
            <span className="section-tag">Dual-Engine Intelligence</span>
            <h2 className="section-title">How FreshGuard AI Works</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-num">01</span>
              <div className="step-icon-wrap">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 className="step-title">1. Choose Input Mode</h3>
              <p className="step-desc">
                Select between uploading a direct photo or providing 13 physical parameters such as firmness, sugar Brix, and storage time.
              </p>
            </div>

            <div className="step-card">
              <span className="step-num">02</span>
              <div className="step-icon-wrap">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="step-title">2. AI Model Inference</h3>
              <p className="step-desc">
                MobileNetV2 processes image textures, while our Random Forest Pipeline handles numerical and categorical quality metrics.
              </p>
            </div>

            <div className="step-card">
              <span className="step-num">03</span>
              <div className="step-icon-wrap">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="step-title">3. Actionable Verdict</h3>
              <p className="step-desc">
                Receive an immediate classification ("Good to Eat" or "Bad to Eat") alongside a precise confidence percentage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section about-section">
        <div className="content-wrapper">
          <div className="about-card">
            <div className="section-header">
              <span className="section-tag">About The Project</span>
              <h2 className="section-title">Intelligent Food Inspection</h2>
            </div>

            <p className="about-body">
              FreshGuard AI is an AI-based food quality classification system for checking the freshness
              condition of fruits and vegetables. By combining computer vision with structured physical quality
              modeling, FreshGuard AI helps households, grocers, and consumers determine whether produce
              remains safe to eat or shows visible degradation.
            </p>

            <div className="about-highlights">
              <div className="highlight-item">
                <div className="highlight-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L1 21h22L12 2zm0 3.84L19.53 19H4.47L12 5.84z" />
                  </svg>
                  Dual AI Models
                </div>
                <p className="highlight-desc">
                  MobileNetV2 for visual surface inspection and Random Forest for measured physical metrics.
                </p>
              </div>

              <div className="highlight-item">
                <div className="highlight-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Reduced Food Waste
                </div>
                <p className="highlight-desc">
                  Helps differentiate fresh, edible produce from spoiled items, preventing unnecessary waste.
                </p>
              </div>

              <div className="highlight-item">
                <div className="highlight-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.25 1.5c.78-1.22 1.25-2.67 1.25-4.04 0-4.42-3.58-8-8-8zm-2 0c-4.42 0-8 3.58-8 8 0 1.37.47 2.82 1.25 4.04l2.25-1.5c-.32-.79-.5-1.64-.5-2.54 0-3.53 2.61-6.43 6-6.92V2.05z" />
                  </svg>
                  Fast & Accessible
                </div>
                <p className="highlight-desc">
                  Instant real-time classification with simple inputs designed for consumers and vendors alike.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="content-wrapper">
          <div className="footer-top">
            <div className="footer-brand">
              <button
                type="button"
                className="nav-brand"
                onClick={() => handleNavClick('home')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="nav-logo-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A9.49 9.49 0 0 0 12 21c7 0 11-8 11-8s-2.5-3-6-5zm-5 11c-1.8 0-3.4-.8-4.5-2.1C9.2 13.3 12 11 15 10c0 3-1.5 6-3 9z" />
                  </svg>
                </div>
                <span className="nav-brand-text">
                  FreshGuard <span>AI</span>
                </span>
              </button>
              <p className="footer-desc">
                An intelligent food quality inspection project dedicated to promoting food safety
                and reducing waste through machine learning and computer vision.
              </p>
            </div>

            <ul className="footer-links">
              <li>
                <button
                  type="button"
                  className="footer-link"
                  onClick={() => handleNavClick('home')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link"
                  onClick={() => handleNavClick('image')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Image Analysis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link"
                  onClick={() => handleNavClick('manual')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Manual Analysis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link"
                  onClick={() => handleNavClick('history')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  History
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link"
                  onClick={() => handleNavClick('profile')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Profile
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} FreshGuard AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
