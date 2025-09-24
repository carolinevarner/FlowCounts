import { useEffect, useState } from "react";
import api from "../api";

export default function AdminUsers() {
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const pend = await api.get("/auth/registration-requests/pending/");
    setPending(pend.data);

    const us = await api.get("/auth/users/");
    setUsers(us.data);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    setMsg("");
    try {
      const { data } = await api.post(`/auth/registration-requests/${id}/approve/`, {});
      setMsg(data.email_sent ? "Approved. Email sent to user." : "Approved. (Email may not have been sent.)");
      await load(); 
    } catch (e) {
      if (e.response?.status === 401) setMsg("Session expired or not authorized. Please log in again.");
      else setMsg("Approve failed. Check server logs for details.");
    }
  }

  async function reject(id) {
    setMsg("");
    const note = prompt("Optional note to include in email:");
    try {
      const { data } = await api.post(`/auth/registration-requests/${id}/reject/`, { note });
      setMsg(data.email_sent ? "Rejected. Email sent to user." : "Rejected. (Email may not have been sent.)");
      await load(); 
    } catch (e) {
      if (e.response?.status === 401) setMsg("Session expired or not authorized. Please log in again.");
      else setMsg("Reject failed. Check server logs for details.");
    }
  }

  return (
    <div>
      <h2>Pending Access Requests</h2>
      {msg && <div style={{ color: "green", margin: "8px 0" }}>{msg}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : pending.length === 0 ? (
        <div>No pending requests.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Email</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>DOB</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Address</th>
              <th style={{ borderBottom: "1px solid #eee", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(r => (
              <tr key={r.id}>
                <td style={{ padding: 8 }}>{r.first_name} {r.last_name}</td>
                <td style={{ padding: 8 }}>{r.email}</td>
                <td style={{ padding: 8 }}>{r.dob}</td>
                <td style={{ padding: 8 }}>{r.address}</td>
                <td style={{ padding: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="auth-button" onClick={() => approve(r.id)}>Allow Access</button>
                    <button className="auth-button secondary" onClick={() => reject(r.id)}>Deny</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 28 }}>All Users</h2>
      {loading ? (
        <div>Loading…</div>
      ) : users.length === 0 ? (
        <div>No users yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Username</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Email</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Role</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8 }}>{[u.first_name, u.last_name].filter(Boolean).join(" ")}</td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>{u.role}</td>
                <td style={{ padding: 8 }}>{u.is_active ? "Active" : "Inactive"}</td>
                <td style={{ padding: 8 }}>{new Date(u.date_joined).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
