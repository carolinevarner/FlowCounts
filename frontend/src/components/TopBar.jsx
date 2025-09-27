import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function TopBar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));

    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const avatarUrl = user?.profile_image_url || null;
  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  function toggle() {
    setOpen((v) => !v);
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.jpe?g$/i.test(file.name)) {
      alert("Please choose a JPEG image.");
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const { data } = await api.post("/auth/me/photo/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const next = { ...(user || {}), profile_image_url: data.profile_image_url };
      setUser(next);
      localStorage.setItem("user", JSON.stringify(next));
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please use a JPEG (max 5MB).");
    } finally {
      e.target.value = "";
    }
  }

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="topbar">
      <div className="brand">
        <img src="/logo.jpg" alt="FlowCounts Logo" className="topbar-logo" />
        <div className="brand-name">FlowCounts</div>
      </div>

      <div className="spacer" />

      <div className="topbar-user" ref={menuRef}>
        <button className="avatar" onClick={toggle} aria-label="Open user menu">
          {avatarUrl ? (
            <img src={avatarUrl} alt="profile" />
          ) : (
            <div className="avatar-fallback">{initials || "?"}</div>
          )}
        </button>

        {open && (
          <div className="user-menu">
            <div className="user-menu-header">
              <div className="um-name">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="um-role">{user?.role}</div>
            </div>
            <button className="um-item" onClick={() => navigate("/profile")}>
              View Profile
            </button>
            <button className="um-item" onClick={pickFile}>Upload Photo</button>
            <button className="um-item danger" onClick={logout}>Logout</button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
