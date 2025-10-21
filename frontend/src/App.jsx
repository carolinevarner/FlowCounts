import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/auth.css";
import "./styles/layout.css";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Protected from "./components/Protected.jsx";
import AdminShell from "./layout/AdminShell.jsx";
import ManagerShell from "./layout/ManagerShell.jsx";
import AccountantShell from "./layout/AccountantShell.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminEvents from "./pages/AdminEvents.jsx";
import ChartOfAccounts from "./pages/ChartOfAccounts.jsx";
import Accounts from "./pages/Accounts.jsx";
import Profile from "./pages/Profile.jsx";
import Ledger from "./pages/Ledger.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import JournalEntry from "./pages/JournalEntry.jsx";
import JournalList from "./pages/JournalList.jsx";
import JournalView from "./pages/JournalView.jsx";
import TrialBalance from "./pages/TrialBalance.jsx";
import IncomeStatement from "./pages/IncomeStatement.jsx";
import BalanceSheet from "./pages/BalanceSheet.jsx";
import RetainedEarnings from "./pages/RetainedEarnings.jsx";

function Blank({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<ForgotPassword />} />

      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />

      <Route
        path="/admin/*"
        element={
          <Protected roles={["ADMIN"]}>
            <AdminShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chart" element={<ChartOfAccounts />} />
        <Route path="ledger/:accountId" element={<Ledger />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="events" element={<AdminEvents />} />
      </Route>

      <Route
        path="/manager/*"
        element={
          <Protected roles={["MANAGER"]}>
            <ManagerShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chart" element={<ChartOfAccounts />} />
        <Route path="ledger/:accountId" element={<Ledger />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="journal" element={<JournalList />} />
        <Route path="journal/new" element={<JournalEntry />} />
        <Route path="journal/edit/:id" element={<JournalEntry />} />
        <Route path="journal/view/:id" element={<JournalView />} />
        <Route path="trial" element={<TrialBalance />} />
        <Route path="income" element={<IncomeStatement />} />
        <Route path="balance" element={<BalanceSheet />} />
        <Route path="retained" element={<RetainedEarnings />} />
      </Route>

      <Route
        path="/accountant/*"
        element={
          <Protected roles={["ACCOUNTANT"]}>
            <AccountantShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chart" element={<ChartOfAccounts />} />
        <Route path="ledger/:accountId" element={<Ledger />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="journal" element={<JournalList />} />
        <Route path="journal/new" element={<JournalEntry />} />
        <Route path="journal/edit/:id" element={<JournalEntry />} />
        <Route path="journal/view/:id" element={<JournalView />} />
        <Route path="trial" element={<TrialBalance />} />
        <Route path="income" element={<IncomeStatement />} />
        <Route path="balance" element={<BalanceSheet />} />
        <Route path="retained" element={<RetainedEarnings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
