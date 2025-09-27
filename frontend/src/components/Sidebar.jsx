import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import "./Sidebar.css";
import api from "../api";

export default function Sidebar({ links, user, onLogout }) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
      await api.post("/auth/upload-profile-photo/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Profile photo updated!");
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please use a JPEG under 5MB.");
    }
  };

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <img src="/logo.jpg" alt="FlowCounts Logo" className="brand-logo-img" />
        </div>
        <div className="brand-name">FlowCounts</div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <span>{user?.name}</span>
        <div className="profile-container">
          <img
            src={user?.image || "/placeholder-user.png"}
            alt="User"
            onClick={toggleDropdown}
            className="profile-img"
          />

          {dropdownOpen && (
            <div className="dropdown-menu">
              <label className="dropdown-item">
                Upload Photo
                <input
                  type="file"
                  accept="image/jpeg"
                  onChange={handleUpload}
                  style={{ display: "none" }}
                />
              </label>
              <button className="dropdown-item">View Profile</button>
              <button className="dropdown-item logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
