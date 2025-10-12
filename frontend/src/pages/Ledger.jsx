import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
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

export default function Ledger() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  async function fetchAccountDetails() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/chart-of-accounts/${accountId}/`);
      setAccount(response.data);
      
      // TODO: Fetch actual transactions when journal entries are implemented
      // For now, we'll show the account details and a placeholder for transactions
      setTransactions([
        // Placeholder data structure
        // {
        //   id: 1,
        //   date: "2024-01-15",
        //   description: "Opening Balance",
        //   reference: "OB-001",
        //   debit: response.data.initial_balance > 0 ? response.data.initial_balance : 0,
        //   credit: response.data.initial_balance < 0 ? Math.abs(response.data.initial_balance) : 0,
        //   balance: response.data.initial_balance
        // }
      ]);
    } catch (err) {
      console.error("Error fetching account:", err);
      setError(err?.response?.data?.detail || "Failed to load account details");
    } finally {
      setLoading(false);
    }
  }

  function calculateRunningBalance(transactions, normalSide) {
    let runningBalance = 0;
    return transactions.map(tx => {
      if (normalSide === "DEBIT") {
        runningBalance += (tx.debit || 0) - (tx.credit || 0);
      } else {
        runningBalance += (tx.credit || 0) - (tx.debit || 0);
      }
      return { ...tx, runningBalance };
    });
  }

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

  const transactionsWithBalance = calculateRunningBalance(transactions, account.normal_side);

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="auth-button secondary"
          style={{ 
            fontSize: 12, 
            padding: '6px 12px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none'
          }}
          title="Go back to Chart of Accounts"
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Account Ledger</h2>
      </div>

      {/* Account Details Card */}
      <div style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: 30
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Account Number</div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#1C5C59" }}>{account.account_number}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Account Name</div>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>{account.account_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Category</div>
            <div style={{ fontSize: 16 }}>{account.account_category}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Subcategory</div>
            <div style={{ fontSize: 16 }}>{account.account_subcategory}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Normal Side</div>
            <div style={{ fontSize: 16 }}>{account.normal_side}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Current Balance</div>
            <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace", color: account.balance >= 0 ? "#2d6a4f" : "#c1121f" }}>
              {formatCurrency(account.balance)}
            </div>
          </div>
        </div>
        {account.account_description && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #ddd" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 14 }}>{account.account_description}</div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <h3 style={{ marginBottom: 16 }}>Transaction History</h3>
      
      {transactionsWithBalance.length === 0 ? (
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "40px",
          textAlign: "center",
          color: "#666"
        }}>
          <p style={{ margin: 0, fontSize: 16 }}>No transactions found for this account.</p>
          <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
            Transactions will appear here once journal entries are posted.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "bold", fontSize: "0.8em" }}>
                  Date
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "bold", fontSize: "0.8em" }}>
                  Reference
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "bold", fontSize: "0.8em" }}>
                  Description
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold", fontSize: "0.8em" }}>
                  Debit
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold", fontSize: "0.8em" }}>
                  Credit
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold", fontSize: "0.8em" }}>
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", fontSize: "0.85em" }}>
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", fontSize: "0.85em" }}>
                    {tx.reference}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #ddd", fontSize: "0.85em" }}>
                    {tx.description}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontSize: "0.85em"
                  }}>
                    {tx.debit ? formatCurrency(tx.debit) : "-"}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontSize: "0.85em"
                  }}>
                    {tx.credit ? formatCurrency(tx.credit) : "-"}
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd", 
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    fontSize: "0.85em",
                    color: tx.runningBalance >= 0 ? "#2d6a4f" : "#c1121f"
                  }}>
                    {formatCurrency(tx.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Section */}
      <div style={{
        marginTop: 30,
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px"
      }}>
        <h4 style={{ marginTop: 0, marginBottom: 16 }}>Account Summary</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Debits</div>
            <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(account.debit)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Credits</div>
            <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(account.credit)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Net Change</div>
            <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(account.debit - account.credit)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Ending Balance</div>
            <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace", color: account.balance >= 0 ? "#2d6a4f" : "#c1121f" }}>
              {formatCurrency(account.balance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

