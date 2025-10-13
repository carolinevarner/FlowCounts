import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api"; 

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
    const { data } = await api.post("/auth/token/", {
      username: form.email, 
      password: form.password
    });

    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));

    const me = await api.get("/auth/me/");
    localStorage.setItem("user", JSON.stringify(me.data));

    const role = me.data.role;
    if (role === "ADMIN") navigate("/admin");
    else if (role === "MANAGER") navigate("/manager");
    else if (role === "ACCOUNTANT") navigate("/accountant");
    else navigate("/login");
  } catch (err) {
    const detail = err?.response?.data?.detail || "Invalid credentials.";
    const attemptsLeft = err?.response?.data?.attempts_left;
    const suspended = err?.response?.data?.suspended;
    const passwordExpired = err?.response?.data?.password_expired;

    if (suspended) {
      setError("Account suspended due to too many failed login attempts. Contact administrator.");
      return;
    }

    if (passwordExpired) {
      setError(detail + " Click 'Forgot Password' to reset your password.");
      return;
    }

    if (typeof attemptsLeft === "number") {
      setError(detail);
    } else {
      setError(detail);
    }
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

        <button className="auth-button" type="submit">Login</button>

        <button
          type="button"
          className="auth-button white-green"
          onClick={() => navigate("/forgot")}
        >
          Forgot Password
        </button>

        <button className="auth-button cancel" type="button" onClick={onCancel} style={{ maxWidth: '200px', margin: '0 auto' }}>Cancel</button>

        <div className="auth-footer">
          <span>Don't have an account?</span>
          <Link to="/signup"><button type="button" className="auth-linkbtn">Request Access</button></Link>
        </div>
      </form>
    </AuthLayout>
  );
}
