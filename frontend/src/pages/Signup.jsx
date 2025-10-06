import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

const ALL_QUESTIONS = [
  "What is your favorite color?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was your high school mascot?",
  "What is your favorite teacher's last name?",
  "What was the make of your first car?",
];

function pickThreeRandom(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 3);
} 

export default function Signup() {
  const questions = useMemo(() => pickThreeRandom(ALL_QUESTIONS), []);
  
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

        <div className="auth-actions">
          <button className="auth-button" type="submit">Request</button>
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
