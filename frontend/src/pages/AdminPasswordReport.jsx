import { useEffect, useState } from "react";
import api from "../api";

export default function AdminPasswordReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/auth/expired-passwords-report/");
      setReport(response.data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setError("Session expired. Log in again.");
      } else if (status === 403) {
        setError("You do not have permission to view this report.");
      } else {
        setError("Failed to load password report. See server logs.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  function formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  function getStatusBadge(status, days) {
    if (status === 'expired') {
      return (
        <span style={{
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: "bold",
          color: "white",
          backgroundColor: "#dc3545"
        }}>
          EXPIRED ({days} days overdue)
        </span>
      );
    } else if (status === 'expiring_soon') {
      return (
        <span style={{
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: "bold",
          color: "white",
          backgroundColor: "#ffc107"
        }}>
          EXPIRES IN {days} DAYS
        </span>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="page">
        <div>Loading password report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div style={{ color: "crimson" }}>{error}</div>
        <button className="auth-button" onClick={loadReport}>Retry</button>
      </div>
    );
  }

  const allUsers = [
    ...(report.expired_passwords || []),
    ...(report.expiring_soon_passwords || [])
  ];

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>Password Expiration Report</h2>
          <button className="auth-button" onClick={loadReport} style={{ padding: "6px 10px", fontSize: 12, width: "150px" }}>
            Refresh
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
            <div style={{ 
              padding: "8px 12px", 
              backgroundColor: "#dc3545", 
              color: "white", 
              borderRadius: 4,
              fontWeight: "bold"
            }}>
              Expired: {report.total_expired}
            </div>
            <div style={{ 
              padding: "8px 12px", 
              backgroundColor: "#ffc107", 
              color: "black", 
              borderRadius: 4,
              fontWeight: "bold"
            }}>
              Expiring Soon: {report.total_expiring_soon}
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            Passwords are flagged as "expiring soon" when they expire within {report.warning_period_days} days.
          </div>
        </div>

        {allUsers.length === 0 ? (
          <div className="muted">No passwords are expired or expiring soon.</div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Expiration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: "bold" }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {user.username}
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {getStatusBadge(user.status, user.days_overdue || user.days_until_expiry)}
                    </td>
                    <td style={{ fontSize: 12, color: "#666" }}>
                      {formatDate(user.password_expires_at)}
                    </td>
                    <td>
                      <button 
                        className="auth-button secondary" 
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => {
                          const subject = `FlowCounts - Password ${user.status === 'expired' ? 'Has Expired' : 'Expiration Warning'}`;
                          const body = user.status === 'expired' 
                            ? `Dear ${user.first_name},\n\nYour password expired on ${user.password_expires_at}. Please reset your password immediately to regain access to your account.\n\nYou can reset your password using the 'Forgot Password' feature on the login page.\n\nBest regards,\nFlowCounts Admin`
                            : `Dear ${user.first_name},\n\nYour password will expire in ${user.days_until_expiry} day(s) on ${user.password_expires_at}. Please change your password soon to avoid account lockout.\n\nYou can change your password using the 'Forgot Password' feature on the login page.\n\nBest regards,\nFlowCounts Admin`;
                          
                          const mailto = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          window.open(mailto);
                        }}
                      >
                        Send Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
