import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import HelpModal from "../components/HelpModal";
import "../styles/auth.css";
import "../styles/layout.css";

function formatCurrency(value) {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function generateSampleTransactions(account) {
  const transactions = [];
  const initialBalance = parseFloat(account.initial_balance || 0);
  const currentBalance = parseFloat(account.balance || 0);
  const totalDebits = parseFloat(account.debit || 0);
  const totalCredits = parseFloat(account.credit || 0);
  
  let runningBalance = 0;
  let transactionId = 1;
  
  transactions.push({
    id: 0,
    date: "",
    reference: "",
    description: "",
    debit: 0,
    credit: 0,
    balance: 0
  });
  
  if (initialBalance !== 0) {
    transactions.push({
      id: transactionId++,
      date: "2024-01-01",
      reference: transactionId - 1,
      description: "Opening Balance",
      debit: account.normal_side === "DEBIT" && initialBalance > 0 ? initialBalance : 0,
      credit: account.normal_side === "CREDIT" && initialBalance > 0 ? initialBalance : 0,
      balance: initialBalance
    });
    runningBalance = initialBalance;
  }

  const netChange = currentBalance - initialBalance;
  const remainingDebits = totalDebits - (account.normal_side === "DEBIT" && initialBalance > 0 ? initialBalance : 0);
  const remainingCredits = totalCredits - (account.normal_side === "CREDIT" && initialBalance > 0 ? initialBalance : 0);

  if (account.account_category === "ASSET") {
    const assetTypes = {
      "cash": ["Cash Deposit", "Cash Withdrawal", "Petty Cash", "Bank Transfer"],
      "accounts receivable": ["Sales on Credit", "Payment Received", "Bad Debt Write-off", "Collection"],
      "inventory": ["Inventory Purchase", "Inventory Sale", "Inventory Adjustment", "Damaged Goods"],
      "equipment": ["Equipment Purchase", "Equipment Sale", "Depreciation", "Maintenance"],
      "prepaid": ["Prepaid Insurance", "Prepaid Rent", "Prepaid Utilities", "Prepaid Services"]
    };
    
    const subcategory = (account.account_subcategory || '').toLowerCase();
    const descriptions = assetTypes[subcategory] || ["Asset Purchase", "Asset Sale", "Asset Adjustment", "Asset Depreciation"];
    
    if (remainingDebits > 0) {
      const splitDebits = Math.max(1, Math.min(4, Math.ceil(remainingDebits / 1000)));
      const debitPerTransaction = remainingDebits / splitDebits;
      
      for (let i = 0; i < splitDebits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 5).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: descriptions[i] || descriptions[0],
          debit: i === splitDebits - 1 ? remainingDebits - (debitPerTransaction * (splitDebits - 1)) : debitPerTransaction,
          credit: 0,
          balance: runningBalance + (debitPerTransaction * (i + 1))
        });
        runningBalance += debitPerTransaction;
      }
    }
    
    if (remainingCredits > 0) {
      const splitCredits = Math.max(1, Math.min(3, Math.ceil(remainingCredits / 1000)));
      const creditPerTransaction = remainingCredits / splitCredits;
      
      for (let i = 0; i < splitCredits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 10).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: descriptions[i + 2] || "Asset Reduction",
          debit: 0,
          credit: i === splitCredits - 1 ? remainingCredits - (creditPerTransaction * (splitCredits - 1)) : creditPerTransaction,
          balance: runningBalance - (creditPerTransaction * (i + 1))
        });
        runningBalance -= creditPerTransaction;
      }
    }
  } else if (account.account_category === "LIABILITY") {
    const liabilityTypes = {
      "accounts payable": ["Vendor Invoice", "Payment Made", "Credit Memo", "Adjustment"],
      "notes payable": ["Loan Received", "Loan Payment", "Interest Accrual", "Principal Payment"],
      "accrued": ["Accrued Expenses", "Expense Payment", "Accrual Adjustment", "Settlement"]
    };
    
    const subcategory = (account.account_subcategory || '').toLowerCase();
    const descriptions = liabilityTypes[subcategory] || ["Liability Incurred", "Liability Payment", "Liability Adjustment"];
    
    if (remainingCredits > 0) {
      const splitCredits = Math.max(1, Math.min(3, Math.ceil(remainingCredits / 1000)));
      const creditPerTransaction = remainingCredits / splitCredits;
      
      for (let i = 0; i < splitCredits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 5).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: descriptions[i] || descriptions[0],
          debit: 0,
          credit: i === splitCredits - 1 ? remainingCredits - (creditPerTransaction * (splitCredits - 1)) : creditPerTransaction,
          balance: runningBalance + (creditPerTransaction * (i + 1))
        });
        runningBalance += creditPerTransaction;
      }
    }
    
    if (remainingDebits > 0) {
      const splitDebits = Math.max(1, Math.min(3, Math.ceil(remainingDebits / 1000)));
      const debitPerTransaction = remainingDebits / splitDebits;
      
      for (let i = 0; i < splitDebits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 10).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: descriptions[i + 1] || "Liability Payment",
          debit: i === splitDebits - 1 ? remainingDebits - (debitPerTransaction * (splitDebits - 1)) : debitPerTransaction,
          credit: 0,
          balance: runningBalance - (debitPerTransaction * (i + 1))
        });
        runningBalance -= debitPerTransaction;
      }
    }
  } else if (account.account_category === "EQUITY") {
    const equityTypes = ["Owner Investment", "Owner Withdrawal", "Retained Earnings", "Dividend Payment"];
    
    if (remainingCredits > 0) {
      const splitCredits = Math.max(1, Math.min(2, Math.ceil(remainingCredits / 2000)));
      const creditPerTransaction = remainingCredits / splitCredits;
      
      for (let i = 0; i < splitCredits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 5).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: equityTypes[i] || equityTypes[0],
          debit: 0,
          credit: i === splitCredits - 1 ? remainingCredits - (creditPerTransaction * (splitCredits - 1)) : creditPerTransaction,
          balance: runningBalance + (creditPerTransaction * (i + 1))
        });
        runningBalance += creditPerTransaction;
      }
    }
    
    if (remainingDebits > 0) {
      const splitDebits = Math.max(1, Math.min(2, Math.ceil(remainingDebits / 2000)));
      const debitPerTransaction = remainingDebits / splitDebits;
      
      for (let i = 0; i < splitDebits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 10).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: equityTypes[i + 2] || equityTypes[1],
          debit: i === splitDebits - 1 ? remainingDebits - (debitPerTransaction * (splitDebits - 1)) : debitPerTransaction,
          credit: 0,
          balance: runningBalance - (debitPerTransaction * (i + 1))
        });
        runningBalance -= debitPerTransaction;
      }
    }
  } else if (account.account_category === "REVENUE") {
    const revenueTypes = ["Sales Revenue", "Service Revenue", "Interest Income", "Other Income"];
    
    if (remainingCredits > 0) {
      const splitCredits = Math.max(1, Math.min(4, Math.ceil(remainingCredits / 500)));
      const creditPerTransaction = remainingCredits / splitCredits;
      
      for (let i = 0; i < splitCredits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 5).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: revenueTypes[i] || revenueTypes[0],
          debit: 0,
          credit: i === splitCredits - 1 ? remainingCredits - (creditPerTransaction * (splitCredits - 1)) : creditPerTransaction,
          balance: runningBalance + (creditPerTransaction * (i + 1))
        });
        runningBalance += creditPerTransaction;
      }
    }
  } else if (account.account_category === "EXPENSE") {
    const expenseTypes = ["Office Supplies", "Utilities", "Rent Expense", "Insurance Expense", "Professional Fees"];
    
    if (remainingDebits > 0) {
      const splitDebits = Math.max(1, Math.min(5, Math.ceil(remainingDebits / 300)));
      const debitPerTransaction = remainingDebits / splitDebits;
      
      for (let i = 0; i < splitDebits; i++) {
        transactions.push({
          id: transactionId++,
          date: `2024-01-${String(i + 5).padStart(2, '0')}`,
          reference: transactionId - 1,
          description: expenseTypes[i] || expenseTypes[0],
          debit: i === splitDebits - 1 ? remainingDebits - (debitPerTransaction * (splitDebits - 1)) : debitPerTransaction,
          credit: 0,
          balance: runningBalance + (debitPerTransaction * (i + 1))
        });
        runningBalance += debitPerTransaction;
      }
    }
  }

  return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export default function Ledger() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetchAccountDetails();
    fetchUserRole();
  }, [accountId]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showDatePicker) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDatePicker]);

  async function fetchUserRole() {
    try {
      const res = await api.get("/auth/me/");
      setUserRole(res.data.role);
    } catch (err) {
      console.error("Failed to fetch user role:", err);
    }
  }

  async function fetchAccountDetails() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/chart-of-accounts/${accountId}/`);
      setAccount(response.data);
      
      const sampleTransactions = generateSampleTransactions(response.data);
      setTransactions(sampleTransactions);
    } catch (err) {
      console.error("Error fetching account:", err);
      setError(err?.response?.data?.detail || "Failed to load account details");
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return ' ⌄';
    }
    return sortConfig.direction === 'asc' ? ' ⌃' : ' ⌄';
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedDate) {
      filtered = filtered.filter((tx) => {
        if (!tx.date) return false;
        const txDate = new Date(tx.date).toISOString().split('T')[0];
        return txDate === selectedDate;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(term) ||
          tx.reference.toString().includes(term) ||
          new Date(tx.date).toLocaleDateString().includes(term)
      );
    }

    if (filter === "debit") {
      filtered = filtered.filter((tx) => tx.debit > 0);
    } else if (filter === "credit") {
      filtered = filtered.filter((tx) => tx.credit > 0);
    } else if (filter === "opening") {
      filtered = filtered.filter((tx) => tx.description === "Opening Balance");
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a.date);
            bValue = new Date(b.date);
            break;
          case 'reference':
            aValue = a.reference;
            bValue = b.reference;
            break;
          case 'description':
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
            break;
          case 'debit':
            aValue = a.debit || 0;
            bValue = b.debit || 0;
            break;
          case 'credit':
            aValue = a.credit || 0;
            bValue = b.credit || 0;
            break;
          case 'balance':
            aValue = a.balance || 0;
            bValue = b.balance || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [transactions, searchTerm, filter, sortConfig, selectedDate]);

  if (loading) {
    return <div style={{ padding: "12px 16px" }}>Loading ledger...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "12px 16px" }}>
        <div className="error-box">{error}</div>
        <button 
          onClick={() => navigate(-1)} 
          className="auth-button secondary"
          style={{ marginTop: 20 }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!account) {
    return <div style={{ padding: "12px 16px" }}>Account not found</div>;
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          {account.account_number} - {account.account_name}
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

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20, 
        gap: 20,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(!showDatePicker);
              }}
              style={{
                padding: "6px 10px",
                fontSize: 16,
                borderRadius: "6px",
                border: "1px solid #b8b6b6",
                backgroundColor: "#fff",
                cursor: "pointer",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "40px",
                color: "#000"
              }}
              title={selectedDate ? `Transactions on: ${new Date(selectedDate).toLocaleDateString()}` : "Select a date to filter transactions"}
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
                  left: 0,
                  background: "white",
                  border: "1px solid #b8b6b6",
                  borderRadius: "6px",
                  padding: "12px",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: 220
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: "bold", color: "#333" }}>
                  View transactions on:
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
                  {selectedDate ? `Selected: ${new Date(selectedDate).toLocaleDateString()}` : "No date selected - Showing all"}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                      setShowDatePicker(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate("");
                      setShowDatePicker(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ 
              padding: "6px 12px", 
              fontSize: 12,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              outline: "none",
              fontFamily: "sans-serif",
              height: "30px",
              lineHeight: "1",
              boxSizing: "border-box"
            }}
          >
            <option value="all">All Transactions</option>
            <option value="debit">Debit Only</option>
            <option value="credit">Credit Only</option>
            <option value="opening">Opening Balance</option>
          </select>

          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: "6px 12px", 
              fontSize: 12,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              outline: "none",
              fontFamily: "sans-serif",
              width: "25vw",
              minWidth: 200,
              maxWidth: 400,
              height: "30px",
              lineHeight: "1",
              boxSizing: "border-box"
            }}
            title="Search by description, reference number, or date"
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th 
                onClick={() => handleSort('date')}
                style={{ 
                  padding: "10px 12px", 
                  textAlign: "left", 
                  fontWeight: "bold", 
                  fontSize: "0.8em",
                  background: "white",
                  color: "#000",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Date{getSortIndicator('date')}
              </th>
                <th 
                  onClick={() => handleSort('reference')}
                  style={{ 
                    padding: "10px 12px", 
                    textAlign: "left", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  Reference No.{getSortIndicator('reference')}
              </th>
              <th style={{ 
                padding: "10px 12px", 
                textAlign: "left", 
                fontWeight: "bold", 
                fontSize: "0.8em",
                background: "white",
                color: "#000"
              }}>
                Description
              </th>
              <th style={{ 
                padding: "10px 12px", 
                textAlign: "right", 
                fontWeight: "bold", 
                fontSize: "0.8em",
                background: "white",
                color: "#000"
              }}>
                Debit
              </th>
              <th style={{ 
                padding: "10px 12px", 
                textAlign: "right", 
                fontWeight: "bold", 
                fontSize: "0.8em",
                background: "white",
                color: "#000"
              }}>
                Credit
              </th>
              <th style={{ 
                padding: "10px 12px", 
                textAlign: "right", 
                fontWeight: "bold", 
                fontSize: "0.8em",
                background: "white",
                color: "#000"
              }}>
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 20, borderBottom: "1px solid #ddd" }}>
                  No transactions found for this account.
                </td>
              </tr>
            ) : (
                filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString() : ""}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal", 
                    fontSize: "0.85em",
                    color: "#1C5C59"
                  }}>
                    {tx.reference || ""}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal", 
                    fontSize: "0.85em"
                  }}>
                    {tx.description || ""}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>
                    {tx.debit > 0 ? formatCurrency(tx.debit) : ""}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>
                    {tx.credit > 0 ? formatCurrency(tx.credit) : ""}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontWeight: "normal",
                    fontSize: "0.85em",
                    color: "#000"
                  }}>
                    {formatCurrency(tx.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "left", 
        alignItems: "left", 
        marginTop: 30
      }}>
        <button
          onClick={() => navigate(-1)}
          className="auth-button secondary"
          style={{ 
            fontSize: 12, 
            padding: '6px 8px',
            backgroundColor: '#1C5C59',
            color: 'white',
            border: 'none',
            width: 'auto',
            minWidth: '200px'
          }}
          title="Go back to Chart of Accounts"
        >
          Back to Accounts
        </button>
      </div>

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} page="ledger" userRole={userRole} />
      )}
    </div>
  );
}