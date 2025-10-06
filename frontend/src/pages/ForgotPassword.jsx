import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
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
  const [step, setStep] = useState(1); // 1: email/username, 2: security questions

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
    setStep(1);
    setQuestions([]);
  }

  async function fetchUsername(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!form.email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      const response = await api.post("/auth/get-username/", {
        email: form.email,
      });
      
      // Username found, auto-fill it and proceed to step 2
      setForm({ ...form, userId: response.data.username });
      setStep(2);
      // For now, use placeholder questions - in a real implementation, 
      // you'd want to get the actual questions from the backend
      setQuestions([
        "What is your favorite color?",
        "What was the name of your first pet?",
        "What city were you born in?"
      ]);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("No user found with this email address.");
      } else {
        setError("We could not verify your email address. Please try again.");
      }
    }
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

      setOk("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail?.includes("Security answers do not match")) {
        setError("Security answers do not match. Please try again.");
      } else {
        setError("We could not reset your password. Please try again.");
      }
    }
  }

  return (
    <AuthLayout title="FlowCounts" subtitle="Forgot Your Password? No Worries!">
      <form onSubmit={step === 1 ? fetchUsername : onSubmit} className="auth-row">
        {error && <div style={{ color: "crimson" }}>{error}</div>}
        {ok && <div style={{ color: "green" }}>{ok}</div>}

        {step === 1 ? (
          <>
            <div className="auth-row">
              <label>Step 1: Enter your email address</label>
            </div>

            <input
              className="auth-input"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div className="auth-actions">
              <button className="auth-button" type="submit">Continue</button>
              <button className="auth-button secondary" type="button" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-row">
              <label>Step 2: Answer security questions</label>
            </div>

            <div className="auth-row">
              <label>Email: {form.email}</label>
            </div>
            
            <div className="auth-row">
              <label>Username: {form.userId}</label>
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
              <button className="auth-button" type="submit">Reset Password</button>
              <button className="auth-button secondary" type="button" onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login"><button type="button" className="auth-linkbtn">Login</button></Link>
        </div>
      </form>
    </AuthLayout>
  );
}
