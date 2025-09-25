import { Outlet, NavLink } from "react-router-dom";
import UserAvatarMenu from "../components/UserAvatarMenu.jsx";
import "../styles/layout.css";

const LINKS = [
  { to: "/accountant/dashboard", label: "Dashboard" },
  { to: "/accountant/chart", label: "Chart of Accounts" },
  { to: "/accountant/accounts", label: "Accounts" },
  { to: "/accountant/journal", label: "Journalize" },
  { to: "/accountant/trial", label: "Trial Balance" },
  { to: "/accountant/income", label: "Income Statement" },
  { to: "/accountant/balance", label: "Balance Sheet" },
  { to: "/accountant/retained", label: "Statement of Retained Earnings" },
];

function doLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export default function AccountantShell() {
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
          <UserAvatarMenu />
        </header>
        <div className="main-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

