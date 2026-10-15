import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, UserCircle, Bell, Menu, X, LogOut,
  Plus, AlertCircle, CheckCircle2, Loader2, Inbox, TrendingUp, ChevronDown,
  ArrowUpRight, UserPlus, PhoneCall, BadgeCheck, RefreshCw,
} from "lucide-react";
import { getLeads, getServices, getErrorMessage, useAuth, getStoredUser, logoutUser } from "./api.jsx";

/* =====================================================================
   Shared UI (imported by Leads, Services and Profile from "./Dashboard.jsx")
   ===================================================================== */

// Kept for backwards compatibility with other pages that read bg/fg values.
export const STATUS_STYLES = {
  New: { bg: "#e0e7ff", fg: "#3730a3" },
  Contacted: { bg: "#fef3c7", fg: "#92400e" },
  Qualified: { bg: "#cffafe", fg: "#155e75" },
  Converted: { bg: "#dcfce7", fg: "#166534" },
  Lost: { bg: "#fee2e2", fg: "#991b1b" },
  Active: { bg: "#dcfce7", fg: "#166534" },
  Inactive: { bg: "#f1f5f9", fg: "#475569" },
};

const BADGE_CLASSES = {
  New: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  Contacted: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Qualified: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  Converted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Lost: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const DOT_CLASSES = {
  New: "bg-indigo-500",
  Contacted: "bg-amber-500",
  Qualified: "bg-cyan-500",
  Converted: "bg-emerald-500",
  Lost: "bg-rose-500",
};

export const getId = (item) => item?._id || item?.id;

export function StatusBadge({ status }) {
  const cls = BADGE_CLASSES[status] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || "Unknown"}
    </span>
  );
}

