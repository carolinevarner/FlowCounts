import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ links, user }) {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo-placeholder.png" alt="FlowCounts Logo" />
        <h2>FlowCounts</h2>
      </div>
      <nav className="sidebar-nav">
        {links.map(link => (
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
        <img src={user?.image || "/placeholder-user.png"} alt="User" />
      </div>
    </div>
  );
}
