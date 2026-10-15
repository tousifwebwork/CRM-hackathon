import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getServices, createService, updateService, deleteService, getErrorMessage } from "./api.jsx";
import { Layout, Modal, Alert, Spinner, EmptyState, StatusBadge, getId } from "./Dashboard.jsx";

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
      <div className="field">
        <label htmlFor="s-name">Service name *</label>
        <input id="s-name" className={`input ${errors.name ? "invalid" : ""}`} value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="s-name-err" />
        {errors.name && <span className="field-error" id="s-name-err">{errors.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="s-desc">Description</label>
        <textarea id="s-desc" rows={3} className="input" value={form.description} onChange={set("description")} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="s-price">Price (USD) *</label>
          <input id="s-price" type="number" min="0" step="0.01" className={`input ${errors.price ? "invalid" : ""}`} value={form.price} onChange={set("price")} aria-invalid={!!errors.price} aria-describedby="s-price-err" />
          {errors.price && <span className="field-error" id="s-price-err">{errors.price}</span>}
        </div>
        <div className="field">
          <label htmlFor="s-status">Status</label>
          <select id="s-status" className="input" value={form.status} onChange={set("status")}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : getId(initial) ? "Save changes" : "Add service"}</button>
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
    <button className="btn btn-primary" onClick={() => setModal({ service: null })}><Plus size={16} /> Add service</button>
  );

  return (
    <Layout title="Services">
      <div className="page-head">
        <p className="muted" style={{ margin: 0 }}>{services.length} service{services.length === 1 ? "" : "s"} offered</p>
        {addButton}
      </div>

      <Alert type="success" onClose={() => setSuccess("")}>{success}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="toolbar">
        <div className="grow" style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
          <input className="input" style={{ paddingLeft: 32, width: "100%" }} placeholder="Search services" aria-label="Search services" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading services..." />
      ) : services.length === 0 ? (
        <div className="card"><EmptyState title="No services yet" text="Add the services you offer so leads can be linked to them." action={addButton} /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="No matching services" text="Try a different search or clear the filter." /></div>
      ) : (
        <div className="grid grid-cards">
          {filtered.map((s) => (
            <article className="card" key={getId(s)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <h3 style={{ fontSize: 16 }}>{s.name}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="muted" style={{ margin: 0, flex: 1 }}>{s.description || "No description."}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 18 }}>{formatPrice(s.price)}</strong>
                <span>
                  <button className="icon-btn" aria-label={`Edit ${s.name}`} onClick={() => setModal({ service: s })}><Pencil size={16} /></button>
                  <button className="icon-btn" aria-label={`Delete ${s.name}`} onClick={() => setToDelete(s)}><Trash2 size={16} color="#dc2626" /></button>
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
          <div className="modal-actions">
            <button className="btn" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete service"}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}