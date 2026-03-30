import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Printer,
  X,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  DollarSign,
  FileText,
  CheckCircle,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as shiftsApi from "@/api/shifts";
import * as branchesApi from "@/api/branches";
import * as reportsApi from "@/api/reports";
import type { Shift, ShiftReport, CashMovementSummaryRow } from "@/types";
import {
  egp,
  fmtDateTime,
  fmtDuration,
  fmtPayment,
  PAYMENT_COLORS,
  SHIFT_STATUS_COLORS,
  SHIFT_STATUS_LABELS,
} from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { getErrorMessage } from "@/lib/client";

// ── Shift Report Component ───────────────────────────────────────────────────
function ShiftReportView({
  shiftId,
  onClose,
}: {
  shiftId: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["shift-report", shiftId],
    queryFn: () => shiftsApi.getShiftReport(shiftId).then((r) => r.data),
  });

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head>
        <title>Shift Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { font-family: Cairo, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
          body { padding: 20px; color: #111; font-size: 13px; max-width: 380px; margin: 0 auto; }
          h1 { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 4px; }
          h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; text-align: center; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
          .row.bold { font-weight: 700; font-size: 13px; }
          .row.total { border-top: 2px solid #111; margin-top: 4px; padding-top: 8px; font-size: 14px; font-weight: 700; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
          .discrepancy-neg { color: #dc2626; }
          .discrepancy-pos { color: #16a34a; }
          hr { border: none; border-top: 1px dashed #ddd; margin: 12px 0; }
        </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 400);
  };

  if (isLoading)
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-xl" />
        ))}
      </div>
    );

  if (!report)
    return (
      <EmptyState icon={FileText} title="Report unavailable" className="h-64" />
    );

  const {
    shift,
    payment_summary,
    cash_movements,
    cash_movements_in,
    cash_movements_out,
    cash_movements_net,
    total_payments,
    net_payments,
  } = report;
  const discrepancy = shift.cash_discrepancy ?? 0;

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div>
          <h2 className="font-bold">Shift Report</h2>
          <p className="text-xs text-muted-foreground">
            {shift.teller_name} · {fmtDateTime(shift.opened_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={13} /> Print
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Printable content */}
        <div ref={printRef} className="p-6 space-y-6">
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block text-center mb-6">
            <h1>The Rue</h1>
            <h2>Shift Report</h2>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              title="Total Revenue"
              value={egp(total_payments)}
              iconColor="brand-gradient"
            />
            <StatCard title="Net Payments" value={egp(net_payments)} />
            <StatCard title="Opening Cash" value={egp(shift.opening_cash)} />
          </div>

          {/* Shift info */}
          <div className="section rounded-xl border p-4 space-y-2">
            <p className="section-title text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Shift Details
            </p>
            {[
              ["Teller", shift.teller_name],
              ["Status", SHIFT_STATUS_LABELS[shift.status] ?? shift.status],
              ["Opened", fmtDateTime(shift.opened_at)],
              ["Closed", shift.closed_at ? fmtDateTime(shift.closed_at) : "—"],
              [
                "Duration",
                fmtDuration(shift.opened_at, shift.closed_at ?? undefined),
              ],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center py-1 border-b border-border/40 last:border-0"
              >
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="rounded-xl border overflow-hidden">
            <div className="p-3 bg-muted/40 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment Breakdown
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {payment_summary.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No payments
                </p>
              ) : (
                payment_summary.map((row) => {
                  const color = PAYMENT_COLORS[row.payment_method] ?? "#888";
                  const pct =
                    total_payments > 0 ? (row.total / total_payments) * 100 : 0;
                  return (
                    <div key={row.payment_method} className="p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: color }}
                          />
                          <span className="text-sm font-medium">
                            {fmtPayment(row.payment_method)}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {row.order_count} orders
                          </Badge>
                        </div>
                        <span className="font-bold tabular-nums">
                          {egp(row.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="p-4 bg-muted/30 flex justify-between font-bold">
                <span>Total</span>
                <span className="tabular-nums">{egp(total_payments)}</span>
              </div>
            </div>
          </div>

          {/* Cash summary */}
          <div className="rounded-xl border overflow-hidden">
            <div className="p-3 bg-muted/40 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cash Summary
              </p>
            </div>
            <div className="p-4 space-y-3">
              {[
                {
                  label: "Opening Cash",
                  value: egp(shift.opening_cash),
                  icon: DollarSign,
                },
                {
                  label: "Cash Sales",
                  value: egp(
                    payment_summary.find((p) => p.payment_method === "cash")
                      ?.total ?? 0,
                  ),
                  icon: ArrowUpRight,
                },
                {
                  label: "Cash Movements In",
                  value: `+ ${egp(cash_movements_in)}`,
                  icon: ArrowDownLeft,
                  className: "text-green-600",
                },
                {
                  label: "Cash Movements Out",
                  value: `- ${egp(cash_movements_out)}`,
                  icon: ArrowUpRight,
                  className: "text-red-500",
                },
              ].map(({ label, value, icon: Icon, className: cn }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon size={13} />
                    {label}
                  </div>
                  <span
                    className={`font-semibold tabular-nums text-sm ${cn ?? ""}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Expected Closing Cash</span>
                <span className="font-bold tabular-nums">
                  {egp(shift.closing_cash_system ?? 0)}
                </span>
              </div>
              {shift.closing_cash_declared != null && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Declared Closing Cash</span>
                  <span className="font-bold tabular-nums">
                    {egp(shift.closing_cash_declared)}
                  </span>
                </div>
              )}
              {discrepancy !== 0 && (
                <div
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${discrepancy < 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      size={13}
                      className={
                        discrepancy < 0 ? "text-red-500" : "text-green-500"
                      }
                    />
                    <span className="font-semibold text-sm">Discrepancy</span>
                  </div>
                  <span
                    className={`font-bold tabular-nums ${discrepancy < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {discrepancy > 0 ? "+" : ""}
                    {egp(discrepancy)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cash movements */}
          {cash_movements.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <div className="p-3 bg-muted/40 border-b">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cash Movements
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {cash_movements.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.moved_by_name} · {fmtDateTime(m.created_at)}
                      </p>
                    </div>
                    <span
                      className={`font-bold tabular-nums text-sm ${m.amount < 0 ? "text-red-500" : "text-green-600"}`}
                    >
                      {m.amount > 0 ? "+" : ""}
                      {egp(m.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-muted/30 font-semibold text-sm">
                  <span>Net Movements</span>
                  <span
                    className={`tabular-nums ${cash_movements_net < 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    {cash_movements_net >= 0 ? "+" : ""}
                    {egp(cash_movements_net)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Shifts Page ──────────────────────────────────────────────────────────
export default function Shifts() {
  const user = useAuthStore((s) => s.user);
  const orgId = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const branchId = useAppStore((s) => s.selectedBranchId) ?? "";
  const qc = useQueryClient();

  const [selBranch, setSelBranch] = useState(branchId);
  const [reportShiftId, setReportShiftId] = useState<string | null>(null);

  // Dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState(false);
  const [forceDialog, setForceDialog] = useState(false);
  const [selShift, setSelShift] = useState<Shift | null>(null);

  const [openForm, setOpenForm] = useState({ opening_cash: "" });
  const [closeForm, setCloseForm] = useState({
    closing_cash_declared: "",
    notes: "",
  });
  const [cashForm, setCashForm] = useState({
    amount: "",
    note: "",
    direction: "in",
  });
  const [forceForm, setForceForm] = useState({ reason: "" });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn: () => branchesApi.getBranches(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  React.useEffect(() => {
    if (branches.length > 0 && !selBranch) {
      setSelBranch(branches[0].id);
    }
  }, [branches, selBranch]);

  const activeBranch = branches.find((b) => b.id === selBranch) ?? branches[0];

  const { data: preFill } = useQuery({
    queryKey: ["shift-prefill", activeBranch?.id],
    queryFn: () =>
      shiftsApi.getCurrentShift(activeBranch!.id).then((r) => r.data),
    enabled: !!activeBranch?.id,
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", activeBranch?.id],
    queryFn: () =>
      shiftsApi.getBranchShifts(activeBranch!.id).then((r) => r.data),
    enabled: !!activeBranch?.id,
  });

  const openMutation = useMutation({
    mutationFn: () =>
      shiftsApi.openShift(activeBranch!.id, {
        opening_cash: Math.round(parseFloat(openForm.opening_cash) * 100),
      }),
    onSuccess: () => {
      toast.success("Shift opened");
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["shift-prefill"] });
      setOpenDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      shiftsApi.closeShift(selShift!.id, {
        closing_cash_declared: Math.round(
          parseFloat(closeForm.closing_cash_declared) * 100,
        ),
        notes: closeForm.notes || null,
      }),
    onSuccess: () => {
      toast.success("Shift closed");
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["shift-prefill"] });
      setCloseDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cashMutation = useMutation({
    mutationFn: () => {
      const raw = parseFloat(cashForm.amount) * 100;
      const signed =
        cashForm.direction === "out" ? -Math.abs(raw) : Math.abs(raw);
      return shiftsApi.addCashMovement(selShift!.id, {
        amount: signed,
        note: cashForm.note,
      });
    },
    onSuccess: () => {
      toast.success("Cash movement recorded");
      qc.invalidateQueries({ queryKey: ["shifts"] });
      setCashDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const forceMutation = useMutation({
    mutationFn: () =>
      shiftsApi.forceCloseShift(selShift!.id, { reason: forceForm.reason }),
    onSuccess: () => {
      toast.success("Shift force closed");
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["shift-prefill"] });
      setForceDialog(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openShift = preFill?.open_shift;
  const hasOpen = preFill?.has_open_shift;
  const suggested = preFill?.suggested_opening_cash ?? 0;

  const columns: ColumnDef<Shift, any>[] = [
    {
      accessorKey: "teller_name",
      header: "Teller",
      cell: ({ row }) => (
        <span className="font-semibold text-sm">
          {row.original.teller_name}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={SHIFT_STATUS_COLORS[row.original.status]}>
          {SHIFT_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "opened_at",
      header: "Opened",
      cell: ({ row }) => (
        <span className="text-xs">{fmtDateTime(row.original.opened_at)}</span>
      ),
    },
    {
      accessorKey: "closed_at",
      header: "Closed",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.closed_at ? fmtDateTime(row.original.closed_at) : "—"}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-xs">
          {fmtDuration(
            row.original.opened_at,
            row.original.closed_at ?? undefined,
          )}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportShiftId(row.original.id)}
          >
            <FileText size={13} /> Report
          </Button>
          {row.original.status === "open" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelShift(row.original);
                  setCashDialog(true);
                }}
              >
                <DollarSign size={13} /> Cash
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelShift(row.original);
                  setCloseDialog(true);
                }}
              >
                <CheckCircle size={13} /> Close
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Shifts"
        sub={
          activeBranch
            ? `${activeBranch.name} · ${shifts.length} shifts`
            : "Select a branch"
        }
        actions={
          <div className="flex items-center gap-2">
            {branches.length > 1 && (
              <Select value={selBranch} onValueChange={setSelBranch}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Branch…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasOpen && openShift ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelShift(openShift);
                  setForceDialog(true);
                }}
              >
                Force Close
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setOpenForm({ opening_cash: String(suggested / 100) });
                  setOpenDialog(true);
                }}
              >
                <Plus size={13} /> Open Shift
              </Button>
            )}
          </div>
        }
      />

      {/* Open shift banner */}
      {hasOpen && openShift && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Shift is open
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {openShift.teller_name} · {fmtDateTime(openShift.opened_at)} ·{" "}
              {fmtDuration(openShift.opened_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReportShiftId(openShift.id)}
            >
              <FileText size={13} /> Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelShift(openShift);
                setCashDialog(true);
              }}
            >
              <DollarSign size={13} /> Cash
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelShift(openShift);
                setCloseDialog(true);
              }}
            >
              <CheckCircle size={13} /> Close Shift
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <DataTable
          data={shifts}
          columns={columns}
          searchPlaceholder="Search shifts…"
          pageSize={15}
        />
      )}

      {/* Open shift dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {suggested > 0 && (
              <div className="bg-accent rounded-xl px-4 py-3 text-sm">
                Suggested opening cash (previous closing):{" "}
                <strong>{egp(suggested)}</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Opening Cash (EGP)</Label>
              <Input
                type="number"
                step="0.5"
                value={openForm.opening_cash}
                onChange={(e) => setOpenForm({ opening_cash: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button
              loading={openMutation.isPending}
              onClick={() => openMutation.mutate()}
            >
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close shift dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Declared Closing Cash (EGP)</Label>
              <Input
                type="number"
                step="0.5"
                value={closeForm.closing_cash_declared}
                onChange={(e) =>
                  setCloseForm((f) => ({
                    ...f,
                    closing_cash_declared: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={closeForm.notes}
                onChange={(e) =>
                  setCloseForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>
              Cancel
            </Button>
            <Button
              loading={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash movement dialog */}
      <Dialog open={cashDialog} onOpenChange={setCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Movement</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={cashForm.direction}
                onValueChange={(v) =>
                  setCashForm((f) => ({ ...f, direction: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Cash In (add to drawer)</SelectItem>
                  <SelectItem value="out">
                    Cash Out (remove from drawer)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (EGP)</Label>
              <Input
                type="number"
                step="0.5"
                value={cashForm.amount}
                onChange={(e) =>
                  setCashForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={cashForm.note}
                onChange={(e) =>
                  setCashForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="Reason for movement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialog(false)}>
              Cancel
            </Button>
            <Button
              loading={cashMutation.isPending}
              onClick={() => cashMutation.mutate()}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force close dialog */}
      <Dialog open={forceDialog} onOpenChange={setForceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Close Shift</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
              Force closing will end the shift without a proper cash count. Use
              only when necessary.
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                value={forceForm.reason}
                onChange={(e) => setForceForm({ reason: e.target.value })}
                placeholder="Required reason…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={forceMutation.isPending}
              onClick={() => forceMutation.mutate()}
            >
              Force Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift report drawer */}
      <Dialog
        open={!!reportShiftId}
        onOpenChange={(o) => !o && setReportShiftId(null)}
      >
        <DialogContent sheet="right" showClose={false} className="p-0">
          {reportShiftId && (
            <ShiftReportView
              shiftId={reportShiftId}
              onClose={() => setReportShiftId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
