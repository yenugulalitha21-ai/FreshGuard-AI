import { useState } from 'react'

function History({ history, onClearHistory, onStartAnalysis }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleConfirmClear = () => {
    onClearHistory()
    setShowConfirmModal(false)
  }

  // Summary statistics
  const totalScans = history.length
  const goodCount = history.filter((item) => item.prediction === 'Good to Eat').length
  const badCount = history.filter((item) => item.prediction !== 'Good to Eat').length

  return (
    <div className="history-page">
      <div className="content-wrapper">
        {/* Header and Actions */}
        <div className="history-header">
          <div>
            <div className="section-tag">User Records</div>
            <h1 className="history-title">Prediction History</h1>
            <p className="history-subtitle">
              Review your past fruit & vegetable freshness assessments and confidence ratings.
            </p>
          </div>

          {totalScans > 0 && (
            <div className="history-header-actions">
              <button
                type="button"
                className="btn-clear-history"
                onClick={() => setShowConfirmModal(true)}
                title="Remove all saved prediction records for this user"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear History
              </button>
            </div>
          )}
        </div>

        {/* Stats Strip */}
        {totalScans > 0 && (
          <div className="history-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Analyses</div>
              <div className="stat-number">{totalScans}</div>
            </div>
            <div className="stat-card stat-good">
              <div className="stat-label">Good to Eat</div>
              <div className="stat-number">{goodCount}</div>
            </div>
            <div className="stat-card stat-bad">
              <div className="stat-label">Spoilage Detected</div>
              <div className="stat-number">{badCount}</div>
            </div>
          </div>
        )}

        {/* Records Display or Empty State */}
        {totalScans === 0 ? (
          <div className="history-empty-card">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="empty-title">No analysis history yet.</h3>
            <p className="empty-desc">
              Your completed fruit and vegetable analyses will appear here.
            </p>
            <div className="empty-actions">
              <button
                type="button"
                className="btn-choose"
                onClick={() => onStartAnalysis('image')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Try Image Analysis
              </button>
              <button
                type="button"
                className="btn-sample"
                onClick={() => onStartAnalysis('manual')}
              >
                <span aria-hidden="true">📊</span> Try Manual Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="history-records-container">
            <div className="history-cards-grid">
              {history.map((record) => {
                const isPositive = record.prediction === 'Good to Eat'
                return (
                  <div
                    key={record.id}
                    className={`history-card ${isPositive ? 'history-card-good' : 'history-card-bad'}`}
                  >
                    <div className="history-card-top">
                      <span className={`analysis-type-badge ${record.analysisType === 'Image' ? 'badge-image' : 'badge-manual'}`}>
                        {record.analysisType === 'Image' ? (
                          <>
                            <span aria-hidden="true">🖼️</span> Image Analysis
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">📊</span> Manual Form
                          </>
                        )}
                      </span>
                      <span className="history-timestamp">
                        {record.date} • {record.time}
                      </span>
                    </div>

                    <div className="history-card-body">
                      <div className="history-item-detail">
                        <span className="history-label">Produce Item</span>
                        <h4 className="history-fruit-name">{record.fruit}</h4>
                      </div>

                      <div className="history-verdict-wrap">
                        <div className={`history-verdict-badge ${isPositive ? 'verdict-good' : 'verdict-bad'}`}>
                          {isPositive ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              Good to Eat
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                              </svg>
                              Bad to Eat
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="history-confidence-row">
                      <div className="history-confidence-info">
                        <span className="conf-label">Confidence</span>
                        <span className="conf-value">{record.confidence}%</span>
                      </div>
                      <div className="history-progress-track">
                        <div
                          className={`history-progress-bar ${isPositive ? 'progress-good' : 'progress-bad'}`}
                          style={{ width: `${Math.min(Math.max(record.confidence, 5), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Clear History Confirmation Modal */}
        {showConfirmModal && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-box">
              <div className="modal-icon-wrap" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 id="modal-title" className="modal-title">Clear Prediction History?</h3>
              <p className="modal-desc">
                This will permanently delete all your recorded prediction history from this browser.
                Your login profile and session will not be affected.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-confirm"
                  onClick={handleConfirmClear}
                >
                  Yes, Clear History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default History
