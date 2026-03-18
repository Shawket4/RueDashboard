#!/usr/bin/env bash
# =============================================================================
#  RuePOS React Dashboard — Bug Fixes + Image Upload
#  Usage:  bash fix_dashboard.sh [path/to/react/src]
#  Default: ./src
# =============================================================================
set -e
SRC="${1:-./src}"
[ -d "$SRC" ] || { echo "ERROR: src not found: $SRC"; exit 1; }
echo "==> Patching React dashboard at: $(cd "$SRC" && pwd)"

write() {
  local dest="$SRC/$1"
  mkdir -p "$(dirname "$dest")"
  cat > "$dest"
  echo "  written: $1"
}

# ──────────────────────────────────────────────────────────────────────
# App.css
# ──────────────────────────────────────────────────────────────────────
write 'App.css' << 'JS_EOF'
/* App.css — Vite defaults removed */

JS_EOF

# ──────────────────────────────────────────────────────────────────────
# api/client.js
# ──────────────────────────────────────────────────────────────────────
write 'api/client.js' << 'JS_EOF'
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://187.124.33.153:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;

JS_EOF

# ──────────────────────────────────────────────────────────────────────
# api/menu.js
# ──────────────────────────────────────────────────────────────────────
write 'api/menu.js' << 'JS_EOF'
import client from "./client";

export const getCategories    = (orgId)        => client.get("/categories",   { params: { org_id: orgId } });
export const createCategory   = (data)         => client.post("/categories",  data);
export const updateCategory   = (id, data)     => client.patch(`/categories/${id}`, data);
export const deleteCategory   = (id)           => client.delete(`/categories/${id}`);

export const getMenuItems     = (orgId, catId) => client.get("/menu-items",   { params: { org_id: orgId, ...(catId ? { category_id: catId } : {}) } });
export const getMenuItem      = (id)           => client.get(`/menu-items/${id}`);
export const createMenuItem   = (data)         => client.post("/menu-items",  data);
export const updateMenuItem   = (id, data)     => client.patch(`/menu-items/${id}`, data);
export const deleteMenuItem   = (id)           => client.delete(`/menu-items/${id}`);

