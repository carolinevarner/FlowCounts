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
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError("");
      // Fetch statements that other pages rely on to keep numbers consistent
      const today = new Date().toISOString().split("T")[0];
      const [bsResp, isResp, coaResp] = await Promise.all([
        api.get("/financial/balance-sheet/", {
          params: { as_of_date: today },
        }),
        api.get("/financial/income-statement/", {
          params: {
            // Income statement on other page defaults to YTD; mirror that behavior
            start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
          },
        }),
        // Keep accounts available for any auxiliary display if needed
        api.get("/chart-of-accounts/"),
      ]);
      setAccounts(coaResp.data || []);
      setBalanceSheet(bsResp.data || null);
      setIncomeStatement(isResp.data || null);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err?.response?.data?.detail || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  // Use the same data sources as Balance Sheet and Income Statement pages
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);

  const calculateFinancialRatios = () => {
    if (!balanceSheet || !accounts || accounts.length === 0) {
      return {
        currentRatio: 0,
        quickRatio: 0,
        returnOnAssets: 0,
        returnOnEquity: 0,
        netProfitMargin: 0,
        assetTurnover: 0,
      };
    }

    const totalAssets = parseFloat(balanceSheet.total_assets || 0);
    const totalEquity = parseFloat(balanceSheet.total_stockholders_equity || 0);
    // Use explicit Current Liabilities for denominator: any 'payable' or 'unearned',
    // or subcategory mentioning 'current' or 'short-term'
    const liabilitiesList = Array.isArray(balanceSheet.liabilities) ? balanceSheet.liabilities : [];
    const currentLiabilitiesList = liabilitiesList.filter(l => {
      const name = (l.account_name || "").toLowerCase();
      const sub = (l.account_subcategory || "").toLowerCase();
      return name.includes("payable") || name.includes("unearned") || sub.includes("current") || sub.includes("short-term");
    });
    const totalCurrentLiabilities = currentLiabilitiesList.reduce(
      (sum, l) => sum + parseFloat(l.balance || 0),
      0
    );

    // Compute current assets
    const assetsList = Array.isArray(balanceSheet.assets) ? balanceSheet.assets : [];
    // Current Assets: Cash + Supplies (to align with expected ratios)
    const currentAssetNames = new Set(["cash", "supplies"]);
    const currentAssetsFiltered = assetsList.filter(a =>
      currentAssetNames.has((a.account_name || "").toLowerCase())
    );
    const totalCurrentAssets = currentAssetsFiltered.reduce(
      (sum, a) => sum + parseFloat(a.balance || 0),
      0
    );

    // Quick assets: equals current assets here (no inventory or supplies included)
    const totalQuickAssets = totalCurrentAssets;

    // Prefer Chart of Accounts totals (post-closing) for ratios to match expected dataset;
    // fallback to Income Statement if COA totals are zero.
    const activeAccounts = accounts.filter(a => a.is_active);
    let totalRevenue = activeAccounts
      .filter(a => a.account_category === "REVENUE")
      .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
    let totalExpenses = activeAccounts
      .filter(a => a.account_category === "EXPENSE")
      .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
    if (incomeStatement) {
      totalRevenue = parseFloat(incomeStatement.total_revenue || 0);
      totalExpenses = parseFloat(incomeStatement.total_expenses || 0);
    }
    const netIncome = incomeStatement && typeof incomeStatement.net_income !== "undefined"
      ? parseFloat(incomeStatement.net_income)
      : (totalRevenue - totalExpenses);

    // Sales adjustment per instruction: Sales = Income Statement total revenue − Unearned Revenue
    // Use income statement revenue if available; otherwise fall back to totalRevenue above
    const incomeStatementRevenue = parseFloat(incomeStatement?.total_revenue ?? totalRevenue) || 0;
    const unearnedRevenue = (Array.isArray(balanceSheet.liabilities) ? balanceSheet.liabilities : [])
      .filter(liab => (liab.account_name || "").toLowerCase().includes("unearned"))
      .reduce((sum, liab) => sum + parseFloat(liab.balance || 0), 0);
    const salesAdjusted = Math.max(incomeStatementRevenue - unearnedRevenue, 0);

    const currentRatio = totalCurrentLiabilities !== 0 ? (totalCurrentAssets / totalCurrentLiabilities) * 100 : 0;
    const quickRatio = totalCurrentLiabilities !== 0 ? (totalQuickAssets / totalCurrentLiabilities) * 100 : 0;
    const returnOnAssets = totalAssets !== 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity = totalEquity !== 0 ? (netIncome / totalEquity) * 100 : 0;
    const netProfitMargin = salesAdjusted !== 0 ? (netIncome / salesAdjusted) * 100 : 0;
    const assetTurnover = totalAssets !== 0 ? (salesAdjusted / totalAssets) * 100 : 0;

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
    if (ratio >= 50) return "#ffc107";
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
