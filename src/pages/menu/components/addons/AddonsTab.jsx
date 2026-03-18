import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getAddonItems, createAddonItem, updateAddonItem, deleteAddonItem,
} from "../../../../api/menu";
import { ADDON_TYPES, TYPE_LABEL, toEGP, toPiastres, fmtEGP } from "../../constants";
import Spinner from "../shared/Spinner";
import Modal from "../shared/Modal";
import Field from "../shared/Field";
import ActiveBadge from "../shared/ActiveBadge";
import BulkActionBar from "../shared/BulkActionBar";

export default function AddonsTab({ orgId }) {
  const qc = useQueryClient();
  const [modal,      setModal]    = useState(false);
  const [editing,    setEditing]  = useState(null);
  const [filterType, setFilter]   = useState("");
  const [form,       setForm]     = useState({ name: "", addon_type: "extra", default_price: "", display_order: 0, is_active: true });
  const [error,      setError]    = useState("");
  const [selected,   setSelected] = useState(new Set());

  const { data: addons, isLoading } = useQuery({
    queryKey: ["addon-items", orgId, filterType],
    queryFn:  () => getAddonItems(orgId, filterType || null).then((r) => r.data),
    enabled:  !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: createAddonItem,
    onSuccess:  () => { qc.invalidateQueries(["addon-items", orgId]); closeModal(); },
    onError:    (e) => setError(e.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAddonItem(id, data),
    onSuccess:  () => { qc.invalidateQueries(["addon-items", orgId]); closeModal(); },
    onError:    (e) => setError(e.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddonItem,
    onSuccess:  () => { qc.invalidateQueries(["addon-items", orgId]); setSelected(new Set()); },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, is_active }) =>
      Promise.all(ids.map((id) => updateAddonItem(id, { is_active }))),
    onSuccess:  () => { qc.invalidateQueries(["addon-items", orgId]); setSelected(new Set()); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(deleteAddonItem)),
    onSuccess:  () => { qc.invalidateQueries(["addon-items", orgId]); setSelected(new Set()); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", addon_type: "extra", default_price: "", display_order: 0, is_active: true });
    setError(""); setModal(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({ name: a.name, addon_type: a.addon_type, default_price: toEGP(a.default_price), display_order: a.display_order, is_active: a.is_active });
    setError(""); setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); setError(""); };

  const handleSubmit = (e) => {
    e.preventDefault(); setError("");
    const payload = { ...form, default_price: toPiastres(form.default_price), display_order: +form.display_order };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else         createMutation.mutate({ ...payload, org_id: orgId });
  };

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isPending  = createMutation.isPending || updateMutation.isPending;
  const grouped    = (addons ?? []).reduce((acc, a) => { (acc[a.addon_type] = acc[a.addon_type] || []).push(a); return acc; }, {});
  const visible    = filterType ? [filterType] : ADDON_TYPES;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[{ id: "", label: "All" }, ...ADDON_TYPES.map((t) => ({ id: t, label: TYPE_LABEL[t] }))].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filterType === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm ml-auto"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
          >
            <Plus size={14} /> New Addon
          </button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="p-6 space-y-6">
            {visible.map((t) => {
              const list = grouped[t] ?? [];
              if (!list.length) return null;
              return (
                <div key={t}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{TYPE_LABEL[t]}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-xl border p-4 transition-all group relative
                          ${a.is_active ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}
                          ${selected.has(a.id) ? "ring-2 ring-blue-500 border-blue-200" : ""}`}
                      >
                        {/* Checkbox */}
                        <div className={`absolute top-3 left-3 transition-opacity
                          ${selected.has(a.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                          <input
                            type="checkbox"
                            checked={selected.has(a.id)}
                            onChange={() => toggleSelect(a.id)}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                        </div>

                        <div className="flex items-start justify-between mb-1 pl-5">
                          <p className="font-medium text-gray-900 text-sm">{a.name}</p>
                          <ActiveBadge active={a.is_active} />
                        </div>
                        <p className="text-xs font-mono text-blue-600 mb-3 pl-5">{fmtEGP(a.default_price)}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${a.name}?`)) deleteMutation.mutate(a.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!addons?.length && (
              <p className="text-center text-sm text-gray-400 py-12">No addons yet</p>
            )}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editing ? "Edit Addon" : "New Addon"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Oat Milk" required />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select
                value={form.addon_type}
                onChange={(e) => setForm((f) => ({ ...f, addon_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ADDON_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <Field label="Default Price (EGP)" value={form.default_price} onChange={(v) => setForm((f) => ({ ...f, default_price: v }))} type="number" placeholder="0.00" required />
            <Field label="Display Order"       value={form.display_order} onChange={(v) => setForm((f) => ({ ...f, display_order: v }))} type="number" />
            {editing && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox" id="addon_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <label htmlFor="addon_active" className="text-sm font-medium text-gray-700 cursor-pointer">Addon is active</label>
              </div>
            )}
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition"
                style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                {isPending ? (editing ? "Saving..." : "Creating...") : (editing ? "Save Changes" : "Create")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <BulkActionBar
        selectedIds={selected}
        onActivate={(ids) => bulkStatusMutation.mutate({ ids, is_active: true })}
        onDeactivate={(ids) => bulkStatusMutation.mutate({ ids, is_active: false })}
        onDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        onClear={() => setSelected(new Set())}
      />
    </>
  );
}
