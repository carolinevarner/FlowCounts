import { useState } from "react";

export default function HelpModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  const helpTopics = {
    overview: {
      title: "System Overview",
      icon: "🏢",
      content: (
        <>
          <h3>FlowCounts Accounting System</h3>
          <p>
            FlowCounts is a comprehensive accounting system designed to help businesses manage their 
            financial records, journal entries, and financial statements with ease.
          </p>
          <h4>Key Features:</h4>
          <ul>
            <li><strong>Chart of Accounts:</strong> Manage and organize all your financial accounts</li>
            <li><strong>Journal Entries:</strong> Record financial transactions systematically</li>
            <li><strong>Financial Reports:</strong> Generate trial balance, income statement, balance sheet, and retained earnings statements</li>
            <li><strong>User Management:</strong> Control access with role-based permissions (Admin, Manager, Accountant)</li>
            <li><strong>Audit Trail:</strong> Track all changes and activities in the system</li>
          </ul>
        </>
      )
    },
    chartOfAccounts: {
      title: "Chart of Accounts",
      icon: "📊",
      content: (
        <>
          <h3>Chart of Accounts</h3>
          <p>
            The Chart of Accounts is the foundation of your accounting system. It's a list of all accounts 
            used to categorize financial transactions.
          </p>
          <h4>Account Types:</h4>
          <ul>
            <li><strong>Assets:</strong> Resources owned by the business (Cash, Inventory, Equipment)</li>
            <li><strong>Liabilities:</strong> Debts and obligations (Accounts Payable, Loans)</li>
            <li><strong>Equity:</strong> Owner's interest in the business (Capital, Retained Earnings)</li>
            <li><strong>Revenue:</strong> Income from business operations (Sales, Service Revenue)</li>
            <li><strong>Expenses:</strong> Costs of running the business (Rent, Utilities, Salaries)</li>
          </ul>
          <h4>How to Use:</h4>
          <ul>
            <li>Click on any account number to view its ledger</li>
            <li>Use the search bar to find specific accounts</li>
            <li>Filter accounts by status (active/inactive) or category</li>
            <li>Admins and Managers can add, edit, or deactivate accounts</li>
          </ul>
        </>
      )
    },
    ledger: {
      title: "Account Ledger",
      icon: "📒",
      content: (
        <>
          <h3>Account Ledger</h3>
          <p>
            The ledger shows all transactions for a specific account, providing a detailed history 
            of debits, credits, and running balance.
          </p>
          <h4>Understanding the Ledger:</h4>
          <ul>
            <li><strong>Debit:</strong> Increases for asset and expense accounts; decreases for liabilities, equity, and revenue</li>
            <li><strong>Credit:</strong> Increases for liability, equity, and revenue accounts; decreases for assets and expenses</li>
            <li><strong>Running Balance:</strong> Current balance after each transaction</li>
          </ul>
          <h4>Navigation:</h4>
          <ul>
            <li>Click on any account number in the Chart of Accounts to open its ledger</li>
            <li>Use the "Back" button to return to the Chart of Accounts</li>
          </ul>
        </>
      )
    },
    journalizing: {
      title: "Journalizing",
      icon: "📝",
      content: (
        <>
          <h3>Journal Entries</h3>
          <p>
            Journal entries are the primary method of recording financial transactions in the accounting system.
          </p>
          <h4>Double-Entry Accounting:</h4>
          <p>
            Every transaction affects at least two accounts - total debits must equal total credits.
          </p>
          <h4>Creating Journal Entries:</h4>
          <ol>
            <li>Navigate to "Journalize" from the navigation bar</li>
            <li>Enter the transaction date and description</li>
            <li>Select accounts to debit (at least one)</li>
            <li>Select accounts to credit (at least one)</li>
            <li>Ensure total debits equal total credits</li>
            <li>Add supporting documentation or notes if needed</li>
            <li>Submit for review or post directly (based on permissions)</li>
          </ol>
          <h4>Best Practices:</h4>
          <ul>
            <li>Use clear, descriptive narratives</li>
            <li>Double-check account selections</li>
            <li>Verify amounts before posting</li>
            <li>Attach supporting documents when possible</li>
          </ul>
        </>
      )
    },
    reports: {
      title: "Financial Reports",
      icon: "📈",
      content: (
        <>
          <h3>Financial Reports</h3>
          <p>
            FlowCounts generates key financial statements to help you understand your business's financial position.
          </p>
          <h4>Trial Balance:</h4>
          <p>
            Lists all accounts with their debit or credit balances. Used to verify that total debits equal total credits.
          </p>
          <h4>Income Statement:</h4>
          <p>
            Shows revenues, expenses, and net income/loss for a specific period. Helps evaluate profitability.
          </p>
          <h4>Balance Sheet:</h4>
          <p>
            Displays assets, liabilities, and equity at a specific point in time. Shows the financial position of the business.
          </p>
          <h4>Statement of Retained Earnings:</h4>
          <p>
            Shows changes in retained earnings from net income, dividends, and other adjustments.
          </p>
          <h4>Generating Reports:</h4>
          <ul>
            <li>Select the desired report from the navigation bar</li>
            <li>Choose date range or period</li>
            <li>Apply filters if needed</li>
            <li>Export to PDF or Excel for sharing</li>
          </ul>
        </>
      )
    },
    userRoles: {
      title: "User Roles & Permissions",
      icon: "👥",
      content: (
        <>
          <h3>User Roles</h3>
          <p>
            FlowCounts uses role-based access control to ensure proper segregation of duties.
          </p>
          <h4>Administrator:</h4>
          <ul>
            <li>Full system access</li>
            <li>Manage users and permissions</li>
            <li>Configure system settings</li>
            <li>Access all reports and audit logs</li>
            <li>Approve registration requests</li>
          </ul>
          <h4>Manager:</h4>
          <ul>
            <li>Review and approve journal entries</li>
            <li>Generate financial reports</li>
            <li>Manage chart of accounts</li>
            <li>View all transactions</li>
            <li>Cannot manage users</li>
          </ul>
          <h4>Accountant:</h4>
          <ul>
            <li>Create journal entries</li>
            <li>View chart of accounts and ledgers</li>
            <li>Generate reports</li>
            <li>Cannot modify system settings</li>
            <li>Cannot manage users or approve entries</li>
          </ul>
        </>
      )
    },
    support: {
      title: "Support & Troubleshooting",
      icon: "🆘",
      content: (
        <>
          <h3>Getting Help</h3>
          <h4>Common Issues:</h4>
          <ul>
            <li><strong>Login Problems:</strong> Use "Forgot Password" feature or contact your administrator</li>
            <li><strong>Permission Denied:</strong> Contact your administrator to request proper access</li>
            <li><strong>Report Errors:</strong> Check date ranges and account selections</li>
            <li><strong>Balance Discrepancies:</strong> Verify all journal entries are posted correctly</li>
          </ul>
          <h4>Best Practices:</h4>
          <ul>
            <li>Regularly back up your data</li>
            <li>Review event logs for suspicious activity</li>
            <li>Keep user permissions up to date</li>
            <li>Reconcile accounts monthly</li>
            <li>Document significant transactions</li>
          </ul>
          <h4>Contact Support:</h4>
          <p>
            For technical support or questions about using FlowCounts, please contact your system administrator 
            or email support at: <strong>support@flowcounts.com</strong>
          </p>
          <h4>Resources:</h4>
          <ul>
            <li>User manual: Available in your dashboard</li>
            <li>Video tutorials: Check the training section</li>
            <li>FAQ: Visit our help center</li>
          </ul>
        </>
      )
    }
  };

  const tabs = Object.keys(helpTopics);

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000
      }}
    >
      <div 
        className="modal-panel" 
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          maxWidth: "900px",
          width: "90%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px",
          borderBottom: "2px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>❓</span>
            <h2 style={{ margin: 0, color: "#1C5C59" }}>FlowCounts Help Center</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: "#666",
              padding: "0",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content Area */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar with tabs */}
          <div style={{
            width: "240px",
            borderRight: "1px solid #e0e0e0",
            padding: "16px",
            overflowY: "auto",
            backgroundColor: "#f8f9fa"
          }}>
            {tabs.map((tabKey) => {
              const topic = helpTopics[tabKey];
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor: activeTab === tabKey ? "#1C5C59" : "transparent",
                    color: activeTab === tabKey ? "white" : "#333",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight: activeTab === tabKey ? "600" : "normal",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== tabKey) {
                      e.currentTarget.style.backgroundColor = "#e0e0e0";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== tabKey) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{topic.icon}</span>
                  <span>{topic.title}</span>
                </button>
              );
            })}
          </div>

          {/* Main content area */}
          <div style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto"
          }}>
            <div style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#333"
            }}>
              {helpTopics[activeTab].content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
          textAlign: "center",
          fontSize: "12px",
          color: "#666"
        }}>
          <p style={{ margin: 0 }}>
            Need more help? Contact your system administrator or visit our support portal.
          </p>
        </div>
      </div>
    </div>
  );
}


