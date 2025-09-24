import { useEffect, useState } from "react";
import api from "../api";

export default function AdminUsers() {
//   const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await api.get("/auth/registration-requests/pending/");
    setRows(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(id) {
    setMsg("");
    await api.post(`/auth/registration-requests/${id}/approve/`, {});
    setMsg("Approved and user created. Email sent.");
    load();
  }
  async function reject(id) {
    setMsg("");
    const note = prompt("Optional note to include in email:");
    await api.post(`/auth/registration-requests/${id}/reject/`, { note });
    setMsg("Request rejected. Email sent.");
    load();
  }

  return (
    <div>
      <h2>Pending Access Requests</h2>
      {msg && <div style={{ color: "green", margin: "8px 0" }}>{msg}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
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
            {rows.map(r => (
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
    </div>
  );
}