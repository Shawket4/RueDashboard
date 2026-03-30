import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Coffee, Tag, Package, Image, ToggleLeft, ToggleRight } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as menuApi from "@/api/menu";
import type { Category, MenuItem, AddonItem } from "@/types";
import { egp, fmtAddonType, ADDON_TYPE_LABELS } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getErrorMessage } from "@/lib/client";

export default function Menu() {
  const user   = useAuthStore((s) => s.user);
  const orgId  = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const qc     = useQueryClient();
  const [tab, setTab] = useState("items");

  // ── Categories ──────────────────────────────────────────────
  const { data: cats = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories", orgId],
    queryFn:  () => menuApi.getCategories(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  // ── Menu items ───────────────────────────────────────────────
  const [selCat, setSelCat] = useState<string | null>(null);
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["menu-items", orgId, selCat],
    queryFn:  () => menuApi.getMenuItems(orgId, selCat).then((r) => r.data),
    enabled:  !!orgId,
  });

  // ── Addon items ──────────────────────────────────────────────
  const [selAddonType, setSelAddonType] = useState<string | null>(null);
  const { data: addons = [], isLoading: addonsLoading } = useQuery({
    queryKey: ["addon-items", orgId, selAddonType],
    queryFn:  () => menuApi.getAddonItems(orgId, selAddonType).then((r) => r.data),
    enabled:  !!orgId,
  });

  // ── Category dialog ──────────────────────────────────────────
  const [catDialog, setCatDialog]   = useState(false);
  const [editCat, setEditCat]       = useState<Category | null>(null);
  const [catForm, setCatForm]       = useState({ name: "", display_order: "0" });

  const openCatDialog = (cat?: Category) => {
    setEditCat(cat ?? null);
    setCatForm({ name: cat?.name ?? "", display_order: String(cat?.display_order ?? 0) });
    setCatDialog(true);
  };

  const catMutation = useMutation({
    mutationFn: () => editCat
      ? menuApi.updateCategory(editCat.id, { name: catForm.name, display_order: parseInt(catForm.display_order) })
      : menuApi.createCategory({ org_id: orgId, name: catForm.name, display_order: parseInt(catForm.display_order) }),
    onSuccess: () => {
      toast.success(editCat ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCatDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteCategory(id),
    onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Menu item dialog ─────────────────────────────────────────
  const [itemDialog, setItemDialog] = useState(false);
  const [editItem, setEditItem]     = useState<MenuItem | null>(null);
  const [itemForm, setItemForm]     = useState({
    name: "", description: "", base_price: "", category_id: "", is_active: true,
  });

  const openItemDialog = (item?: MenuItem) => {
    setEditItem(item ?? null);
    setItemForm({
      name:        item?.name ?? "",
      description: item?.description ?? "",
      base_price:  item ? String(item.base_price / 100) : "",
      category_id: item?.category_id ?? "",
      is_active:   item?.is_active ?? true,
    });
    setItemDialog(true);
  };

  const itemMutation = useMutation({
    mutationFn: () => {
      const payload = {
        org_id:      orgId,
        name:        itemForm.name,
        description: itemForm.description || null,
        base_price:  Math.round(parseFloat(itemForm.base_price) * 100),
        category_id: itemForm.category_id || null,
        is_active:   itemForm.is_active,
      };
      return editItem
        ? menuApi.updateMenuItem(editItem.id, payload)
        : menuApi.createMenuItem(payload);
    },
    onSuccess: () => {
      toast.success(editItem ? "Item updated" : "Item created");
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      setItemDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleItem = useMutation({
    mutationFn: (item: MenuItem) => menuApi.updateMenuItem(item.id, { is_active: !item.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Addon dialog ─────────────────────────────────────────────
  const [addonDialog, setAddonDialog] = useState(false);
  const [editAddon, setEditAddon]     = useState<AddonItem | null>(null);
  const [addonForm, setAddonForm]     = useState({
    name: "", addon_type: "extra", default_price: "", display_order: "0",
  });

  const openAddonDialog = (addon?: AddonItem) => {
    setEditAddon(addon ?? null);
    setAddonForm({
      name:          addon?.name ?? "",
      addon_type:    addon?.addon_type ?? "extra",
      default_price: addon ? String(addon.default_price / 100) : "",
      display_order: String(addon?.display_order ?? 0),
    });
    setAddonDialog(true);
  };

  const addonMutation = useMutation({
    mutationFn: () => {
      const payload = {
        org_id:        orgId,
        name:          addonForm.name,
        addon_type:    addonForm.addon_type,
        default_price: Math.round(parseFloat(addonForm.default_price) * 100),
        display_order: parseInt(addonForm.display_order),
      };
      return editAddon
        ? menuApi.updateAddonItem(editAddon.id, payload)
        : menuApi.createAddonItem(payload);
    },
    onSuccess: () => {
      toast.success(editAddon ? "Addon updated" : "Addon created");
      qc.invalidateQueries({ queryKey: ["addon-items"] });
      setAddonDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Columns ──────────────────────────────────────────────────
  const itemCols: ColumnDef<MenuItem, any>[] = [
    { accessorKey: "name", header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm">{row.original.name}</p>
          {row.original.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</p>}
        </div>
      ),
    },
    { accessorKey: "base_price", header: "Price",
      cell: ({ row }) => <span className="font-semibold tabular-nums">{egp(row.original.base_price)}</span>,
    },
    { accessorKey: "category_id", header: "Category",
      cell: ({ row }) => {
        const cat = cats.find((c) => c.id === row.original.category_id);
        return cat ? <Badge variant="outline">{cat.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    { accessorKey: "is_active", header: "Active",
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); toggleItem.mutate(row.original); }}>
          {row.original.is_active
            ? <ToggleRight size={20} className="text-green-500" />
            : <ToggleLeft  size={20} className="text-muted-foreground" />}
        </button>
      ),
    },
    { id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm" onClick={() => openItemDialog(row.original)}>
            <Pencil size={13} />
          </Button>
        </div>
      ),
    },
  ];

  const catCols: ColumnDef<Category, any>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { accessorKey: "display_order", header: "Order" },
    { accessorKey: "is_active", header: "Active",
      cell: ({ row }) => <Badge variant={row.original.is_active ? "success" : "outline"}>{row.original.is_active ? "Active" : "Inactive"}</Badge>,
    },
    { id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => openCatDialog(row.original)}><Pencil size={13} /></Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteCatMutation.mutate(row.original.id)}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  const addonCols: ColumnDef<AddonItem, any>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { accessorKey: "addon_type", header: "Type",
      cell: ({ row }) => <Badge variant="info">{fmtAddonType(row.original.addon_type)}</Badge>,
    },
    { accessorKey: "default_price", header: "Price",
      cell: ({ row }) => <span className="tabular-nums">{egp(row.original.default_price)}</span>,
    },
    { accessorKey: "is_active", header: "Active",
      cell: ({ row }) => <Badge variant={row.original.is_active ? "success" : "outline"}>{row.original.is_active ? "Active" : "Inactive"}</Badge>,
    },
    { id: "actions", header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => openAddonDialog(row.original)}><Pencil size={13} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Menu" sub="Manage categories, items and addons" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="items"><Coffee size={14} /> Items ({items.length})</TabsTrigger>
          <TabsTrigger value="categories"><Tag size={14} /> Categories ({cats.length})</TabsTrigger>
          <TabsTrigger value="addons"><Package size={14} /> Addons ({addons.length})</TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Select value={selCat ?? "all"} onValueChange={(v) => setSelCat(v === "all" ? null : v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={() => openItemDialog()}>
              <Plus size={14} /> Add Item
            </Button>
          </div>
          {itemsLoading
            ? <div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : <DataTable data={items} columns={itemCols} searchPlaceholder="Search items..." onRowClick={openItemDialog} />
          }
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories">
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => openCatDialog()}><Plus size={14} /> Add Category</Button>
          </div>
          {catsLoading
            ? <div className="space-y-2">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            : <DataTable data={cats} columns={catCols} searchPlaceholder="Search categories..." />
          }
        </TabsContent>

        {/* Addons tab */}
        <TabsContent value="addons">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Select value={selAddonType ?? "all"} onValueChange={(v) => setSelAddonType(v === "all" ? null : v)}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(ADDON_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={() => openAddonDialog()}>
              <Plus size={14} /> Add Addon
            </Button>
          </div>
          {addonsLoading
            ? <div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            : <DataTable data={addons} columns={addonCols} searchPlaceholder="Search addons..." />
          }
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Hot Drinks" />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" value={catForm.display_order} onChange={(e) => setCatForm((f) => ({ ...f, display_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button loading={catMutation.isPending} onClick={() => catMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "New Item"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Latte" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (EGP)</Label>
                <Input type="number" step="0.5" value={itemForm.base_price} onChange={(e) => setItemForm((f) => ({ ...f, base_price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={itemForm.category_id || "none"} onValueChange={(v) => setItemForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={itemForm.is_active} onCheckedChange={(v) => setItemForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button loading={itemMutation.isPending} onClick={() => itemMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addon dialog */}
      <Dialog open={addonDialog} onOpenChange={setAddonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAddon ? "Edit Addon" : "New Addon"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Oat Milk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={addonForm.addon_type} onValueChange={(v) => setAddonForm((f) => ({ ...f, addon_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADDON_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Price (EGP)</Label>
                <Input type="number" step="0.5" value={addonForm.default_price} onChange={(e) => setAddonForm((f) => ({ ...f, default_price: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" value={addonForm.display_order} onChange={(e) => setAddonForm((f) => ({ ...f, display_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialog(false)}>Cancel</Button>
            <Button loading={addonMutation.isPending} onClick={() => addonMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
