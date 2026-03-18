import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight } from "lucide-react";
import { getCategories, getMenuItems, deleteMenuItem, updateMenuItem } from "../../../../api/menu";
import Spinner from "../shared/Spinner";
import BulkActionBar from "../shared/BulkActionBar";
import ItemCard from "./ItemCard";
import ItemFormModal from "./ItemFormModal";
import ConfigureDrawer from "./ConfigureDrawer";

export default function MenuItemsTab({ orgId }) {
  const qc = useQueryClient();
  const [selCat,    setSelCat]    = useState(null);
  const [drawer,    setDrawer]    = useState(null);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [selected,  setSelected]  = useState(new Set());

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories", orgId],
    queryFn:  () => getCategories(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["menu-items", orgId, selCat],
    queryFn:  () => getMenuItems(orgId, selCat).then((r) => r.data),
    enabled:  !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess:  () => { qc.invalidateQueries(["menu-items", orgId]); setSelected(new Set()); },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, is_active }) =>
      Promise.all(ids.map((id) => updateMenuItem(id, { is_active }))),
    onSuccess: () => { qc.invalidateQueries(["menu-items", orgId]); setSelected(new Set()); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(deleteMenuItem)),
    onSuccess:  () => { qc.invalidateQueries(["menu-items", orgId]); setSelected(new Set()); },
  });

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const catName = (id) => categories?.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mb-3">Categories</p>
          <button
            onClick={() => setSelCat(null)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between
              ${!selCat ? "bg-white shadow-sm border border-gray-100 text-gray-900" : "text-gray-500 hover:bg-white hover:shadow-sm hover:border hover:border-gray-100"}`}
          >
            All Items
            <span className="text-xs text-gray-400 font-mono">{items?.length ?? ""}</span>
          </button>
          {catsLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelCat(cat.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between group
                  ${selCat === cat.id ? "bg-white shadow-sm border border-gray-100 text-gray-900" : "text-gray-500 hover:bg-white hover:shadow-sm hover:border hover:border-gray-100"}`}
              >
                <span className="truncate">{cat.name}</span>
                <ChevronRight
                  size={14}
                  className={`flex-shrink-0 transition-all ${selCat === cat.id ? "opacity-100 text-blue-600" : "opacity-0 group-hover:opacity-50"}`}
                />
              </button>
            ))
          )}
        </div>

        {/* Items panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {selCat ? catName(selCat) : "All Items"} · {items?.length ?? 0} drinks
              </p>
              <button
                onClick={() => { setEditing(null); setModal(true); }}
                className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
              >
                <Plus size={14} /> New Item
              </button>
            </div>

            {itemsLoading ? (
              <Spinner />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                {items?.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selected.has(item.id)}
                    onSelect={toggleSelect}
                    onEdit={(i) => { setEditing(i); setModal(true); }}
                    onDelete={(i) => { if (confirm(`Delete ${i.name}?`)) deleteMutation.mutate(i.id); }}
                    onConfigure={(id) => setDrawer(id)}
                  />
                ))}
                {!items?.length && (
                  <div className="col-span-3 py-12 text-center text-sm text-gray-400">
                    No items in this category
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals / Drawer */}
      {modal && (
        <ItemFormModal
          editing={editing}
          categories={categories}
          orgId={orgId}
          selCat={selCat}
          onClose={() => { setModal(false); setEditing(null); }}
        />
      )}

      {drawer && (
        <ConfigureDrawer itemId={drawer} orgId={orgId} onClose={() => setDrawer(null)} />
      )}

      {/* Bulk action bar */}
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
