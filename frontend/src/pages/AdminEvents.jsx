import { useEffect, useState } from "react";
import api from "../api";
import HelpModal from "../components/HelpModal";
import "../styles/auth.css";
import "../styles/layout.css";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/auth/events/");
      setEvents(response.data || []);
    } catch (e) {
      console.error("Error loading events:", e);
      const status = e?.response?.status;
      if (status === 401) {
        setError("Session expired. Log in again.");
      } else if (status === 403) {
        setError("You do not have permission to view event logs.");
      } else {
        setError("Failed to load event logs.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  function getActionLabel(action) {
    const labels = {
      USER_CREATED: "User Created",
      USER_ACTIVATED: "User Activated",
      USER_DEACTIVATED: "User Deactivated",
      USER_SUSPENDED: "User Suspended",
      USER_UNSUSPENDED: "User Unsuspended",
      USER_UPDATED: "User Updated",
      REQUEST_APPROVED: "Access Approved",
      REQUEST_REJECTED: "Access Rejected",
      PASSWORD_CHANGED: "Password Changed",
      PASSWORD_RESET: "Password Reset",
      ACCOUNT_CREATED: "Account Created",
      ACCOUNT_UPDATED: "Account Updated",
      ACCOUNT_ACTIVATED: "Account Activated",
      ACCOUNT_DEACTIVATED: "Account Deactivated",
      JOURNAL_ENTRY_CREATED: "Journal Entry Created",
      JOURNAL_ENTRY_UPDATED: "Journal Entry Updated",
      JOURNAL_ENTRY_APPROVED: "Journal Entry Approved",
      JOURNAL_ENTRY_REJECTED: "Journal Entry Rejected",
    };
    return labels[action] || action;
  }

  function getActionColor(action) {
    const colors = {
      USER_CREATED: "#4f772d",
      USER_ACTIVATED: "#2196F3",
      USER_DEACTIVATED: "#ffc107",
      USER_SUSPENDED: "#c1121f",
      USER_UNSUSPENDED: "#4f772d",
      USER_UPDATED: "#1C5C59",
      REQUEST_APPROVED: "#4f772d",
      REQUEST_REJECTED: "#c1121f",
      PASSWORD_CHANGED: "#1C5C59",
      PASSWORD_RESET: "#ffc107",
      ACCOUNT_CREATED: "#4f772d",
      ACCOUNT_UPDATED: "#1C5C59",
      ACCOUNT_ACTIVATED: "#2196F3",
      ACCOUNT_DEACTIVATED: "#ffc107",
      JOURNAL_ENTRY_CREATED: "#4f772d",
      JOURNAL_ENTRY_UPDATED: "#1C5C59",
      JOURNAL_ENTRY_APPROVED: "#2196F3",
      JOURNAL_ENTRY_REJECTED: "#c1121f",
    };
    return colors[action] || "#666";
  }

  function renderChangeDetails(before, after) {
    if (!before || !after) return null;

    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    allKeys.forEach(key => {
      const beforeValue = before[key];
      const afterValue = after[key];
      
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push({ key, before: beforeValue, after: afterValue });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div style={{ 
        marginTop: 12, 
        background: "#fff", 
        borderRadius: "8px", 
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}>
        <table className="users-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ background: "#1C302F" }}>
              <th style={{ color: "#fff" }}>Field</th>
              <th style={{ color: "#fff", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>Before</th>
              <th style={{ color: "#fff", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change, index) => (
              <tr key={index}>
                <td style={{ fontWeight: "500" }}>
                  {change.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td style={{ color: "#c1121f", borderLeft: "1px solid #eee" }}>
                  {change.before !== null && change.before !== undefined ? 
                    (Array.isArray(change.before) ? change.before.join(', ') : String(change.before)) : 'N/A'}
                </td>
                <td style={{ color: "#4f772d", borderLeft: "1px solid #eee" }}>
                  {change.after !== null && change.after !== undefined ? 
                    (Array.isArray(change.after) ? change.after.join(', ') : String(change.after)) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFullImage(image, title) {
    if (!image) return null;

    return (
      <div style={{ 
        marginTop: 12, 
        background: "#fff", 
        borderRadius: "8px", 
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}>
        <table className="users-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ background: "#1C302F" }}>
              <th style={{ width: "35%", color: "#fff" }}>Field</th>
              <th style={{ color: "#fff", borderLeft: "1px solid rgba(255, 255, 255, 0.07)" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(image).map(([key, value], index) => (
              <tr key={index}>
                <td style={{ fontWeight: "500" }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td style={{ borderLeft: "1px solid #eee" }}>
                  {value !== null && value !== undefined ? 
                    (Array.isArray(value) ? value.join(', ') : String(value)) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-body">
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Loading event logs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-body">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="main-body">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.8em", fontWeight: "600", color: "#000000" }}>
          Event Log
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

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#f8f9fa" }}>
          <p style={{ margin: 0, color: "#666", fontSize: "1.1em" }}>No events logged yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {events.map((event) => (
            <div key={event.id} className="card" style={{ padding: 0, overflow: "hidden", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)" }}>
              {(event.before_image || event.after_image) && (
                <div style={{ 
                  padding: "24px", 
                  background: "#f8f9fa",
                  borderBottom: "2px solid #e0e0e0"
                }}>
                  <h3 style={{ 
                    margin: "0 0 16px 0", 
                    color: "#000000", 
                    fontSize: "1.2em",
                    fontFamily: "Playfair Display",
                    fontWeight: "600"
                  }}>
                    Changes Made
                  </h3>
                  
                  {event.before_image && event.after_image ? (
                    renderChangeDetails(event.before_image, event.after_image)
                  ) : event.after_image ? (
                    renderFullImage(event.after_image, "Created Record")
                  ) : null}
                </div>
              )}

              <div style={{ padding: "24px" }}>
                <h3 style={{ 
                  margin: "0 0 20px 0", 
                  color: "#000000", 
                  fontSize: "1.2em",
                  fontFamily: "Playfair Display",
                  fontWeight: "600"
                }}>
                  Event Information
                </h3>
                
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "20px",
                  marginBottom: "16px"
                }}>
                  <div>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Event ID
                    </div>
                    <div style={{ fontSize: "1.1em", fontWeight: "600", color: "#1C5C59" }}>
                      #{event.id}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Date & Time
                    </div>
                    <div style={{ fontSize: "0.95em", color: "#333" }}>
                      {formatDate(event.created_at)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Action
                    </div>
                    <span style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.85em",
                      fontWeight: "600",
                      color: "white",
                      backgroundColor: getActionColor(event.action),
                      display: "inline-block"
                    }}>
                      {getActionLabel(event.action)}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      User / Actor
                    </div>
                    <div style={{ fontSize: "0.95em", color: "#333" }}>
                      {event.actor_username || "System"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Record Type
                    </div>
                    <div style={{ fontSize: "0.95em", color: "#333" }}>
                      {event.record_type || "—"}
                    </div>
                  </div>

                  {event.record_id && (
                    <div>
                      <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Record ID
                      </div>
                      <div style={{ fontSize: "0.95em", color: "#333" }}>
                        {event.record_id}
                      </div>
                    </div>
                  )}
                </div>

                {event.details && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e0e0e0" }}>
                    <div style={{ fontSize: "0.7em", color: "#888", marginBottom: 6, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Details
                    </div>
                    <div style={{ fontSize: "0.95em", color: "#333", lineHeight: "1.6" }}>
                      {event.details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} page="events" userRole="ADMIN" />
      )}
    </div>
  );
}
