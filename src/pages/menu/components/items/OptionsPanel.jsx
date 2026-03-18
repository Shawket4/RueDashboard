import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Plus, ChevronRight, Search, Check } from "lucide-react";
import {
  getAddonItems,
  getOptionGroups,
  createOptionGroup,
  deleteOptionGroup,
  addOptionItem,
  deleteOptionItem,
  updateOptionItem,
} from "../../../../api/menu";
import { ADDON_TYPES, TYPE_LABEL, toEGP, toPiastres, fmtEGP } from "../../constants";

// ── Inline-editable price chip ────────────────────────────────
function AddonChip({ optionItem, onDelete, onPriceChange }) {
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState(
    optionItem.price_override != null ? toEGP(optionItem.price_override) : ""
  );

  const handleBlur = () => {
    setEditing(false);
    const newPrice = draft !== "" ? toPiastres(draft) : null;
    if (newPrice !== optionItem.price_override) onPriceChange(optionItem.id, newPrice);
  };

  return (
    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl pl-3 pr-1 py-1 group/chip">
      <span className="text-xs font-medium text-gray-800">{optionItem.name}</span>

      {/* Price — click to edit inline */}
      {editing ? (
        <input
          autoFocus
          type="number" step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          placeholder={toEGP(optionItem.default_price)}
          className="w-20 text-xs font-mono border border-blue-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Click to override price"
          className="text-xs font-mono text-blue-600 hover:bg-blue-50 rounded-lg px-1.5 py-0.5 transition-colors"
        >
          {optionItem.price_override != null
            ? fmtEGP(optionItem.price_override)
            : fmtEGP(optionItem.default_price)}
        </button>
      )}

      <button
        onClick={() => onDelete(optionItem.id)}
        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Multi-select addon picker ─────────────────────────────────
function AddonPicker({ groupId, groupType, itemId, existingAddonIds, allAddons, onAdd }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(new Set());

  const available = (allAddons ?? []).filter(
    (a) => a.addon_type === groupType && !existingAddonIds.has(a.id)
  );

  const filtered = available.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const handleAdd = () => {
    onAdd([...selected]);
    setSelected(new Set());
    setSearch("");
  };

  if (available.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic px-1 py-2">
        No addons of type "{TYPE_LABEL[groupType]}" available to add.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <Search size={13} className="text-gray-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search addons..."
          className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400"
        />
      </div>

      {/* Select-all row */}
      {filtered.length > 1 && (
        <button
          onClick={toggleAll}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 transition-colors"
        >
          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
            ${selected.size === filtered.length
              ? "bg-blue-600 border-blue-600"
              : selected.size > 0
              ? "bg-blue-200 border-blue-400"
              : "border-gray-300"}`}
          >
            {selected.size > 0 && <Check size={10} className="text-white" />}
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {selected.size === filtered.length ? "Deselect all" : "Select all"}
          </span>
        </button>
      )}

      {/* Addon rows */}
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left
              ${selected.has(a.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
              ${selected.has(a.id) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
            >
              {selected.has(a.id) && <Check size={10} className="text-white" />}
            </div>
            <span className="flex-1 text-sm text-gray-800">{a.name}</span>
            <span className="text-xs font-mono text-gray-400">{fmtEGP(a.default_price)}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 italic px-4 py-3">No results</p>
        )}
      </div>

      {/* Confirm button */}
      {selected.size > 0 && (
        <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 text-white text-xs font-semibold py-2 rounded-xl transition"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
          >
            <Plus size={13} /> Add Selected ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}

// ── Option group card ─────────────────────────────────────────
function OptionGroupCard({ group, item, orgId, allAddons }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const existingAddonIds = new Set((group.items ?? []).map((i) => i.addon_item_id));

  const addItemsMutation = useMutation({
    mutationFn: (addonIds) =>
      Promise.all(
        addonIds.map((addonId) =>
          addOptionItem(item.id, group.id, { addon_item_id: addonId, price_override: null })
        )
      ),
    onSuccess: () => qc.invalidateQueries(["option-groups", item.id]),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (oid) => deleteOptionItem(item.id, group.id, oid),
    onSuccess:  () => qc.invalidateQueries(["option-groups", item.id]),
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ oid, price }) => updateOptionItem(item.id, group.id, oid, { price_override: price }),
    onSuccess:  () => qc.invalidateQueries(["option-groups", item.id]),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteOptionGroup(item.id, group.id),
    onSuccess:  () => qc.invalidateQueries(["option-groups", item.id]),
  });

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      {/* Group header */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 uppercase tracking-wide">
            {TYPE_LABEL[group.group_type] ?? group.group_type}
          </span>
          <span className="text-xs text-gray-400">
            {group.selection_type} · {group.is_required ? "required" : "optional"} · {(group.items ?? []).length} items
          </span>
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
        <button
          onClick={() => { if (confirm("Delete this option group?")) deleteGroupMutation.mutate(); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Chips — always visible */}
      {(group.items ?? []).length > 0 && (
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
          {group.items.map((oi) => (
            <AddonChip
              key={oi.id}
              optionItem={oi}
              onDelete={(oid) => deleteItemMutation.mutate(oid)}
              onPriceChange={(oid, price) => updatePriceMutation.mutate({ oid, price })}
            />
          ))}
        </div>
      )}

      {/* Expandable picker */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add from catalog</p>
          <AddonPicker
            groupId={group.id}
            groupType={group.group_type}
            itemId={item.id}
            existingAddonIds={existingAddonIds}
            allAddons={allAddons}
            onAdd={(ids) => addItemsMutation.mutate(ids)}
          />
        </div>
      )}
    </div>
  );
}

// ── OptionsPanel (main export) ────────────────────────────────
export default function OptionsPanel({ item, orgId }) {
  const qc = useQueryClient();
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm,   setGroupForm]   = useState({
    group_type:      "coffee_type",
    selection_type:  "single",
    is_required:     true,
    display_order:   0,
  });

  const { data: groups } = useQuery({
    queryKey: ["option-groups", item.id],
    queryFn:  () => getOptionGroups(item.id).then((r) => r.data),
  });

  const { data: allAddons } = useQuery({
    queryKey: ["addon-items", orgId],
    queryFn:  () => getAddonItems(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => createOptionGroup(item.id, data),
    onSuccess:  () => { qc.invalidateQueries(["option-groups", item.id]); setAddingGroup(false); },
  });

  return (
    <div className="space-y-4">
      {(groups ?? []).map((g) => (
        <OptionGroupCard
          key={g.id}
          group={g}
          item={item}
          orgId={orgId}
          allAddons={allAddons}
        />
      ))}

      {/* Add group */}
      {addingGroup ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">New Option Group</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select
                value={groupForm.group_type}
                onChange={(e) => setGroupForm((f) => ({ ...f, group_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ADDON_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Selection</label>
              <select
                value={groupForm.selection_type}
                onChange={(e) => setGroupForm((f) => ({ ...f, selection_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="single">Single</option>
                <option value="multi">Multi</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
            <input
              type="checkbox" id="grp_req"
              checked={groupForm.is_required}
              onChange={(e) => setGroupForm((f) => ({ ...f, is_required: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <label htmlFor="grp_req" className="text-sm font-medium text-gray-700 cursor-pointer">Required selection</label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createGroupMutation.mutate(groupForm)}
              className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
            >
              Create Group
            </button>
            <button
              onClick={() => setAddingGroup(false)}
              className="flex-1 border border-gray-200 text-sm font-medium text-gray-600 py-2.5 rounded-xl hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingGroup(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Plus size={15} /> Add Option Group
        </button>
      )}
    </div>
  );
}
