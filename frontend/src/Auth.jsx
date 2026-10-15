import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  TrendingUp, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, X,
  Users, BarChart3, Bot, ArrowRight, ShieldCheck,
} from "lucide-react";
import { loginUser, registerUser, getErrorMessage, isAuthenticated } from "./api.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INITIAL = { name: "", email: "", password: "", confirmPassword: "" };

const FEATURES = [
  { icon: Users, title: "Track every lead", text: "Keep contacts, sources and notes in one place." },
  { icon: BarChart3, title: "See your pipeline", text: "Know what is new, contacted and converted at a glance." },
  { icon: Bot, title: "Built-in AI assistant", text: "Ask it to add leads or update their status for you." },
];

// Simple password strength score from 0 to 4
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-slate-200", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

function Field({ id, label, icon: Icon, type = "text", value, onChange, error, autoComplete, placeholder, trailing }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-lg border bg-white py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 ${
            trailing ? "pr-11" : "pr-3"
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  const isRegister = mode === "register";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchMode = (m) => {
    if (m === mode || submitting) return;
    setMode(m);
    setErrors({});
    setApiError("");
    setForm(INITIAL);
    setShowPw(false);
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

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPw((s) => !s)}
      aria-label={showPw ? "Hide password" : "Show password"}
      aria-pressed={showPw}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  const tabClass = (active) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="grid min-h-screen bg-slate-50 font-sans text-slate-900 lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <aside className="hidden flex-col justify-between bg-indigo-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          SimpleCRM
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Manage leads. Close more deals.</h2>
          <p className="mt-4 text-indigo-100">A lightweight CRM for small teams, with an AI assistant that works inside your pipeline.</p>

          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-indigo-100">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-sm text-indigo-200">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Your data is private to your account.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 text-xl font-bold text-indigo-900 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            SimpleCRM
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isRegister ? "Start tracking your leads in minutes." : "Log in to continue to your dashboard."}
            </p>

            <div role="tablist" aria-label="Authentication mode" className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode("login")} className={tabClass(!isRegister)}>
                Log in
              </button>
              <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode("register")} className={tabClass(isRegister)}>
                Register
              </button>
            </div>

            {apiError && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{apiError}</span>
                <button
                  type="button"
                  onClick={() => setApiError("")}
                  aria-label="Dismiss error"
                  className="rounded p-0.5 text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <form onSubmit={submit} noValidate className="mt-5 space-y-4">
              {isRegister && (
                <Field id="a-name" label="Full name" icon={User} value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" placeholder="Asha Kumar" />
              )}
              <Field id="a-email" label="Email" icon={Mail} type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" placeholder="you@company.com" />
              <Field
                id="a-password"
                label="Password"
                icon={Lock}
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                error={errors.password}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 6 characters" : "Your password"}
                trailing={eyeButton}
              />

              {isRegister && form.password && (
                <div aria-live="polite">
                  <div className="flex gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${strength >= i ? STRENGTH_COLORS[strength] : "bg-slate-200"}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Password strength: <span className="font-medium text-slate-700">{STRENGTH_LABELS[strength]}</span></p>
                </div>
              )}

              {isRegister && (
                <Field
                  id="a-confirm"
                  label="Confirm password"
                  icon={Lock}
                  type={showPw ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    {isRegister ? "Creating account..." : "Logging in..."}
                  </>
                ) : (
                  <>
                    {isRegister ? "Create account" : "Log in"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {isRegister ? "Already have an account?" : "New to SimpleCRM?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? "login" : "register")}
                className="font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline"
              >
                {isRegister ? "Log in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}