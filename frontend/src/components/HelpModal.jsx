import { useState } from "react";

export default function HelpModal({ onClose, page = "general", userRole = "" }) {
  const [activeTab, setActiveTab] = useState(page);

  const getHelpContent = () => {
    const isAdmin = userRole === "ADMIN";
    const isManager = userRole === "MANAGER";
    const isAccountant = userRole === "ACCOUNTANT";

    const content = {
      dashboard: {
        title: "Dashboard",
        icon: "📊",
        content: (
          <>
            <h3>Dashboard Overview</h3>
            <p>Your dashboard provides a quick overview of your accounting system's current state.</p>
            <h4>What You'll See:</h4>
            <ul>
              <li><strong>Account Summary:</strong> Total counts by category (Assets, Liabilities, etc.)</li>
              <li><strong>Recent Activity:</strong> Latest journal entries and transactions</li>
              <li><strong>Quick Stats:</strong> Key financial metrics at a glance</li>
              {isAdmin && <li><strong>System Status:</strong> User activity and pending approvals</li>}
            </ul>
          </>
        )
      },
      chartOfAccounts: {
        title: "Chart of Accounts",
        icon: "📋",
        content: (
          <>
            <h3>Chart of Accounts</h3>
            <p>The Chart of Accounts lists all accounts used to categorize financial transactions.</p>
            <h4>Account Categories:</h4>
            <ul>
              <li><strong>Assets:</strong> Resources owned (Cash, Inventory, Equipment)</li>
              <li><strong>Liabilities:</strong> Debts owed (Accounts Payable, Loans)</li>
              <li><strong>Equity:</strong> Owner's interest (Capital, Retained Earnings)</li>
              <li><strong>Revenue:</strong> Income earned (Sales, Service Revenue)</li>
              <li><strong>Expenses:</strong> Costs incurred (Rent, Utilities, Salaries)</li>
            </ul>
            <h4>Features:</h4>
            <ul>
              <li>Click account number to view ledger details</li>
              <li>Use calendar icon to filter by creation date</li>
              <li>Search by name, number, or category</li>
              <li>Sort by any column by clicking headers</li>
              {(isAdmin || isManager) && <li>Add, edit, or deactivate accounts (Admin/Manager only)</li>}
            </ul>
          </>
        )
      },
      ledger: {
        title: "Ledger",
        icon: "📒",
        content: (
          <>
            <h3>Account Ledger</h3>
            <p>The ledger displays all transactions for a specific account with running balance.</p>
            <h4>Understanding Ledger Entries:</h4>
            <ul>
              <li><strong>Date:</strong> Transaction date</li>
              <li><strong>Reference:</strong> Journal entry or transaction reference number</li>
              <li><strong>Description:</strong> What the transaction was for</li>
              <li><strong>Debit:</strong> Increases to asset/expense accounts</li>
              <li><strong>Credit:</strong> Increases to liability/equity/revenue accounts</li>
              <li><strong>Balance:</strong> Running balance after each transaction</li>
            </ul>
            <h4>Features:</h4>
            <ul>
              <li>Use calendar icon to filter transactions by date</li>
              <li>Filter by debit only, credit only, or all transactions</li>
              <li>Search by description or reference number</li>
              <li>Sort by clicking column headers</li>
            </ul>
          </>
        )
      },
      journalEntry: {
        title: "Journal Entry",
        icon: "✍️",
        content: (
          <>
            <h3>Creating Journal Entries</h3>
            <p>Journal entries record financial transactions using double-entry bookkeeping.</p>
            <h4>Double-Entry Rule:</h4>
            <p><strong>Total Debits MUST equal Total Credits</strong> - Every transaction affects at least two accounts.</p>
            <h4>Steps to Create:</h4>
            <ol>
              <li>Enter transaction date</li>
              <li>Write a clear description</li>
              <li>Add debit entries (at least one)</li>
              <li>Add credit entries (at least one)</li>
              <li>Verify debits = credits</li>
              <li>Attach supporting documents (optional)</li>
              <li>Submit for {isAccountant ? "manager approval" : "posting"}</li>
            </ol>
            {isAccountant && (
              <>
                <h4>Accountant Notes:</h4>
                <ul>
                  <li>Your entries require manager approval before posting</li>
                  <li>Save drafts to complete later</li>
                  <li>Attach receipts or invoices when available</li>
                </ul>
              </>
            )}
            {(isAdmin || isManager) && (
              <>
                <h4>Manager/Admin Notes:</h4>
                <ul>
                  <li>Review accountant entries in the Journal List</li>
                  <li>Approve or reject with detailed feedback</li>
                  <li>Your entries post immediately without approval</li>
                </ul>
              </>
            )}
          </>
        )
      },
      journalList: {
        title: "Journal List",
        icon: "📝",
        content: (
          <>
            <h3>Journal Entry List</h3>
            <p>View and manage all journal entries in the system.</p>
            <h4>Entry Status:</h4>
            <ul>
              <li><strong>Pending:</strong> Awaiting manager approval</li>
              <li><strong>Approved:</strong> Posted to accounts</li>
              <li><strong>Rejected:</strong> Returned for revision</li>
            </ul>
            <h4>Features:</h4>
            <ul>
              <li>Filter by status (Pending/Approved/Rejected)</li>
              <li>Search by description or date</li>
              <li>Click entry to view full details</li>
              {(isAdmin || isManager) && <li>Approve or reject pending entries</li>}
              {isAccountant && <li>Edit rejected entries and resubmit</li>}
            </ul>
          </>
        )
      },
      users: {
        title: "User Management",
        icon: "👥",
        content: (
          <>
            <h3>User Management</h3>
            <p>Manage user accounts and registration requests (Admin only).</p>
            <h4>User Roles:</h4>
            <ul>
              <li><strong>Admin:</strong> Full system access, manage users, approve registrations</li>
              <li><strong>Manager:</strong> Approve journal entries, manage accounts, view reports</li>
              <li><strong>Accountant:</strong> Create entries, view accounts, generate reports</li>
            </ul>
            <h4>Actions Available:</h4>
            <ul>
              <li>Create new users manually</li>
              <li>Approve or reject registration requests</li>
              <li>Activate/deactivate user accounts</li>
              <li>Suspend users with date ranges</li>
              <li>Edit user information and roles</li>
              <li>Send emails directly to users</li>
            </ul>
            <h4>Registration Workflow:</h4>
            <ol>
              <li>User submits registration request</li>
              <li>Admin assigns role (Admin/Manager/Accountant)</li>
              <li>Admin approves request</li>
              <li>System creates account and emails temporary password</li>
              <li>User logs in and changes password</li>
            </ol>
          </>
        )
      },
      events: {
        title: "Event Log",
        icon: "📜",
        content: (
          <>
            <h3>Event Log</h3>
            <p>Complete audit trail of all system activities.</p>
            <h4>Events Tracked:</h4>
            <ul>
              <li><strong>User Events:</strong> Created, updated, activated, deactivated, suspended</li>
              <li><strong>Account Events:</strong> Created, updated, activated, deactivated</li>
              <li><strong>Journal Events:</strong> Created, updated, approved, rejected</li>
              <li><strong>Password Events:</strong> Changed, reset</li>
              <li><strong>Registration Events:</strong> Approved, rejected</li>
            </ul>
            <h4>Before & After Images:</h4>
            <p>Each event shows what changed with before/after comparison tables displaying:</p>
            <ul>
              <li>Field-by-field changes highlighted</li>
              <li>Before values in red</li>
              <li>After values in green</li>
              <li>Complete record snapshots for new items</li>
            </ul>
            <h4>Event Details:</h4>
            <p>Each log entry includes event ID, timestamp, action type, user/actor, record type, record ID, and detailed description.</p>
          </>
        )
      }
    };

    const availablePages = isAdmin 
      ? ["dashboard", "chartOfAccounts", "ledger", "journalEntry", "journalList", "users", "events"]
      : ["dashboard", "chartOfAccounts", "ledger", "journalEntry", "journalList"];

    const filteredContent = {};
    availablePages.forEach(key => {
      if (content[key]) {
        filteredContent[key] = content[key];
      }
    });

    return filteredContent;
  };

  const helpTopics = getHelpContent();
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
        <div style={{
          padding: "24px",
          borderBottom: "2px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>❓</span>
            <h2 style={{ margin: 0, color: "#1C5C59", fontFamily: "Playfair Display" }}>FlowCounts Help Center</h2>
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

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
              {helpTopics[activeTab]?.content}
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
          textAlign: "center",
          fontSize: "12px",
          color: "#666"
        }}>
          <p style={{ margin: 0 }}>
            Need more help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
