import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDrinkRecipes,
  upsertDrinkRecipe,
  deleteDrinkRecipe,
  getAddonIngredients,
  upsertAddonIngredient,
  deleteAddonIngredient,
} from "../../api/recipes";
import { getMenuItems, getMenuItem, getAddonItems } from "../../api/menu";
import { getBranches } from "../../api/branches";
import client from "../../api/client";
import { useAuth } from "../../store/auth.jsx";

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const SIZE_DISPLAY = {
  one_size:    "One Size",
  small:       "Small",
  medium:      "Medium",
  large:       "Large",
  extra_large: "Extra Large",
};

const SIZE_COLORS = {
  one_size:    { bg: "#EFF6FF", color: "#1a56db", border: "#BFDBFE" },
  small:       { bg: "#F0FDF4", color: "#059669", border: "#BBF7D0" },
  medium:      { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  large:       { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  extra_large: { bg: "#FDF4FF", color: "#9333EA", border: "#E9D5FF" },
};

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const norm = (s = "") =>
  s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const fmtQty = (n) => {
  const f = parseFloat(n);
  return f % 1 === 0 ? f.toString() : f.toFixed(2);
};

// ─────────────────────────────────────────────────────────────
//  HOOKS
// ─────────────────────────────────────────────────────────────
function useInventoryItems(orgId) {
  return useQuery({
    queryKey:  ["inv-all", orgId],
    enabled:   !!orgId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data: branches } = await getBranches(orgId);
      if (!branches?.length) return [];
      const results = await Promise.allSettled(
        branches.map((b) =>
          client.get(`/inventory/branches/${b.id}/items`).then((r) => r.data)
        )
      );
      const seen = new Map();
      results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value)
        .forEach((item) => { if (!seen.has(item.name)) seen.set(item.name, item); });
      return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

// ─────────────────────────────────────────────────────────────
//  COMBOBOX — searchable ingredient picker
//  Uses onMouseDown instead of onClick so it fires before onBlur
// ─────────────────────────────────────────────────────────────
function Combobox({ items, usedIds = new Set(), value, onChange, placeholder = "Search ingredient…" }) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const inputRef            = useRef(null);
  const listRef             = useRef(null);

  const selected = items.find((i) => i.id === value);

  const filtered = items.filter(
    (i) =>
      !usedIds.has(i.id) &&
      i.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    onChange(item.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    if (e.key === "Enter" && filtered.length === 1) handleSelect(filtered[0]);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      listRef.current?.querySelector("[data-item]")?.focus();
    }
  };

  const handleItemKeyDown = (e, item) => {
    if (e.key === "Enter" || e.key === " ") handleSelect(item);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.focus(); }
  };

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      {/* Input trigger */}
      <div style={{
        display: "flex",
        alignItems: "center",
        border: open ? "1.5px solid #1a56db" : "1.5px solid #E5E7EB",
        borderRadius: 9,
        background: "#fff",
        transition: "border-color 0.15s",
        overflow: "hidden",
      }}>
        <input
          ref={inputRef}
          value={open ? query : (selected ? selected.name : "")}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onBlur={(e) => {
            // Don't close if focus moved to the list
            if (listRef.current?.contains(e.relatedTarget)) return;
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={selected ? selected.name : placeholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: "9px 12px",
            fontSize: 13,
            color: open ? "#111827" : (selected ? "#111827" : "#9CA3AF"),
            background: "transparent",
            minWidth: 0,
          }}
        />

        {selected && (
          <span style={{
            fontSize: 11,
            color: "#6B7280",
            background: "#F3F4F6",
            padding: "2px 7px",
            borderRadius: 4,
            marginRight: 4,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            {selected.unit}
          </span>
        )}

        {value && (
          <button
            onMouseDown={handleClear}
            tabIndex={-1}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "0 10px 0 4px",
              color: "#9CA3AF",
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}

        {!value && (
          <span style={{
            padding: "0 10px",
            color: "#9CA3AF",
            fontSize: 11,
            flexShrink: 0,
            pointerEvents: "none",
          }}>▾</span>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #E5E7EB",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
            zIndex: 99999,
            overflow: "hidden",
            maxHeight: 220,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: "14px 16px",
                fontSize: 13,
                color: "#9CA3AF",
                textAlign: "center",
              }}>
                {items.length === 0 ? "No inventory items loaded" : "No matches"}
              </div>
            ) : (
              filtered.map((item, idx) => (
                <div
                  key={item.id}
                  data-item
                  tabIndex={0}
                  onMouseDown={() => handleSelect(item)}
                  onKeyDown={(e) => handleItemKeyDown(e, item)}
                  style={{
                    padding: "9px 14px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#111827",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: idx < filtered.length - 1 ? "1px solid #F5F5F5" : "none",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onFocus={(e)      => (e.currentTarget.style.background = "#EFF6FF")}
                  onBlur={(e)       => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{
                    fontSize: 11,
                    color: "#6B7280",
                    background: "#F3F4F6",
                    padding: "2px 7px",
                    borderRadius: 4,
                    marginLeft: 8,
                    flexShrink: 0,
                  }}>
                    {item.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  INGREDIENT ROW — inline quantity editing
// ─────────────────────────────────────────────────────────────
function IngredientRow({ name, quantity, unit, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(fmtQty(quantity));

  const commit = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) onUpdate(n);
    else setVal(fmtQty(quantity));
    setEditing(false);
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 4px",
      borderBottom: "1px solid #F5F5F5",
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "#1a56db", flexShrink: 0,
      }} />

      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#111827", minWidth: 0 }}>
        {name}
      </span>

      {/* Quantity badge — click to edit */}
      {editing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            autoFocus
            type="number"
            min="0.01"
            step="0.1"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter")  commit();
              if (e.key === "Escape") { setVal(fmtQty(quantity)); setEditing(false); }
            }}
            style={{
              width: 72,
              padding: "4px 8px",
              border: "1.5px solid #1a56db",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
              textAlign: "right",
            }}
          />
          <span style={{ fontSize: 11, color: "#6B7280" }}>{unit}</span>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Click to edit"
          style={{
            border: "none",
            background: "#EFF6FF",
            color: "#1a56db",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {fmtQty(quantity)} {unit}
        </button>
      )}

      <button
        onClick={onDelete}
        title="Remove"
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "#D1D5DB",
          fontSize: 20,
          lineHeight: 1,
          padding: "0 2px",
          transition: "color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#D1D5DB")}
      >
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ADD ROW — ingredient picker + quantity + add button
// ─────────────────────────────────────────────────────────────
function AddRow({ inventoryItems, usedIds, onAdd, saving }) {
  const [invId, setInvId]   = useState("");
  const [qty,   setQty]     = useState("");

  const selectedItem = inventoryItems.find((i) => i.id === invId);
  const canAdd = invId && parseFloat(qty) > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(invId, parseFloat(qty));
    setInvId("");
    setQty("");
  };

  return (
    <div style={{
      display: "flex",
      gap: 8,
      alignItems: "flex-end",
      paddingTop: 14,
      borderTop: "1px dashed #E5E7EB",
      flexWrap: "nowrap",
    }}>
      {/* Combobox */}
      <Combobox
        items={inventoryItems}
        usedIds={usedIds}
        value={invId}
        onChange={setInvId}
      />

      {/* Quantity input */}
      <div style={{ flexShrink: 0, width: 100 }}>
        <input
          type="number"
          min="0.01"
          step="0.1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={selectedItem ? selectedItem.unit : "Qty"}
          style={{
            width: "100%",
            padding: "9px 10px",
            border: "1.5px solid #E5E7EB",
            borderRadius: 9,
            fontSize: 13,
            color: "#111827",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={(e)  => (e.target.style.borderColor = "#1a56db")}
          onBlur={(e)   => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={!canAdd || saving}
        style={{
          padding: "9px 16px",
          background: canAdd ? "#1a56db" : "#F3F4F6",
          color:      canAdd ? "#fff"    : "#9CA3AF",
          border: "none",
          borderRadius: 9,
          cursor:      canAdd ? "pointer" : "not-allowed",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {saving ? "…" : "+ Add"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIZE RECIPE CARD
// ─────────────────────────────────────────────────────────────
function SizeCard({ size, recipes, inventoryItems, onAdd, onDelete, onUpdate, saving }) {
  const usedIds = new Set(recipes.map((r) => r.inventory_item_id));
  const colors  = SIZE_COLORS[size] || SIZE_COLORS.one_size;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #EEEEEE",
      overflow: "visible",   // let dropdown escape
      boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
    }}>
      {/* Size header */}
      <div style={{
        padding: "11px 18px",
        background: "#FAFAFA",
        borderBottom: "1px solid #F0F0F0",
        borderRadius: "14px 14px 0 0",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{
          background: colors.bg,
          color: colors.color,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: "3px 12px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}>
          {SIZE_DISPLAY[size] || size}
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
          {recipes.length} ingredient{recipes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 18 }}>
        {recipes.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", margin: "0 0 14px" }}>
            No ingredients set
          </p>
        ) : (
          <div style={{ marginBottom: 4 }}>
            {recipes.map((r) => (
              <IngredientRow
                key={r.id}
                name={r.inventory_item_name}
                quantity={r.quantity_used}
                unit={r.unit}
                onDelete={() => onDelete(r.inventory_item_id)}
                onUpdate={(qty) => onAdd(r.inventory_item_id, qty)}
              />
            ))}
          </div>
        )}

        <AddRow
          inventoryItems={inventoryItems}
          usedIds={usedIds}
          onAdd={(invId, qty) => onAdd(invId, qty)}
          saving={saving}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DRINK RECIPE EDITOR
// ─────────────────────────────────────────────────────────────
function DrinkEditor({ item, inventoryItems }) {
  const qc = useQueryClient();

  const { data: fullItem } = useQuery({
    queryKey: ["menu-item-full", item.id],
    queryFn:  () => getMenuItem(item.id).then((r) => r.data),
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["drink-recipes", item.id],
    queryFn:  () => getDrinkRecipes(item.id).then((r) => r.data),
  });

  const sizes = fullItem?.sizes?.length
    ? fullItem.sizes.map((s) => s.label)
    : ["one_size"];

  const bySize = sizes.reduce((acc, s) => {
    acc[s] = recipes.filter((r) => r.size_label === s);
    return acc;
  }, {});

  const upsert = useMutation({
    mutationFn: ({ size, invId, qty }) =>
      upsertDrinkRecipe(item.id, {
        size_label:        size,
        inventory_item_id: invId,
        quantity_used:     qty,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drink-recipes", item.id] }),
  });

  const remove = useMutation({
    mutationFn: ({ size, invId }) => deleteDrinkRecipe(item.id, size, invId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["drink-recipes", item.id] }),
  });

  if (isLoading) return <p style={{ fontSize: 13, color: "#9CA3AF", padding: 28 }}>Loading…</p>;

  return (
    <div style={{ padding: 28, maxWidth: 740 }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
        {norm(item.name)}
      </h2>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
        Ingredients deducted from inventory each time this drink is ordered
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sizes.map((size) => (
          <SizeCard
            key={size}
            size={size}
            recipes={bySize[size] || []}
            inventoryItems={inventoryItems}
            onAdd={(invId, qty) => upsert.mutate({ size, invId, qty })}
            onDelete={(invId) => remove.mutate({ size, invId })}
            saving={upsert.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ADDON RECIPE EDITOR
// ─────────────────────────────────────────────────────────────
function AddonEditor({ item, inventoryItems }) {
  const qc = useQueryClient();

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ["addon-ingredients", item.id],
    queryFn:  () => getAddonIngredients(item.id).then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: ({ invId, qty }) =>
      upsertAddonIngredient(item.id, {
        inventory_item_id: invId,
        quantity_used:     qty,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addon-ingredients", item.id] }),
  });

  const remove = useMutation({
    mutationFn: (invId) => deleteAddonIngredient(item.id, invId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["addon-ingredients", item.id] }),
  });

  const usedIds = new Set(ingredients.map((i) => i.inventory_item_id));

  if (isLoading) return <p style={{ fontSize: 13, color: "#9CA3AF", padding: 28 }}>Loading…</p>;

  return (
    <div style={{ padding: 28, maxWidth: 740 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: 0 }}>
          {norm(item.name)}
        </h2>
        {item.type && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#7C3AED",
            background: "#F3E8FF", padding: "2px 9px",
            borderRadius: 20, letterSpacing: 0.3,
          }}>
            {norm(item.type)}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
        Base ingredients used when this addon is selected
      </p>

      <div style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #EEEEEE",
        overflow: "visible",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        padding: 18,
      }}>
        {ingredients.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", margin: "0 0 14px" }}>
            No ingredients set
          </p>
        ) : (
          <div style={{ marginBottom: 4 }}>
            {ingredients.map((ing) => (
              <IngredientRow
                key={ing.id}
                name={ing.inventory_item_name}
                quantity={ing.quantity_used}
                unit={ing.unit}
                onDelete={() => remove.mutate(ing.inventory_item_id)}
                onUpdate={(qty) => upsert.mutate({ invId: ing.inventory_item_id, qty })}
              />
            ))}
          </div>
        )}
        <AddRow
          inventoryItems={inventoryItems}
          usedIds={usedIds}
          onAdd={(invId, qty) => upsert.mutate({ invId, qty })}
          saving={upsert.isPending}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ITEM LIST PANEL
// ─────────────────────────────────────────────────────────────
function ItemList({ items, loading, selectedId, onSelect, tab }) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #F0F0F0" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          padding: "7px 10px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}…`}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: "#111827", width: "100%",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none", background: "none", cursor: "pointer",
                color: "#9CA3AF", fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >×</button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {search ? `No results for "${search}"` : `No ${tab} found`}
          </div>
        ) : (
          filtered.map((item) => {
            const sel = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: sel ? "#EFF6FF" : "transparent",
                  borderLeft: `3px solid ${sel ? "#1a56db" : "transparent"}`,
                  transition: "all 0.12s",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  fontSize: 13,
                  fontWeight: sel ? 600 : 500,
                  color: sel ? "#1a56db" : "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {norm(item.name)}
                </div>
                {tab === "drinks" && item.base_price != null && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    EGP {(item.base_price / 100).toFixed(0)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ROOT PAGE
// ─────────────────────────────────────────────────────────────
export default function Recipes() {
  const { user }  = useAuth();
  const orgId     = user?.org_id;

  const [tab,      setTab]      = useState("drinks");
  const [selected, setSelected] = useState(null);

  const { data: menuItems  = [], isLoading: loadingMenu }   = useQuery({
    queryKey: ["menu-items",  orgId],
    queryFn:  () => getMenuItems(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const { data: addonItems = [], isLoading: loadingAddons } = useQuery({
    queryKey: ["addon-items", orgId],
    queryFn:  () => getAddonItems(orgId).then((r) => r.data),
    enabled:  !!orgId && tab === "addons",
  });

  const { data: inventoryItems = [] } = useInventoryItems(orgId);

  // Reset selection on tab switch
  useEffect(() => setSelected(null), [tab]);

  const items   = tab === "drinks" ? menuItems  : addonItems;
  const loading = tab === "drinks" ? loadingMenu : loadingAddons;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "#F9FAFB" }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div style={{
        width: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Tab switcher */}
        <div style={{ padding: "12px 12px 0", display: "flex", gap: 6 }}>
          {["drinks", "addons"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: tab === t ? "#1a56db" : "#F3F4F6",
                color:      tab === t ? "#fff"    : "#6B7280",
                transition: "all 0.15s",
              }}
            >
              {t === "drinks" ? "Drinks" : "Addons"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "hidden", marginTop: 4 }}>
          <ItemList
            items={items}
            loading={loading}
            selectedId={selected?.id}
            onSelect={setSelected}
            tab={tab}
          />
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {!selected ? (
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
            gap: 14,
          }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>
                No {tab === "drinks" ? "drink" : "addon"} selected
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Pick one from the list to edit its recipe
              </div>
            </div>
          </div>
        ) : tab === "drinks" ? (
          <DrinkEditor item={selected} inventoryItems={inventoryItems} />
        ) : (
          <AddonEditor item={selected} inventoryItems={inventoryItems} />
        )}
      </div>
    </div>
  );
}