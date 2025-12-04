import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import HelpModal from '../components/HelpModal';
import EmailModal from '../components/EmailModal';
import { getErrorMessage, getErrorTitle } from '../utils/errorUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../styles/auth.css';

export default function TrialBalance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
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

  const fetchUserRole = async () => {
    try {
      const res = await api.get('/auth/me/');
      setUserRole(res.data.role || '');
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  // Auto-fetch on component mount and when date changes
  useEffect(() => {
    fetchTrialBalance();
  }, [selectedDate, startDate, endDate, dateMode]);

  useEffect(() => {
    fetchUserRole();
  }, []);

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

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  const handleDownload = async () => {
    if (!trialBalanceData) return;
    
    const reportDate = dateMode === 'asof' 
      ? selectedDate 
      : `${startDate}_to_${endDate}`;
    
    // Find the report card element
    const reportCard = document.getElementById('trial-balance-report-card');
    if (!reportCard) {
      alert('Report card not found. Please ensure the report is displayed.');
      return;
    }
    
    try {
      // Capture the report card as an image using html2canvas
      const canvas = await html2canvas(reportCard, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: reportCard.scrollWidth,
        windowHeight: reportCard.scrollHeight
      });
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with the image
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      pdf.save(`trial-balance-${reportDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handlePrint}
              disabled={!trialBalanceData}
              style={{
                backgroundColor: "#1C5C59",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: trialBalanceData ? "pointer" : "not-allowed",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: trialBalanceData ? 1 : 0.6
              }}
              title="Print report"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1h12a1 1 0 0 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1h6a1 1 0 0 1 1z"/>
              </svg>
              Print
            </button>
            <button
              onClick={handleEmail}
              disabled={!trialBalanceData}
              style={{
                backgroundColor: "#1C5C59",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: trialBalanceData ? "pointer" : "not-allowed",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: trialBalanceData ? 1 : 0.6
              }}
              title="Email report"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/>
              </svg>
              Email
            </button>
            <button
              onClick={handleDownload}
              disabled={!trialBalanceData}
              style={{
                backgroundColor: "#1C5C59",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: trialBalanceData ? "pointer" : "not-allowed",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: trialBalanceData ? 1 : 0.6
              }}
              title="Download/Save report"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
              Save
            </button>
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
        <div id="trial-balance-report-card" className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
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
                {(() => {
                  let firstDebitPlaced = false;
                  let firstCreditPlaced = false;
                  return trialBalanceData.trial_balance.map((account, index) => {
                    let debitDisplay = '';
                    if (account.debit_balance > 0) {
                      if (!firstDebitPlaced) {
                        debitDisplay = formatCurrency(account.debit_balance);
                        firstDebitPlaced = true;
                      } else {
                        debitDisplay = formatNumber(account.debit_balance);
                      }
                    }
                    let creditDisplay = '';
                    if (account.credit_balance > 0) {
                      if (!firstCreditPlaced) {
                        creditDisplay = formatCurrency(account.credit_balance);
                        firstCreditPlaced = true;
                      } else {
                        creditDisplay = formatNumber(account.credit_balance);
                      }
                    }
                    return (
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
                      <button
                        onClick={() => navigate(`/${(userRole || 'manager').toLowerCase()}/ledger/${account.account_number}`)}
                        className="clickable-link"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontFamily: "inherit",
                          fontSize: "inherit"
                        }}
                        title="Open ledger for this account"
                      >
                        {account.account_number} - {account.account_name}
                      </button>
                    </td>
                        <td style={{ 
                          padding: "12px 16px", 
                          textAlign: "right", 
                          fontFamily: "monospace",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}>
                          {debitDisplay}
                        </td>
                        <td style={{ 
                          padding: "12px 16px", 
                          textAlign: "right", 
                          fontFamily: "monospace",
                          fontSize: "14px",
                          fontWeight: "500"
                        }}>
                          {creditDisplay}
                        </td>
                      </tr>
                    );
                  });
                })()}
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

      {showEmailModal && trialBalanceData && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          recipientType="manager"
          senderRole="ACCOUNTANT"
          initialSubject={`Trial Balance Report - ${dateMode === 'asof' ? new Date(selectedDate).toLocaleDateString() : `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}`}
          initialMessage={`
Trial Balance Report

${dateMode === 'asof' 
  ? `As of: ${new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  : `Period: ${new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
}

Total Debits: ${formatCurrency(trialBalanceData.total_debits)}
Total Credits: ${formatCurrency(trialBalanceData.total_credits)}
Status: ${trialBalanceData.is_balanced ? 'Balanced ✓' : 'Not Balanced ✗'}
${!trialBalanceData.is_balanced ? `Difference: ${formatCurrency(Math.abs(trialBalanceData.total_debits - trialBalanceData.total_credits))}` : ''}

Please review the detailed report below.

Account Details:
${trialBalanceData.trial_balance.map(acc => 
  `${acc.account_number} - ${acc.account_name}: ${acc.debit_balance > 0 ? `Debit ${formatCurrency(acc.debit_balance)}` : `Credit ${formatCurrency(acc.credit_balance)}`}`
).join('\n')}

Generated on: ${new Date().toLocaleString()}
          `}
        />
      )}

    </div>
  );
}
