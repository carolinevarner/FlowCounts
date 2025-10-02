import { useEffect, useState } from "react";
import api from "../api";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      console.log("Loading events...");
      const token = localStorage.getItem("access");
      console.log("Token exists:", !!token);
      const response = await api.get("/auth/events/");
      console.log("Response:", response);
      setEvents(response.data || []);
    } catch (e) {
      console.error("Error loading events:", e);
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.log("Error status:", status, "Error data:", data);
      if (status === 401) {
        setError("Session expired. Log in again.");
      } else if (status === 403) {
        setError("You do not have permission to view event logs.");
      } else {
        setError(`Failed to load event logs. Status: ${status}, Error: ${data?.detail || 'Unknown error'}`);
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
      REQUEST_APPROVED: "Access Approved",
      REQUEST_REJECTED: "Access Rejected",
    };
    return labels[action] || action;
  }

  function getActionColor(action) {
    const colors = {
      USER_CREATED: "#4CAF50",
      USER_ACTIVATED: "#2196F3", 
      USER_DEACTIVATED: "#FF9800",
      USER_SUSPENDED: "#F44336",
      REQUEST_APPROVED: "#4CAF50",
      REQUEST_REJECTED: "#F44336",
    };
    return colors[action] || "#666";
  }

  if (loading) {
    return (
      <div className="page">
        <div>Loading event logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">{error}</div>
        <button className="auth-button" onClick={loadEvents}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Event Log</h2>
          <button className="auth-button" onClick={loadEvents} style={{ padding: "6px 10px", fontSize: 12 }}>
            Refresh
          </button>
        </div>

        {events.length === 0 ? (
          <div className="muted">No events logged yet.</div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td style={{ fontSize: 12, color: "#666" }}>
                      {formatDate(event.created_at)}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: "bold",
                          color: "white",
                          backgroundColor: getActionColor(event.action),
                        }}
                      >
                        {getActionLabel(event.action)}
                      </span>
                    </td>
                    <td>{event.actor_username || "System"}</td>
                    <td>{event.target_username || "—"}</td>
                    <td style={{ fontSize: 12, color: "#666" }}>
                      {event.details || "—"}
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
