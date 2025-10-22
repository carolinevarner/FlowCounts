import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import EmailModal from '../components/EmailModal';
import '../styles/auth.css';

export default function RetainedEarnings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retainedEarningsData, setRetainedEarningsData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateMode, setDateMode] = useState('asof'); // 'asof' or 'range'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  console.log('RetainedEarnings component rendered');

  const fetchRetainedEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      
      let params = {};
      
      if (dateMode === 'asof') {
        // Use current year start and selected date
        const selectedDateObj = new Date(selectedDate);
        const startOfYear = new Date(selectedDateObj.getFullYear(), 0, 1); // January 1st of selected year
        
        params = {
          start_date: startOfYear.toISOString().split('T')[0],
          end_date: selectedDate
        };
      } else {
        params = {
          start_date: startDate,
          end_date: endDate
        };
      }

      console.log('Fetching retained earnings with params:', params);
      const response = await api.get('/financial/retained-earnings/', { params });
      console.log('Retained earnings response:', response.data);
      setRetainedEarningsData(response.data);
    } catch (err) {
      console.error('Failed to fetch retained earnings:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load retained earnings statement');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount and when date changes
  useEffect(() => {
    fetchRetainedEarnings();
  }, [selectedDate, startDate, endDate, dateMode]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  const handleDownload = () => {
    if (!retainedEarningsData) return;
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startDate = startOfYear.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    const data = {
      title: 'Statement of Retained Earnings',
      period: `${startDate} to ${endDate}`,
      data: retainedEarningsData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retained-earnings-${startDate}-to-${endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading retained earnings statement...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we generate your report.</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
          Debug: Component is loading...
        </div>
      </div>
    );
  }

  // Add error handling
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px', color: 'red' }}>Error Loading Retained Earnings Statement</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>{error}</div>
        <button 
          onClick={() => fetchRetainedEarnings()} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#1C5C59', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Add data check to prevent crashes
  if (!retainedEarningsData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>No Data Available</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Retained earnings statement data is not available.</div>
        <button 
          onClick={() => fetchRetainedEarnings()} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#1C5C59', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Load Data
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          Statement of Retained Earnings
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Date Filter */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "40px",
                color: "#000"
              }}
              title={`Report as of: ${new Date(selectedDate).toLocaleDateString()}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
            </button>
            {showDatePicker && (
              <div
                style={{
                  position: "absolute",
                  top: "35px",
                  right: "0",
                  backgroundColor: "white",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: "220px"
                }}
              >
                {/* Date Mode Toggle */}
                <div style={{ marginBottom: 12, display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setDateMode('asof')}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: 11,
                      backgroundColor: dateMode === 'asof' ? "#1C5C59" : "#f8f9fa",
                      color: dateMode === 'asof' ? "white" : "#333",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    As of Date
                  </button>
                  <button
                    onClick={() => setDateMode('range')}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: 11,
                      backgroundColor: dateMode === 'range' ? "#1C5C59" : "#f8f9fa",
                      color: dateMode === 'range' ? "white" : "#333",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Date Range
                  </button>
                </div>

                {dateMode === 'asof' ? (
                  <>
                    <div style={{ marginBottom: 8, fontSize: 12, fontWeight: "bold", color: "#333" }}>
                      Report as of:
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setShowDatePicker(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: "4px",
                        border: "1px solid #b8b6b6"
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 11, color: "#666", textAlign: "center" }}>
                      {selectedDate ? `Selected: ${new Date(selectedDate).toLocaleDateString()}` : "No date selected"}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 8, fontSize: 12, fontWeight: "bold", color: "#333" }}>
                      Date Range:
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>From:</div>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: 12,
                          borderRadius: "4px",
                          border: "1px solid #b8b6b6"
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>To:</div>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: 12,
                          borderRadius: "4px",
                          border: "1px solid #b8b6b6"
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#666", textAlign: "center" }}>
                      {startDate && endDate ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : "Select date range"}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      if (dateMode === 'asof') {
                        setSelectedDate(today);
                      } else {
                        setStartDate(today);
                        setEndDate(today);
                      }
                      setShowDatePicker(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#1C5C59",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="auth-linkbtn"
            style={{
              height: "30px",
              padding: "0 12px",
              fontSize: 14,
              width: "auto",
              minWidth: "80px"
            }}
            title="Get help with this page"
          >
            Help
          </button>
        </div>
      </div>


      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          marginBottom: '16px',
          color: '#c00',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Retained Earnings Statement Report */}
      {retainedEarningsData && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
          {/* Report Header */}
          <div style={{ 
            backgroundColor: "#1C302F", 
            color: "white", 
            padding: "20px", 
            textAlign: "center",
            marginBottom: 0
          }}>
            <h1 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "1.8em", 
              fontWeight: "600",
              fontFamily: "Playfair Display"
            }}>
              Addams & Family Inc.
            </h1>
            <h2 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "1.4em", 
              fontWeight: "500",
              fontFamily: "Playfair Display"
            }}>
              Statement of Retained Earnings
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: "0.9em",
              fontWeight: "normal",
              opacity: 0.8
            }}>
              {dateMode === 'asof' ? (
                <>For the period ending {new Date(selectedDate).toLocaleDateString('en-US', { 
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</>
              ) : (
                <>For the period from {new Date(startDate).toLocaleDateString('en-US', { 
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} to {new Date(endDate).toLocaleDateString('en-US', { 
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</>
              )}
            </p>
          </div>

          {/* Statement Content */}
          <div style={{ padding: "20px", backgroundColor: "white" }}>
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ 
                      textAlign: "left", 
                      padding: "12px 0", 
                      borderBottom: "1px solid #ddd",
                      fontWeight: "normal",
                      fontSize: "14px",
                      color: "#666"
                    }}>
                      Description
                    </th>
                    <th style={{ 
                      textAlign: "right", 
                      padding: "12px 0", 
                      borderBottom: "1px solid #ddd",
                      fontWeight: "normal",
                      fontSize: "14px",
                      color: "#666"
                    }}>
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: "500"
                    }}>
                      Beginning Retained Earnings
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "sans-serif",
                      fontWeight: "500"
                    }}>
                      {formatCurrency(retainedEarningsData.beginning_retained_earnings)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: "500"
                    }}>
                      Add: Net Income
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "sans-serif",
                      fontWeight: "500"
                    }}>
                      {formatNumber(retainedEarningsData.net_income)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: "500"
                    }}>
                      Less: Dividends
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "sans-serif",
                      fontWeight: "500"
                    }}>
                      {formatNumber(0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      fontWeight: "bold",
                      fontSize: "1.1em"
                    }}>
                      Ending Retained Earnings
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      textAlign: "right",
                      fontFamily: "sans-serif",
                      fontWeight: "bold",
                      fontSize: "1.1em"
                    }}>
                      <div style={{
                        display: "inline-block",
                        borderBottom: "3px double #333",
                        paddingBottom: "2px"
                      }}>
                        {formatCurrency(retainedEarningsData.ending_retained_earnings)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          page="retainedEarnings" 
          userRole="MANAGER" 
        />
      )}

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        subject={`Statement of Retained Earnings - ${new Date().getFullYear()}`}
        body={retainedEarningsData ? `
Statement of Retained Earnings Report

Period: ${new Date().getFullYear()}
Beginning Retained Earnings: ${formatCurrency(retainedEarningsData.beginning_retained_earnings)}
Net Income: ${formatCurrency(retainedEarningsData.net_income)}
Ending Retained Earnings: ${formatCurrency(retainedEarningsData.ending_retained_earnings)}

Please find the detailed report attached.
        ` : ''}
      />
    </div>
  );
}
