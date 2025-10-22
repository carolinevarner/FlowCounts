import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import EmailModal from '../components/EmailModal';
import { getErrorMessage, getErrorTitle } from '../utils/errorUtils';
import '../styles/auth.css';

export default function BalanceSheet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateMode, setDateMode] = useState('asof'); // 'asof' or 'range'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  console.log('BalanceSheet component rendered');

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      setError('');
      
      let params = {};
      
      if (dateMode === 'asof') {
        params = { as_of_date: selectedDate };
      } else {
        params = { start_date: startDate, end_date: endDate };
      }

      console.log('Fetching balance sheet with params:', params);
      const response = await api.get('/financial/balance-sheet/', { params });
      console.log('Balance sheet response:', response.data);
      setBalanceSheetData(response.data);
    } catch (err) {
      console.error('Failed to fetch balance sheet:', err);
      console.error('Error details:', err.response?.data);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount and when date changes
  useEffect(() => {
    fetchBalanceSheet();
  }, [selectedDate, startDate, endDate, dateMode]);

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

  const formatNumber = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
              Addams & Family Inc.
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
                
                {/* Current Assets Section */}
                <h5 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "1em", 
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Current Assets
                </h5>
                
                {(() => {
                  const currentAssets = balanceSheetData.assets.filter(account => 
                    account.account_subcategory && account.account_subcategory.toLowerCase().includes('current')
                  );
                  
                  return currentAssets.map((account, index) => (
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
                        fontFamily: "sans-serif", 
                        fontWeight: "500",
                        textAlign: "right"
                      }}>
                        {account.account_name === 'Cash' ? formatCurrency(account.balance) : formatNumber(account.balance)}
                      </div>
                    </div>
                  ));
                })()}
                
                {/* Total Current Assets */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1em",
                  borderTop: "1px solid #1C5C59",
                  marginTop: "10px"
                }}>
                  <span>Total Current Assets</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "1px solid #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatCurrency(balanceSheetData.assets
                      .filter(account => account.account_subcategory && account.account_subcategory.toLowerCase().includes('current'))
                      .reduce((sum, account) => sum + account.balance, 0)
                    )}
                  </div>
                </div>

                {/* Property Plant & Equipment Section */}
                <h5 style={{ 
                  margin: "20px 0 8px 0", 
                  fontSize: "1em", 
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Property Plant & Equipment
                </h5>
                
                {(() => {
                  const fixedAssets = balanceSheetData.assets.filter(account => 
                    account.account_name === 'Office Equipment'
                  );
                  
                  return fixedAssets.map((account, index) => (
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
                        fontFamily: "sans-serif", 
                        fontWeight: "500",
                        textAlign: "right"
                      }}>
                        {formatNumber(account.balance)}
                      </div>
                    </div>
                  ));
                })()}
                
                {/* Less: Accumulated Depreciation */}
                {(() => {
                  const accumulatedDepreciation = balanceSheetData.assets.find(account => 
                    account.account_name === 'Accumulated Depreciation - Office Equipment'
                  );
                  
                  if (accumulatedDepreciation) {
                    return (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "6px 0",
                        borderBottom: "1px solid #f0f0f0"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          Less: Accumulated Depreciation - Office Equipment
                        </div>
                        <div style={{ 
                          fontFamily: "sans-serif", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatNumber(accumulatedDepreciation.balance)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Property Plant & Equipment Net */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1em",
                  borderTop: "1px solid #1C5C59",
                  marginTop: "10px"
                }}>
                  <span>Property Plant & Equipment, Net</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "1px solid #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatNumber(
                      balanceSheetData.assets
                        .filter(account => account.account_name === 'Office Equipment')
                        .reduce((sum, account) => sum + account.balance, 0) +
                      balanceSheetData.assets
                        .filter(account => account.account_name === 'Accumulated Depreciation - Office Equipment')
                        .reduce((sum, account) => sum + account.balance, 0)
                    )}
                  </div>
                </div>
                
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
                    borderBottom: "1px solid #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatNumber(balanceSheetData.total_assets)}
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
                  Liabilities & Stocklholders' Equity
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
                          fontFamily: "sans-serif", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {account.account_name === 'Salaries Payable' ? formatCurrency(account.balance) : formatNumber(account.balance)}
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
                  <span>Total Current Liabilities</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "1px solid #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatNumber(balanceSheetData.total_liabilities)}
                  </div>
                </div>

                {/* Equity */}
                <h5 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "1em", 
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Stockholders' Equity
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
                          fontFamily: "sans-serif", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatNumber(account.balance)}
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
                  <span>Total Stockholders' Equity</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "1px solid #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatNumber(balanceSheetData.total_stockholders_equity)}
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
                  <span>Total Liabilities & Stockholders' Equity</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "sans-serif"
                  }}>
                    {formatCurrency(balanceSheetData.total_liabilities + balanceSheetData.total_stockholders_equity)}
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
                  Liabilities + Equity: {formatCurrency(balanceSheetData.total_liabilities + balanceSheetData.total_stockholders_equity)}<br/>
                  Difference: {formatCurrency(Math.abs(balanceSheetData.total_assets - (balanceSheetData.total_liabilities + balanceSheetData.total_stockholders_equity)))}
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
Total Stockholders' Equity: ${formatCurrency(balanceSheetData.total_stockholders_equity)}
Status: ${balanceSheetData.is_balanced ? 'Balanced' : 'Not Balanced'}

Please find the detailed report attached.
        ` : ''}
      />
    </div>
  );
}
