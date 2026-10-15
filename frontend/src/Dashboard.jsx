import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, UserCircle, Bell, Menu, X, LogOut,
  Plus, AlertCircle, CheckCircle2, Loader2, Inbox, TrendingUp,
} from "lucide-react";
import { getLeads, getServices, getErrorMessage, isAuthenticated, getStoredUser, logoutUser } from "./api.jsx";

/* =====================================================================
   Shared UI (imported by Leads, Services and Profile from "./Dashboard.jsx")
   ===================================================================== */

export const STATUS_STYLES = {
  New: { bg: "#e0e7ff", fg: "#3730a3" },
  Contacted: { bg: "#fef3c7", fg: "#92400e" },
  Qualified: { bg: "#cffafe", fg: "#155e75" },
  Converted: { bg: "#dcfce7", fg: "#166534" },
  Lost: { bg: "#fee2e2", fg: "#991b1b" },
  Active: { bg: "#dcfce7", fg: "#166534" },
  Inactive: { bg: "#f1f5f9", fg: "#475569" },
};

export const getId = (item) => item?._id || item?.id;

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: "#f1f5f9", fg: "#475569" };
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{status || "Unknown"}</span>;
}

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="center-box" role="status">
      <Loader2 className="spin" size={22} /> <span>{label}</span>
    </div>
  );
}

