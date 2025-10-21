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

  console.log('RetainedEarnings component rendered');

  const fetchRetainedEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use current year start and current date
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      
      const params = {
        start_date: startOfYear.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      };

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

  // Auto-fetch on component mount
  useEffect(() => {
    fetchRetainedEarnings();
  }, []);

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
              FlowCounts Inc.
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
              For the period ending {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
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
                      Beginning Balance
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "monospace",
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
                      Net Income
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: "500"
                    }}>
                      {formatCurrency(retainedEarningsData.net_income)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      fontWeight: "500"
                    }}>
                      Less Drawings
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      borderBottom: "1px solid #f0f0f0",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: "500"
                    }}>
                      {formatCurrency(0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ 
                      padding: "12px 0", 
                      fontWeight: "bold",
                      fontSize: "1.1em"
                    }}>
                      Ending Balance
                    </td>
                    <td style={{ 
                      padding: "12px 0", 
                      textAlign: "right",
                      fontFamily: "monospace",
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