export function Spinner({ label = "Loading..." }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 px-4 py-16 text-sm text-slate-500">
      <Loader2 className="animate-spin text-indigo-600 motion-reduce:animate-none" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function Alert({ type = "error", children, onClose }) {
  if (!children) return null;
  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss message"
          className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={24} />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {text && <p className="max-w-xs text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =====================================================================
   Layout: sidebar + top bar + auth guard. Wrap every protected page in it.
   ===================================================================== */

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/services", label: "Services", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export const inputClass = (invalid = false) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    invalid
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
  }`;

export const buttonClass = (variant = "secondary") =>
  `inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${
    variant === "primary"
      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
      : variant === "danger"
        ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700"
        : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
  }`;

export const iconButtonClass =
  `inline-grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 ${focusRing}`;

export const surfaceClass = "rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40";
export const fieldClass = "space-y-1.5";
export const modalActionsClass = "mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4";

export function Layout({ title, children }) {
  const navigate = useNavigate();
  const token = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const user = getStoredUser();

  useEffect(() => {
    const onUnauthorized = () => navigate("/login", { replace: true });
    window.addEventListener("crm:unauthorized", onUnauthorized);
    return () => window.removeEventListener("crm:unauthorized", onUnauthorized);
  }, [navigate]);

  useEffect(() => {
    document.title = `${title} | CRM`;
  }, [title]);

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!token) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    if (!window.confirm("Log out of your account?")) return;
    try {
      await logoutUser();
    } catch {
      /* local auth is cleared even if the server call fails */
    }
    navigate("/login", { replace: true });
  };

  const initial = (user?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-sm text-slate-900 antialiased">
      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-900/40">
              <TrendingUp size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight">SimpleCRM</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className={`rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-xs font-medium text-slate-500">Workspace</p>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} ${
                  isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name || "Account"}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className={`rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden ${focusRing}`}
          >
            <Menu size={20} />
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h1>

          <button
            aria-label="Notifications"
            className={`relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
          >
            <Bell size={20} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label="Open profile menu"
              className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 ${focusRing}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {initial}
              </span>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${menu ? "rotate-180" : ""}`} />
            </button>

            {menu && (
              <div
                role="menu"
                className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name || "Account"}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <UserCircle size={16} /> Profile
                  </Link>
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/* =====================================================================
   Dashboard page
   ===================================================================== */

const PIPELINE = ["New", "Contacted", "Qualified", "Converted", "Lost"];

const STAT_TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
};

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 " + focusRing;
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 " + focusRing;

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function StatCardSkeleton() {
  return <div className="h-[104px] animate-pulse rounded-xl border border-slate-200 bg-white motion-reduce:animate-none" />;
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [l, s] = await Promise.all([getLeads(), getServices()]);
      setLeads(l);
      setServices(s);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when the chatbot changes data
  useEffect(() => {
    window.addEventListener("crm:data-changed", load);
    return () => window.removeEventListener("crm:data-changed", load);
  }, [load]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(PIPELINE.map((s) => [s, 0]));
    leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status] += 1; });
    return c;
  }, [leads]);

  const recent = useMemo(
    () => [...leads].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    [leads]
  );

  const conversionRate = leads.length ? Math.round((counts.Converted / leads.length) * 100) : 0;

  const stats = [
    { label: "Total leads", value: leads.length, icon: Users, tone: "indigo" },
    { label: "New leads", value: counts.New, icon: UserPlus, tone: "sky" },
    { label: "Contacted", value: counts.Contacted, icon: PhoneCall, tone: "amber" },
    { label: "Converted", value: counts.Converted, icon: BadgeCheck, tone: "emerald", hint: leads.length ? `${conversionRate}% conversion` : null },
    { label: "Services", value: services.length, icon: Briefcase, tone: "violet" },
  ];

  const firstName = (getStoredUser()?.name || "").split(" ")[0];

  return (
    <Layout title="Dashboard">
      {error ? (
        <div className="mx-auto max-w-xl py-10">
          <Alert>{error}</Alert>
          <button className={btnSecondary} onClick={load}>
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </h2>
              <p className="mt-0.5 text-slate-500">Here is where your leads and services stand today.</p>
            </div>
            <div className="flex gap-2.5">
              <Link to="/leads" className={btnSecondary}>View all leads</Link>
              <Link to="/leads?new=1" className={btnPrimary}><Plus size={16} /> Add lead</Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
              : stats.map(({ label, value, icon: Icon, tone, hint }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${STAT_TONES[tone]}`}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
                    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
                  </div>
                ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent leads */}
            <section aria-labelledby="recent-h" className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 id="recent-h" className="text-base font-semibold text-slate-900">Recent leads</h2>
                <Link to="/leads" className={`inline-flex items-center gap-1 rounded text-sm font-medium text-indigo-600 hover:text-indigo-700 ${focusRing}`}>
                  See all <ArrowUpRight size={14} />
                </Link>
              </div>

              {loading ? (
                <Spinner label="Loading recent leads..." />
              ) : recent.length === 0 ? (
                <EmptyState
                  title="No leads yet"
                  text="Add your first lead to start tracking your pipeline."
                  action={<Link to="/leads?new=1" className={btnPrimary}><Plus size={16} /> Add lead</Link>}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="text-xs font-medium text-slate-500">
                        <th className="px-5 py-3 font-medium">Lead</th>
                        <th className="px-3 py-3 font-medium">Company</th>
                        <th className="px-3 py-3 font-medium">Service</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recent.map((l) => (
                        <tr key={getId(l)} className="transition-colors hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {initials(l.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">{l.name}</p>
                                <p className="truncate text-xs text-slate-500">{l.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{l.company || "-"}</td>
                          <td className="px-3 py-3 text-slate-600">{l.service || "-"}</td>
                          <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Pipeline */}
            <section aria-labelledby="pipe-h" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 id="pipe-h" className="text-base font-semibold text-slate-900">Pipeline</h2>
              <p className="mt-0.5 text-xs text-slate-500">Leads by stage</p>

              {loading ? (
                <Spinner label="Loading pipeline..." />
              ) : leads.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">Your pipeline shows up here once you add leads.</p>
              ) : (
                <>
                  {/* Segmented overview */}
                  <div
                    className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={PIPELINE.map((s) => `${s}: ${counts[s]}`).join(", ")}
                  >
                    {PIPELINE.map((s) =>
                      counts[s] ? (
                        <div
                          key={s}
                          className={DOT_CLASSES[s]}
                          style={{ width: `${(counts[s] / leads.length) * 100}%` }}
                        />
                      ) : null
                    )}
                  </div>

                  <ul className="mt-5 space-y-3">
                    {PIPELINE.map((s) => {
                      const pct = Math.round((counts[s] / leads.length) * 100);
                      return (
                        <li key={s} className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[s]}`} />
                          <span className="flex-1 text-slate-700">{s}</span>
                          <span className="text-xs tabular-nums text-slate-400">{pct}%</span>
                          <span className="w-8 text-right font-semibold tabular-nums text-slate-900">{counts[s]}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </Layout>
  );
}