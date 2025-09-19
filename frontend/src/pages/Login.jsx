import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
// import api from "../api"; // uncomment when you wire real login

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function onCancel() {
    setForm({ email: "", password: "" });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      // When backend is ready (JWT), do:
      // const { data } = await api.post("/auth/token/", { username: form.email, password: form.password });
      // localStorage.setItem("access", data.access);
      // localStorage.setItem("refresh", data.refresh);

      // TEMP success:
      localStorage.setItem("access", "demo-token");
      navigate("/app");
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <AuthLayout title="FlowCounts" subtitle="Welcome to FlowCounts!">
      <form onSubmit={onSubmit} className="auth-row">
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <input
          className="auth-input"
          placeholder="Email address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          className="auth-input"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {/* Primary actions: Login + Cancel */}
        <div className="auth-actions">
          <button className="auth-button" type="submit">Login</button>
          <button className="auth-button secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>

        {/* Forgot password + Create account */}
        <div className="auth-footer">
          <button
            type="button"
            className="auth-linkbtn"
            onClick={() => navigate("/forgot")}
          >
            Forgot Password
          </button>
          </div>
          <div className="auth-footer">
            <span>Don't have an account?</span>
            <Link to="/signup"><button type="button" className="auth-linkbtn">Request Access</button></Link>
        </div>
      </form>
    </AuthLayout>
  );
}