export function Alert({ type = "error", children, onClose }) {
  if (!children) return null;
  const Icon = type === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <Icon size={18} />
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button className="icon-btn" onClick={onClose} aria-label="Dismiss message"><X size={16} /></button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="center-box" style={{ flexDirection: "column", textAlign: "center" }}>
      <Inbox size={32} color="#94a3b8" />
      <strong>{title}</strong>
      {text && <span className="muted">{text}</span>}
      {action}
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
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CSS = `
.crm{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.5}
.crm *{box-sizing:border-box}
.crm h1,.crm h2,.crm h3{margin:0}
.side{position:fixed;top:0;bottom:0;left:0;width:240px;background:#fff;border-right:1px solid #e2e8f0;padding:20px 12px;z-index:40;transition:transform .2s}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;padding:0 10px 20px;color:#312e81}
.brand span.logo{width:32px;height:32px;border-radius:8px;background:#4f46e5;color:#fff;display:grid;place-items:center}
.nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:#475569;text-decoration:none;font-weight:500;margin-bottom:4px}
.nav a:hover{background:#f1f5f9}
.nav a.active{background:#eef2ff;color:#4338ca}
.main{margin-left:240px}
.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;height:60px;padding:0 24px;background:#fff;border-bottom:1px solid #e2e8f0}
.top h1{font-size:18px;flex:1}
.menu-btn{display:none}
.content{padding:24px;max-width:1200px;margin:0 auto}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.05);padding:20px}
.grid{display:grid;gap:16px}
.grid-stats{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.grid-2{grid-template-columns:2fr 1fr}
.grid-cards{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.muted{color:#64748b}
.stat-label{color:#64748b;font-size:13px;display:flex;align-items:center;gap:6px}
.stat-value{font-size:28px;font-weight:700;margin-top:4px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font:inherit;font-weight:500;cursor:pointer;text-decoration:none}
.btn:hover{background:#f8fafc}
.btn:disabled{opacity:.6;cursor:not-allowed}
.btn-primary{background:#4f46e5;border-color:#4f46e5;color:#fff}
.btn-primary:hover{background:#4338ca}
.btn-danger{background:#dc2626;border-color:#dc2626;color:#fff}
.btn-danger:hover{background:#b91c1c}
.icon-btn{border:0;background:transparent;padding:6px;border-radius:6px;cursor:pointer;color:#475569;display:inline-flex}
.icon-btn:hover{background:#f1f5f9}
.crm :focus-visible{outline:2px solid #4f46e5;outline-offset:2px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.field label{font-weight:500}
.input{width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;background:#fff;color:#0f172a}
.input.invalid{border-color:#dc2626}
.field-error{color:#b91c1c;font-size:12px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
.table-wrap{overflow-x:auto}
table.table{width:100%;border-collapse:collapse}
.table th{text-align:left;font-size:12px;color:#64748b;font-weight:600;padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap}
.table td{padding:12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.alert{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:8px;margin-bottom:16px}
.alert-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.alert-success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.center-box{display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 16px;color:#475569}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
.toolbar .input{width:auto;min-width:150px}
.toolbar .grow{flex:1;min-width:200px}
.page-head{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:16px}
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:grid;place-items:center;padding:16px;z-index:60}
.modal{background:#fff;border-radius:12px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;padding:20px}
.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.bar-row .name{width:84px}
.bar-track{flex:1;height:10px;background:#f1f5f9;border-radius:999px;overflow:hidden}
.bar-fill{height:100%;background:#4f46e5;border-radius:999px}
.profile-menu{position:relative}
.dropdown{position:absolute;right:0;top:46px;width:200px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.12);padding:6px;z-index:50}
.dropdown a,.dropdown button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;background:none;font:inherit;color:#0f172a;text-decoration:none;border-radius:6px;cursor:pointer}
.dropdown a:hover,.dropdown button:hover{background:#f1f5f9}
.avatar{width:34px;height:34px;border-radius:50%;background:#e0e7ff;color:#3730a3;display:grid;place-items:center;font-weight:700;border:0;cursor:pointer}
.scrim{display:none}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){
 .side{transform:translateX(-100%)}
 .side.open{transform:none}
 .scrim.open{display:block;position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:35}
 .main{margin-left:0}
 .menu-btn{display:inline-flex}
 .grid-2{grid-template-columns:1fr}
 .top{padding:0 14px}
 .content{padding:16px}
}
@media(max-width:560px){.form-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.spin,.side{animation:none;transition:none}}
`;

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/services", label: "Services", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

/* Layout: sidebar + top bar + auth guard. Wrap every protected page in it. */
export function Layout({ title, children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const user = getStoredUser();

  useEffect(() => {
    const onUnauthorized = () => navigate("/login", { replace: true });
    window.addEventListener("crm:unauthorized", onUnauthorized);
    return () => window.removeEventListener("crm:unauthorized", onUnauthorized);
  }, [navigate]);

  useEffect(() => {
    document.title = `${title} | CRM`;
  }, [title]);

  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    if (!window.confirm("Log out of your account?")) return;
    try {
      await logoutUser();
    } catch {
      /* local auth is cleared even if the server call fails */
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="crm">
      <style>{CSS}</style>
      <aside className={`side ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand"><span className="logo"><TrendingUp size={18} /></span>SimpleCRM</div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={`scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="top">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <h1>{title}</h1>
          <button className="icon-btn" aria-label="Notifications"><Bell size={20} /></button>
          <div className="profile-menu">
            <button className="avatar" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Open profile menu">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </button>
            {menu && (
              <div className="dropdown" role="menu">
                <div style={{ padding: "6px 10px" }}>
                  <strong>{user?.name || "Account"}</strong>
                  <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
                </div>
                <Link to="/profile" role="menuitem" onClick={() => setMenu(false)}><UserCircle size={16} /> Profile</Link>
                <button role="menuitem" onClick={handleLogout}><LogOut size={16} /> Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

/* =====================================================================
   Dashboard page
   ===================================================================== */

const PIPELINE = ["New", "Contacted", "Qualified", "Converted", "Lost"];

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

  const stats = [
    { label: "Total leads", value: leads.length, icon: Users },
    { label: "New leads", value: counts.New, icon: Plus },
    { label: "Contacted", value: counts.Contacted, icon: Bell },
    { label: "Converted", value: counts.Converted, icon: CheckCircle2 },
    { label: "Total services", value: services.length, icon: Briefcase },
  ];

  return (
    <Layout title="Dashboard">
      {loading ? (
        <Spinner label="Loading dashboard..." />
      ) : error ? (
        <>
          <Alert>{error}</Alert>
          <button className="btn" onClick={load}>Try again</button>
        </>
      ) : (
        <>
          <div className="page-head">
            <p className="muted" style={{ margin: 0 }}>Overview of your leads and services.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/leads?new=1" className="btn btn-primary"><Plus size={16} /> Add lead</Link>
              <Link to="/leads" className="btn">View all leads</Link>
            </div>
          </div>

          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            {stats.map(({ label, value, icon: Icon }) => (
              <div className="card" key={label}>
                <div className="stat-label"><Icon size={16} /> {label}</div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-2">
            <section className="card" aria-labelledby="recent-h">
              <div className="page-head" style={{ marginBottom: 8 }}>
                <h2 id="recent-h" style={{ fontSize: 16 }}>Recent leads</h2>
                <Link to="/leads" className="muted">See all</Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  title="No leads yet"
                  text="Add your first lead to start tracking your pipeline."
                  action={<Link to="/leads?new=1" className="btn btn-primary"><Plus size={16} /> Add lead</Link>}
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Company</th><th>Service</th><th>Status</th></tr></thead>
                    <tbody>
                      {recent.map((l) => (
                        <tr key={getId(l)}>
                          <td><strong>{l.name}</strong><div className="muted" style={{ fontSize: 12 }}>{l.email}</div></td>
                          <td>{l.company || "-"}</td>
                          <td>{l.service || "-"}</td>
                          <td><StatusBadge status={l.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card" aria-labelledby="pipe-h">
              <h2 id="pipe-h" style={{ fontSize: 16, marginBottom: 16 }}>Pipeline</h2>
              {leads.length === 0 ? (
                <p className="muted">The pipeline appears once you add leads.</p>
              ) : (
                PIPELINE.map((s) => (
                  <div className="bar-row" key={s}>
                    <span className="name">{s}</span>
                    <div className="bar-track" role="img" aria-label={`${s}: ${counts[s]} of ${leads.length}`}>
                      <div className="bar-fill" style={{ width: `${(counts[s] / leads.length) * 100}%`, background: STATUS_STYLES[s].fg }} />
                    </div>
                    <strong>{counts[s]}</strong>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}
    </Layout>
  );
}