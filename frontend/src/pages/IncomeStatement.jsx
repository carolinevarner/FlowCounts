import { useState, useEffect } from 'react';
import api from '../api';
import HelpModal from '../components/HelpModal';
import EmailModal from '../components/EmailModal';
import '../styles/auth.css';

export default function IncomeStatement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [incomeStatementData, setIncomeStatementData] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  console.log('IncomeStatement component rendered');

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Starting to fetch income statement...');
      
      // Use current year start and current date
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      
      const params = {
        start_date: startOfYear.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      };

      console.log('Fetching income statement with params:', params);
      
      // Add a small delay to see if it's a timing issue
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await api.get('/financial/income-statement/', { params });
      console.log('Income statement response received:', response.status);
      console.log('Income statement data:', response.data);
      
      setIncomeStatementData(response.data);
      console.log('Income statement data set successfully');
    } catch (err) {
      console.error('Failed to fetch income statement:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.error || 'Failed to load income statement');
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchIncomeStatement();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  const handleDownload = () => {
    if (!incomeStatementData) return;
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startDate = startOfYear.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    const data = {
      title: 'Income Statement',
      period: `${startDate} to ${endDate}`,
      data: incomeStatementData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-statement-${startDate}-to-${endDate}.json`;
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
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading income statement...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we generate your report.</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
          Debug: Component is loading...
        </div>
      </div>
    );
  }

  // Add error boundary fallback
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px', color: 'red' }}>Error Loading Income Statement</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>{error}</div>
        <button 
          onClick={() => fetchIncomeStatement()} 
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
  if (!incomeStatementData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>No Data Available</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Income statement data is not available.</div>
        <button 
          onClick={() => fetchIncomeStatement()} 
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
  if (!incomeStatementData.revenues || !incomeStatementData.expenses) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px', color: 'red' }}>Data Structure Error</div>
        <div style={{ fontSize: '14px', color: '#666' }}>The income statement data is not in the expected format.</div>
        <button 
          onClick={() => fetchIncomeStatement()} 
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
          Income Statement
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

      {/* Income Statement Report */}
      {incomeStatementData && (
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
              Income Statement
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

          {/* Income Statement Content */}
          <div style={{ padding: "20px", backgroundColor: "white" }}>
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              {/* Revenue Section */}
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ 
                  margin: "0 0 16px 0", 
                  fontSize: "1.1em", 
                  fontWeight: "bold",
                  color: "#1C5C59"
                }}>
                  Revenue
                </h4>
                
                {incomeStatementData.revenues.length > 0 ? (
                  <div>
                    {incomeStatementData.revenues.map((revenue, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "8px 0",
                        borderBottom: "1px solid #eee"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          {revenue.account_name}
                        </div>
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatCurrency(revenue.amount)}
                        </div>
                      </div>
                    ))}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "12px 0",
                      fontWeight: "bold",
                      fontSize: "1.1em",
                      borderTop: "1px solid #1C5C59"
                    }}>
                      <span>Revenue Total</span>
                      <div style={{
                        display: "inline-block",
                        borderBottom: "3px double #333",
                        paddingBottom: "2px",
                        fontFamily: "monospace"
                      }}>
                        {formatCurrency(incomeStatementData.total_revenue)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#666", fontStyle: "italic", padding: "16px 0" }}>
                    No revenue transactions for this period
                  </div>
                )}
              </div>

              {/* Expense Section */}
              <div style={{ marginBottom: 30 }}>
                <h4 style={{ 
                  margin: "0 0 16px 0", 
                  fontSize: "1.1em", 
                  fontWeight: "bold",
                  color: "#1C5C59"
                }}>
                  Expenses
                </h4>
                
                {incomeStatementData.expenses.length > 0 ? (
                  <div>
                    {incomeStatementData.expenses.map((expense, index) => (
                      <div key={index} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "8px 0",
                        borderBottom: "1px solid #eee"
                      }}>
                        <div style={{ fontWeight: "500" }}>
                          {expense.account_name}
                        </div>
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontWeight: "500",
                          textAlign: "right"
                        }}>
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                    ))}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "12px 0",
                      fontWeight: "bold",
                      fontSize: "1.1em",
                      borderTop: "1px solid #1C5C59"
                    }}>
                      <span>Expenses Total</span>
                      <div style={{
                        display: "inline-block",
                        borderBottom: "3px double #333",
                        paddingBottom: "2px",
                        fontFamily: "monospace"
                      }}>
                        {formatCurrency(incomeStatementData.total_expenses)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#666", fontStyle: "italic", padding: "16px 0" }}>
                    No expense transactions for this period
                  </div>
                )}
              </div>

              {/* Net Income Section */}
              <div style={{ 
                marginTop: "30px",
                padding: "20px 0",
                borderTop: "2px solid #1C5C59"
              }}>
                <h4 style={{ 
                  margin: "0 0 16px 0", 
                  fontSize: "1.1em", 
                  fontWeight: "bold",
                  color: "#1C5C59"
                }}>
                  Net Income
                </h4>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "12px 0",
                  fontWeight: "bold",
                  fontSize: "1.1em"
                }}>
                  <span>Net Income Total</span>
                  <div style={{
                    display: "inline-block",
                    borderBottom: "3px double #333",
                    paddingBottom: "2px",
                    fontFamily: "monospace"
                  }}>
                    {formatCurrency(incomeStatementData.net_income)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          page="incomeStatement" 
          userRole="MANAGER" 
        />
      )}

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        subject={`Income Statement - ${new Date().getFullYear()}`}
        body={incomeStatementData ? `
Income Statement Report

Period: ${new Date().getFullYear()}
Total Revenue: ${formatCurrency(incomeStatementData.total_revenue)}
Total Expenses: ${formatCurrency(incomeStatementData.total_expenses)}
Net Income: ${formatCurrency(incomeStatementData.net_income)}

Please find the detailed report attached.
        ` : ''}
      />
    </div>
  );
}
