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
  { to: "/profile", label: "Profile" },
];

export default function AccountantShell() {
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

