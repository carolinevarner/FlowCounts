import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

const SECURITY_QUESTIONS = [
  "What is your favorite color?",
  "What was the name of your first pet?",
  "What city were you born in?",
];

function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!password[0] || !password[0].match(/[a-zA-Z]/)) {
    errors.push("Password must start with a letter");
  }
  
  if (!password.match(/[a-zA-Z]/)) {
    errors.push("Password must contain at least one letter");
  }
  
  if (!password.match(/\d/)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!password.match(/[^a-zA-Z0-9]/)) {
    errors.push("Password must contain at least one special character");
  }
  
  return errors;
}

export default function Signup() {
  const questions = SECURITY_QUESTIONS;
  
  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    address: "",
    dob: "",
    password: "",
    confirm: "",
    q0: "",
    q1: "",
    q2: "",
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
      q0: "",
      q1: "",
      q2: "",
    });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const passwordErrors = validatePassword(form.password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(". ") + ".");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await api.post("/auth/registration-requests/", {
        first_name: form.first,
        last_name: form.last,
        address: form.address,
        dob: form.dob,
        email: form.email,
        security_question_1: questions[0],
        security_answer_1: form.q0,
        security_question_2: questions[1],
        security_answer_2: form.q1,
        security_question_3: questions[2],
        security_answer_3: form.q2,
      });

      navigate("/login");
    } catch (err) {
      console.log("signup error:", err.response?.data || err.message);

      let msg = "Could not sign up";
      const data = err.response?.data;

      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.detail) msg = data.detail;
        else if (typeof data === "object") {
          msg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" | ");
        }
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    }
  }

  return (
    <AuthLayout title="FlowCounts" subtitle="Leave the Numbers to Us, Focus on Your Business!">
      <form onSubmit={onSubmit} className="auth-row">
        {error && <div style={{ color: "#c00" }}>{error}</div>}

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

        <div className="auth-row">
          <label>Date of Birth (MM/DD/YYYY):</label>
        </div>

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

        <div className="auth-row">
          <label>Security Questions (for password recovery):</label>
        </div>

        <div className="auth-row">
          <label>{questions[0]}</label>
          <input
            className="auth-input"
            placeholder="Answer"
            value={form.q0}
            onChange={(e) => setForm({ ...form, q0: e.target.value })}
            required
          />
        </div>

        <div className="auth-row">
          <label>{questions[1]}</label>
          <input
            className="auth-input"
            placeholder="Answer"
            value={form.q1}
            onChange={(e) => setForm({ ...form, q1: e.target.value })}
            required
          />
        </div>

        <div className="auth-row">
          <label>{questions[2]}</label>
          <input
            className="auth-input"
            placeholder="Answer"
            value={form.q2}
            onChange={(e) => setForm({ ...form, q2: e.target.value })}
            required
          />
        </div>

        <button className="auth-button" type="submit">Request Access</button>
        
        <button className="auth-button cancel" type="button" onClick={onCancel} style={{ maxWidth: '200px', margin: '0 auto' }}>Cancel</button>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login"><button type="button" className="auth-linkbtn">Login</button></Link>
        </div>
      </form>
    </AuthLayout>
  );
}
