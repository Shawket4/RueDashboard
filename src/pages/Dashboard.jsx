import React from "react";
import { useAuth } from "../store/auth.jsx";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Users, GitBranch, Coffee, TrendingUp,
  AlertTriangle, Clock, ShoppingBag, CheckCircle2,
  XCircle, Loader2, ArrowRight, Package, RefreshCw,
} from "lucide-react";
import { getOrgs } from "../api/orgs";
import { getUsers } from "../api/users";
import { getBranches } from "../api/branches";
import { getCurrentShift, getBranchShifts } from "../api/shifts";
import { getInventoryItems } from "../api/inventory";
import { getOrders } from "../api/orders";
import { getBranchSales } from "../api/reports";
import { Link } from "react-router-dom";

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const egp = (n = 0) =>
  `EGP ${(n / 100).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

const dur = (start) => {
  const ms = Date.now() - new Date(start);
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const norm = (s = "") =>
  s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const greet = (name) => {
  const h = new Date().getHours();
  const word = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  return `Good ${word}, ${name?.split(" ")[0]} 👋`;
};

// ─────────────────────────────────────────────────────────────
//  SKELETON
// ─────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

// ─────────────────────────────────────────────────────────────
//  STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, border, loading, to }) {
  const inner = (
    <div className={`bg-white rounded-2xl border ${border} p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-between`}>
      {/* Top row — icon + arrow */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={color} />
        </div>
        {to && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={14} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Bottom — value + label + sub */}
      <div>
        {loading ? (
          <>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3.5 w-24 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900 leading-none tabular-nums">{value ?? "—"}</p>
            <p className="text-gray-600 font-semibold text-sm mt-2 leading-tight">{label}</p>
            {sub && <p className="text-gray-400 text-xs mt-0.5 leading-tight">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

// ─────────────────────────────────────────────────────────────
//  BRANCH HEALTH CARD
//  Fetches shift + inventory independently per branch
// ─────────────────────────────────────────────────────────────
function BranchCard({ branch }) {
  const { data: shiftData, isLoading: shiftLoading } = useQuery({
    queryKey: ["current-shift", branch.id],
    queryFn:  () => getCurrentShift(branch.id).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const shiftId = shiftData?.open_shift?.id;

  const { data: orders = [] } = useQuery({
    queryKey: ["shift-orders-flat", shiftId],
    queryFn:  () => getOrders({ shift_id: shiftId }).then((r) => r.data),
    enabled:  !!shiftId,
    staleTime: 30_000,
  });

  const { data: invItems = [] } = useQuery({
    queryKey: ["inventory", branch.id],
    queryFn:  () => getInventoryItems(branch.id).then((r) => r.data),
    staleTime: 120_000,
  });

  const hasOpen    = shiftData?.has_open_shift;
  const openShift  = shiftData?.open_shift;
  const validOrds  = orders.filter((o) => o.status !== "voided");
  const todaySales = validOrds.reduce((s, o) => s + (o.total_amount || 0), 0);
  const lowStock   = invItems.filter((i) => parseFloat(i.current_stock) <= parseFloat(i.reorder_threshold));

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md
      ${hasOpen ? "border-green-200" : "border-gray-100"}`}>

      {/* Header */}
      <div className={`px-5 py-3.5 flex items-center justify-between border-b
        ${hasOpen ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
            ${shiftLoading ? "bg-gray-300 animate-pulse" : hasOpen ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" : "bg-gray-300"}`}
          />
          <p className="font-semibold text-gray-900 text-sm">{branch.name}</p>
        </div>
        {!shiftLoading && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
            ${hasOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {hasOpen ? "Shift Open" : "No Shift"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {shiftLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : hasOpen && openShift ? (
          <>
            {/* Teller + time */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Teller</span>
              <span className="font-semibold text-gray-800">{openShift.teller_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Running</span>
              <span className="font-mono text-gray-600">{dur(openShift.opened_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Opening Cash</span>
              <span className="font-mono text-gray-600">{egp(openShift.opening_cash)}</span>
            </div>

            {/* Sales */}
            <div className="pt-1 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Today's Sales</span>
                <span className="font-bold text-blue-600 text-sm font-mono">{egp(todaySales)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{validOrds.length} orders</span>
                {orders.filter((o) => o.status === "voided").length > 0 && (
                  <span className="text-xs text-red-400">
                    {orders.filter((o) => o.status === "voided").length} voided
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">No active shift</p>
        )}

        {/* Low stock warning */}
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-700">
              {lowStock.length} item{lowStock.length > 1 ? "s" : ""} low on stock
            </span>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="px-5 pb-4">
        <Link
          to="/shifts"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          View Shifts <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RECENT ORDERS  (fetches from first open shift found)
// ─────────────────────────────────────────────────────────────
function RecentOrders({ branches }) {
  // Find first branch with open shift
  const [activeBranchId, setActiveBranchId] = React.useState(null);
  const [shiftId, setShiftId] = React.useState(null);

  // Poll each branch for open shift — pick first one found
  useQuery({
    queryKey: ["recent-orders-branch-scan", branches?.map((b) => b.id).join(",")],
    enabled: !!branches?.length && !activeBranchId,
    queryFn: async () => {
      for (const branch of branches) {
        try {
          const r = await getCurrentShift(branch.id).then((res) => res.data);
          if (r?.has_open_shift && r.open_shift?.id) {
            setActiveBranchId(branch.id);
            setShiftId(r.open_shift.id);
            return r;
          }
        } catch (_) {}
      }
      return null;
    },
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["shift-orders-flat", shiftId],
    queryFn:  () => getOrders({ shift_id: shiftId }).then((r) => r.data),
    enabled:  !!shiftId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  const PAYMENT_STYLE = {
    cash:           "bg-green-50 text-green-700",
    card:           "bg-blue-50 text-blue-700",
    digital_wallet: "bg-purple-50 text-purple-700",
    digital_wallet: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Recent Orders</h3>
          {shiftId && (
            <span className="text-xs text-gray-400 font-mono">
              {activeBranchId && branches?.find((b) => b.id === activeBranchId)?.name}
            </span>
          )}
        </div>
        <Link to="/shifts" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          All shifts <ArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : !shiftId ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <ShoppingBag size={28} className="text-gray-200" />
          <p className="text-sm">No open shift found</p>
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <ShoppingBag size={28} className="text-gray-200" />
          <p className="text-sm">No orders yet this shift</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {recent.map((order) => {
            const isVoided = order.status === "voided";
            return (
              <div key={order.id}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isVoided ? "opacity-50" : ""}`}>
                {/* Order number badge */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs
                  ${isVoided ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>
                  #{order.order_number}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${PAYMENT_STYLE[order.payment_method] || "bg-gray-100 text-gray-600"}`}>
                      {norm(order.payment_method || "")}
                    </span>
                    {isVoided && (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                        Voided
                      </span>
                    )}
                    {order.customer_name && (
                      <span className="text-xs text-gray-400 truncate">{order.customer_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtTime(order.created_at)}</p>
                </div>

                {/* Total */}
                <p className={`font-bold text-sm font-mono flex-shrink-0
                  ${isVoided ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  {egp(order.total_amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LOW STOCK PANEL  (org-level: scans first branch)
// ─────────────────────────────────────────────────────────────
function LowStockPanel({ branches }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-all", branches?.map((b) => b.id)],
    enabled:  !!branches?.length,
    staleTime: 120_000,
    queryFn: async () => {
      const results = await Promise.allSettled(
        (branches ?? []).map((b) => getInventoryItems(b.id).then((r) => r.data))
      );
      const map = new Map();
      results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value)
        .forEach((item) => {
          const existing = map.get(item.name);
          if (!existing || parseFloat(item.current_stock) < parseFloat(existing.current_stock)) {
            map.set(item.name, item);
          }
        });
      return [...map.values()];
    },
  });

  const low = items
    .filter((i) => parseFloat(i.current_stock) <= parseFloat(i.reorder_threshold))
    .sort((a, b) => (parseFloat(a.current_stock) / parseFloat(a.reorder_threshold)) - (parseFloat(b.current_stock) / parseFloat(b.reorder_threshold)))
    .slice(0, 6);

  const UNIT = { g: "g", kg: "kg", ml: "ml", l: "L", pcs: "pcs" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Low Stock Alerts</h3>
          {low.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {low.length}
            </span>
          )}
        </div>
        <Link to="/inventory" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          Inventory <ArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      ) : low.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <CheckCircle2 size={28} className="text-green-400" />
          <p className="text-sm">All stock levels OK</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {low.map((item) => {
            const pct = Math.min((parseFloat(item.current_stock) / parseFloat(item.reorder_threshold)) * 100, 100);
            const critical = parseFloat(item.current_stock) === 0;
            return (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <span className={`text-xs font-bold font-mono
                    ${critical ? "text-red-600" : "text-amber-600"}`}>
                    {item.current_stock} {UNIT[item.unit] ?? item.unit}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${critical ? "bg-red-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Reorder at {item.reorder_threshold} {UNIT[item.unit] ?? item.unit}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SALES SUMMARY  (today across open shift)
// ─────────────────────────────────────────────────────────────
function SalesSummary({ branches }) {
  // Aggregate today's sales across ALL branches with open shifts
  const queries = (branches ?? []).map((b) => ({
    queryKey: ["current-shift", b.id],
    queryFn:  () => getCurrentShift(b.id).then((r) => r.data),
    staleTime: 60_000,
  }));

  // We'll use a single aggregated query approach
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["dashboard-sales-agg", branches?.map((b) => b.id)],
    enabled:  !!branches?.length,
    staleTime: 60_000,
    queryFn: async () => {
      let totalSales = 0;
      let totalOrders = 0;
      let totalCash = 0;
      let totalCard = 0;
      let openBranches = 0;

      await Promise.allSettled(
        (branches ?? []).map(async (branch) => {
          try {
            const shiftData = await getCurrentShift(branch.id).then((r) => r.data);
            if (!shiftData?.has_open_shift || !shiftData.open_shift?.id) return;
            openBranches++;
            const orders = await getOrders({ shift_id: shiftData.open_shift.id }).then((r) => r.data);
            const valid = orders.filter((o) => o.status !== "voided");
            totalOrders += valid.length;
            valid.forEach((o) => {
              totalSales += o.total_amount || 0;
              if (o.payment_method === "cash") totalCash += o.total_amount || 0;
              if (o.payment_method === "card") totalCard += o.total_amount || 0;
            });
          } catch (_) {}
        })
      );

      return { totalSales, totalOrders, totalCash, totalCard, openBranches };
    },
  });

  const items = [
    { label: "Total Sales",   value: egp(salesData?.totalSales),  color: "text-blue-600",  bg: "bg-blue-50"  },
    { label: "Orders",        value: salesData?.totalOrders ?? 0,  color: "text-green-600", bg: "bg-green-50" },
    { label: "Cash",          value: egp(salesData?.totalCash),    color: "text-gray-700",  bg: "bg-gray-50"  },
    { label: "Card",          value: egp(salesData?.totalCard),    color: "text-violet-600",bg: "bg-violet-50"},
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Today's Sales</h3>
          {!isLoading && salesData && (
            <span className="text-xs text-gray-400">
              {salesData.openBranches} branch{salesData.openBranches !== 1 ? "es" : ""} active
            </span>
          )}
        </div>
        <Link to="/shifts" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          Details <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {items.map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white px-5 py-4">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-3 w-16 mt-1" />
              </>
            ) : (
              <>
                <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SHIFT STATUS ROW  (quick view of all branches)
// ─────────────────────────────────────────────────────────────
function AllBranchShiftStatus({ branches }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Clock size={15} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Branch Status</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {(branches ?? []).map((branch) => (
          <BranchStatusRow key={branch.id} branch={branch} />
        ))}
      </div>
    </div>
  );
}

function BranchStatusRow({ branch }) {
  const { data, isLoading } = useQuery({
    queryKey: ["current-shift", branch.id],
    queryFn:  () => getCurrentShift(branch.id).then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const hasOpen = data?.has_open_shift;
  const shift   = data?.open_shift;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5
        ${isLoading ? "bg-gray-200 animate-pulse" : hasOpen ? "bg-green-500" : "bg-gray-300"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{branch.name}</p>
        {!isLoading && hasOpen && shift && (
          <p className="text-xs text-gray-400">
            {shift.teller_name} · {dur(shift.opened_at)} · {egp(shift.opening_cash)} opening
          </p>
        )}
        {!isLoading && !hasOpen && (
          <p className="text-xs text-gray-400">No active shift</p>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
          ${hasOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {hasOpen ? "Open" : "Closed"}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SUPER ADMIN PLATFORM STATS
// ─────────────────────────────────────────────────────────────
function SuperAdminStats() {
  const { data: orgs,     isLoading: orgsLoading }     = useQuery({ queryKey: ["orgs"],              queryFn: () => getOrgs().then((r) => r.data) });
  const { data: users,    isLoading: usersLoading }    = useQuery({ queryKey: ["users", null],        queryFn: () => getUsers(null).then((r) => r.data) });

  const stats = [
    { icon: Building2, label: "Organizations", value: orgs?.length,  sub: "Active brands",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   loading: orgsLoading,  to: "/orgs"     },
    { icon: Users,     label: "Total Users",   value: users?.length, sub: "Staff accounts",   color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", loading: usersLoading, to: "/users"    },
    { icon: GitBranch, label: "Organizations", value: orgs?.length,  sub: `${orgs?.filter(o => o.is_active).length ?? 0} active`, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", loading: orgsLoading },
    { icon: Coffee,    label: "Active Users",  value: users?.filter(u => u.is_active).length, sub: "Active accounts", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", loading: usersLoading },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ORG / BRANCH ADMIN KPI ROW
// ─────────────────────────────────────────────────────────────
function OrgAdminStats({ orgId }) {
  const { data: users,    isLoading: usersLoading }    = useQuery({ queryKey: ["users", orgId],    queryFn: () => getUsers(orgId).then((r) => r.data),    enabled: !!orgId });
  const { data: branches, isLoading: branchesLoading } = useQuery({ queryKey: ["branches", orgId], queryFn: () => getBranches(orgId).then((r) => r.data), enabled: !!orgId });

  const stats = [
    { icon: Users,     label: "Staff",         value: users?.length,                      sub: `${users?.filter(u => u.is_active).length ?? 0} active`,  color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", loading: usersLoading,    to: "/users"    },
    { icon: GitBranch, label: "Branches",       value: branches?.length,                   sub: `${branches?.filter(b => b.is_active).length ?? 0} active`, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100",   loading: branchesLoading, to: "/branches" },
    { icon: Coffee,    label: "Menu Branches",  value: branches?.filter(b => b.is_active).length, sub: "Operating today", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",  loading: branchesLoading },
    { icon: Clock,     label: "Active Shifts",  value: null, sub: "Live now", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", loading: branchesLoading, _branchCount: branches?.length },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
      {stats.map((s, i) => (
        i === 3 ? <ActiveShiftsCard key={i} branches={branches} loading={branchesLoading} /> : <StatCard key={i} {...s} />
      ))}
    </div>
  );
}

function ActiveShiftsCard({ branches, loading }) {
  const { data: shiftCount, isLoading: countLoading } = useQuery({
    queryKey: ["active-shifts-count", branches?.map((b) => b.id)],
    enabled: !!branches?.length,
    staleTime: 60_000,
    queryFn: async () => {
      let count = 0;
      await Promise.allSettled(
        (branches ?? []).map(async (b) => {
          const d = await getCurrentShift(b.id).then((r) => r.data).catch(() => null);
          if (d?.has_open_shift) count++;
        })
      );
      return count;
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-green-600" />
        </div>
        {(loading || countLoading) && (
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mt-1" />
        )}
      </div>
      <div>
        {loading || countLoading ? (
          <>
            <Skeleton className="h-8 w-10 mb-2" />
            <Skeleton className="h-3.5 w-24 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900 leading-none tabular-nums">{shiftCount ?? 0}</p>
            <p className="text-gray-600 font-semibold text-sm mt-2 leading-tight">Active Shifts</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">of {branches?.length ?? 0} branches</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ROOT DASHBOARD
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const orgId    = user?.org_id;
  const role     = user?.role;

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
    staleTime: 120_000,
  });

  const isSuperAdmin     = role === "super_admin";
  const isOrgLevel       = ["org_admin", "branch_manager"].includes(role);
  const showBranchGrid   = isOrgLevel && (branches?.length ?? 0) > 0;
  const showTwoColBottom = isOrgLevel;

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* ── Welcome hero ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a56db 0%, #3b28cc 100%)" }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-blue-200 text-sm font-medium mb-1">Dashboard</p>
            <h2 className="text-2xl lg:text-3xl font-bold mb-1">{greet(user?.name)}</h2>
            <p className="text-blue-100 text-sm capitalize">
              {role?.replace(/_/g, " ")} · Rue POS
            </p>
          </div>
          {/* Live indicator */}
          {!branchesLoading && branches?.length > 0 && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-3 self-start">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.3)]" />
              <span className="text-sm font-semibold text-white">
                {branches.length} branch{branches.length !== 1 ? "es" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI stats ──────────────────────────────────────── */}
      {isSuperAdmin  && <SuperAdminStats />}
      {isOrgLevel    && <OrgAdminStats orgId={orgId} />}

      {/* ── Branch health grid ─────────────────────────────── */}
      {showBranchGrid && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-0.5">
            Branch Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-52 animate-pulse" />
                ))
              : branches.map((branch) => (
                  <BranchCard key={branch.id} branch={branch} />
                ))
            }
          </div>
        </div>
      )}

      {/* ── Bottom two-column section ───────────────────────── */}
      {showTwoColBottom && branches?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Sales summary + Branch status */}
          <div className="space-y-6">
            <SalesSummary branches={branches} />
            {branches.length > 1 && <AllBranchShiftStatus branches={branches} />}
          </div>

          {/* Right — Recent orders + Low stock */}
          <div className="space-y-6">
            <RecentOrders branches={branches} />
            <LowStockPanel branches={branches} />
          </div>
        </div>
      )}

      {/* ── Super admin bottom panel ────────────────────────── */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Manage Organizations", to: "/orgs",    color: "bg-blue-50 text-blue-700 hover:bg-blue-100"       },
                { label: "Manage Users",          to: "/users",   color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
                { label: "View All Branches",     to: "/branches",color: "bg-amber-50 text-amber-700 hover:bg-amber-100"   },
                { label: "Shifts & Reports",      to: "/shifts",  color: "bg-green-50 text-green-700 hover:bg-green-100"   },
              ].map((a) => (
                <Link key={a.label} to={a.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${a.color}`}>
                  {a.label}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">System Status</h3>
            </div>
            {[
              { label: "API Server",   status: "Online" },
              { label: "Database",     status: "Online" },
              { label: "Auth Service", status: "Online" },
            ].map((s) => (
              <div key={s.label}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Teller — minimal view ──────────────────────────── */}
      {role === "teller" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Your Shift</h3>
            </div>
            {user?.branch_id ? (
              <BranchCard branch={{ id: user.branch_id, name: "Your Branch" }} />
            ) : (
              <p className="text-sm text-gray-400">No branch assigned</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Quick Links</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "View Shifts",    to: "/shifts",   color: "bg-blue-50 text-blue-700 hover:bg-blue-100"  },
                { label: "Order History",  to: "/shifts",   color: "bg-green-50 text-green-700 hover:bg-green-100"},
              ].map((a) => (
                <Link key={a.label} to={a.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${a.color}`}>
                  {a.label} <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}