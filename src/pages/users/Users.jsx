import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Shield, X, Search, Pencil } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser, assignBranch, unassignBranch, getUserBranches } from "../../api/users";
import { getOrgs } from "../../api/orgs";
import { getBranches } from "../../api/branches";
import { useAuth } from "../../store/auth.jsx";

const ROLES = ["org_admin", "branch_manager", "teller"];
const ROLE_STYLE = {
  super_admin:    "bg-yellow-50 text-yellow-700 border-yellow-100",
  org_admin:      "bg-violet-50 text-violet-700 border-violet-100",
  branch_manager: "bg-blue-50 text-blue-700 border-blue-100",
  teller:         "bg-green-50 text-green-700 border-green-100",
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", role: "teller",
  password: "", pin: "", org_id: "", branch_ids: [],
};

export default function Users() {
  const { user: me } = useAuth();
  const qc           = useQueryClient();
  const navigate     = useNavigate();

  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null); // user being edited
  const [search,  setSearch]  = useState("");
  const [selOrg,  setSelOrg]  = useState(me?.org_id || "");
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ ...EMPTY_FORM, org_id: me?.org_id || "" });

  const { data: orgs } = useQuery({
    queryKey: ["orgs"],
    queryFn:  () => getOrgs().then(r => r.data),
    enabled:  me?.role === "super_admin",
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", selOrg],
    queryFn:  () => getUsers(selOrg || null).then(r => r.data),
    enabled:  me?.role === "super_admin" || !!selOrg,
  });

  const formOrgId = form.org_id || selOrg;
  const needsBranchPicker = ["teller", "branch_manager"].includes(form.role);

  const { data: branches } = useQuery({
    queryKey: ["branches", formOrgId],
    queryFn:  () => getBranches(formOrgId).then(r => r.data),
    enabled:  !!formOrgId && modal && needsBranchPicker,
  });

  // Fetch current branch assignments when editing
  const { data: currentBranches } = useQuery({
    queryKey: ["user-branches", editing?.id],
    queryFn:  () => getUserBranches(editing.id).then(r => r.data),
    enabled:  !!editing?.id && modal && needsBranchPicker,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess:  () => { qc.invalidateQueries(["users", selOrg]); setSelOrg(form.org_id); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess:  () => { qc.invalidateQueries(["users", selOrg]); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed to update user"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, branchId }) => assignBranch(userId, branchId),
    onSuccess:  () => qc.invalidateQueries(["user-branches", editing?.id]),
  });

  const unassignMutation = useMutation({
    mutationFn: ({ userId, branchId }) => unassignBranch(userId, branchId),
    onSuccess:  () => qc.invalidateQueries(["user-branches", editing?.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess:  () => qc.invalidateQueries(["users"]),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, org_id: me?.org_id || "" });
    setError("");
    setModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      org_id:    u.org_id || "",
      name:      u.name,
      email:     u.email || "",
      phone:     u.phone || "",
      role:      u.role,
      password:  "",
      pin:       "",
      branch_ids: [],
      is_active: u.is_active,
    });
    setError("");
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, org_id: me?.org_id || "" });
    setError("");
  };

  const toggleBranch = (id) => {
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(b => b !== id)
        : [...f.branch_ids, id],
    }));
  };

  // For edit mode — toggle branch via API immediately
  const toggleEditBranch = (branchId) => {
    const assigned = currentBranches?.some(b => b.branch_id === branchId);
    if (assigned) {
      unassignMutation.mutate({ userId: editing.id, branchId });
    } else {
      assignMutation.mutate({ userId: editing.id, branchId });
    }
  };

  // For edit mode teller — switch branch via API
  const switchEditBranch = (branchId) => {
    // unassign all current, then assign new one
    const promises = (currentBranches ?? []).map(b =>
      unassignBranch(editing.id, b.branch_id)
    );
    Promise.all(promises)
      .then(() => { assignMutation.mutate({ userId: editing.id, branchId }); })
      .catch((e) => { setError("Failed to switch branch: " + (e?.response?.data?.error || e.message)); });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!editing && !form.org_id) { setError("Please select an organization"); return; }

    if (editing) {
      // Build only changed fields
      const payload = {};
      if (form.name     !== editing.name)      payload.name      = form.name;
      if (form.email    !== (editing.email || ""))   payload.email     = form.email || null;
      if (form.phone    !== (editing.phone || ""))   payload.phone     = form.phone || null;
      if (form.role     !== editing.role)      payload.role      = form.role;
      if (form.is_active !== editing.is_active) payload.is_active = form.is_active;
      if (form.password) payload.password = form.password;
      if (form.pin)      payload.pin      = form.pin;

      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      const payload = {
        name:       form.name,
        org_id:     form.org_id,
        phone:      form.phone || null,
        role:       form.role,
        branch_ids: form.branch_ids.length ? form.branch_ids : null,
      };
      if (form.role === "teller") {
        payload.pin = form.pin;
      } else {
        payload.email    = form.email;
        payload.password = form.password;
      }
      createMutation.mutate(payload);
    }
  };

  const filtered = users?.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">All Users</h2>
          <p className="text-gray-400 text-xs mt-0.5">{users?.length ?? 0} staff accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {me?.role === "super_admin" && (
            <select value={selOrg} onChange={e => setSelOrg(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All orgs...</option>
              {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
            />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Plus size={15} /> New User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["User", "Email", "Role", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!selOrg && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">Select an organization to view users</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.name}</p>
                          {u.phone && <p className="text-gray-400 text-xs">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{u.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${ROLE_STYLE[u.role] || ""}`}>
                        {u.role?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border
                        ${u.is_active ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(u)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => navigate(`/permissions/${u.id}`)}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Permissions">
                          <Shield size={15} />
                        </button>
                        <button onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {selOrg && !isLoading && !filtered.length && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editing ? "Edit User" : "Create User"}</h2>
                <p className="text-gray-400 text-xs mt-0.5">{editing ? "Update staff details" : "Add a new staff member"}</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Jane Doe" required />

              {/* Org selector — super_admin, create only */}
              {me?.role === "super_admin" && !editing && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Organization</label>
                  <select value={form.org_id} onChange={e => setForm(f => ({ ...f, org_id: e.target.value, branch_ids: [] }))}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Select organization...</option>
                    {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, branch_ids: [] }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              {/* Credentials */}
              {form.role !== "teller" ? (
                <>
                  <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))}
                    placeholder="jane@example.com" type="email" required={!editing} />
                  <Field label={editing ? "New Password (leave blank to keep)" : "Password"}
                    value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))}
                    placeholder="••••••••" type="password" required={!editing} />
                </>
              ) : (
                <Field label={editing ? "New PIN (leave blank to keep)" : "PIN (4–6 digits)"}
                  value={form.pin} onChange={v => setForm(f => ({ ...f, pin: v }))}
                  placeholder="1234" required={!editing} />
              )}

              <Field label="Phone (optional)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+20 100 000 0000" />

              {/* Active toggle — edit only */}
              {editing && (
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input type="checkbox" id="is_active" checked={form.is_active ?? true}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">Account is active</label>
                </div>
              )}

              {/* Branch assignment */}
              {needsBranchPicker && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    {form.role === "teller" ? "Assign to Branch" : "Assign to Branches"}
                  </label>
                  {!formOrgId ? (
                    <p className="text-xs text-gray-400 italic px-1">Select an organization first</p>
                  ) : !branches?.length ? (
                    <p className="text-xs text-gray-400 italic px-1">No branches found for this org</p>
                  ) : form.role === "teller" ? (
                    // ── Teller: single branch radio ──
                    <div className="space-y-2">
                      {branches.map(b => {
                        const isSelected = editing
                          ? currentBranches?.some(cb => cb.branch_id === b.id)
                          : form.branch_ids[0] === b.id;
                        return (
                          <label key={b.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
                              ${isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                            <input
                              type="radio"
                              name="teller_branch"
                              checked={!!isSelected}
                              onChange={() => editing ? switchEditBranch(b.id) : setForm(f => ({ ...f, branch_ids: [b.id] }))}
                              className="w-4 h-4 accent-blue-600"
                              required={!editing}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                              {b.address && <p className="text-xs text-gray-400 truncate">{b.address}</p>}
                            </div>
                            {!b.is_active && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Inactive</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    // ── Branch manager: multi checkbox ──
                    <div className="space-y-2">
                      {branches.map(b => {
                        const isSelected = editing
                          ? currentBranches?.some(cb => cb.branch_id === b.id)
                          : form.branch_ids.includes(b.id);
                        return (
                          <label key={b.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
                              ${isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => editing ? toggleEditBranch(b.id) : toggleBranch(b.id)}
                              className="w-4 h-4 rounded accent-blue-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                              {b.address && <p className="text-xs text-gray-400 truncate">{b.address}</p>}
                            </div>
                            {!b.is_active && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Inactive</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                  {isPending ? (editing ? "Saving..." : "Creating...") : (editing ? "Save Changes" : "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}