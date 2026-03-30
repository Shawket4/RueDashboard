import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, ArrowRightLeft, AlertTriangle, Package } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as inventoryApi from "@/api/inventory";
import * as branchesApi from "@/api/branches";
import type { InventoryItem, InventoryAdjustment, InventoryTransfer } from "@/types";
import { egp, fmtDateTime, fmtUnit, UNIT_LABELS } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getErrorMessage } from "@/lib/client";

export default function Inventory() {
  const user     = useAuthStore((s) => s.user);
  const orgId    = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const branchId = useAppStore((s) => s.selectedBranchId) ?? "";
  const qc       = useQueryClient();
  const [tab, setTab] = useState("stock");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => branchesApi.getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0];

  const { data: items = [], isLoading: stockLoading } = useQuery({
    queryKey: ["inventory-items", activeBranch?.id],
    queryFn:  () => inventoryApi.getInventoryItems(activeBranch!.id).then((r) => r.data),
    enabled:  !!activeBranch?.id,
  });

  const { data: adjustments = [], isLoading: adjLoading } = useQuery({
    queryKey: ["adjustments", activeBranch?.id],
    queryFn:  () => inventoryApi.getAdjustments(activeBranch!.id).then((r) => r.data),
    enabled:  !!activeBranch?.id,
  });

  const { data: transfers = [], isLoading: transLoading } = useQuery({
    queryKey: ["transfers", activeBranch?.id],
    queryFn:  () => inventoryApi.getTransfers(activeBranch!.id).then((r) => r.data),
    enabled:  !!activeBranch?.id,
  });

  const lowStock = items.filter((i) => i.current_stock <= i.reorder_threshold);

  // ── Item dialog ───────────────────────────────────────────────
  const [itemDialog, setItemDialog] = useState(false);
  const [editItem, setEditItem]     = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm]     = useState({
    name: "", unit: "g", current_stock: "", reorder_threshold: "", cost_per_unit: "", is_active: true,
  });

  const openItemDialog = (item?: InventoryItem) => {
    setEditItem(item ?? null);
    setItemForm({
      name:              item?.name ?? "",
      unit:              item?.unit ?? "g",
      current_stock:     item ? String(item.current_stock) : "",
      reorder_threshold: item ? String(item.reorder_threshold) : "",
      cost_per_unit:     item?.cost_per_unit ? String(item.cost_per_unit) : "",
      is_active:         item?.is_active ?? true,
    });
    setItemDialog(true);
  };

  const itemMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name:              itemForm.name,
        unit:              itemForm.unit,
        current_stock:     parseFloat(itemForm.current_stock),
        reorder_threshold: parseFloat(itemForm.reorder_threshold),
        cost_per_unit:     itemForm.cost_per_unit ? parseFloat(itemForm.cost_per_unit) : null,
        is_active:         itemForm.is_active,
      };
      return editItem
        ? inventoryApi.updateInventoryItem(editItem.id, payload)
        : inventoryApi.createInventoryItem(activeBranch!.id, payload);
    },
    onSuccess: () => {
      toast.success(editItem ? "Item updated" : "Item created");
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      setItemDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Adjustment dialog ─────────────────────────────────────────
  const [adjDialog, setAdjDialog] = useState(false);
  const [adjForm, setAdjForm]     = useState({ inventory_item_id: "", adjustment_type: "add", quantity: "", note: "" });

  const adjMutation = useMutation({
    mutationFn: () => inventoryApi.createAdjustment(activeBranch!.id, {
      inventory_item_id: adjForm.inventory_item_id,
      adjustment_type:   adjForm.adjustment_type,
      quantity:          parseFloat(adjForm.quantity),
      note:              adjForm.note || null,
    }),
    onSuccess: () => {
      toast.success("Adjustment recorded");
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["adjustments"] });
      setAdjDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Transfer dialog ───────────────────────────────────────────
  const [transDialog, setTransDialog] = useState(false);
  const [transForm, setTransForm]     = useState({ destination_branch_id: "", inventory_item_id: "", quantity_sent: "", note: "" });

  const transMutation = useMutation({
    mutationFn: () => inventoryApi.createTransfer({
      source_branch_id:      activeBranch!.id,
      destination_branch_id: transForm.destination_branch_id,
      inventory_item_id:     transForm.inventory_item_id,
      quantity_sent:         parseFloat(transForm.quantity_sent),
      note:                  transForm.note || null,
    }),
    onSuccess: () => {
      toast.success("Transfer initiated");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      setTransDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Table columns ─────────────────────────────────────────────
  const stockCols: ColumnDef<InventoryItem, any>[] = [
    { accessorKey: "name", header: "Item",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.current_stock <= row.original.reorder_threshold && (
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
          )}
          <span className="font-semibold text-sm">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "unit", header: "Unit", cell: ({ row }) => <Badge variant="outline">{fmtUnit(row.original.unit)}</Badge> },
    { accessorKey: "current_stock", header: "Stock",
      cell: ({ row }) => {
        const pct = Math.min(100, (row.original.current_stock / Math.max(row.original.reorder_threshold * 2, 1)) * 100);
        const low = row.original.current_stock <= row.original.reorder_threshold;
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={pct} className={`h-1.5 flex-1 ${low ? "[&>div]:bg-amber-500" : ""}`} />
            <span className={`text-xs tabular-nums font-semibold ${low ? "text-amber-600" : ""}`}>
              {row.original.current_stock} {fmtUnit(row.original.unit)}
            </span>
          </div>
        );
      },
    },
    { accessorKey: "reorder_threshold", header: "Reorder",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.reorder_threshold} {fmtUnit(row.original.unit)}</span>,
    },
    { accessorKey: "cost_per_unit", header: "Cost/Unit",
      cell: ({ row }) => row.original.cost_per_unit
        ? <span className="text-xs tabular-nums">{egp(row.original.cost_per_unit * 100)}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    { accessorKey: "is_active", header: "Active",
      cell: ({ row }) => <Badge variant={row.original.is_active ? "success" : "outline"}>{row.original.is_active ? "Active" : "Off"}</Badge>,
    },
    { id: "actions", header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); openItemDialog(row.original); }}>
          <Pencil size={13} />
        </Button>
      ),
    },
  ];

  const adjCols: ColumnDef<InventoryAdjustment, any>[] = [
    { accessorKey: "item_name", header: "Item", cell: ({ row }) => <span className="font-semibold text-sm">{row.original.item_name}</span> },
    { accessorKey: "adjustment_type", header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.adjustment_type === "add" ? "success" : "warning"}>
          {row.original.adjustment_type.replace("_", " ")}
        </Badge>
      ),
    },
    { accessorKey: "quantity", header: "Qty",
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.quantity} {fmtUnit(row.original.unit)}</span>,
    },
    { accessorKey: "note", header: "Note", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.note ?? "—"}</span> },
    { accessorKey: "adjusted_by_name", header: "By", cell: ({ row }) => <span className="text-xs">{row.original.adjusted_by_name}</span> },
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDateTime(row.original.created_at)}</span> },
  ];

  const STATUS_VARIANT: Record<string, any> = { pending: "warning", completed: "success", partial: "info", rejected: "destructive" };
  const transCols: ColumnDef<InventoryTransfer, any>[] = [
    { accessorKey: "item_name", header: "Item", cell: ({ row }) => <span className="font-semibold text-sm">{row.original.item_name}</span> },
    { accessorKey: "source_branch_name",      header: "From", cell: ({ row }) => <span className="text-xs">{row.original.source_branch_name}</span> },
    { accessorKey: "destination_branch_name", header: "To",   cell: ({ row }) => <span className="text-xs">{row.original.destination_branch_name}</span> },
    { accessorKey: "quantity_sent", header: "Qty",
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.quantity_sent} {fmtUnit(row.original.unit)}</span>,
    },
    { accessorKey: "status", header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>,
    },
    { accessorKey: "initiated_at", header: "Date", cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDateTime(row.original.initiated_at)}</span> },
  ];

  if (!activeBranch) return (
    <div className="p-6 lg:p-8"><EmptyState icon={Package} title="No branch selected" sub="Select a branch from the sidebar to view inventory" /></div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Inventory"
        sub={`${activeBranch.name} · ${items.length} items${lowStock.length > 0 ? ` · ${lowStock.length} low stock` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjDialog(true)}>
              <Plus size={13} /> Adjustment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTransDialog(true)}>
              <ArrowRightLeft size={13} /> Transfer
            </Button>
            <Button size="sm" onClick={() => openItemDialog()}>
              <Plus size={13} /> Add Item
            </Button>
          </div>
        }
      />

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} below reorder threshold:{" "}
            <span className="font-bold">{lowStock.map((i) => i.name).join(", ")}</span>
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="stock">
            Stock ({items.length})
            {lowStock.length > 0 && <Badge variant="warning" className="ml-1 h-4 text-[10px]">{lowStock.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments ({adjustments.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transfers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          {stockLoading
            ? <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-14 rounded-xl"/>)}</div>
            : <DataTable data={items} columns={stockCols} searchPlaceholder="Search items..." onRowClick={openItemDialog} />
          }
        </TabsContent>

        <TabsContent value="adjustments">
          {adjLoading
            ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>
            : <DataTable data={adjustments} columns={adjCols} searchPlaceholder="Search adjustments..." />
          }
        </TabsContent>

        <TabsContent value="transfers">
          {transLoading
            ? <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>
            : <DataTable data={transfers} columns={transCols} searchPlaceholder="Search transfers..." />
          }
        </TabsContent>
      </Tabs>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Item" : "New Inventory Item"}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5"><Label>Name</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm((f)=>({...f,name:e.target.value}))} placeholder="e.g. Whole Milk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Unit</Label>
                <Select value={itemForm.unit} onValueChange={(v)=>setItemForm((f)=>({...f,unit:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNIT_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Current Stock</Label>
                <Input type="number" step="0.1" value={itemForm.current_stock} onChange={(e)=>setItemForm((f)=>({...f,current_stock:e.target.value}))} placeholder="0" />
              </div>
              <div className="space-y-1.5"><Label>Reorder Threshold</Label>
                <Input type="number" step="0.1" value={itemForm.reorder_threshold} onChange={(e)=>setItemForm((f)=>({...f,reorder_threshold:e.target.value}))} placeholder="0" />
              </div>
              <div className="space-y-1.5"><Label>Cost per Unit (EGP)</Label>
                <Input type="number" step="0.01" value={itemForm.cost_per_unit} onChange={(e)=>setItemForm((f)=>({...f,cost_per_unit:e.target.value}))} placeholder="Optional" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={itemForm.is_active} onCheckedChange={(v)=>setItemForm((f)=>({...f,is_active:v}))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setItemDialog(false)}>Cancel</Button>
            <Button loading={itemMutation.isPending} onClick={()=>itemMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment dialog */}
      <Dialog open={adjDialog} onOpenChange={setAdjDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5"><Label>Item</Label>
              <Select value={adjForm.inventory_item_id} onValueChange={(v)=>setAdjForm((f)=>({...f,inventory_item_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                <SelectContent>{items.map((i)=><SelectItem key={i.id} value={i.id}>{i.name} ({fmtUnit(i.unit)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={adjForm.adjustment_type} onValueChange={(v)=>setAdjForm((f)=>({...f,adjustment_type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add stock</SelectItem>
                    <SelectItem value="remove">Remove stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Quantity</Label>
                <Input type="number" step="0.1" value={adjForm.quantity} onChange={(e)=>setAdjForm((f)=>({...f,quantity:e.target.value}))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5"><Label>Note (optional)</Label>
              <Input value={adjForm.note} onChange={(e)=>setAdjForm((f)=>({...f,note:e.target.value}))} placeholder="Reason for adjustment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAdjDialog(false)}>Cancel</Button>
            <Button loading={adjMutation.isPending} onClick={()=>adjMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={transDialog} onOpenChange={setTransDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Transfer</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5"><Label>Item</Label>
              <Select value={transForm.inventory_item_id} onValueChange={(v)=>setTransForm((f)=>({...f,inventory_item_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                <SelectContent>{items.map((i)=><SelectItem key={i.id} value={i.id}>{i.name} ({fmtUnit(i.unit)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Destination Branch</Label>
              <Select value={transForm.destination_branch_id} onValueChange={(v)=>setTransForm((f)=>({...f,destination_branch_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select branch…" /></SelectTrigger>
                <SelectContent>
                  {branches.filter((b)=>b.id!==activeBranch.id).map((b)=><SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label>
              <Input type="number" step="0.1" value={transForm.quantity_sent} onChange={(e)=>setTransForm((f)=>({...f,quantity_sent:e.target.value}))} placeholder="0" />
            </div>
            <div className="space-y-1.5"><Label>Note (optional)</Label>
              <Input value={transForm.note} onChange={(e)=>setTransForm((f)=>({...f,note:e.target.value}))} placeholder="Optional note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setTransDialog(false)}>Cancel</Button>
            <Button loading={transMutation.isPending} onClick={()=>transMutation.mutate()}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
