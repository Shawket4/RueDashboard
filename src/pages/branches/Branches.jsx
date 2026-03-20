import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Search, Printer, MapPin, Phone, GitBranch } from "lucide-react";
import { getBranches, createBranch, updateBranch, deleteBranch } from "../../api/branches";
import { getOrgs } from "../../api/orgs";
import { useAuth } from "../../store/auth.jsx";

const TIMEZONES = [
  "Africa/Cairo",
];

const PRINTER_BRANDS = [
  { value: "star",  label: "Star Micronics" },
  { value: "epson", label: "Epson" },
];

const EMPTY_FORM = {
  name: "", address: "", phone: "",
  timezone: "Africa/Cairo",
  printer_brand: "",
  printer_ip: "", printer_port: 9100,
  org_id: "",
};

export default function Branches() {
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [search,  setSearch]  = useState("");
  const [selOrg,  setSelOrg]  = useState(me?.org_id || "");
  const [form,    setForm]    = useState({ ...EMPTY_FORM, org_id: me?.org_id || "" });
  const [error,   setError]   = useState("");

  const { data: orgs } = useQuery({
    queryKey: ["orgs"],
    queryFn:  () => getOrgs().then(r => r.data),
    enabled:  me?.role === "super_admin",
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", selOrg],
    queryFn:  () => getBranches(selOrg).then(r => r.data),
    enabled:  !!selOrg,
  });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess:  () => { qc.invalidateQueries(["branches", selOrg]); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed to create branch"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBranch(id, data),
    onSuccess:  () => { qc.invalidateQueries(["branches", selOrg]); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed to update branch"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess:  () => qc.invalidateQueries(["branches", selOrg]),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, org_id: selOrg || me?.org_id || "" });
    setError("");
    setModal(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      org_id:        branch.org_id,
      name:          branch.name,
      address:       branch.address || "",
      phone:         branch.phone || "",
      timezone:      branch.timezone,
      printer_brand: branch.printer_brand || "",
      printer_ip:    branch.printer_ip || "",
      printer_port:  branch.printer_port || 9100,
      is_active:     branch.is_active ?? true,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Validate printer fields together
    const hasIp    = !!form.printer_ip.trim();
    const hasBrand = !!form.printer_brand;
    if (hasIp && !hasBrand) { setError("Please select a printer brand"); return; }
    if (hasBrand && !hasIp) { setError("Please enter a printer IP address"); return; }

    if (form.printer_ip) {
      const ipRe = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRe.test(form.printer_ip)) { setError("Invalid printer IP format"); return; }
      if (form.printer_ip.split(".").some(o => parseInt(o) > 255)) { setError("Invalid printer IP (octet > 255)"); return; }
    }

    const payload = {
      ...form,
      printer_brand: form.printer_brand || null,
      printer_port:  parseInt(form.printer_port) || 9100,
      printer_ip:    form.printer_ip || null,
      address:       form.address || null,
      phone:         form.phone || null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = branches?.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.address || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const isPending = createMutation.isPending || updateMutation.isPending;

  const brandLabel = (brand) =>
    PRINTER_BRANDS.find(b => b.value === brand)?.label ?? brand;

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">Branches</h2>
          <p className="text-gray-400 text-xs mt-0.5">{branches?.length ?? 0} locations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {me?.role === "super_admin" && (
            <select value={selOrg} onChange={e => setSelOrg(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select org...</option>
              {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search branches..."
              className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
            />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Plus size={15} /> New Branch
          </button>
        </div>
      </div>

      {/* Cards */}
      <div>
        {!selOrg ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
            Select an organization to view branches
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
            No branches found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => (
              <div key={b.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #1a56db22, #3b28cc22)" }}>
                      <GitBranch size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                        ${b.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(b)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${b.name}?`)) deleteMutation.mutate(b.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-2.5">
                  {b.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.printer_ip && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Printer size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{b.printer_ip}:{b.printer_port}</span>
                        {b.printer_brand && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {brandLabel(b.printer_brand)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-mono">
                      {b.timezone}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">
                  {editing ? "Edit Branch" : "Create Branch"}
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {editing ? "Update branch details" : "Add a new location"}
                </p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {me?.role === "super_admin" && !editing && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Organization</label>
                  <select value={form.org_id} onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Select organization...</option>
                    {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}

              <Field label="Branch Name" value={form.name}
                onChange={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Maadi Branch" required />
              <Field label="Address" value={form.address}
                onChange={v => setForm(f => ({ ...f, address: v }))}
                placeholder="123 Road 9, Maadi, Cairo" />
              <Field label="Phone" value={form.phone}
                onChange={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="+20 2 1234 5678" />

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Timezone</label>
                <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>

              {/* Printer section */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <Printer size={13} /> Printer Configuration
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Brand</label>
                  <select value={form.printer_brand}
                    onChange={e => setForm(f => ({ ...f, printer_brand: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">No printer</option>
                    {PRINTER_BRANDS.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="IP Address" value={form.printer_ip}
                      onChange={v => setForm(f => ({ ...f, printer_ip: v }))}
                      placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <Field label="Port" value={form.printer_port}
                      onChange={v => setForm(f => ({ ...f, printer_port: v }))}
                      placeholder="9100" type="number" />
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input type="checkbox" id="is_active" checked={form.is_active ?? true}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Branch is active
                  </label>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition"
                  style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                  {isPending ? (editing ? "Saving..." : "Creating...") : (editing ? "Save Changes" : "Create Branch")}
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