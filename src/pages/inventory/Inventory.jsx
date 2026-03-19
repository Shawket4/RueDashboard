import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, X, Search, Package,
  ArrowRightLeft, RefreshCw, AlertTriangle, ChevronRight, IceCream2, ChevronDown, Check
} from "lucide-react";
import {
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getAdjustments, createAdjustment,
  getTransfers, createTransfer, confirmTransfer, rejectTransfer,
  getSoftServePools, getSoftServeBatches, createSoftServeBatch,
} from "../../api/inventory";
import { getBranches } from "../../api/branches";
import { getMenuItems } from "../../api/menu";
import { useAuth } from "../../store/auth.jsx";

// ── Constants ─────────────────────────────────────────────────
const UNITS       = ["g", "kg", "ml", "l", "pcs"];
const UNIT_LABEL  = { g: "g", kg: "kg", ml: "ml", l: "L", pcs: "pcs" };
const ADJ_TYPES   = ["add", "remove"];
const TABS = [
  { id: "stock",     label: "Stock",        Icon: Package        },
  { id: "adjust",   label: "Adjustments",  Icon: RefreshCw      },
  { id: "transfers", label: "Transfers",   Icon: ArrowRightLeft  },
  { id: "softserve", label: "Soft Serve",  Icon: IceCream2       },
];

const EMPTY_ITEM = { name: "", unit: "kg", current_stock: "", reorder_threshold: "", cost_per_unit: "" };

