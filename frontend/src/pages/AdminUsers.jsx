import { useEffect, useState } from "react";
import api from "../api";
import HelpModal from "../components/HelpModal";

// function useClickAway(close) {
//   const ref = useRef(null);
//   useEffect(() => {
//     const onClick = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) close();
//     };
//     document.addEventListener("mousedown", onClick);
//     return () => document.removeEventListener("mousedown", onClick);
//   }, [close]);
//   return ref;
// }

function normalizedEmailFromRow(row) {
  const email = (row?.email || row?.user?.email || "").trim();
  return email;
}

function openGmailCompose({ to, subject, body }) {
  if (!to) {
    alert("No email address on this user.");
    return;
  }

  const gmailUrl =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(to)}` +
    (subject ? `&su=${encodeURIComponent(subject)}` : "") +
    (body ? `&body=${encodeURIComponent(body)}` : "");

  const a = document.createElement("a");
  a.href = gmailUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    // if (confirm("If Gmail didn't open, press OK to open your default mail app.")) {
    //   const mailto =
    //     `mailto:${encodeURIComponent(to)}` +
    //     (subject ? `?subject=${encodeURIComponent(subject)}` : "") +
    //     (body ? `${subject ? "&" : "?"}body=${encodeURIComponent(body)}` : "");
    //   window.location.href = mailto;
    // }
  }, 150);
}


const ROLE_BASE = {
  ADMIN: "adminUser",
  MANAGER: "managerUser",
  ACCOUNTANT: "accountantUser",
};

function makeDisplayNameMap(users) {
  const sorted = [...users].sort((a, b) => (a.id || 0) - (b.id || 0));
  const counters = { ADMIN: 0, MANAGER: 0, ACCOUNTANT: 0 };
  const out = new Map();
  for (const u of sorted) {
    const base = ROLE_BASE[u.role] || "user";
    counters[u.role] = (counters[u.role] || 0) + 1;
    out.set(u.id, `${base}${counters[u.role]}`);
  }
  return out;
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "ACCOUNTANT",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onCancel() {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      role: "ACCOUNTANT",
      password: "",
    });
    setError("");
  }

  function validate() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return "First and last name are required.";
    }
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
    if (!okEmail) return "Please enter a valid email address.";
    if (!["ADMIN", "MANAGER", "ACCOUNTANT"].includes(form.role)) {
      return "Role must be ADMIN, MANAGER, or ACCOUNTANT.";
    }
    if (!form.password || form.password.trim().length < 8) {
      return "Password must be at least 8 characters.";
    }
    return "";
  }

  async function onCreate() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password.trim(),
      };
      await api.post("/auth/users/", payload);
      onCreated();
    } catch (e) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.role?.[0] ||
        e?.response?.data?.password?.[0] ||
        "Create failed. Check server.";
      setError(apiMsg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '35px',
            cursor: 'pointer',
            color: '#000000',
            lineHeight: '1',
            padding: '0',
            width: '60px',
            height: '60px'
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>Create User</h3>

        <div className="field">
          <label>First name</label>
          <input
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            placeholder="Enter first name"
          />
        </div>

        <div className="field">
          <label>Last name</label>
          <input
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
            placeholder="Enter last name"
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="field">
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setField("role", e.target.value)}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
          </select>
        </div>

        <div className="field">
          <label>Temporary Password (min 8 characters)</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Enter temporary password"
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button className="auth-button" disabled={saving} onClick={onCreate} style={{ marginTop: 6, backgroundColor: '#1C5C59' }}>
          {saving ? "Creating…" : "Create User"}
        </button>
        <button className="auth-button secondary" disabled={saving} onClick={onCancel} style={{ marginTop: 10 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SuspendUserModal({ user, onClose, onSuspended }) {
  const isSuspended = user.suspended_now === true || (user.is_active === false && (user.suspend_from || user.suspend_to));
  
  const [form, setForm] = useState({
    suspend_from: user.suspend_from || "",
    suspend_to: user.suspend_to || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onCancel() {
    setForm({
      suspend_from: user.suspend_from || "",
      suspend_to: user.suspend_to || "",
    });
    setError("");
  }

  function validate() {
    if (isSuspended) {
      // For unsuspend, no validation needed
      return "";
    }
    
    if (!form.suspend_from || !form.suspend_to) {
      return "Both start and end dates are required.";
    }
    
    const startDate = new Date(form.suspend_from);
    const endDate = new Date(form.suspend_to);
    
    if (startDate > endDate) {
      return "End date must be after start date.";
    }
    
    return "";
  }

  async function onSubmit() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    try {
      setSaving(true);
      const payload = isSuspended 
        ? { suspend_from: "", suspend_to: "" }
        : {
            suspend_from: form.suspend_from.trim(),
            suspend_to: form.suspend_to.trim(),
          };
      const { data } = await api.post(`/auth/users/${user.id}/suspend/`, payload);
      onSuspended(data);
    } catch (e) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.suspend_from?.[0] ||
        e?.response?.data?.suspend_to?.[0] ||
        `${isSuspended ? "Unsuspend" : "Suspend"} failed. Check server.`;
      setError(apiMsg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '35px',
            cursor: 'pointer',
            color: '#666',
            lineHeight: '1',
            padding: '0',
            width: '60px',
            height: '60px'
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>
          {isSuspended ? "Unsuspend User" : "Suspend User"}
        </h3>

        <div className="field">
          <label>User</label>
          <input value={`${user.first_name} ${user.last_name} (${user.email})`} disabled />
        </div>

        {isSuspended ? (
          <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              This user is currently suspended.
              {user.suspend_from && user.suspend_to && (
                <><br />From: <strong>{user.suspend_from}</strong> to <strong>{user.suspend_to}</strong></>
              )}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              Click "Unsuspend" to restore their access.
            </p>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Suspend From</label>
              <input
                type="date"
                value={form.suspend_from}
                onChange={(e) => setField("suspend_from", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Suspend To</label>
              <input
                type="date"
                value={form.suspend_to}
                onChange={(e) => setField("suspend_to", e.target.value)}
              />
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button 
          className="auth-button" 
          disabled={saving} 
          onClick={onSubmit} 
          style={{ 
            marginTop: 6, 
            backgroundColor: isSuspended ? '#4f772d' : '#f08f00' 
          }}
        >
          {saving ? (isSuspended ? "Unsuspending…" : "Suspending…") : (isSuspended ? "Unsuspend" : "Suspend User")}
        </button>
        <button className="auth-button secondary" disabled={saving} onClick={onCancel} style={{ marginTop: 10 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    role: user.role || "ACCOUNTANT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onCancel() {
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role || "ACCOUNTANT",
    });
    setError("");
  }

  function validate() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return "First and last name are required.";
    }
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
    if (!okEmail) return "Please enter a valid email address.";
    if (!["ADMIN", "MANAGER", "ACCOUNTANT"].includes(form.role)) {
      return "Role must be ADMIN, MANAGER, or ACCOUNTANT.";
    }
    return "";
  }

  async function onSave() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      const { data } = await api.patch(`/auth/users/${user.id}/`, payload);
      onSaved(data);
    } catch (e) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.role?.[0] ||
        "Update failed. Check server.";
      setError(apiMsg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '35px',
            cursor: 'pointer',
            color: '#666',
            lineHeight: '1',
            padding: '0',
            width: '60px',
            height: '60px'
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>Edit User</h3>

        <div className="field">
          <label>Username (read-only)</label>
          <input value={user.username} disabled />
        </div>

        <div className="field">
          <label>First name</label>
          <input
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Last name</label>
          <input
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>

        <div className="field">
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setField("role", e.target.value)}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="auth-button" disabled={saving} onClick={onSave} style={{ marginTop: 6, backgroundColor: '#1C5C59' }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="auth-button secondary" disabled={saving} onClick={onCancel} style={{ marginTop: 10 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}


export default function AdminUsers() {
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null); 
  const [creating, setCreating] = useState(false);
  const [suspending, setSuspending] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  

  // const [openMenuFor, setOpenMenuFor] = useState(null);
  // const menuRef = useClickAway(() => setOpenMenuFor(null));

  function RowActions({ row }) {
    const onSend = () => {
      const to = normalizedEmailFromRow(row);
      const clean = to.replace(/\s+/g, "");
      const isLikelyEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean);
      if (!isLikelyEmail) {
        alert(`This user has no valid email set.\n\nGot: "${to || "(empty)"}"`);
        return;
      }

      const subject = `FlowCounts — Message for ${row.first_name} ${row.last_name}`;
      const body =
        `Hi ${row.first_name},\n\n` +
        `This is a message from a FlowCounts administrator.\n\n— Admin`;

      openGmailCompose({ to: clean, subject, body });
    };

  return (
    <div className="row-actions">
      <button
        type="button"
        className="auth-button secondary"
        onClick={onSend}
        style={{ fontSize: 12, padding: '6px 12px', backgroundColor: '#1C5C59', color: 'white', border: 'none' }}
      >
        Email
      </button>
    </div>
  );
  }

  async function load() {
    setLoading(true);
    try {
      const pend = await api.get("/auth/registration-requests/pending/");
      const us = await api.get("/auth/users/");
      setPending((pend.data || []).map((p) => ({ ...p, __kind: "pending" })));
      setUsers((us.data || []).map((u) => ({ ...u, __kind: "user" })));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) setMsg("Session expired. Log in again.");
      else if (status === 403) setMsg("You do not have permission to view users.");
      else setMsg("Failed to load users. See server logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function assignRole(id, role) {
    setMsg("");
    try {
      await api.post(`/auth/registration-requests/${id}/assign_role/`, { role });
      await load();
      if (role) {
        setMsg(`Role ${role} assigned.`);
      } else {
        setMsg(`Role cleared.`);
      }
    } catch (e) {
      setMsg(e.response?.status === 401 ? "Session expired. Log in again." : "Role assignment failed. See server logs.");
    }
  }

  async function approve(id) {
    setMsg("");
    try {
      const { data } = await api.post(`/auth/registration-requests/${id}/approve/`, {});
      setMsg(data.email_sent ? "Approved. Email sent to user." : "Approved.");
      await load();
    } catch (e) {
      const detail = e?.response?.data?.detail || "Approve failed. See server logs.";
      setMsg(e.response?.status === 401 ? "Session expired. Log in again." : detail);
    }
  }

  async function reject(id) {
    setMsg("");
    const note = prompt("Optional note to include in email:");
    try {
      const { data } = await api.post(`/auth/registration-requests/${id}/reject/`, { note });
      setMsg(data.email_sent ? "Rejected. Email sent to user." : "Rejected.");
      await load();
    } catch (e) {
      setMsg(e.response?.status === 401 ? "Session expired. Log in again." : "Reject failed. See server logs.");
    }
  }

  const displayMap = makeDisplayNameMap(users);

  async function toggleActive(user, makeActive) {
    setMsg("");
    setBusyId(user.id);
    try {
      const path = makeActive ? "activate" : "deactivate";
      const { data } = await api.post(`/auth/users/${user.id}/${path}/`, {});
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data } : u)));
    } catch (e) {
      setMsg(e?.response?.status === 401 ? "Session expired. Log in again." : "Update failed. See server logs.");
    } finally {
      setBusyId(null);
    }
  }



  return (
  <>
    <div className="page">
      {msg && <div style={{ color: "green", margin: "8px 0" }}>{msg}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600", padding: "12px 24px", maxWidth: "100%" }}>User Management</h2>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>Pending Access Requests</h2>
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
            {/* <h3 style={{ fontFamily: "Playfair Display", fontSize: "1.2em", fontWeight: "600", marginTop: 0 }}>Pending Access Requests</h3> */}
            {pending.length === 0 ? (
              <div className="muted">No pending requests.</div>
            ) : (
              <div style={{ overflow: "visible" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status/Role</th>
                      <th>Active</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((p) => (
                      <tr key={`p:${p.id}`}>
                        <td>{p.first_name} {p.last_name}</td>
                        <td>—</td>
                        <td>{p.email}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <select 
                              value={p.assigned_role || ""} 
                              onChange={(e) => assignRole(p.id, e.target.value)}
                              style={{ 
                                padding: "6px 12px", 
                                fontSize: 13, 
                                borderRadius: "6px",
                                border: "1px solid #b8b6b6",
                                backgroundColor: "#fff",
                                cursor: "pointer",
                                outline: "none",
                                fontFamily: "sans-serif"
                              }}
                            >
                              <option value="">Select Role</option>
                              <option value="ADMIN">Admin</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ACCOUNTANT">Accountant</option>
                            </select>
                            {p.assigned_role && (
                              <span style={{ fontSize: 12, color: "green" }}>
                                ✓ {p.assigned_role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>No</td>
                        <td>
                          <div className="row-flex">
                            <button 
                              className="auth-button" 
                              onClick={() => approve(p.id)}
                              disabled={!p.assigned_role}
                              style={{ backgroundColor: '#4f772d', color: 'white', border: 'none', opacity: p.assigned_role ? 1 : 0.5 }}
                            >
                              Allow
                            </button>
                            <button className="auth-button secondary" onClick={() => reject(p.id)} style={{ backgroundColor: '#c1121f', color: 'white', border: 'none' }}>Deny</button>
                            <RowActions row={p} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <br />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>Current Users</h2>
              <button
                className="auth-button secondary"
                style={{ fontSize: 12, padding: '6px 12px', backgroundColor: '#1C5C59', color: 'white', border: 'none', width: '28%' }}
                onClick={() => setCreating(true)}
              >
                + Create User
              </button>
            </div>

            {users.length === 0 ? (
              <div className="muted">No users.</div>
            ) : (
              <div style={{ overflow: "visible" }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status/Role</th>
                      <th>Active</th>
                      <th>Edit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .slice()
                      .sort((a, b) => (a.id || 0) - (b.id || 0))
                      .map((u) => (
                        <tr key={`u:${u.id}`}>
                          <td>{u.first_name} {u.last_name}</td>
                          <td>{displayMap.get(u.id) || "user"}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>{u.is_active && !u.suspended_now ? "Yes" : "No"}</td>
                          <td>
                            <button
                              className="auth-button secondary"
                              disabled={busyId === u.id}
                              onClick={() => setEditing(u)}
                              style={{ backgroundColor: '#4f772d', color: 'white', border: 'none' }}
                            >
                              {busyId === u.id ? "Saving..." : "Edit"}
                            </button>
                          </td>
                          <td>
                            <div className="row-flex" style={{ gap: 8 }}>
                              {u.is_active ? (
                                <button
                                  className="auth-button secondary"
                                  disabled={busyId === u.id}
                                  onClick={() => toggleActive(u, false)}
                                  style={{ backgroundColor: '#c1121f', color: 'white', border: 'none' }}
                                >
                                  {busyId === u.id ? "…" : "Deactivate"}
                                </button>
                              ) : (
                                <button
                                  className="auth-button"
                                  disabled={busyId === u.id}
                                  onClick={() => toggleActive(u, true)}
                                  style={{ backgroundColor: '#c1121f', color: 'white', border: 'none' }}
                                >
                                  {busyId === u.id ? "…" : "Activate"}
                                </button>
                              )}
                              <button
                                className="auth-button secondary"
                                disabled={busyId === u.id}
                                onClick={() => setSuspending(u)}
                                style={{ backgroundColor: '#f08f00', color: 'white', border: 'none' }}
                              >
                                {busyId === u.id ? "…" : (u.suspended_now ? "Unsuspend" : "Suspend")}
                              </button>

                              <RowActions row={u} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {creating && (
      <CreateUserModal
        onClose={() => setCreating(false)}
        onCreated={async () => {
          await load();
          setCreating(false);
          setMsg("User created.");
        }}
      />
    )}

    {editing && (
      <EditUserModal
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setUsers(prev =>
            prev.map(x => (x.id === updated.id ? { ...x, ...updated } : x))
          );
          setEditing(null);
          setMsg("User updated.");
        }}
      />
    )}

    {suspending && (
      <SuspendUserModal
        user={suspending}
        onClose={() => setSuspending(null)}
        onSuspended={(updated) => {
          setUsers(prev =>
            prev.map(x => (x.id === updated.id ? { ...x, ...updated } : x))
          );
          setSuspending(null);
          const action = updated.suspended_now ? "suspended" : "unsuspended";
          setMsg(`User ${action}.`);
        }}
      />
    )}

    {showHelpModal && (
      <HelpModal onClose={() => setShowHelpModal(false)} page="users" userRole="ADMIN" />
    )}
  </>
  );
}
