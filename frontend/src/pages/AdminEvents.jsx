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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (startDate) {
          params.start_date = startDate;
        }
        if (endDate) {
          params.end_date = endDate;
        }
        const response = await api.get("/auth/events/", { params });
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
    
    loadEvents();
  }, [startDate, endDate]);

  function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setQuickFilter(days) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    setStartDate(formatDateForInput(start));
    setEndDate(formatDateForInput(today));
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
  }

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

  function getChangedFields(before, after) {
    if (!before || !after) return new Set();
    
    const changed = new Set();
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    allKeys.forEach(key => {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changed.add(key);
      }
    });
    
    return changed;
  }

  function renderBeforeAfterColumns(before, after) {
    const changedFields = getChangedFields(before, after);
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ]);

    // If no before image, treat it as a new record
    if (!before && after) {
      return (
        <div style={{ 
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginTop: 12
        }}>
          {/* Before Column - New Record */}
          <div style={{ 
            background: "#fff", 
            borderRadius: "8px", 
            overflow: "hidden",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ 
              background: "#1C302F", 
              padding: "12px 16px",
              color: "#fff",
              fontWeight: "600",
              fontSize: "0.9em"
            }}>
              Before
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ 
                textAlign: "center", 
                padding: "40px 20px",
                color: "#888",
                fontStyle: "italic"
              }}>
                New Record
              </div>
            </div>
          </div>

          {/* After Column - Complete Record */}
          <div style={{ 
            background: "#fff", 
            borderRadius: "8px", 
            overflow: "hidden",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ 
              background: "#1C302F", 
              padding: "12px 16px",
              color: "#fff",
              fontWeight: "600",
              fontSize: "0.9em"
            }}>
              After (New Record Added)
            </div>
            <table className="users-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ width: "40%", padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600" }}>Field</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600", borderLeft: "1px solid #eee" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(after).map(([key, value], index) => (
                  <tr key={index} style={{ backgroundColor: "#fff" }}>
                    <td style={{ 
                      fontWeight: "500", 
                      padding: "10px 12px",
                      fontSize: "0.9em"
                    }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td style={{ 
                      borderLeft: "1px solid #eee",
                      padding: "10px 12px",
                      fontSize: "0.9em",
                      color: "#4f772d",
                      fontWeight: "500"
                    }}>
                      {value !== null && value !== undefined ? 
                        (Array.isArray(value) ? value.join(', ') : String(value)) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Both before and after exist - show side by side
    return (
      <div style={{ 
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        marginTop: 12
      }}>
        {/* Before Column */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "8px", 
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ 
            background: "#1C302F", 
            padding: "12px 16px",
            color: "#fff",
            fontWeight: "600",
            fontSize: "0.9em"
          }}>
            Before
          </div>
          <table className="users-table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ width: "40%", padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600" }}>Field</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600", borderLeft: "1px solid #eee" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(allKeys).map((key, index) => {
                const value = before?.[key];
                const isChanged = changedFields.has(key);
                return (
                  <tr key={index} style={{ 
                    backgroundColor: isChanged ? "#fff5f5" : "#fff"
                  }}>
                    <td style={{ 
                      fontWeight: "500", 
                      padding: "10px 12px",
                      fontSize: "0.9em"
                    }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {isChanged && (
                        <span style={{ 
                          marginLeft: "8px",
                          fontSize: "0.75em",
                          color: "#c1121f",
                          fontWeight: "600"
                        }}>
                          (Changed)
                        </span>
                      )}
                    </td>
                    <td style={{ 
                      borderLeft: "1px solid #eee",
                      padding: "10px 12px",
                      fontSize: "0.9em",
                      color: isChanged ? "#c1121f" : "#333",
                      fontWeight: isChanged ? "600" : "400"
                    }}>
                      {value !== null && value !== undefined ? 
                        (Array.isArray(value) ? value.join(', ') : String(value)) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* After Column */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "8px", 
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ 
            background: "#1C302F", 
            padding: "12px 16px",
            color: "#fff",
            fontWeight: "600",
            fontSize: "0.9em"
          }}>
            After
          </div>
          <table className="users-table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ width: "40%", padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600" }}>Field</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.85em", fontWeight: "600", borderLeft: "1px solid #eee" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(allKeys).map((key, index) => {
                const value = after?.[key];
                const isChanged = changedFields.has(key);
                return (
                  <tr key={index} style={{ 
                    backgroundColor: isChanged ? "#f0fff4" : "#fff"
                  }}>
                    <td style={{ 
                      fontWeight: "500", 
                      padding: "10px 12px",
                      fontSize: "0.9em"
                    }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {isChanged && (
                        <span style={{ 
                          marginLeft: "8px",
                          fontSize: "0.75em",
                          color: "#4f772d",
                          fontWeight: "600"
                        }}>
                          (Changed)
                        </span>
                      )}
                    </td>
                    <td style={{ 
                      borderLeft: "1px solid #eee",
                      padding: "10px 12px",
                      fontSize: "0.9em",
                      color: isChanged ? "#4f772d" : "#333",
                      fontWeight: isChanged ? "600" : "400"
                    }}>
                      {value !== null && value !== undefined ? 
                        (Array.isArray(value) ? value.join(', ') : String(value)) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

      {/* Date Range Filter */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "16px"
        }}>
          <div style={{ 
            fontSize: "0.9em", 
            fontWeight: "600", 
            color: "#333",
            marginBottom: "8px",
            fontFamily: "Playfair Display"
          }}>
            Filter by Date Range
          </div>
          
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "12px", 
            alignItems: "flex-end" 
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "150px" }}>
              <label style={{ 
                fontSize: "0.75em", 
                color: "#666", 
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "0.9em",
                  fontFamily: "sans-serif"
                }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "150px" }}>
              <label style={{ 
                fontSize: "0.75em", 
                color: "#666", 
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "0.9em",
                  fontFamily: "sans-serif"
                }}
              />
            </div>

            <div style={{ 
              display: "flex", 
              gap: "8px", 
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <button
                onClick={() => setQuickFilter(0)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                  fontWeight: "500",
                  color: "#333"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e9ecef"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f8f9fa"}
              >
                Today
              </button>
              <button
                onClick={() => setQuickFilter(7)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                  fontWeight: "500",
                  color: "#333"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e9ecef"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f8f9fa"}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setQuickFilter(30)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                  fontWeight: "500",
                  color: "#333"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e9ecef"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f8f9fa"}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setQuickFilter(90)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85em",
                  fontWeight: "500",
                  color: "#333"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e9ecef"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f8f9fa"}
              >
                Last 90 Days
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1C5C59",
                    border: "1px solid #1C5C59",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.85em",
                    fontWeight: "500",
                    color: "white"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#1a4d4a"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#1C5C59"}
                  title="Clear date filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          {(startDate || endDate) && (
            <div style={{ 
              fontSize: "0.8em", 
              color: "#666",
              fontStyle: "italic",
              marginTop: "4px"
            }}>
              Showing events from {startDate || "beginning"} to {endDate || "now"}
            </div>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#f8f9fa" }}>
          <p style={{ margin: 0, color: "#666", fontSize: "1.1em" }}>
            {startDate || endDate 
              ? "No events found for the selected date range." 
              : "No events logged yet."}
          </p>
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
                  
                  {renderBeforeAfterColumns(event.before_image, event.after_image)}
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
