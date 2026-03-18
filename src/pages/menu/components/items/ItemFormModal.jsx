import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, ImageIcon, ExternalLink } from "lucide-react";
import { createMenuItem, updateMenuItem, uploadMenuItemImage } from "../../../../api/menu";
import { toEGP, toPiastres } from "../../constants";
import Modal from "../shared/Modal";
import Field from "../shared/Field";

export default function ItemFormModal({ editing, categories, orgId, selCat, onClose }) {
  const qc      = useQueryClient();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    category_id:   editing?.category_id  ?? selCat ?? categories?.[0]?.id ?? "",
    name:          editing?.name         ?? "",
    description:   editing?.description  ?? "",
    image_url:     editing?.image_url    ?? "",
    base_price:    editing ? toEGP(editing.base_price) : "",
    display_order: editing?.display_order ?? 0,
    is_active:     editing?.is_active    ?? true,
  });

  const [error,          setError]          = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState("");
  const [showUrlInput,   setShowUrlInput]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => { qc.invalidateQueries(["menu-items", orgId]); onClose(); },
    onError: (e) => setError(e.response?.data?.error || "Failed"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMenuItem(id, data),
    onSuccess: () => { qc.invalidateQueries(["menu-items", orgId]); onClose(); },
    onError: (e) => setError(e.response?.data?.error || "Failed"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      org_id:        orgId,
      base_price:    toPiastres(form.base_price),
      display_order: +form.display_order,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else         createMutation.mutate(payload);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Must have an editing item to upload (need the item ID)
    if (!editing) {
      setUploadError("Save the item first, then upload an image.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadProgress(0);

    try {
      const res = await uploadMenuItemImage(editing.id, file);
      const url = res.data?.image_url;
      if (url) {
        setForm((f) => ({ ...f, image_url: url }));
        qc.invalidateQueries(["menu-items", orgId]);
      }
    } catch (e) {
      setUploadError(e.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Modal title={editing ? "Edit Item" : "New Menu Item"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select category...</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <Field label="Name"             value={form.name}          onChange={(v) => setForm((f) => ({ ...f, name: v }))}          placeholder="e.g. Iced Spanish Latte" required />
        <Field label="Description"      value={form.description}   onChange={(v) => setForm((f) => ({ ...f, description: v }))}   placeholder="Optional" />
        <Field label="Base Price (EGP)" value={form.base_price}    onChange={(v) => setForm((f) => ({ ...f, base_price: v }))}    type="number" placeholder="0.00" required />
        <Field label="Display Order"    value={form.display_order} onChange={(v) => setForm((f) => ({ ...f, display_order: v }))} type="number" />

        {/* Image section */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Image</label>

          {/* Preview */}
          {form.image_url && (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 h-32">
              <img
                src={form.image_url}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Upload button — only available when editing an existing item */}
          {editing ? (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Upload Image
                  </>
                )}
              </button>
              {uploadError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <ImageIcon size={12} className="inline mr-1" />
              Create the item first, then upload an image by editing it.
            </p>
          )}

          {/* Manual URL fallback */}
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            <ExternalLink size={11} />
            {showUrlInput ? "Hide URL input" : "Or enter image URL manually"}
          </button>
          {showUrlInput && (
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {editing && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <input
              type="checkbox" id="item_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <label htmlFor="item_active" className="text-sm font-medium text-gray-700 cursor-pointer">Item is active</label>
          </div>
        )}

        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
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
  );
}

