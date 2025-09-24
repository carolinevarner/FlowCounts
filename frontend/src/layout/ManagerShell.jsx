import { Outlet, NavLink } from "react-router-dom";
import "../styles/layout.css";

const LINKS = [
  { to: "/manager/dashboard", label: "Dashboard" },
  { to: "/manager/chart", label: "Chart of Accounts" },
  { to: "/manager/accounts", label: "Accounts" },
  { to: "/manager/journal", label: "Journalize" },
  { to: "/manager/trial", label: "Trial Balance" },
  { to: "/manager/income", label: "Income Statement" },
  { to: "/manager/balance", label: "Balance Sheet" },
  { to: "/manager/retained", label: "Statement of Retained Earnings" },
];

function doLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export default function ManagerShell() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-logo" />
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
          <div className="user-box">
            <div className="user-name">{[user.first_name, user.last_name].filter(Boolean).join(" ")}</div>
            <div className="user-avatar" />
          </div>
        </header>
        <div className="main-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
