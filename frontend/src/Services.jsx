import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getServices, createService, updateService, deleteService, getErrorMessage } from "./api.jsx";
import { Layout, Modal, Alert, Spinner, EmptyState, StatusBadge, getId, buttonClass, fieldClass, iconButtonClass, inputClass, modalActionsClass, surfaceClass } from "./Dashboard.jsx";

const EMPTY = { name: "", description: "", price: "", status: "Active" };

const formatPrice = (p) => {
  const n = Number(p);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "-";
};

function ServiceForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, price: initial?.price ?? "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const v = {};
    if (!form.name.trim()) v.name = "Service name is required.";
    if (form.price === "" || Number.isNaN(Number(form.price))) v.price = "Enter a price.";
    else if (Number(form.price) < 0) v.price = "Price cannot be negative.";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setApiError("");
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        status: form.status,
      });
    } catch (err) {
      setApiError(getErrorMessage(err, "Could not save the service."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Alert>{apiError}</Alert>
      <div className={fieldClass}>
        <label htmlFor="s-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service name *</label>
        <input id="s-name" className={inputClass(!!errors.name)} value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="s-name-err" />
        {errors.name && <span className="text-xs font-medium text-rose-600" id="s-name-err">{errors.name}</span>}
      </div>
      <div className={`${fieldClass} mt-4`}>
        <label htmlFor="s-desc" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
        <textarea id="s-desc" rows={3} className={inputClass()} value={form.description} onChange={set("description")} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="s-price" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price (USD) *</label>
          <input id="s-price" type="number" min="0" step="0.01" className={inputClass(!!errors.price)} value={form.price} onChange={set("price")} aria-invalid={!!errors.price} aria-describedby="s-price-err" />
          {errors.price && <span className="text-xs font-medium text-rose-600" id="s-price-err">{errors.price}</span>}
        </div>
        <div className={fieldClass}>
          <label htmlFor="s-status" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <select id="s-status" className={inputClass()} value={form.status} onChange={set("status")}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <div className={modalActionsClass}>
        <button type="button" className={buttonClass()} onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className={buttonClass("primary")} disabled={saving}>{saving ? "Saving..." : getId(initial) ? "Save changes" : "Add service"}</button>
      </div>
    </form>
  );
}

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setServices(await getServices());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load services."));
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

  const handleSave = async (data) => {
    const id = getId(modal.service);
    if (id) await updateService(id, data);
    else await createService(data);
    setModal(null);
    setSuccess(id ? "Service updated." : "Service added.");
    await load();
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteService(getId(toDelete));
      setToDelete(null);
      setSuccess("Service deleted.");
      await load();
    } catch (err) {
      setToDelete(null);
      setError(getErrorMessage(err, "Could not delete the service."));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const matchQ = !q || (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
      return matchQ && (!statusFilter || s.status === statusFilter);
    });
  }, [services, query, statusFilter]);

  const addButton = (
    <button className={buttonClass("primary")} onClick={() => setModal({ service: null })}><Plus size={16} /> Add service</button>
  );

  return (
    <Layout title="Services">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Catalog</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Services</h2>
          <p className="mt-1 text-sm text-slate-500">{services.length} service{services.length === 1 ? "" : "s"} available to your team</p>
        </div>
        {addButton}
      </div>

      <Alert type="success" onClose={() => setSuccess("")}>{success}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className={`${surfaceClass} mb-5 flex flex-col gap-3 p-4 sm:flex-row`}>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass()} pl-9`} placeholder="Search services" aria-label="Search services" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass()} sm:w-44`} aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading services..." />
      ) : services.length === 0 ? (
        <div className={surfaceClass}><EmptyState title="No services yet" text="Add the services you offer so leads can be linked to them." action={addButton} /></div>
      ) : filtered.length === 0 ? (
        <div className={surfaceClass}><EmptyState title="No matching services" text="Try a different search or clear the filter." /></div>
      ) : (
        <div className="grid grid-cards">
          {filtered.map((s) => (
            <article className={`${surfaceClass} flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`} key={getId(s)}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{s.name}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="flex-1 text-sm leading-6 text-slate-500">{s.description || "No description."}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <strong className="text-lg font-semibold text-slate-950">{formatPrice(s.price)}</strong>
                <span>
                  <button className={iconButtonClass} aria-label={`Edit ${s.name}`} onClick={() => setModal({ service: s })}><Pencil size={16} /></button>
                  <button className={`${iconButtonClass} text-rose-500 hover:bg-rose-50 hover:text-rose-600`} aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}><Trash2 size={16} /></button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={getId(modal.service) ? "Edit service" : "Add service"} onClose={() => setModal(null)}>
          <ServiceForm initial={modal.service} onSubmit={handleSave} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete service" onClose={() => !deleting && setToDelete(null)}>
          <p>Delete <strong>{toDelete.name}</strong>? This cannot be undone.</p>
          <div className={modalActionsClass}>
            <button className={buttonClass()} onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
            <button className={buttonClass("danger")} onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete service"}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}