import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

export default function Signup() {
  const [form, setForm] = useState({ first: "", last: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
        await api.post("/auth/register/", form);
        navigate("/login");
    } catch {
      setError("Could not sign up");
    }
  }

  return (
    <AuthLayout title="Sign up" subtitle="Leave the Numbers to Us, Focus on Your Business!">
      <form onSubmit={onSubmit} className="auth-row">
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <div className="auth-grid-2">
          <input
            className="auth-input"
            placeholder="First name"
            value={form.first}
            onChange={(e) => setForm({ ...form, first: e.target.value })}
            required
          />
          <input
            className="auth-input"
            placeholder="Last name"
            value={form.last}
            onChange={(e) => setForm({ ...form, last: e.target.value })}
            required
          />
        </div>

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
          placeholder="Create password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <button className="auth-button">Register</button>
      </form>

      <div className="auth-footer">
        <span>Already have an account?</span>
        <Link to="/login"><button className="auth-linkbtn">Login</button></Link>
      </div>
    </AuthLayout>
  );
}