// Image upload endpoint — POST /uploads/menu-items/:id
// multipart/form-data, field name: "image"
// Returns: { image_url: string }
export const uploadMenuItemImage = (id, file) => {
  const form = new FormData();
  form.append("image", file);
  return client.post(`/uploads/menu-items/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getAddonItems    = (orgId, type)  => client.get("/addon-items",  { params: { org_id: orgId, ...(type ? { addon_type: type } : {}) } });
export const createAddonItem  = (data)         => client.post("/addon-items", data);
export const updateAddonItem  = (id, data)     => client.patch(`/addon-items/${id}`, data);
export const deleteAddonItem  = (id)           => client.delete(`/addon-items/${id}`);

export const getOptionGroups    = (itemId)            => client.get(`/menu-items/${itemId}/option-groups`);
export const createOptionGroup  = (itemId, data)      => client.post(`/menu-items/${itemId}/option-groups`, data);
export const updateOptionGroup  = (itemId, gid, data) => client.patch(`/menu-items/${itemId}/option-groups/${gid}`, data);
export const deleteOptionGroup  = (itemId, gid)       => client.delete(`/menu-items/${itemId}/option-groups/${gid}`);
export const addOptionItem      = (itemId, gid, data)      => client.post(`/menu-items/${itemId}/option-groups/${gid}/items`, data);
export const updateOptionItem   = (itemId, gid, oid, data) => client.patch(`/menu-items/${itemId}/option-groups/${gid}/items/${oid}`, data);
export const deleteOptionItem   = (itemId, gid, oid)       => client.delete(`/menu-items/${itemId}/option-groups/${gid}/items/${oid}`);

export const upsertSize  = (itemId, data) => client.post(`/menu-items/${itemId}/sizes`, data);
export const deleteSize  = (itemId, sid)  => client.delete(`/menu-items/${itemId}/sizes/${sid}`);

JS_EOF

# ──────────────────────────────────────────────────────────────────────
# components/Layout.jsx
# ──────────────────────────────────────────────────────────────────────
write 'components/Layout.jsx' << 'JS_EOF'
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const TITLES = {
  "/":            { title: "Dashboard",     sub: "System overview" },
  "/orgs":        { title: "Organizations", sub: "Manage all coffee brands on the platform" },
  "/users":       { title: "Users",         sub: "Manage staff accounts and access" },
  "/branches":    { title: "Branches",      sub: "Manage branch locations and printers" },
  "/menu":        { title: "Menu",          sub: "Categories, items and addons" },
  "/inventory":   { title: "Inventory",     sub: "Stock levels, adjustments and transfers" },
  "/recipes":     { title: "Recipes",       sub: "Drink ingredients and quantities" },
  "/shifts":      { title: "Shifts",        sub: "Reports and shift management" },
  "/permissions": { title: "Permissions",   sub: "User access control overrides" },
};

export default function Layout() {
  const loc  = useLocation();
  const segs = loc.pathname.split("/").filter(Boolean);
  const base = segs.length ? "/" + segs[0] : "/";
  const meta = TITLES[base] || { title: "Rue POS", sub: "" };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center px-6 lg:px-8 h-16">
            <div className="lg:hidden w-8" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">{meta.title}</h1>
              {meta.sub && <p className="text-gray-400 text-xs mt-0.5">{meta.sub}</p>}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

JS_EOF

# ──────────────────────────────────────────────────────────────────────
# pages/menu/components/items/ItemCard.jsx
# ──────────────────────────────────────────────────────────────────────
write 'pages/menu/components/items/ItemCard.jsx' << 'JS_EOF'
import { Pencil, Trash2, Settings } from "lucide-react";
import { fmtEGP } from "../../constants";
import ActiveBadge from "../shared/ActiveBadge";

export default function ItemCard({ item, isSelected, onSelect, onEdit, onDelete, onConfigure }) {
  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden group relative
        ${item.is_active ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}
        ${isSelected ? "ring-2 ring-blue-500 border-blue-200" : ""}`}
    >
      {/* Checkbox */}
      <div
        className={`absolute top-3 left-3 z-10 transition-opacity
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
        />
      </div>

      {/* Image thumbnail — shown when image_url is set */}
      {item.image_url && (
        <div className="w-full h-28 overflow-hidden bg-gray-100">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <p className="font-semibold text-gray-900 text-sm leading-tight pl-5">{item.name}</p>
          <ActiveBadge active={item.is_active} />
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 pl-5">{item.description}</p>
        )}
        <p className="text-sm font-bold text-blue-600 mt-3 font-mono">{fmtEGP(item.base_price)}</p>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={() => onConfigure(item.id)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-xl transition-colors"
        >
          <Settings size={12} /> Configure
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

JS_EOF

# ──────────────────────────────────────────────────────────────────────
# pages/menu/components/items/ItemFormModal.jsx
# ──────────────────────────────────────────────────────────────────────
write 'pages/menu/components/items/ItemFormModal.jsx' << 'JS_EOF'
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

JS_EOF


# =============================================================================
#  TARGETED PATCHES (via embedded Python scripts)
# =============================================================================

PATCHES_DIR="$(dirname "$0")/dashboard_patches"
mkdir -p "$PATCHES_DIR"

# Write patch scripts inline

cat > "$PATCHES_DIR/patch_recipes.py" << 'PY_EOF'
import sys
with open(sys.argv[1], "r") as f:
    src = f.read()
src = src.replace('from "../../store/auth"', 'from "../../store/auth.jsx"')
src = src.replace("from '../../store/auth'", "from '../../store/auth.jsx'")
with open(sys.argv[1], "w") as f:
    f.write(src)
print("  patched: Recipes auth import")

PY_EOF

cat > "$PATCHES_DIR/patch_inventory.py" << 'PY_EOF'
import sys, re
with open(sys.argv[1], "r") as f:
    src = f.read()

lines = [l for l in src.splitlines(keepends=True) if "console.log" not in l]
src = "".join(lines)
print("  patched: Inventory console.logs removed")

old = "function SoftServeTab({ branchId, orgId }) {"
new = """function SoftServeTab({ branchId, orgId }) {
  if (!orgId) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
      No organization assigned to your account. Contact your administrator.
    </div>
  );"""
if old in src and "No organization assigned" not in src:
    src = src.replace(old, new)
    print("  patched: SoftServeTab orgId guard")

with open(sys.argv[1], "w") as f:
    f.write(src)

PY_EOF

cat > "$PATCHES_DIR/patch_branches.py" << 'PY_EOF'
import sys
with open(sys.argv[1], "r") as f:
    src = f.read()

old1 = "      printer_ip:   branch.printer_ip || \"\",\n      printer_port: branch.printer_port || 9100,\n    });"
new1 = "      printer_ip:   branch.printer_ip || \"\",\n      printer_port: branch.printer_port || 9100,\n      is_active:    branch.is_active ?? true,\n    });"
if old1 in src:
    src = src.replace(old1, new1)
    print("  patched: Branches is_active in openEdit")

old2 = "    const payload = {"
new2 = """    // Validate printer IP
    if (form.printer_ip) {
      const ipRe = /^(\\d{1,3}\\.){3}\\d{1,3}$/;
      if (!ipRe.test(form.printer_ip)) { setError("Invalid printer IP format"); return; }
      if (form.printer_ip.split(".").some((o) => parseInt(o) > 255)) { setError("Invalid printer IP (octet > 255)"); return; }
    }
    const payload = {"""
if old2 in src and "Invalid printer IP" not in src:
    src = src.replace(old2, new2, 1)
    print("  patched: Branches IP validation")

with open(sys.argv[1], "w") as f:
    f.write(src)

PY_EOF

cat > "$PATCHES_DIR/patch_users.py" << 'PY_EOF'
import sys
with open(sys.argv[1], "r") as f:
    src = f.read()

if "is_active: u.is_active," not in src:
    old = "      branch_ids: [],\n    });"
    new = "      branch_ids: [],\n      is_active: u.is_active,\n    });"
    if old in src:
        src = src.replace(old, new, 1)
        print("  patched: Users is_active in openEdit")

old_sw = "    Promise.all(promises).then(() => {\n      assignMutation.mutate({ userId: editing.id, branchId });\n    });"
new_sw = "    Promise.all(promises)\n      .then(() => { assignMutation.mutate({ userId: editing.id, branchId }); })\n      .catch((e) => { setError(\"Failed to switch branch: \" + (e?.response?.data?.error || e.message)); });"
if old_sw in src:
    src = src.replace(old_sw, new_sw)
    print("  patched: Users switchEditBranch error handling")

with open(sys.argv[1], "w") as f:
    f.write(src)

PY_EOF

cat > "$PATCHES_DIR/patch_shifts.py" << 'PY_EOF'
import sys, re
with open(sys.argv[1], "r") as f:
    src = f.read()

old_q = """  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
    onSuccess: (data) => { if (data.length && !branchId) setBranchId(data[0].id); },
  });"""
new_q = """  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });
  React.useEffect(() => {
    if (branches.length && !branchId) setBranchId(branches[0].id);
  }, [branches]);"""
if old_q in src:
    src = src.replace(old_q, new_q)
    print("  patched: Shifts onSuccess → useEffect")

if "import React" not in src:
    src = "import React from \"react\";\n" + src
    print("  patched: Shifts React import added")

old_fc = """            {shift.status === "open" && <>
              <Btn variant="ghost" onClick={() => setShowCash(true)} style={{ fontSize: 12 }}>
                + Cash Movement
              </Btn>
              <Btn variant="danger" onClick={() => setShowForce(true)} style={{ fontSize: 12 }}>
                Force Close
              </Btn>
            </>}"""
new_fc = """            {shift.status === "open" && <>
              <Btn variant="ghost" onClick={() => setShowCash(true)} style={{ fontSize: 12 }}>
                + Cash Movement
              </Btn>
              {user?.role !== "teller" && (
                <Btn variant="danger" onClick={() => setShowForce(true)} style={{ fontSize: 12 }}>
                  Force Close
                </Btn>
              )}
            </>}"""
if old_fc in src:
    src = src.replace(old_fc, new_fc)
    print("  patched: Shifts Force Close hidden from tellers")

old_sd = "function ShiftDetail({ shift, branchName, onClose }) {"
new_sd = "function ShiftDetail({ shift, branchName, onClose }) {\n  const { user } = useAuth();"
if old_sd in src and "const { user } = useAuth();" not in src:
    src = src.replace(old_sd, new_sd, 1)
    print("  patched: Shifts ShiftDetail gets user")

with open(sys.argv[1], "w") as f:
    f.write(src)

PY_EOF

cat > "$PATCHES_DIR/patch_dashboard.py" << 'PY_EOF'
import sys, re
with open(sys.argv[1], "r") as f:
    src = f.read()

# Move React import to top
src = re.sub(r"\nimport React from \"react\";\n", "\n", src)
if "import React from \"react\";" not in src[:50]:
    src = "import React from \"react\";\n" + src
    print("  patched: Dashboard React import at top")

src = src.replace(
    "instapay:       \"bg-purple-50 text-purple-700\"",
    "digital_wallet: \"bg-purple-50 text-purple-700\""
)
print("  patched: Dashboard instapay → digital_wallet")

src = src.replace(
    "queryKey: [\"recent-orders-branch-scan\", branches?.map((b) => b.id)]",
    "queryKey: [\"recent-orders-branch-scan\", branches?.map((b) => b.id).join(\",\")]"
)
print("  patched: Dashboard queryKey stable")

old_dup = "    { icon: GitBranch, label: \"Organizations\", value: orgs?.length,  sub: `${orgs?.filter(o => o.is_active).length ?? 0} active`, color: \"text-amber-600\", bg: \"bg-amber-50\", border: \"border-amber-100\",  loading: orgsLoading },"
new_dup = "    { icon: Users,     label: \"Active Staff\",  value: users?.filter(u => u.is_active).length, sub: \"Active accounts\", color: \"text-amber-600\", bg: \"bg-amber-50\", border: \"border-amber-100\", loading: usersLoading },"
if old_dup in src:
    src = src.replace(old_dup, new_dup)
    print("  patched: Dashboard dup stat → Active Staff")

src = re.sub(
    r"\n\s*// We'll use a single aggregated query approach\n\s*const queries = \(branches \?\? \[\]\)\.map\(\(b\) => \(\{.*?\}\)\);\n",
    "\n",
    src, flags=re.DOTALL
)
print("  patched: Dashboard dead queries variable removed")

with open(sys.argv[1], "w") as f:
    f.write(src)

PY_EOF

run_patch() {
    local script="$1" target="$SRC/$2"
    if [ -f "$target" ]; then
        python3 "$PATCHES_DIR/$script" "$target"
    else
        echo "  SKIP (not found): $2"
    fi
}

run_patch "patch_recipes.py"   "pages/recipes/Recipes.jsx"
run_patch "patch_inventory.py" "pages/inventory/Inventory.jsx"
run_patch "patch_branches.py"  "pages/branches/Branches.jsx"
run_patch "patch_users.py"     "pages/users/Users.jsx"
run_patch "patch_shifts.py"    "pages/shifts/Shifts.jsx"
run_patch "patch_dashboard.py" "pages/Dashboard.jsx"

echo ""
echo "========================================"
echo "  Dashboard fixes applied!"
echo "========================================"
echo ""
echo "Full rewrites:"
echo "  App.css, api/client.js (timeout), api/menu.js (upload),"
echo "  Layout.jsx (titles), ItemCard.jsx (thumbnail), ItemFormModal.jsx (upload widget)"
echo ""
echo "Patches applied:"
echo "  Dashboard.jsx  — React import, instapay, queryKey, dup stat, dead code"
echo "  Branches.jsx   — is_active openEdit, IP validation"
echo "  Users.jsx      — is_active openEdit, switchEditBranch error handling"
echo "  Inventory.jsx  — console.logs, SoftServeTab orgId guard"
echo "  Shifts.jsx     — onSuccess→useEffect, Force Close role guard"
echo "  Recipes.jsx    — auth import extension"
echo ""