import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import EmailModal from '../components/EmailModal';
import '../styles/auth.css';

export default function BalanceSheet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  console.log('BalanceSheet component rendered');

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use current date as the as_of_date
      const params = {
        as_of_date: new Date().toISOString().split('T')[0]
      };

      console.log('Fetching balance sheet with params:', params);
      const response = await api.get('/financial/balance-sheet/', { params });
      console.log('Balance sheet response:', response.data);
      setBalanceSheetData(response.data);
    } catch (err) {
      console.error('Failed to fetch balance sheet:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchBalanceSheet();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  const handleDownload = () => {
    if (!balanceSheetData) return;
    
    const asOfDate = new Date().toISOString().split('T')[0];
    
    const data = {
      title: 'Balance Sheet',
      as_of_date: asOfDate,
      data: balanceSheetData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.json`;
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

  const groupAccountsBySubcategory = (accounts) => {
    const groups = {};
    accounts.forEach(account => {
      const subcategory = account.account_subcategory || 'Other';
      if (!groups[subcategory]) {
        groups[subcategory] = [];
      }
      groups[subcategory].push(account);
    });
    return groups;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading balance sheet...</div>
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
        <div style={{ fontSize: '18px', marginBottom: '10px', color: 'red' }}>Error Loading Balance Sheet</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>{error}</div>
        <button 
          onClick={() => fetchBalanceSheet()} 
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
  if (!balanceSheetData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>No Data Available</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Balance sheet data is not available.</div>
        <button 
          onClick={() => fetchBalanceSheet()} 
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

  // Add safety check for data structure
  if (!balanceSheetData.assets || !balanceSheetData.liabilities || !balanceSheetData.equity) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px', color: 'red' }}>Data Structure Error</div>
        <div style={{ fontSize: '14px', color: '#666' }}>The balance sheet data is not in the expected format.</div>
        <button 
          onClick={() => fetchBalanceSheet()} 
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
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          Balance Sheet
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

      {/* Balance Sheet Report */}
      {balanceSheetData && (
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
              Balance Sheet
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

          {/* Balance Sheet Content */}
          <div style={{ padding: "20px", backgroundColor: "white" }}>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              {/* Assets Column */}
              <div style={{ flex: 1, minWidth: "300px" }}>
                <h4 style={{ 
                  margin: "0 0 16px 0", 
                  fontSize: "1.1em", 
                  fontWeight: "bold",
                  color: "#1C5C59"
                }}>
                  Assets
                </h4>
                
                {Object.entries(groupAccountsBySubcategory(balanceSheetData.assets)).map(([subcategory, accounts]) => (
                  <div key={subcategory} style={{ marginBottom: 20 }}>
                    <h5 style={{ 
                      margin: "0 0 8px 0", 
                      fontSize: "1em", 
                      fontWeight: "bold",
                      color: "#333"
                    }}>
                      {subcategory}
                    </h5>
                    {accounts.map((account, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "6px 0",
                        borderBottom: "1px solid #f0f0f0"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          {account.account_name}
                        </div>
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatCurrency(account.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1.1em",
                  borderTop: "1px solid #1C5C59",
                  marginTop: "20px"
                }}>
                  <span>Total Assets</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "monospace"
                  }}>
                    {formatCurrency(balanceSheetData.total_assets)}
                  </div>
                </div>
              </div>

              {/* Liabilities and Equity Column */}
              <div style={{ flex: 1, minWidth: "300px" }}>
                <h4 style={{ 
                  margin: "0 0 16px 0", 
                  fontSize: "1.1em", 
                  fontWeight: "bold",
                  color: "#1C5C59"
                }}>
                  Equity & Liabilities
                </h4>
                
                {/* Liabilities */}
                <h5 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "1em", 
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Current Liabilities
                </h5>
                
                {Object.entries(groupAccountsBySubcategory(balanceSheetData.liabilities)).map(([subcategory, accounts]) => (
                  <div key={subcategory} style={{ marginBottom: 20 }}>
                    {accounts.map((account, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "6px 0",
                        borderBottom: "1px solid #f0f0f0"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          {account.account_name}
                        </div>
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatCurrency(account.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1.1em",
                  borderTop: "1px solid #1C5C59",
                  marginBottom: "20px"
                }}>
                  <span>Total Liabilities</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "monospace"
                  }}>
                    {formatCurrency(balanceSheetData.total_liabilities)}
                  </div>
                </div>

                {/* Equity */}
                <h5 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "1em", 
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Owners Equity
                </h5>
                
                {Object.entries(groupAccountsBySubcategory(balanceSheetData.equity)).map(([subcategory, accounts]) => (
                  <div key={subcategory} style={{ marginBottom: 20 }}>
                    {accounts.map((account, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "6px 0",
                        borderBottom: "1px solid #f0f0f0"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          {account.account_name}
                        </div>
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatCurrency(account.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1.1em",
                  borderTop: "1px solid #1C5C59",
                  marginBottom: "20px"
                }}>
                  <span>Total Equity</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "monospace"
                  }}>
                    {formatCurrency(balanceSheetData.total_equity)}
                  </div>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1.1em",
                  borderTop: "2px solid #1C5C59"
                }}>
                  <span>Total Equity & Liabilities</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "monospace"
                  }}>
                    {formatCurrency(balanceSheetData.total_liabilities + balanceSheetData.total_equity)}
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Check */}
            <div style={{ 
              marginTop: 30, 
              padding: "16px", 
              backgroundColor: balanceSheetData.is_balanced ? "#d4edda" : "#f8d7da",
              border: `2px solid ${balanceSheetData.is_balanced ? "#c3e6cb" : "#f5c6cb"}`,
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <strong style={{ 
                fontSize: "1.1em",
                color: balanceSheetData.is_balanced ? "#155724" : "#721c24"
              }}>
                {balanceSheetData.is_balanced ? '✓ Balance Sheet is Balanced' : '✗ Balance Sheet is NOT Balanced'}
              </strong>
              {!balanceSheetData.is_balanced && (
                <div style={{ marginTop: 8, fontSize: "14px" }}>
                  Assets: {formatCurrency(balanceSheetData.total_assets)}<br/>
                  Liabilities + Equity: {formatCurrency(balanceSheetData.total_liabilities + balanceSheetData.total_equity)}<br/>
                  Difference: {formatCurrency(Math.abs(balanceSheetData.total_assets - (balanceSheetData.total_liabilities + balanceSheetData.total_equity)))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          page="balanceSheet" 
          userRole="MANAGER" 
        />
      )}

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        subject={`Balance Sheet - ${new Date().toLocaleDateString()}`}
        body={balanceSheetData ? `
Balance Sheet Report

As of: ${new Date().toLocaleDateString()}
Total Assets: ${formatCurrency(balanceSheetData.total_assets)}
Total Liabilities: ${formatCurrency(balanceSheetData.total_liabilities)}
Total Equity: ${formatCurrency(balanceSheetData.total_equity)}
Status: ${balanceSheetData.is_balanced ? 'Balanced' : 'Not Balanced'}

Please find the detailed report attached.
        ` : ''}
      />
    </div>
  );
}
