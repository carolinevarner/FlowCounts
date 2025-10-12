import { useEffect, useState } from "react";
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

function formatPercentage(value) {
  if (value === null || value === undefined) return "0.00%";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
    setUserName(user.first_name || user.username || "User");
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/chart-of-accounts/");
      setAccounts(response.data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err?.response?.data?.detail || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  const calculateFinancialRatios = () => {
    const activeAccounts = accounts.filter(account => account.is_active);
    
    const assets = activeAccounts.filter(account => account.account_category === "ASSET");
    const currentAssets = assets.filter(account => {
      const subcategory = (account.account_subcategory || '').toLowerCase();
      return subcategory.includes('current') || subcategory.includes('cash') || 
             subcategory.includes('receivable') || subcategory.includes('inventory');
    });
    const quickAssets = currentAssets.filter(account => {
      const subcategory = (account.account_subcategory || '').toLowerCase();
      return !subcategory.includes('inventory');
    });
    
    const liabilities = activeAccounts.filter(account => account.account_category === "LIABILITY");
    const currentLiabilities = liabilities.filter(account => {
      const subcategory = (account.account_subcategory || '').toLowerCase();
      return subcategory.includes('current') || subcategory.includes('payable') || 
             subcategory.includes('short-term');
    });
    
    const equity = activeAccounts.filter(account => account.account_category === "EQUITY");
    const revenue = activeAccounts.filter(account => account.account_category === "REVENUE");
    const expenses = activeAccounts.filter(account => account.account_category === "EXPENSE");

    const totalAssets = assets.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalCurrentAssets = currentAssets.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalQuickAssets = quickAssets.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalEquity = equity.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalRevenue = revenue.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0);

    const netIncome = totalRevenue - totalExpenses;

    const currentRatio = totalCurrentLiabilities !== 0 ? (totalCurrentAssets / totalCurrentLiabilities) * 100 : 0;
    const quickRatio = totalCurrentLiabilities !== 0 ? (totalQuickAssets / totalCurrentLiabilities) * 100 : 0;
    const returnOnAssets = totalAssets !== 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity = totalEquity !== 0 ? (netIncome / totalEquity) * 100 : 0;
    const netProfitMargin = totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0;
    const assetTurnover = totalAssets !== 0 ? (totalRevenue / totalAssets) * 100 : 0;

    return {
      currentRatio,
      quickRatio,
      returnOnAssets,
      returnOnEquity,
      netProfitMargin,
      assetTurnover
    };
  };

  const ratios = calculateFinancialRatios();

  const getRatioColor = (ratio) => {
    if (ratio >= 100) return "#4f772d";
    if (ratio >= 50) return "#f4a261";
    return "#c1121f";
  };

  const getRatioStatus = (ratio) => {
    if (ratio >= 100) return "Excellent";
    if (ratio >= 50) return "Good";
    return "Needs Attention";
  };

  if (loading) {
    return <div style={{ padding: "12px 16px" }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          {userName}'s Dashboard
        </h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Current Ratio
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.currentRatio)
            }}>
              {formatPercentage(ratios.currentRatio)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.currentRatio)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.currentRatio)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Return on Assets
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.returnOnAssets)
            }}>
              {formatPercentage(ratios.returnOnAssets)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.returnOnAssets)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.returnOnAssets)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Return on Equity
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.returnOnEquity)
            }}>
              {formatPercentage(ratios.returnOnEquity)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.returnOnEquity)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.returnOnEquity)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Net Profit Margin
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.netProfitMargin)
            }}>
              {formatPercentage(ratios.netProfitMargin)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.netProfitMargin)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.netProfitMargin)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Asset Turnover
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.assetTurnover)
            }}>
              {formatPercentage(ratios.assetTurnover)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.assetTurnover)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.assetTurnover)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{
            backgroundColor: "#1C302F",
            color: "white",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Playfair Display"
          }}>
            Quick Ratio
          </div>
          <div style={{
            padding: "20px 16px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: getRatioColor(ratios.quickRatio)
            }}>
              {formatPercentage(ratios.quickRatio)}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getRatioColor(ratios.quickRatio)
            }}></div>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #ddd"
          }}>
            Status: {getRatioStatus(ratios.quickRatio)}
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginTop: "20px"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: "1.1em", fontWeight: "600", fontFamily: "Playfair Display" }}>
          Summary Information
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Active Accounts</div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#1C5C59" }}>
              {accounts.filter(account => account.is_active).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Assets</div>
            <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(accounts
                .filter(account => account.account_category === "ASSET" && account.is_active)
                .reduce((sum, account) => sum + parseFloat(account.balance || 0), 0)
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Liabilities</div>
            <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(accounts
                .filter(account => account.account_category === "LIABILITY" && account.is_active)
                .reduce((sum, account) => sum + parseFloat(account.balance || 0), 0)
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total Equity</div>
            <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "monospace" }}>
              {formatCurrency(accounts
                .filter(account => account.account_category === "EQUITY" && account.is_active)
                .reduce((sum, account) => sum + parseFloat(account.balance || 0), 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
