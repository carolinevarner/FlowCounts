// import { Routes, Route, Navigate } from "react-router-dom";
// import "./styles/auth.css";
// import "./styles/layout.css";

// import Login from "./pages/Login.jsx";
// import Signup from "./pages/Signup.jsx";
// import ForgotPassword from "./pages/ForgotPassword.jsx"; 
// import Protected from "./components/Protected.jsx";
// import AdminShell from "./layout/AdminShell.jsx";
// import ManagerShell from "./layout/ManagerShell.jsx";
// import AccountantShell from "./layout/AccountantShell.jsx";
// import AdminUsers from "./pages/AdminUsers.jsx";
// import Profile from "./pages/Profile.jsx";
// // import Page from "./layout/Page.jsx"; 
// function Blank({ title }) {
//   return <div style={{ padding: 24 }}><h2>{title}</h2></div>;
// }

// export default function App() {
//   return (
//     <Routes>
//       <Route path="/" element={<Navigate to="/login" replace />} />
//       <Route path="/login" element={<Login />} />
//       <Route path="/signup" element={<Signup />} />
//       <Route path="/forgot" element={<ForgotPassword />} /> {/* <-- FIXED */}
//       {/* ...keep the rest as you had... */}
//       <Route path="/profile" element={<Protected><Profile/></Protected>} />
//       <Route path="*" element={<Navigate to="/login" replace />} />
    
//       <Route
//         path="/admin/*"
//         element={
//           <Protected roles={["ADMIN"]}>
//             <AdminShell />
//           </Protected>
//         }
//       >
//         <Route index element={<Navigate to="dashboard" replace />} />
//         <Route path="dashboard" element={<Blank title="Admins HomePage" />} />
//         <Route path="chart" element={<Blank title="Admin • Chart of Accounts" />} />
//         <Route path="accounts" element={<Blank title="Admin • Accounts" />} />
//         <Route path="users" element={<AdminUsers />} />
//         <Route path="events" element={<Blank title="Admin • Event Log" />} />
//       </Route>

//       <Route
//         path="/manager/*"
//         element={
//           <Protected roles={["MANAGER"]}>
//             <ManagerShell />
//           </Protected>
//         }
//       >
//         <Route index element={<Navigate to="dashboard" replace />} />
//         <Route path="dashboard" element={<Blank title="Managers HomePage" />} />
//         <Route path="chart" element={<Blank title="Manager • Chart of Accounts" />} />
//         <Route path="accounts" element={<Blank title="Manager • Accounts" />} />
//         <Route path="journal" element={<Blank title="Manager • Journalize" />} />
//         <Route path="trial" element={<Blank title="Manager • Trial Balance" />} />
//         <Route path="income" element={<Blank title="Manager • Income Statement" />} />
//         <Route path="balance" element={<Blank title="Manager • Balance Sheet" />} />
//         <Route path="retained" element={<Blank title="Manager • Statement of Retained Earnings" />} />
//       </Route>

//       <Route
//         path="/accountant/*"
//         element={
//           <Protected roles={["ACCOUNTANT"]}>
//             <AccountantShell />
//           </Protected>
//         }
//       >
//         <Route index element={<Navigate to="dashboard" replace />} />
//         <Route path="dashboard" element={<Blank title="Accountants HomePage" />} />
//         <Route path="chart" element={<Blank title="Accountant • Chart of Accounts" />} />
//         <Route path="accounts" element={<Blank title="Accountant • Accounts" />} />
//         <Route path="journal" element={<Blank title="Accountant • Journalize" />} />
//         <Route path="trial" element={<Blank title="Accountant • Trial Balance" />} />
//         <Route path="income" element={<Blank title="Accountant • Income Statement" />} />
//         <Route path="balance" element={<Blank title="Accountant • Balance Sheet" />} />
//         <Route path="retained" element={<Blank title="Accountant • Statement of Retained Earnings" />} />
//       </Route>

//       <Route path="*" element={<Navigate to="/login" replace />} />
//       <Route path="/profile" element={<Protected><Page title="Profile"><Profile/></Page></Protected>} />

//     </Routes>
//   );
// }

import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/auth.css";
import "./styles/layout.css";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx"; // <-- fix name
import Protected from "./components/Protected.jsx";
import AdminShell from "./layout/AdminShell.jsx";
import ManagerShell from "./layout/ManagerShell.jsx";
import AccountantShell from "./layout/AccountantShell.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
// import Page from "./layout/Page.jsx"; // if you actually have this component
import Profile from "./pages/Profile.jsx";

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
      {/* Always land on login first */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<ForgotPassword />} />

      {/* If you don’t have a Page wrapper yet, just render Profile directly */}
      <Route
        path="/profile"
        element={
          <Protected>
            {/* <Page title="Profile"><Profile/></Page> */}
            <Profile />
          </Protected>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin/*"
        element={
          <Protected roles={["ADMIN"]}>
            <AdminShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Blank title="Admins HomePage" />} />
        <Route path="chart" element={<Blank title="Admin • Chart of Accounts" />} />
        <Route path="accounts" element={<Blank title="Admin • Accounts" />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="events" element={<Blank title="Admin • Event Log" />} />
      </Route>

      {/* MANAGER */}
      <Route
        path="/manager/*"
        element={
          <Protected roles={["MANAGER"]}>
            <ManagerShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Blank title="Managers HomePage" />} />
        <Route path="chart" element={<Blank title="Manager • Chart of Accounts" />} />
        <Route path="accounts" element={<Blank title="Manager • Accounts" />} />
        <Route path="journal" element={<Blank title="Manager • Journalize" />} />
        <Route path="trial" element={<Blank title="Manager • Trial Balance" />} />
        <Route path="income" element={<Blank title="Manager • Income Statement" />} />
        <Route path="balance" element={<Blank title="Manager • Balance Sheet" />} />
        <Route path="retained" element={<Blank title="Manager • Statement of Retained Earnings" />} />
      </Route>

      {/* ACCOUNTANT */}
      <Route
        path="/accountant/*"
        element={
          <Protected roles={["ACCOUNTANT"]}>
            <AccountantShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Blank title="Accountants HomePage" />} />
        <Route path="chart" element={<Blank title="Accountant • Chart of Accounts" />} />
        <Route path="accounts" element={<Blank title="Accountant • Accounts" />} />
        <Route path="journal" element={<Blank title="Accountant • Journalize" />} />
        <Route path="trial" element={<Blank title="Accountant • Trial Balance" />} />
        <Route path="income" element={<Blank title="Accountant • Income Statement" />} />
        <Route path="balance" element={<Blank title="Accountant • Balance Sheet" />} />
        <Route path="retained" element={<Blank title="Accountant • Statement of Retained Earnings" />} />
      </Route>

      {/* final catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
