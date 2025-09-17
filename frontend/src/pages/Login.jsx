import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
//import api from "../api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      // If you have JWT set up in Django (simplejwt), use:
      // const { data } = await api.post("/auth/token/", { username: form.email, password: form.password });
      // localStorage.setItem("access", data.access);
      // localStorage.setItem("refresh", data.refresh);

      // TEMP: simulate success while backend auth is not wired yet
      localStorage.setItem("access", "demo-token");
      navigate("/app"); // change to your dashboard route later
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <AuthLayout title="Login" subtitle="Welcome back!">
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

        <button className="auth-button">Login</button>
      </form>

      <div className="auth-footer">
        <span>Don’t have an account?</span>
        <Link to="/signup"><button className="auth-linkbtn">Sign Up</button></Link>
      </div>
    </AuthLayout>
  );
}
