import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

const SECURITY_QUESTIONS = [
  "What is your favorite color?",
  "What was the name of your first pet?",
  "What city were you born in?",
];



export default function Signup() {
  const questions = SECURITY_QUESTIONS;
  
  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    address: "",
    dob: "",
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
      q0: "",
      q1: "",
      q2: "",
    });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

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

      navigate("/login", { state: { message: "Registration request submitted successfully! You will receive an email with your login credentials once your request is approved by an administrator." } });
    } catch (err) {
      console.log("signup error:", err.response?.data || err.message);

      let msg = "Could not submit registration request";
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
    <AuthLayout title="FlowCounts" subtitle="Request Access to FlowCounts">
      <form onSubmit={onSubmit} className="auth-row">
        {error && <div style={{ color: "#c00" }}>{error}</div>}
        
        <div style={{ 
          padding: "12px", 
          backgroundColor: "#e7f3ff", 
          border: "1px solid #b3d9ff", 
          borderRadius: "6px", 
          marginBottom: "16px",
          fontSize: "14px",
          color: "#004085"
        }}>
          <strong>📧 Important:</strong> After submitting your request, an administrator will review it. 
          Once approved, you will receive an email with your username and temporary password. 
          You will need to change your password on first login.
        </div>

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
