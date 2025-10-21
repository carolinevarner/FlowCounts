import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import '../styles/auth.css';

export default function TrialBalance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use current date as the as_of_date
      const params = {
        as_of_date: new Date().toISOString().split('T')[0]
      };

      const response = await api.get('/financial/trial-balance/', { params });
      setTrialBalanceData(response.data);
    } catch (err) {
      console.error('Failed to fetch trial balance:', err);
      setError(err.response?.data?.error || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchTrialBalance();
  }, []);


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
              FlowCounts Inc.
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
              As of {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
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
