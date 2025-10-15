import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export default function NavigationBar({ userRole = "ACCOUNTANT" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredButton, setHoveredButton] = useState(null);

  const basePath = `/${userRole.toLowerCase()}`;

  const navigationButtons = [
    {
      id: "dashboard",
      label: "Dashboard",
      path: `${basePath}/dashboard`,
      tooltip: "Return to your main dashboard and overview",
      icon: "🏠",
      availableFor: ["ADMIN", "MANAGER", "ACCOUNTANT"]
    },
    {
      id: "chart",
      label: "Chart of Accounts",
      path: `${basePath}/chart`,
      tooltip: "View and manage the chart of accounts",
      icon: "📊",
      availableFor: ["ADMIN", "MANAGER", "ACCOUNTANT"]
    },
    {
      id: "journal",
      label: "Journalize",
      path: `${basePath}/journal`,
      tooltip: "Record journal entries and transactions",
      icon: "📝",
      availableFor: ["MANAGER", "ACCOUNTANT"]
    },
    {
      id: "trial",
      label: "Trial Balance",
      path: `${basePath}/trial`,
      tooltip: "View trial balance to verify debits equal credits",
      icon: "⚖️",
      availableFor: ["MANAGER", "ACCOUNTANT"]
    },
    {
      id: "income",
      label: "Income Statement",
      path: `${basePath}/income`,
      tooltip: "View income statement showing revenues and expenses",
      icon: "💰",
      availableFor: ["MANAGER", "ACCOUNTANT"]
    },
    {
      id: "balance",
      label: "Balance Sheet",
      path: `${basePath}/balance`,
      tooltip: "View balance sheet showing assets, liabilities, and equity",
      icon: "📋",
      availableFor: ["MANAGER", "ACCOUNTANT"]
    },
    {
      id: "retained",
      label: "Retained Earnings",
      path: `${basePath}/retained`,
      tooltip: "View statement of retained earnings",
      icon: "📈",
      availableFor: ["MANAGER", "ACCOUNTANT"]
    },
    {
      id: "users",
      label: "Manage Users",
      path: `${basePath}/users`,
      tooltip: "Manage user accounts and permissions",
      icon: "👥",
      availableFor: ["ADMIN"]
    },
    {
      id: "events",
      label: "Event Log",
      path: `${basePath}/events`,
      tooltip: "View system event logs and audit trail",
      icon: "📜",
      availableFor: ["ADMIN"]
    }
  ];

  const availableButtons = navigationButtons.filter(btn => 
    btn.availableFor.includes(userRole)
  );

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div style={{
      backgroundColor: "#1C5C59",
      padding: "12px 16px",
      marginBottom: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        {availableButtons.map((button) => (
          <div
            key={button.id}
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredButton(button.id)}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button
              onClick={() => handleNavigation(button.path)}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "500",
                border: "none",
                borderRadius: "6px",
                backgroundColor: isActive(button.path) ? "#f4a261" : "#fff",
                color: isActive(button.path) ? "#fff" : "#1C5C59",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                boxShadow: isActive(button.path) 
                  ? "0 2px 8px rgba(244, 162, 97, 0.4)" 
                  : "none"
              }}
              onMouseOver={(e) => {
                if (!isActive(button.path)) {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }
              }}
              onMouseOut={(e) => {
                if (!isActive(button.path)) {
                  e.currentTarget.style.backgroundColor = "#fff";
                }
              }}
            >
              <span>{button.icon}</span>
              <span>{button.label}</span>
            </button>
            
            {/* Tooltip */}
            {hoveredButton === button.id && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#333",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                pointerEvents: "none"
              }}>
                {button.tooltip}
                <div style={{
                  position: "absolute",
                  top: "-4px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0",
                  height: "0",
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: "4px solid #333"
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



