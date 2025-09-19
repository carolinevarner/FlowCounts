import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/auth.css";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

function AppHome() {
  return (
    <div style={{ padding: 24 }}>
      <h2>App Home</h2>
      <p>You’re logged in (placeholder). Replace with your dashboard.</p>
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
      <Route path="/app" element={<AppHome />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
