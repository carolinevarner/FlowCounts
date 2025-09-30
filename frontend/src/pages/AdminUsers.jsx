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
    const pend = await api.get("/auth/registration-requests/pending/");
    const us = await api.get("/auth/users/");
    setPending((pend.data || []).map((p) => ({ ...p, __kind: "pending" })));
    setUsers((us.data || []).map((u) => ({ ...u, __kind: "user" })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    setMsg("");
    try {
      const { data } = await api.post(`/auth/registration-requests/${id}/approve/`, {});
      setMsg(data.email_sent ? "Approved. Email sent to user." : "Approved.");
      await load();
    } catch (e) {
      setMsg(e.response?.status === 401 ? "Session expired. Log in again." : "Approve failed. See server logs.");
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
                        <td>Pending</td>
                        <td>No</td>
                        <td>
                          <div className="row-flex">
                            <button className="auth-button" onClick={() => approve(p.id)}>Allow</button>
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
              <h2 style={{ margin: 0 }}>Current Users</h2>
              <button className="auth-button" onClick={createUserQuick}>+ Create User</button>
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
                                Suspend
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
