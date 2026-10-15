import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getLeads, createLead, updateLead, deleteLead, getServices, getErrorMessage } from "./api.jsx";
import {
  Layout, Modal, Alert, Spinner, EmptyState, StatusBadge, getId,
  buttonClass, fieldClass, iconButtonClass, inputClass, selectClass, textareaClass,
  labelClass, errorTextClass, modalActionsClass, surfaceClass,
} from "./Dashboard.jsx";

const STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"];
const SOURCES = ["Website", "Referral", "Social Media", "Email Campaign", "Cold Call", "Event", "Other"];
const EMPTY = { name: "", email: "", phone: "", company: "", service: "", source: "Website", status: "New", notes: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Full name is required.";
  if (!f.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (!f.source) e.source = "Choose a lead source.";
  if (!f.status) e.status = "Choose a status.";
  return e;
}

function LeadForm({ initial, serviceNames, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setApiError("");
    try {
      await onSubmit({ ...form, name: form.name.trim(), email: form.email.trim() });
    } catch (err) {
      setApiError(getErrorMessage(err, "Could not save the lead."));
      setSaving(false);
    }
  };

  const field = (id, label, input, error, optional = false) => (
    <div className={fieldClass}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={labelClass}>{label}</label>
        {optional && <span className="text-xs text-slate-400">Optional</span>}
      </div>
      {input}
      {error && <span className={errorTextClass} id={`${id}-err`}>{error}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <Alert>{apiError}</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("l-name", "Full name *", <input id="l-name" className={inputClass(!!errors.name)} placeholder="Jane Cooper" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="l-name-err" />, errors.name)}
        {field("l-email", "Email *", <input id="l-email" type="email" className={inputClass(!!errors.email)} placeholder="jane@company.com" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby="l-email-err" />, errors.email)}
        {field("l-phone", "Phone", <input id="l-phone" type="tel" className={inputClass()} placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />, null, true)}
        {field("l-company", "Company", <input id="l-company" className={inputClass()} placeholder="Company name" value={form.company} onChange={set("company")} />, null, true)}
        {field("l-service", "Service of interest", (
          <>
            <input id="l-service" className={inputClass()} placeholder="Type or pick a service" list="service-options" value={form.service} onChange={set("service")} />
            <datalist id="service-options">{serviceNames.map((n) => <option key={n} value={n} />)}</datalist>
          </>
        ), null, true)}
        {field("l-source", "Lead source *", (
          <select id="l-source" className={selectClass(!!errors.source)} value={form.source} onChange={set("source")}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ), errors.source)}
        {field("l-status", "Status *", (
          <select id="l-status" className={selectClass(!!errors.status)} value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ), errors.status)}
      </div>
      <div className="mt-4">
        {field("l-notes", "Notes", <textarea id="l-notes" rows={4} className={textareaClass()} placeholder="Add any context about this lead..." value={form.notes} onChange={set("notes")} />, null, true)}
      </div>
      <div className={modalActionsClass}>
        <button type="button" className={buttonClass()} onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className={buttonClass("primary")} disabled={saving}>{saving ? "Saving..." : initial?._id || initial?.id ? "Save changes" : "Add lead"}</button>
      </div>
    </form>
  );
}

export default function Leads() {
  const [params, setParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [serviceNames, setServiceNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [modal, setModal] = useState(params.get("new") === "1" ? { lead: null } : null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setLeads(await getLeads());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load leads."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Service names are only suggestions; failing to load them should not block the page
    getServices().then((s) => setServiceNames(s.map((x) => x.name).filter(Boolean))).catch(() => {});
  }, [load]);

  // Refresh when the chatbot changes data
  useEffect(() => {
    window.addEventListener("crm:data-changed", load);
    return () => window.removeEventListener("crm:data-changed", load);
  }, [load]);

  const closeModal = () => {
    setModal(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  const handleSave = async (data) => {
    const id = getId(modal.lead);
    if (id) await updateLead(id, data);
    else await createLead(data);
    closeModal();
    setSuccess(id ? "Lead updated." : "Lead added.");
    await load();
  };

  const handleStatus = async (lead, status) => {
    const id = getId(lead);
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      await updateLead(id, { ...lead, status });
      setSuccess(`${lead.name} marked as ${status}.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not change the status."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteLead(getId(toDelete));
      setToDelete(null);
      setSuccess("Lead deleted.");
      await load();
    } catch (err) {
      setToDelete(null);
      setError(getErrorMessage(err, "Could not delete the lead."));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchQ = !q || [l.name, l.email, l.company].some((v) => (v || "").toLowerCase().includes(q));
      return matchQ && (!statusFilter || l.status === statusFilter) && (!sourceFilter || l.source === sourceFilter);
    });
  }, [leads, query, statusFilter, sourceFilter]);

  const addButton = (
    <button className={buttonClass("primary")} onClick={() => setModal({ lead: null })}><Plus size={16} /> Add lead</button>
  );

  return (
    <Layout title="Leads">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Pipeline</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Leads</h2>
          <p className="mt-1 text-sm text-slate-500">{leads.length} total lead{leads.length === 1 ? "" : "s"} in your pipeline</p>
        </div>
        {addButton}
      </div>

      <Alert type="success" onClose={() => setSuccess("")}>{success}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className={`${surfaceClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass()} pl-9`} placeholder="Search name, email or company" aria-label="Search leads" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="sm:w-44">
            <select className={selectClass()} aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:w-44">
            <select className={selectClass()} aria-label="Filter by source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">All sources</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading leads..." />
        ) : leads.length === 0 ? (
          <EmptyState title="No leads yet" text="Add a lead to start building your pipeline." action={addButton} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matching leads" text="Try a different search or clear the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>{["Lead", "Phone", "Company", "Service", "Source", "Status", "Change status", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={getId(l)}>
                    <td className="px-5 py-4"><strong className="font-semibold text-slate-900">{l.name}</strong><div className="mt-0.5 text-xs text-slate-500">{l.email}</div></td>
                    <td className="px-5 py-4 text-slate-600">{l.phone || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{l.company || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{l.service || "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{l.source || "-"}</td>
                    <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                    <td className="px-5 py-4">
                      <div className="w-36">
                        <select className={selectClass()} aria-label={`Change status for ${l.name}`} value={l.status} disabled={busyId === getId(l)} onChange={(e) => handleStatus(l, e.target.value)}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <button className={iconButtonClass} aria-label={`Edit ${l.name}`} onClick={() => setModal({ lead: l })}><Pencil size={16} /></button>
                      <button className={`${iconButtonClass} text-rose-500 hover:bg-rose-50 hover:text-rose-600`} aria-label={`Delete ${l.name}`} onClick={() => setToDelete(l)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={getId(modal.lead) ? "Edit lead" : "Add lead"} onClose={closeModal}>
          <LeadForm initial={modal.lead} serviceNames={serviceNames} onSubmit={handleSave} onCancel={closeModal} />
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete lead" onClose={() => !deleting && setToDelete(null)}>
          <p>Delete <strong>{toDelete.name}</strong>? This cannot be undone.</p>
          <div className={modalActionsClass}>
            <button className={buttonClass()} onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
            <button className={buttonClass("danger")} onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete lead"}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
} 