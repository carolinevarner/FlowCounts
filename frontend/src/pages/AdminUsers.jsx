import { useEffect, useRef, useState } from "react";
import api from "../api";

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

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="auth-button" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="auth-button secondary" disabled={saving} onClick={onClose}>
            Cancel
          </button>
        </div>
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
  const [busyId, setBusyId] = useState(null);

  

  // const [openMenuFor, setOpenMenuFor] = useState(null);
  // const menuRef = useClickAway(() => setOpenMenuFor(null));

  function RowActions({ row }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const onDown = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, []);

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
      setOpen(false);
    };

    return (
      <div className="row-actions" ref={ref}>
        <button
          type="button"
          className="kebab"
          aria-label="User actions"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          ⋮
        </button>
        {open && (
          <div className="row-menu">
            <button type="button" className="row-menu-item" onClick={onSend}>
              Send Email
            </button>
          </div>
        )}
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

  async function suspendUser(user) {
    setMsg("");
    // If currently suspended, offer to unsuspend
    if (user.suspended_now === true || (user.is_active === false && (user.suspend_from || user.suspend_to))) {
      const ok = window.confirm(`Unsuspend ${user.first_name} ${user.last_name}?`);
      if (!ok) return;
      setBusyId(user.id);
      try {
        const payload = { suspend_from: "", suspend_to: "" };
        const { data } = await api.post(`/auth/users/${user.id}/suspend/`, payload);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data } : u)));
      } catch (e) {
        const detail = e?.response?.data?.detail || "Unsuspend failed. See server logs.";
        setMsg(detail);
      } finally {
        setBusyId(null);
      }
      return;
    }

    const start = prompt("Suspend from (YYYY-MM-DD). Leave blank to cancel.", "");
    const end = start ? prompt("Suspend to (YYYY-MM-DD).", start) : "";
    setBusyId(user.id);
    try {
      const payload = { suspend_from: (start || "").trim(), suspend_to: (end || "").trim() };
      const { data } = await api.post(`/auth/users/${user.id}/suspend/`, payload);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data } : u)));
    } catch (e) {
      const detail = e?.response?.data?.detail || "Suspend failed. See server logs.";
      setMsg(detail);
    } finally {
      setBusyId(null);
    }
  }

  async function createUserQuick() {
    setMsg("");
    const first = prompt("First name:", "");
    if (first === null) return;
    const last = prompt("Last name:", "");
    if (last === null) return;
    const email = prompt("Email:", "");
    if (email === null) return;
    const role = prompt("Role (ADMIN, MANAGER, ACCOUNTANT):", "ACCOUNTANT");
    if (role === null) return;
    const password = prompt("Temporary password (min 8 chars, will be required to change later):", "");
    if (password === null) return;
    if (!password || password.trim().length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    try {
      await api.post("/auth/users/", {
        first_name: (first || "").trim(),
        last_name: (last || "").trim(),
        email: (email || "").trim(),
        role: (role || "ACCOUNTANT").trim(),
        password: password.trim(),
      });
      await load();
      setMsg("User created.");
    } catch (e) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.role?.[0] ||
        e?.response?.data?.password?.[0] ||
        "Create failed. See server logs.";
      setMsg(apiMsg);
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
          <div className="card" style={{ marginBottom: 16 }}>
            <h2>Pending Access Requests</h2>
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
                              style={{ padding: "4px 8px", fontSize: 12 }}
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
                              style={{ opacity: p.assigned_role ? 1 : 0.5 }}
                            >
                              Allow
                            </button>
                            <button className="auth-button secondary" onClick={() => reject(p.id)}>Deny</button>
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ marginBottom: 10 }}>Current Users</h2>
              <button
                className="auth-create-user"
                style={{ padding: "10px 10px", fontSize: 12, marginLeft: "565px", marginBottom: "3px"}}
                onClick={createUserQuick}
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
                                >
                                  {busyId === u.id ? "…" : "Deactivate"}
                                </button>
                              ) : (
                                <button
                                  className="auth-button"
                                  disabled={busyId === u.id}
                                  onClick={() => toggleActive(u, true)}
                                >
                                  {busyId === u.id ? "…" : "Activate"}
                                </button>
                              )}
                              <button
                                className="auth-button secondary"
                                disabled={busyId === u.id}
                                onClick={() => suspendUser(u)}
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
  </>
);
}
