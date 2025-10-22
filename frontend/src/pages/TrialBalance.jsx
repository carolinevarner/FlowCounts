import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import { getErrorMessage, getErrorTitle } from '../utils/errorUtils';
import '../styles/auth.css';

export default function TrialBalance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateMode, setDateMode] = useState('asof'); // 'asof' or 'range'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      setError('');
      
      let params = {};
      
      if (dateMode === 'asof') {
        params = { as_of_date: selectedDate };
      } else {
        params = { start_date: startDate, end_date: endDate };
      }

      const response = await api.get('/financial/trial-balance/', { params });
      setTrialBalanceData(response.data);
    } catch (err) {
      console.error('Failed to fetch trial balance:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount and when date changes
  useEffect(() => {
    fetchTrialBalance();
  }, [selectedDate, startDate, endDate, dateMode]);


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          Trial Balance
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
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Trial Balance Report */}
      {trialBalanceData && (
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
              Trial Balance
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: "0.9em",
              fontWeight: "normal",
              opacity: 0.8
            }}>
              {dateMode === 'asof' ? (
                <>As of {new Date(selectedDate).toLocaleDateString('en-US', { 
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


          {/* Trial Balance Table */}
          <div style={{ padding: 0 }}>
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse", 
              fontSize: "14px",
              backgroundColor: "white"
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: "#f8f9fa", 
                  borderBottom: "2px solid #dee2e6",
                  fontWeight: "bold"
                }}>
                  <th style={{ 
                    padding: "12px 16px", 
                    textAlign: "left", 
                    fontWeight: "bold",
                    fontSize: "15px",
                    color: "#333"
                  }}>
                    Account
                  </th>
                  <th style={{ 
                    padding: "12px 16px", 
                    textAlign: "right", 
                    fontWeight: "bold",
                    fontSize: "15px",
                    color: "#333"
                  }}>
                    Debit
                  </th>
                  <th style={{ 
                    padding: "12px 16px", 
                    textAlign: "right", 
                    fontWeight: "bold",
                    fontSize: "15px",
                    color: "#333"
                  }}>
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {trialBalanceData.trial_balance.map((account, index) => (
                  <tr key={index} style={{ 
                    borderBottom: "1px solid #e9ecef",
                    backgroundColor: index % 2 === 0 ? "white" : "#f8f9fa"
                  }}>
                    <td style={{ 
                      padding: "12px 16px", 
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {account.account_number} - {account.account_name}
                    </td>
                    <td style={{ 
                      padding: "12px 16px", 
                      textAlign: "right", 
                      fontFamily: "monospace",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}>
                      {account.debit_balance > 0 ? formatCurrency(account.debit_balance) : ''}
                    </td>
                    <td style={{ 
                      padding: "12px 16px", 
                      textAlign: "right", 
                      fontFamily: "monospace",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}>
                      {account.credit_balance > 0 ? formatCurrency(account.credit_balance) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ 
                  backgroundColor: "#f8f9fa", 
                  fontWeight: "bold",
                  borderTop: "2px solid #dee2e6"
                }}>
                  <td style={{ 
                    padding: "16px", 
                    textAlign: "left",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Total
                  </td>
                  <td style={{ 
                    padding: "16px", 
                    textAlign: "right", 
                    fontFamily: "monospace",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    <div style={{
                      display: "inline-block",
                      borderBottom: "3px double #333",
                      paddingBottom: "2px"
                    }}>
                      {formatCurrency(trialBalanceData.total_debits)}
                    </div>
                  </td>
                  <td style={{ 
                    padding: "16px", 
                    textAlign: "right", 
                    fontFamily: "monospace",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    <div style={{
                      display: "inline-block",
                      borderBottom: "3px double #333",
                      paddingBottom: "2px"
                    }}>
                      {formatCurrency(trialBalanceData.total_credits)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Status */}
          <div style={{ 
            padding: "16px 20px", 
            backgroundColor: trialBalanceData.is_balanced ? "#d4edda" : "#f8d7da",
            borderTop: `2px solid ${trialBalanceData.is_balanced ? "#c3e6cb" : "#f5c6cb"}`,
            color: trialBalanceData.is_balanced ? "#155724" : "#721c24"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: "bold"
            }}>
              {trialBalanceData.is_balanced ? '✓' : '✗'} 
              <span style={{ marginLeft: "8px" }}>
                {trialBalanceData.is_balanced ? 'Trial Balance is Balanced' : 'Trial Balance is NOT Balanced'}
              </span>
            </div>
            {!trialBalanceData.is_balanced && (
              <div style={{ 
                marginTop: "8px", 
                fontSize: "14px", 
                textAlign: "center",
                fontWeight: "500"
              }}>
                Difference: {formatCurrency(Math.abs(trialBalanceData.total_debits - trialBalanceData.total_credits))}
              </div>
            )}
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          page="trialBalance" 
          userRole="MANAGER" 
        />
      )}

    </div>
  );
}
