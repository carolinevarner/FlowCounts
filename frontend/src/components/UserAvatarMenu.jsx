import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function UserAvatarMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase();

  const avatarUrl = user?.profile_image_url || null;

  function toggle() { setOpen(v => !v); }
  function pickFile() { pickerRef.current?.click(); }

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login");
  }

  async function onPick(e) {
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
      alert("Upload failed. Please use a JPEG under 5MB.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="user-box" ref={menuRef}>
      <div className="user-name">
        {[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
      </div>
      <button className="user-avatar" onClick={toggle} aria-label="User menu">
        {avatarUrl
          ? <img src={avatarUrl} alt="profile" />
          : <div className="ua-fallback">{initials || "?"}</div>}
      </button>

      {open && (
        <div className="ua-menu">
          <div className="ua-header">
            <div className="ua-title">
              {[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
            </div>
            <div className="ua-sub">{user?.role}</div>
          </div>
          <button className="ua-item" onClick={() => navigate("/profile")}>View Profile</button>
          <button className="ua-item" onClick={pickFile}>Upload Photo</button>
          <button className="ua-item" onClick={logout}>Logout</button>
          <input
            ref={pickerRef}
            type="file"
            accept="image/jpeg"
            style={{ display: "none" }}
            onChange={onPick}
          />
        </div>
      )}
    </div>
  );
}
