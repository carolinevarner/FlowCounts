import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api";

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
  const [step, setStep] = useState(1); 

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

  async function verifyIdentity(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!form.email || !form.userId) {
      setError("Please enter both your email address and username.");
      return;
    }

    try {
      const response = await api.post("/auth/get-username/", {
        email: form.email,
        username: form.userId,  
      });
      
      setStep(2);
      setQuestions(response.data.security_questions);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("No user found with this email address.");
      } else if (err.response?.status === 400 && err.response?.data?.detail?.includes("Security questions not set")) {
        setError("Security questions not set for this user. Please contact your administrator.");
      } else {
        setError("We could not verify your identity. Please check your email and username.");
      }
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    const passwordErrors = validatePassword(form.newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(". ") + ".");
      return;
    }

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
      <form onSubmit={step === 1 ? verifyIdentity : onSubmit} className="auth-row">
        {error && <div style={{ color: "#c1121f", marginBottom: "12px", padding: "12px", backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "6px" }}>{error}</div>}
        {ok && <div style={{ color: "green" }}>{ok}</div>}

        {step === 1 ? (
          <>
            <div className="auth-row">
              <label>Step 1: Verify your identity</label>
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
              placeholder="Username"
              type="text"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              required
            />

            <button className="auth-button" type="submit">Verify Identity</button>
            
            <button className="auth-button cancel" type="button" onClick={onCancel} style={{ maxWidth: '200px', margin: '0 auto' }}>Cancel</button>
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

            <button className="auth-button" type="submit">Reset Password</button>
            
            <button className="auth-button cancel" type="button" onClick={onCancel} style={{ maxWidth: '200px', margin: '0 auto' }}>Cancel</button>
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
