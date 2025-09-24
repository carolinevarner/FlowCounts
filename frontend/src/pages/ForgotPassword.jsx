import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api"; 

const ALL_QUESTIONS = [
  "What is your favorite color?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother’s maiden name?",
  "What was your high school mascot?",
  "What is your favorite teacher’s last name?",
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

export default function ForgotPassword() {
  const navigate = useNavigate();

  const questions = useMemo(() => pickThreeRandom(ALL_QUESTIONS), []);
  const [form, setForm] = useState({
    email: "",
    userId: "",
    q0: "",
    q1: "",
    q2: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function onCancel() {
    setForm({
      email: "",
      userId: "",
      q0: "",
      q1: "",
      q2: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    setOk("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await api.post("/auth/forgot-password/", {
         email: form.email,
         username: form.userId,
         answers: [form.q0, form.q1, form.q2],
         new_password: form.newPassword,
      });

      setOk("If the information matches our records, you’ll receive instructions shortly.");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setError("We could not process your request. Please try again.");
    }
  }

  return (
    <AuthLayout title="FlowCounts" subtitle="Forgot Your Password? No Worries!">
      <form onSubmit={onSubmit} className="auth-row">
        {error && <div style={{ color: "crimson" }}>{error}</div>}
        {ok && <div style={{ color: "green" }}>{ok}</div>}

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
          placeholder="User ID"
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
          required
        />

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

        <input
          className="auth-input"
          placeholder="New password"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          required
        />

        <input
          className="auth-input"
          placeholder="Confirm new password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        <div className="auth-actions">
          <button className="auth-button" type="submit">Request Reset</button>
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
