import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { getProfile, updateProfile, changePassword, logoutUser, getErrorMessage } from "./api.jsx";
import { Layout, Modal, Alert, Spinner } from "./Dashboard.jsx";

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
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" autoComplete={autoComplete} className={`input ${pwErrors[key] ? "invalid" : ""}`} value={pw[key]} onChange={setP(key)} aria-invalid={!!pwErrors[key]} aria-describedby={`${id}-err`} />
      {pwErrors[key] && <span className="field-error" id={`${id}-err`}>{pwErrors[key]}</span>}
    </div>
  );

  return (
    <Layout title="Profile">
      {loading ? (
        <Spinner label="Loading profile..." />
      ) : loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <div className="grid" style={{ maxWidth: 640 }}>
          <section className="card" aria-labelledby="info-h">
            <h2 id="info-h" style={{ fontSize: 16, marginBottom: 14 }}>Profile information</h2>
            <Alert type={infoMsg.type || "error"} onClose={() => setInfoMsg({ type: "", text: "" })}>{infoMsg.text}</Alert>
            <form onSubmit={saveInfo} noValidate>
              <div className="field">
                <label htmlFor="p-name">Name</label>
                <input id="p-name" className={`input ${infoErrors.name ? "invalid" : ""}`} value={info.name} onChange={(e) => setInfo((i) => ({ ...i, name: e.target.value }))} aria-invalid={!!infoErrors.name} aria-describedby="p-name-err" />
                {infoErrors.name && <span className="field-error" id="p-name-err">{infoErrors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="p-email">Email</label>
                <input id="p-email" type="email" className={`input ${infoErrors.email ? "invalid" : ""}`} value={info.email} onChange={(e) => setInfo((i) => ({ ...i, email: e.target.value }))} aria-invalid={!!infoErrors.email} aria-describedby="p-email-err" />
                {infoErrors.email && <span className="field-error" id="p-email-err">{infoErrors.email}</span>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingInfo}>{savingInfo ? "Saving..." : "Save changes"}</button>
            </form>
          </section>

          <section className="card" aria-labelledby="pw-h">
            <h2 id="pw-h" style={{ fontSize: 16, marginBottom: 14 }}>Change password</h2>
            <Alert type={pwMsg.type || "error"} onClose={() => setPwMsg({ type: "", text: "" })}>{pwMsg.text}</Alert>
            <form onSubmit={savePassword} noValidate>
              {pwField("pw-current", "Current password", "currentPassword", "current-password")}
              {pwField("pw-new", "New password", "newPassword", "new-password")}
              {pwField("pw-confirm", "Confirm new password", "confirmPassword", "new-password")}
              <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? "Updating..." : "Update password"}</button>
            </form>
          </section>

          <section className="card" aria-labelledby="out-h">
            <h2 id="out-h" style={{ fontSize: 16, marginBottom: 6 }}>Session</h2>
            <p className="muted" style={{ marginTop: 0 }}>Log out of this device.</p>
            <button className="btn" onClick={() => setConfirmLogout(true)}><LogOut size={16} /> Log out</button>
          </section>
        </div>
      )}

      {confirmLogout && (
        <Modal title="Log out" onClose={() => !loggingOut && setConfirmLogout(false)}>
          <p>Are you sure you want to log out?</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmLogout(false)} disabled={loggingOut}>Cancel</button>
            <button className="btn btn-danger" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Log out"}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
