import { useEffect, useState } from "react";
import api from "../api";
import "../styles/auth.css";
import "../styles/layout.css";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedEvent, setExpandedEvent] = useState(null);

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
      USER_DEACTIVATED: "#FF9800",
      USER_SUSPENDED: "#c1121f",
      USER_UNSUSPENDED: "#4f772d",
      USER_UPDATED: "#1C5C59",
      REQUEST_APPROVED: "#4f772d",
      REQUEST_REJECTED: "#c1121f",
      PASSWORD_CHANGED: "#1C5C59",
      PASSWORD_RESET: "#FF9800",
      ACCOUNT_CREATED: "#4f772d",
      ACCOUNT_UPDATED: "#1C5C59",
      ACCOUNT_ACTIVATED: "#2196F3",
      ACCOUNT_DEACTIVATED: "#FF9800",
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
      <div style={{ marginTop: 10 }}>
        <strong style={{ display: "block", marginBottom: 8, fontSize: "0.9em" }}>Changes Made:</strong>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: "0.85em",
          border: "1px solid #ddd"
        }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd", fontWeight: "bold" }}>Field</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd", fontWeight: "bold" }}>Before</th>
              <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd", fontWeight: "bold" }}>After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change, index) => (
              <tr key={index}>
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "500" }}>
                  {change.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd", color: "#c1121f" }}>
                  {change.before !== null && change.before !== undefined ? String(change.before) : 'N/A'}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd", color: "#4f772d" }}>
                  {change.after !== null && change.after !== undefined ? String(change.after) : 'N/A'}
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
      <div style={{ marginTop: 10 }}>
        <strong style={{ display: "block", marginBottom: 8, fontSize: "0.9em" }}>{title}:</strong>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: "0.85em",
          border: "1px solid #ddd"
        }}>
          <tbody>
            {Object.entries(image).map(([key, value], index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "500", width: "40%" }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                  {value !== null && value !== undefined ? String(value) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: "12px 16px" }}>Loading event logs...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "12px 16px" }}>
        <div className="error-box">{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <h2 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>Event Log</h2>

      {events.length === 0 ? (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "8px",
          color: "#666" 
        }}>
          No events logged yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {events.map((event) => (
            <div key={event.id} style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "white",
              overflow: "hidden"
            }}>
              {/* Before/After Images Section - Shown First */}
              {(event.before_image || event.after_image) && (
                <div style={{ 
                  padding: "20px", 
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #ddd"
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: 16, color: "#1C5C59", fontSize: "1.1em" }}>
                    Before & After Images
                  </h4>
                  
                  {event.before_image && event.after_image ? (
                    renderChangeDetails(event.before_image, event.after_image)
                  ) : event.after_image ? (
                    renderFullImage(event.after_image, "Created Record")
                  ) : null}
                </div>
              )}

              {/* Event Details Section - Shown After */}
              <div style={{ padding: "20px" }}>
                <h4 style={{ marginTop: 0, marginBottom: 16, color: "#1C5C59", fontSize: "1.1em" }}>
                  Event Information
                </h4>
                
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                  gap: "16px",
                  marginBottom: "12px"
                }}>
                  <div>
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      EVENT ID
                    </div>
                    <div style={{ fontSize: "1.1em", fontWeight: "bold", color: "#1C5C59" }}>
                      #{event.id}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      DATE & TIME
                    </div>
                    <div style={{ fontSize: "0.9em", fontWeight: "normal" }}>
                      {formatDate(event.created_at)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      ACTION
                    </div>
                    <span style={{
                      padding: "4px 10px",
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
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      USER / ACTOR
                    </div>
                    <div style={{ fontSize: "0.9em", fontWeight: "normal" }}>
                      {event.actor_username || "System"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      RECORD TYPE
                    </div>
                    <div style={{ fontSize: "0.9em", fontWeight: "normal" }}>
                      {event.record_type || "—"}
                    </div>
                  </div>

                  {event.record_id && (
                    <div>
                      <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                        RECORD ID
                      </div>
                      <div style={{ fontSize: "0.9em", fontWeight: "normal" }}>
                        {event.record_id}
                      </div>
                    </div>
                  )}
                </div>

                {event.details && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e0e0e0" }}>
                    <div style={{ fontSize: "0.75em", color: "#666", marginBottom: 4, fontWeight: "600" }}>
                      DETAILS
                    </div>
                    <div style={{ fontSize: "0.9em", color: "#333" }}>
                      {event.details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
