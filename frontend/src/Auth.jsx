import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { loginUser, registerUser, getErrorMessage, isAuthenticated } from "./api.jsx";
import { Alert } from "./Dashboard.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL = { name: "", email: "", password: "", confirmPassword: "" };

const CSS = `
.auth-page{min-height:100vh;display:grid;place-items:center;padding:16px;background:#f8fafc;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;color:#0f172a}
.auth-page *{box-sizing:border-box}
.auth-card{width:100%;max-width:420px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,.08);padding:28px}
.auth-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:#312e81;margin-bottom:4px}
.auth-logo{width:34px;height:34px;border-radius:8px;background:#4f46e5;color:#fff;display:grid;place-items:center}
.auth-tabs{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;border-radius:8px;padding:4px;margin:20px 0}
.auth-tabs button{border:0;background:transparent;padding:8px;border-radius:6px;font:inherit;font-weight:600;color:#475569;cursor:pointer}
.auth-tabs button[aria-selected="true"]{background:#fff;color:#4338ca;box-shadow:0 1px 2px rgba(15,23,42,.1)}
.auth-page :focus-visible{outline:2px solid #4f46e5;outline-offset:2px}
.auth-page .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.auth-page .field label{font-weight:500}
.auth-page .input{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
.auth-page .input.invalid{border-color:#dc2626}
.auth-page .field-error{color:#b91c1c;font-size:12px}
.auth-page .btn-primary{width:100%;padding:10px;border-radius:8px;border:0;background:#4f46e5;color:#fff;font:inherit;font-weight:600;cursor:pointer}
.auth-page .btn-primary:hover{background:#4338ca}
.auth-page .btn-primary:disabled{opacity:.6;cursor:not-allowed}
.auth-page .alert{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:8px;margin-bottom:16px}
.auth-page .alert-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.auth-page .icon-btn{border:0;background:transparent;cursor:pointer;display:inline-flex}
`;

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  const isRegister = mode === "register";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setApiError("");
    setForm(INITIAL);
  };

  const validate = () => {
    const v = {};
    if (isRegister && !form.name.trim()) v.name = "Name is required.";
    if (!form.email.trim()) v.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) v.email = "Enter a valid email address.";
    if (!form.password) v.password = "Password is required.";
    else if (isRegister && form.password.length < 6) v.password = "Password must be at least 6 characters.";
    if (isRegister && form.confirmPassword !== form.password) v.confirmPassword = "Passwords do not match.";
    return v;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setApiError("");
    try {
      if (isRegister) {
        await registerUser({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      } else {
        await loginUser({ email: form.email.trim(), password: form.password });
      }
      // api.jsx only resolves when a token was returned and saved
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err, isRegister ? "Could not create your account." : "Could not log you in."));
      setSubmitting(false);
    }
  };

  const field = (id, label, key, type = "text", autoComplete) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} className={`input ${errors[key] ? "invalid" : ""}`} value={form[key]} onChange={set(key)} aria-invalid={!!errors[key]} aria-describedby={`${id}-err`} />
      {errors[key] && <span className="field-error" id={`${id}-err`}>{errors[key]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <style>{CSS}</style>
      <div className="auth-card">
        <div className="auth-brand"><span className="auth-logo"><TrendingUp size={18} /></span>SimpleCRM</div>
        <p style={{ margin: 0, color: "#64748b" }}>{isRegister ? "Create an account to manage your leads." : "Log in to manage your leads."}</p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode("login")}>Log in</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode("register")}>Register</button>
        </div>

        <Alert onClose={() => setApiError("")}>{apiError}</Alert>

        <form onSubmit={submit} noValidate>
          {isRegister && field("a-name", "Name", "name", "text", "name")}
          {field("a-email", "Email", "email", "email", "email")}
          {field("a-password", "Password", "password", "password", isRegister ? "new-password" : "current-password")}
          {isRegister && field("a-confirm", "Confirm password", "confirmPassword", "password", "new-password")}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (isRegister ? "Creating account..." : "Logging in...") : isRegister ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
