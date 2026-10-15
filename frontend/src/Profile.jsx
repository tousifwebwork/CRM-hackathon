import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { getProfile, updateProfile, changePassword, logoutUser, getErrorMessage } from "./api.jsx";
import { Layout, Modal, Alert, Spinner, buttonClass, fieldClass, inputClass, modalActionsClass, surfaceClass } from "./Dashboard.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [info, setInfo] = useState({ name: "", email: "" });
  const [infoErrors, setInfoErrors] = useState({});
  const [infoMsg, setInfoMsg] = useState({ type: "", text: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [savingPw, setSavingPw] = useState(false);

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getProfile();
        if (active) setInfo({ name: user?.name || "", email: user?.email || "" });
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err, "Could not load your profile."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const saveInfo = async (e) => {
    e.preventDefault();
    if (savingInfo) return;
    const v = {};
    if (!info.name.trim()) v.name = "Name is required.";
    if (!info.email.trim()) v.email = "Email is required.";
    else if (!EMAIL_RE.test(info.email.trim())) v.email = "Enter a valid email address.";
    setInfoErrors(v);
    if (Object.keys(v).length) return;

    setSavingInfo(true);
    setInfoMsg({ type: "", text: "" });
    try {
      const { message, user } = await updateProfile({ name: info.name.trim(), email: info.email.trim() });
      if (user) setInfo({ name: user.name || info.name, email: user.email || info.email });
      setInfoMsg({ type: "success", text: message || "Profile updated." });
    } catch (err) {
      setInfoMsg({ type: "error", text: getErrorMessage(err, "Could not update your profile.") });
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (savingPw) return;
    const v = {};
    if (!pw.currentPassword) v.currentPassword = "Enter your current password.";
    if (pw.newPassword.length < 6) v.newPassword = "New password must be at least 6 characters.";
    else if (pw.newPassword === pw.currentPassword) v.newPassword = "New password must be different from the current one.";
    if (pw.confirmPassword !== pw.newPassword) v.confirmPassword = "Passwords do not match.";
    setPwErrors(v);
    if (Object.keys(v).length) return;

    setSavingPw(true);
    setPwMsg({ type: "", text: "" });
    try {
      const data = await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwMsg({ type: "success", text: data?.message || "Password changed." });
    } catch (err) {
      setPwMsg({ type: "error", text: getErrorMessage(err, "Could not change your password.") });
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch {
      /* logoutUser clears local auth even when the server call fails */
    }
    navigate("/login", { replace: true });
  };

  const setP = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  const pwField = (id, label, key, autoComplete) => (
    <div className={fieldClass}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input id={id} type="password" autoComplete={autoComplete} className={inputClass(!!pwErrors[key])} value={pw[key]} onChange={setP(key)} aria-invalid={!!pwErrors[key]} aria-describedby={`${id}-err`} />
      {pwErrors[key] && <span className="text-xs font-medium text-rose-600" id={`${id}-err`}>{pwErrors[key]}</span>}
    </div>
  );

  return (
    <Layout title="Profile">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Workspace</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Profile & security</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account details and keep your workspace secure.</p>
      </div>
      {loading ? (
        <Spinner label="Loading profile..." />
      ) : loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <div className="grid max-w-3xl gap-5">
          <section className={`${surfaceClass} p-5 sm:p-6`} aria-labelledby="info-h">
            <div className="mb-5 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><UserRound size={18} /></span>
              <div><h2 id="info-h" className="font-semibold text-slate-950">Profile information</h2><p className="mt-1 text-sm text-slate-500">The name and email your team sees.</p></div>
            </div>
            <Alert type={infoMsg.type || "error"} onClose={() => setInfoMsg({ type: "", text: "" })}>{infoMsg.text}</Alert>
            <form onSubmit={saveInfo} noValidate>
              <div className={fieldClass}>
                <label htmlFor="p-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                <input id="p-name" className={inputClass(!!infoErrors.name)} value={info.name} onChange={(e) => setInfo((i) => ({ ...i, name: e.target.value }))} aria-invalid={!!infoErrors.name} aria-describedby="p-name-err" />
                {infoErrors.name && <span className="text-xs font-medium text-rose-600" id="p-name-err">{infoErrors.name}</span>}
              </div>
              <div className={`${fieldClass} mt-4`}>
                <label htmlFor="p-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input id="p-email" type="email" className={inputClass(!!infoErrors.email)} value={info.email} onChange={(e) => setInfo((i) => ({ ...i, email: e.target.value }))} aria-invalid={!!infoErrors.email} aria-describedby="p-email-err" />
                {infoErrors.email && <span className="text-xs font-medium text-rose-600" id="p-email-err">{infoErrors.email}</span>}
              </div>
              <div className="mt-5 flex justify-end"><button type="submit" className={buttonClass("primary")} disabled={savingInfo}><Save size={16} /> {savingInfo ? "Saving..." : "Save changes"}</button></div>
            </form>
          </section>

          <section className={`${surfaceClass} p-5 sm:p-6`} aria-labelledby="pw-h">
            <div className="mb-5 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck size={18} /></span>
              <div><h2 id="pw-h" className="font-semibold text-slate-950">Change password</h2><p className="mt-1 text-sm text-slate-500">Use a strong password you do not reuse elsewhere.</p></div>
            </div>
            <Alert type={pwMsg.type || "error"} onClose={() => setPwMsg({ type: "", text: "" })}>{pwMsg.text}</Alert>
            <form onSubmit={savePassword} noValidate>
              {pwField("pw-current", "Current password", "currentPassword", "current-password")}
              <div className="mt-4">{pwField("pw-new", "New password", "newPassword", "new-password")}</div>
              <div className="mt-4">{pwField("pw-confirm", "Confirm new password", "confirmPassword", "new-password")}</div>
              <div className="mt-5 flex justify-end"><button type="submit" className={buttonClass("primary")} disabled={savingPw}><KeyRound size={16} /> {savingPw ? "Updating..." : "Update password"}</button></div>
            </form>
          </section>

          <section className={`${surfaceClass} flex items-center justify-between gap-4 p-5 sm:p-6`} aria-labelledby="out-h">
            <div><h2 id="out-h" className="font-semibold text-slate-950">Session</h2><p className="mt-1 text-sm text-slate-500">Log out of this device.</p></div>
            <button className={buttonClass()} onClick={() => setConfirmLogout(true)}><LogOut size={16} /> Log out</button>
          </section>
        </div>
      )}

      {confirmLogout && (
        <Modal title="Log out" onClose={() => !loggingOut && setConfirmLogout(false)}>
          <p>Are you sure you want to log out?</p>
          <div className={modalActionsClass}>
            <button className={buttonClass()} onClick={() => setConfirmLogout(false)} disabled={loggingOut}>Cancel</button>
            <button className={buttonClass("danger")} onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Log out"}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
