import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
// import api from "../api"; // hook up later

export default function Signup() {
  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    address: "",
    dob: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function onCancel() {
    setForm({
      first: "",
      last: "",
      email: "",
      address: "",
      dob: "",
      password: "",
      confirm: "",
    });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // When backend registration endpoint is ready:
      // await api.post("/auth/registration-requests/", {
      //   first_name: form.first,
      //   last_name: form.last,
      //   address: form.address,
      //   dob: form.dob,
      //   email: form.email,
      // });

      // TEMP: pretend success → back to login
      navigate("/login");
    } catch {
      setError("Could not sign up");
    }
  }

  return (
    <AuthLayout title="FlowCounts" subtitle="Leave the Numbers to Us, Focus on Your Business!">
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
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          required
        />

        <input
          className="auth-input"
          placeholder="Date of birth"
          type="date"
          value={form.dob}
          onChange={(e) => setForm({ ...form, dob: e.target.value })}
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

        <input
          className="auth-input"
          placeholder="Confirm password"
          type="password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          required
        />

        {/* Register + Cancel */}
        <div className="auth-actions">
          <button className="auth-button" type="submit">Request Access</button>
          <button className="auth-button secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login"><button type="button" className="auth-linkbtn">Login</button></Link>
        </div>
      </form>
    </AuthLayout>
  );
}
