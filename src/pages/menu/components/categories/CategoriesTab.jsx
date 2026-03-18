import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from "../../../../api/menu";
import Spinner from "../shared/Spinner";
import Modal from "../shared/Modal";
import Field from "../shared/Field";
import ActiveBadge from "../shared/ActiveBadge";
import BulkActionBar from "../shared/BulkActionBar";

export default function CategoriesTab({ orgId }) {
  const qc = useQueryClient();
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name: "", image_url: "", display_order: 0, is_active: true });
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(new Set());

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", orgId],
    queryFn:  () => getCategories(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess:  () => { qc.invalidateQueries(["categories", orgId]); closeModal(); },
    onError:    (e) => setError(e.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess:  () => { qc.invalidateQueries(["categories", orgId]); closeModal(); },
    onError:    (e) => setError(e.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess:  () => { qc.invalidateQueries(["categories", orgId]); setSelected(new Set()); },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, is_active }) =>
      Promise.all(ids.map((id) => updateCategory(id, { is_active }))),
    onSuccess:  () => { qc.invalidateQueries(["categories", orgId]); setSelected(new Set()); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(deleteCategory)),
    onSuccess:  () => { qc.invalidateQueries(["categories", orgId]); setSelected(new Set()); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", image_url: "", display_order: 0, is_active: true });
    setError(""); setModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, image_url: cat.image_url || "", display_order: cat.display_order, is_active: cat.is_active });
    setError(""); setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); setError(""); };

  const handleSubmit = (e) => {
    e.preventDefault(); setError("");
    const payload = { ...form, display_order: +form.display_order };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else         createMutation.mutate({ ...payload, org_id: orgId });
  };

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-400">{categories?.length ?? 0} categories</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
          >
            <Plus size={14} /> New Category
          </button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-6">
            {categories?.map((cat) => (
              <div
                key={cat.id}
                className={`rounded-2xl border p-4 text-center transition-all group relative
                  ${cat.is_active ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}
                  ${selected.has(cat.id) ? "ring-2 ring-blue-500 border-blue-200" : ""}`}
              >
                {/* Checkbox */}
                <div className={`absolute top-3 left-3 transition-opacity
                  ${selected.has(cat.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(cat.id)}
                    onChange={() => toggleSelect(cat.id)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Tag size={20} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{cat.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">#{cat.display_order}</p>
                <div className="flex justify-center mt-1"><ActiveBadge active={cat.is_active} /></div>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${cat.name}?`)) deleteMutation.mutate(cat.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {!categories?.length && (
              <div className="col-span-5 py-12 text-center text-sm text-gray-400">No categories yet</div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editing ? "Edit Category" : "New Category"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Name"          value={form.name}          onChange={(v) => setForm((f) => ({ ...f, name: v }))}          placeholder="e.g. Blended" required />
            <Field label="Image URL"     value={form.image_url}     onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}     placeholder="https://..." />
            <Field label="Display Order" value={form.display_order} onChange={(v) => setForm((f) => ({ ...f, display_order: v }))} type="number" />
            {editing && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox" id="cat_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <label htmlFor="cat_active" className="text-sm font-medium text-gray-700 cursor-pointer">Category is active</label>
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
