import { Outlet, NavLink } from "react-router-dom";
import UserAvatarMenu from "../components/UserAvatarMenu.jsx";
import "../styles/layout.css";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/chart", label: "Chart of Accounts" },
  { to: "/admin/accounts", label: "Accounts" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/events", label: "Event Log" },
];

function doLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export default function AdminShell() {
  return (
    <div className="shell">
      <aside className="side">
      <div className="brand">
        <div className="brand-logo">
          <img src="/logo.jpg" alt="FlowCounts Logo" className="brand-logo-img" />
        </div>
        <div className="brand-name">FlowCounts</div>
      </div>
        <nav className="side-nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end className={({isActive}) => "side-link" + (isActive ? " active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
            <button className="side-logout" onClick={doLogout}>Log out</button>
        </div>

      </aside>

      <main className="main">
        <header className="main-top">
          <div />
          <UserAvatarMenu />
        </header>
        <div className="main-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