// ── SearchSelect ──────────────────────────────────────────────
function SearchSelect({ value, onChange, options, placeholder = "Search...", required }) {
    const [open, setOpen]     = useState(false);
    const [query, setQuery]   = useState("");
    const ref                 = useRef(null);
  
    const selected = options?.find(o => o.value === value);
    const filtered = options?.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase())
    ) ?? [];
  
    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
  
    return (
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => { setOpen(o => !o); setQuery(""); }}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between transition
            ${open ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-200"}
            ${selected ? "text-gray-900" : "text-gray-400"}`}>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown size={14} className={`flex-shrink-0 ml-2 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
  
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {!filtered.length ? (
                <p className="text-xs text-gray-400 text-center py-4">No results</p>
              ) : filtered.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition flex items-center justify-between
                    ${o.value === value ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-700"}`}>
                  {o.label}
                  {o.value === value && <Check size={13} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {required && <input tabIndex={-1} value={value} onChange={() => {}} required
          className="absolute inset-0 opacity-0 pointer-events-none" />}
      </div>
    );
  }

// ── Root ──────────────────────────────────────────────────────
export default function Inventory() {
  const { user: me } = useAuth();
  const [tab,      setTab]      = useState("stock");
  const [branchId, setBranchId] = useState(me?.branch_id || "");

  const { data: branches } = useQuery({
    queryKey: ["branches", me?.org_id],
    queryFn:  () => getBranches(me?.org_id).then(r => r.data),
    enabled:  !!me?.org_id,
  });

  const canSelectBranch = ["super_admin", "org_admin"].includes(me?.role);

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col gap-3">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-400 text-xs mt-0.5">Stock levels, adjustments and transfers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canSelectBranch && (
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select branch...</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={12} /><span className="hidden xs:inline sm:inline">{label}</span><span className="xs:hidden sm:hidden">{label.slice(0,3)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {!branchId ? (
        <Empty text="Select a branch to view inventory" />
      ) : (
        <>
          {tab === "stock"      && <StockTab     branchId={branchId} branches={branches} />}
          {tab === "adjust"     && <AdjustTab    branchId={branchId} />}
          {tab === "transfers"  && <TransfersTab branchId={branchId} branches={branches} />}
          {tab === "softserve"  && <SoftServeTab branchId={branchId} orgId={me?.org_id} />}
        </>
      )}
    </div>
  );
}

// ── Stock Tab ─────────────────────────────────────────────────
function StockTab({ branchId, branches }) {
  const qc = useQueryClient();
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState({ ...EMPTY_ITEM });
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn:  () => getInventoryItems(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createInventoryItem(branchId, data),
    onSuccess:  () => { qc.invalidateQueries(["inventory", branchId]); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateInventoryItem(id, data),
    onSuccess:  () => { qc.invalidateQueries(["inventory", branchId]); closeModal(); },
    onError:    e  => setError(e.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess:  () => qc.invalidateQueries(["inventory", branchId]),
  });

  const openCreate = () => {
    setEditing(null); setForm({ ...EMPTY_ITEM }); setError(""); setModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name:              item.name,
      unit:              item.unit,
      current_stock:     item.current_stock,
      reorder_threshold: item.reorder_threshold,
      cost_per_unit:     item.cost_per_unit ?? "",
    });
    setError(""); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setError(""); };

  const handleSubmit = (e) => {
    e.preventDefault(); setError("");
    const payload = {
      name:              form.name,
      unit:              form.unit,
      current_stock:     parseFloat(form.current_stock),
      reorder_threshold: parseFloat(form.reorder_threshold),
      cost_per_unit:     form.cost_per_unit !== "" ? parseFloat(form.cost_per_unit) : null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else         createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const filtered  = (items ?? []).filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );
  const belowReorder = filtered.filter(i => i.current_stock <= i.reorder_threshold).length;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {belowReorder > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <AlertTriangle size={13} /> {belowReorder} item{belowReorder > 1 ? "s" : ""} below reorder threshold
            </div>
          )}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Plus size={14} /> New Item
          </button>
        </div>

        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <Empty text="No inventory items yet" />
        ) : (
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full text-sm" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reorder At</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cost/Unit</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const low = item.current_stock <= item.reorder_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400 uppercase">{UNIT_LABEL[item.unit] ?? item.unit}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-semibold ${low ? "text-amber-600" : "text-gray-900"}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{UNIT_LABEL[item.unit]}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-500 text-xs">
                        {item.reorder_threshold} {UNIT_LABEL[item.unit]}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-500 text-xs">
                        {item.cost_per_unit != null ? `${item.cost_per_unit} EGP` : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {low ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                            <AlertTriangle size={11} /> Low
                          </span>
                        ) : (
                          <span className="text-xs font-semibold bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full">OK</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${item.name}?`)) deleteMutation.mutate(item.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={editing ? "Edit Item" : "New Inventory Item"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Espresso Beans" required />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {UNITS.map(u => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Current Stock (${UNIT_LABEL[form.unit]})`} value={form.current_stock}
                onChange={v => setForm(f => ({ ...f, current_stock: v }))} type="number" placeholder="0" required />
              <Field label={`Reorder At (${UNIT_LABEL[form.unit]})`} value={form.reorder_threshold}
                onChange={v => setForm(f => ({ ...f, reorder_threshold: v }))} type="number" placeholder="0" required />
            </div>
            <Field label="Cost per Unit (EGP)" value={form.cost_per_unit}
              onChange={v => setForm(f => ({ ...f, cost_per_unit: v }))} type="number" placeholder="Optional" />
            {error && <ErrorBox msg={error} />}
            <ModalActions onCancel={closeModal} isPending={isPending} isEditing={!!editing} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ── Adjustments Tab ───────────────────────────────────────────
function AdjustTab({ branchId }) {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({ inventory_item_id: "", adjustment_type: "add", quantity: "", notes: "" });
  const [error,  setError]  = useState("");

  const { data: items } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn:  () => getInventoryItems(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["adjustments", branchId],
    queryFn:  () => getAdjustments(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createAdjustment(branchId, data),
    onSuccess:  () => {
      qc.invalidateQueries(["adjustments", branchId]);
      qc.invalidateQueries(["inventory", branchId]);
      setModal(false);
      setForm({ inventory_item_id: "", adjustment_type: "add", quantity: "", notes: "" });
    },
    onError: e => setError(e.response?.data?.error || "Failed"),
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError("");
    createMutation.mutate({ ...form, quantity: parseFloat(form.quantity) });
  };

  const itemName = (id) => items?.find(i => i.id === id)?.name ?? id;
  const itemUnit = (id) => UNIT_LABEL[items?.find(i => i.id === id)?.unit] ?? "";

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-400">{adjustments?.length ?? 0} adjustments</p>
          <button onClick={() => { setError(""); setModal(true); }}
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Plus size={14} /> New Adjustment
          </button>
        </div>

        {isLoading ? <Spinner /> : !adjustments?.length ? (
          <Empty text="No adjustments recorded yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Quantity</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {adjustments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{itemName(a.inventory_item_id)}</td>
                    <td className="px-6 py-4">
                      <AdjTypeBadge type={a.adjustment_type} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-700">
                      {a.adjustment_type === "remove" || a.adjustment_type === "transfer_out" ? "-" : "+"}{a.quantity} {itemUnit(a.inventory_item_id)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">{a.notes ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title="New Adjustment" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Item</label>
              <select value={form.inventory_item_id} onChange={e => setForm(f => ({ ...f, inventory_item_id: e.target.value }))} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select item...</option>
                {items?.map(i => <option key={i.id} value={i.id}>{i.name} ({UNIT_LABEL[i.unit]})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type</label>
              <div className="flex gap-2">
                {ADJ_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, adjustment_type: t }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition
                      ${form.adjustment_type === t
                        ? t === "add" ? "bg-green-50 border-green-300 text-green-700" : "bg-red-50 border-red-300 text-red-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                    {t === "add" ? "+ Add Stock" : "− Remove Stock"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Quantity" value={form.quantity} onChange={v => setForm(f => ({ ...f, quantity: v }))} type="number" placeholder="0" required />
            <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional reason" />
            {error && <ErrorBox msg={error} />}
            <ModalActions onCancel={() => setModal(false)} isPending={createMutation.isPending} isEditing={false} submitLabel="Log Adjustment" />
          </form>
        </Modal>
      )}
    </>
  );
}

// ── Transfers Tab ─────────────────────────────────────────────
function TransfersTab({ branchId, branches }) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState("outgoing");
  const [modal,     setModal]     = useState(false);
  const [detail,    setDetail]    = useState(null);
  const [form,      setForm]      = useState({ destination_branch_id: "", inventory_item_id: "", quantity: "", notes: "" });
  const [error,     setError]     = useState("");

  const { data: items } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn:  () => getInventoryItems(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers", branchId, direction],
    queryFn:  () => getTransfers(branchId, direction).then(r => r.data),
    enabled:  !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess:  () => { qc.invalidateQueries(["transfers", branchId]); qc.invalidateQueries(["inventory", branchId]); setModal(false); },
    onError:    e  => setError(e.response?.data?.error || "Failed"),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, data }) => confirmTransfer(id, data),
    onSuccess:  () => { qc.invalidateQueries(["transfers", branchId]); setDetail(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }) => rejectTransfer(id, data),
    onSuccess:  () => { qc.invalidateQueries(["transfers", branchId]); setDetail(null); },
  });

  const handleSubmit = (e) => {
    e.preventDefault(); setError("");
    createMutation.mutate({
      source_branch_id:      branchId,
      destination_branch_id: form.destination_branch_id,
      inventory_item_id:     form.inventory_item_id,
      quantity:              parseFloat(form.quantity),
      notes:                 form.notes || null,
    });
  };

  const branchName = (id) => branches?.find(b => b.id === id)?.name ?? id?.slice(0, 8);
  const itemName   = (id) => items?.find(i => i.id === id)?.name ?? id?.slice(0, 8);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {["outgoing", "incoming"].map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                  ${direction === d ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {d}
              </button>
            ))}
          </div>
          {direction === "outgoing" && (
            <button onClick={() => { setError(""); setForm({ destination_branch_id: "", inventory_item_id: "", quantity: "", notes: "" }); setModal(true); }}
              className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm ml-auto"
              style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
              <Plus size={14} /> New Transfer
            </button>
          )}
        </div>

        {isLoading ? <Spinner /> : !transfers?.length ? (
          <Empty text={`No ${direction} transfers`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {direction === "outgoing" ? "To" : "From"}
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{itemName(t.inventory_item_id)}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {direction === "outgoing" ? branchName(t.destination_branch_id) : branchName(t.source_branch_id)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-700">{t.quantity}</td>
                    <td className="px-6 py-4"><TransferBadge status={t.status} /></td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{fmtDate(t.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      {direction === "incoming" && t.status === "pending" && (
                        <button onClick={() => setDetail(t)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                          Review <ChevronRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New transfer modal */}
      {modal && (
        <Modal title="New Transfer" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Destination Branch</label>
              <select value={form.destination_branch_id} onChange={e => setForm(f => ({ ...f, destination_branch_id: e.target.value }))} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select branch...</option>
                {branches?.filter(b => b.id !== branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Item</label>
              <select value={form.inventory_item_id} onChange={e => setForm(f => ({ ...f, inventory_item_id: e.target.value }))} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select item...</option>
                {items?.map(i => <option key={i.id} value={i.id}>{i.name} — {i.current_stock} {UNIT_LABEL[i.unit]}</option>)}
              </select>
            </div>
            <Field label="Quantity" value={form.quantity} onChange={v => setForm(f => ({ ...f, quantity: v }))} type="number" placeholder="0" required />
            <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional" />
            {error && <ErrorBox msg={error} />}
            <ModalActions onCancel={() => setModal(false)} isPending={createMutation.isPending} isEditing={false} submitLabel="Send Transfer" />
          </form>
        </Modal>
      )}

      {/* Review transfer modal */}
      {detail && (
        <Modal title="Review Transfer" onClose={() => setDetail(null)}>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
              <Row label="Item"     value={itemName(detail.inventory_item_id)} />
              <Row label="From"     value={branchName(detail.source_branch_id)} />
              <Row label="Quantity" value={`${detail.quantity_sent}`} mono />
              {detail.notes && <Row label="Notes" value={detail.notes} />}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => rejectMutation.mutate({ id: detail.id, data: { note: "Rejected" } })}
                disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60">
                Reject
              </button>
              <button
                onClick={() => confirmMutation.mutate({ id: detail.id, data: { quantity_confirmed: parseFloat(detail.quantity_sent), note: "Confirmed" } })}
                disabled={confirmMutation.isPending}
                className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition"
                style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                Confirm Full Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Soft Serve Tab ────────────────────────────────────────────
function SoftServeTab({ branchId, orgId }) {
  if (!orgId) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
      No organization assigned to your account. Contact your administrator.
    </div>
  );
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");

  const EMPTY_FORM = {
    menu_item_id: "",
    small_serves: 15,
    large_serves: 10,
    notes: "",
    ingredients: [{ inventory_item_id: "", quantity_used: "" }],
  };
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: menuItems } = useQuery({
    queryKey: ["ss-menu-items", orgId],
    queryFn:  () => {
      return getMenuItems(orgId).then(r => r.data);
    },
    enabled:  !!orgId,
  });
  

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn:  () => getInventoryItems(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const { data: pools, isLoading: poolsLoading } = useQuery({
    queryKey: ["ss-pools", branchId],
    queryFn:  () => getSoftServePools(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ["ss-batches", branchId],
    queryFn:  () => getSoftServeBatches(branchId).then(r => r.data),
    enabled:  !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createSoftServeBatch(branchId, data),
    onSuccess:  () => {
      qc.invalidateQueries(["ss-pools", branchId]);
      qc.invalidateQueries(["ss-batches", branchId]);
      qc.invalidateQueries(["inventory", branchId]);
      setModal(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: e => setError(e.response?.data?.error || "Failed to log batch"),
  });

  const addIngredient = () =>
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { inventory_item_id: "", quantity_used: "" }] }));

  const removeIngredient = (idx) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));

  const updateIngredient = (idx, field, value) =>
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const filledIngredients = form.ingredients.filter(
      ing => ing.inventory_item_id && ing.quantity_used !== ""
    );

    const payload = {
      menu_item_id: form.menu_item_id,
      small_serves: parseInt(form.small_serves),
      large_serves: parseInt(form.large_serves),
      notes:        form.notes || null,
      ingredients: filledIngredients.length > 0
        ? filledIngredients.map(ing => ({
            inventory_item_id: ing.inventory_item_id,
            quantity_used:     parseFloat(ing.quantity_used),
          }))
        : null,
    };

    createMutation.mutate(payload);
  };

  const unitLabel       = (id) => UNIT_LABEL[inventoryItems?.find(i => i.id === id)?.unit] ?? "";
  const menuOptions     = menuItems?.map(m => ({ value: m.id, label: m.name })) ?? [];
  const inventoryOptions = inventoryItems?.map(i => ({ value: i.id, label: `${i.name} (${UNIT_LABEL[i.unit] ?? i.unit})` })) ?? [];

  return (
    <>
      <div className="space-y-4">
        {/* Serve pools */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Serve Pools</p>
            <button
              onClick={() => { setError(""); setForm({ ...EMPTY_FORM }); setModal(true); }}
              className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
              style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
            >
              <Plus size={14} /> Log Batch
            </button>
          </div>
          {poolsLoading ? <Spinner /> : !pools?.length ? (
            <Empty text="No serve pools yet — log a batch to create one" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {pools.map(p => (
                <div key={p.id} className={`rounded-2xl border p-5 ${p.low_stock_flag ? "border-amber-200 bg-amber-50" : "border-gray-100"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <p className="font-semibold text-gray-900 text-sm">{p.item_name}</p>
                    {p.low_stock_flag && (
                      <span className="flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} /> Low
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
    <p className="text-2xl font-bold text-gray-900">
      {Math.floor(parseFloat(p.total_units))}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">Small cups</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
    <p className="text-2xl font-bold text-gray-900">
      {Math.floor(parseFloat(p.total_units) / parseFloat(p.large_ratio))}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">Large cups</p>
  </div>
</div>
<p className="text-xs text-gray-400 mt-1 text-center">
  1 large = {parseFloat(p.large_ratio).toFixed(2)} smalls
</p>
<p className="text-xs text-gray-400 mt-1 text-center">Updated {fmtDate(p.updated_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Batch History</p>
          </div>
          {batchesLoading ? <Spinner /> : !batches?.length ? (
            <Empty text="No batches logged yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 480 }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Small</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Large</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Logged By</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{b.item_name}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">{b.small_serves}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-700">{b.large_serves}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{b.logged_by_name}</td>
                      <td className="px-6 py-4 text-gray-400 text-xs max-w-xs truncate">{b.notes ?? "—"}</td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{fmtDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log batch modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Log Soft Serve Batch</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ingredients are deducted from inventory immediately</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Soft serve item */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Soft Serve Item</label>
                <SearchSelect
                  value={form.menu_item_id}
                  onChange={v => setForm(f => ({ ...f, menu_item_id: v }))}
                  options={menuOptions}
                  placeholder="Search menu items..."
                  required
                />
              </div>

              {/* Serves */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Small Cups</label>
                  <input
                    type="number" min="0"
                    value={form.small_serves}
                    onChange={e => setForm(f => ({ ...f, small_serves: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Large Cups</label>
                  <input
                    type="number" min="0"
                    value={form.large_serves}
                    onChange={e => setForm(f => ({ ...f, large_serves: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Ingredients Used</label>
                  <button type="button" onClick={addIngredient}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
                  <p className="text-xs text-gray-400">
                    Leave empty to use defaults (items named "Powder" and "Milk" at 0.5kg each).
                  </p>
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <SearchSelect
                          value={ing.inventory_item_id}
                          onChange={v => updateIngredient(idx, "inventory_item_id", v)}
                          options={inventoryOptions}
                          placeholder="Search ingredients..."
                        />
                      </div>
                      <div className="relative w-28 flex-shrink-0">
                        <input
                          type="number" min="0" step="any"
                          value={ing.quantity_used}
                          onChange={e => updateIngredient(idx, "quantity_used", e.target.value)}
                          placeholder="Qty"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono pr-8"
                        />
                        {ing.inventory_item_id && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            {unitLabel(ing.inventory_item_id)}
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => removeIngredient(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional batch notes" />

              {error && <ErrorBox msg={error} />}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition"
                  style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                  {createMutation.isPending ? "Logging..." : "Log Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared helpers ────────────────────────────────────────────
function AdjTypeBadge({ type }) {
  const styles = {
    add:          "bg-green-50 text-green-700 border-green-100",
    remove:       "bg-red-50 text-red-700 border-red-100",
    transfer_out: "bg-blue-50 text-blue-700 border-blue-100",
    transfer_in:  "bg-purple-50 text-purple-700 border-purple-100",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${styles[type] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
      {type?.replace("_", " ")}
    </span>
  );
}

function TransferBadge({ status }) {
  const styles = {
    pending:   "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-green-50 text-green-700 border-green-100",
    partial:   "bg-blue-50 text-blue-700 border-blue-100",
    rejected:  "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${styles[status] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
      {status}
    </span>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, isPending, isEditing, submitLabel }) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
        Cancel
      </button>
      <button type="submit" disabled={isPending}
        className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition"
        style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
        {isPending ? "Saving..." : (submitLabel ?? (isEditing ? "Save Changes" : "Create"))}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} step={type === "number" ? "any" : undefined}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{msg}</p>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-center text-sm text-gray-400 py-16">{text}</p>;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}