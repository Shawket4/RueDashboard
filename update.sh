#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  make_responsive.sh
#  Run from the root of your dashboard project (where src/ lives).
#  Rewrites every component to be fully responsive / iPhone-friendly.
# ─────────────────────────────────────────────────────────────────────────────
set -e
SRC="src"

echo "▶  Starting responsive rewrite…"

# ─────────────────────────────────────────────────────────────────────────────
#  1. Layout.jsx  — mobile header with hamburger space
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SRC/components/Layout.jsx" << 'ENDOFFILE'
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const TITLES = {
  "/":            { title: "Dashboard",     sub: "System overview" },
  "/orgs":        { title: "Organizations", sub: "Manage all coffee brands on the platform" },
  "/users":       { title: "Users",         sub: "Manage staff accounts and access" },
  "/branches":    { title: "Branches",      sub: "Manage branch locations and printers" },
  "/menu":        { title: "Menu",          sub: "Categories, items and addons" },
  "/inventory":   { title: "Inventory",     sub: "Stock levels, adjustments and transfers" },
  "/recipes":     { title: "Recipes",       sub: "Drink ingredients and quantities" },
  "/shifts":      { title: "Shifts",        sub: "Reports and shift management" },
  "/permissions": { title: "Permissions",   sub: "User access control overrides" },
};

export default function Layout() {
  const loc  = useLocation();
  const segs = loc.pathname.split("/").filter(Boolean);
  const base = segs.length ? "/" + segs[0] : "/";
  const meta = TITLES[base] || { title: "Rue POS", sub: "" };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center px-4 lg:px-8 h-14 lg:h-16 gap-3">
            {/* Space for mobile hamburger button (rendered inside Sidebar) */}
            <div className="w-10 lg:hidden flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-bold text-gray-900 leading-none truncate">{meta.title}</h1>
              {meta.sub && <p className="text-gray-400 text-xs mt-0.5 truncate hidden sm:block">{meta.sub}</p>}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
ENDOFFILE

echo "  ✓  Layout.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  2. index.css  — add safe-area insets + prevent horizontal scroll
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SRC/index.css" << 'ENDOFFILE'
@import "tailwindcss";

* {
  font-family: 'Cairo', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

html, body, #root {
  overflow-x: hidden;
  overscroll-behavior: none;
}

/* Safe area support for iPhone notch/home bar */
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-top    { padding-top:    env(safe-area-inset-top); }

/* Prevent table overflow breaking layout */
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* Mobile card stacks instead of tables */
@media (max-width: 640px) {
  .mobile-card-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .mobile-hide      { display: none !important; }
  .mobile-full      { width: 100% !important; }
}
ENDOFFILE

echo "  ✓  index.css"

# ─────────────────────────────────────────────────────────────────────────────
#  3. Dashboard.jsx  — responsive grid + mobile-friendly stat cards
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SRC/pages/Dashboard.jsx" << 'ENDOFFILE'
import React from "react";
import { useAuth } from "../store/auth.jsx";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Users, GitBranch, Coffee, TrendingUp,
  AlertTriangle, Clock, ShoppingBag, CheckCircle2,
  ArrowRight, Package, RefreshCw,
} from "lucide-react";
import { getOrgs } from "../api/orgs";
import { getUsers } from "../api/users";
import { getBranches } from "../api/branches";
import { getCurrentShift } from "../api/shifts";
import { getInventoryItems } from "../api/inventory";
import { getOrders } from "../api/orders";
import { Link } from "react-router-dom";

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

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function StatCard({ icon: Icon, label, value, sub, color, bg, border, loading, to }) {
  const inner = (
    <div className={`bg-white rounded-2xl border ${border} p-4 sm:p-5 shadow-sm hover:shadow-md transition-all group h-full flex flex-col justify-between`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={color} />
        </div>
        {to && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={14} className="text-gray-300" />
          </div>
        )}
      </div>
      <div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-14 mb-2" />
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : (
          <>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none tabular-nums">{value ?? "—"}</p>
            <p className="text-gray-600 font-semibold text-xs sm:text-sm mt-1.5 sm:mt-2 leading-tight">{label}</p>
            {sub && <p className="text-gray-400 text-xs mt-0.5 leading-tight">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

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

  const hasOpen   = shiftData?.has_open_shift;
  const openShift = shiftData?.open_shift;
  const validOrds = orders.filter((o) => o.status !== "voided");
  const todaySales = validOrds.reduce((s, o) => s + (o.total_amount || 0), 0);
  const lowStock  = invItems.filter((i) => parseFloat(i.current_stock) <= parseFloat(i.reorder_threshold));

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md
      ${hasOpen ? "border-green-200" : "border-gray-100"}`}>
      <div className={`px-4 py-3 flex items-center justify-between border-b
        ${hasOpen ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
            ${shiftLoading ? "bg-gray-300 animate-pulse" : hasOpen ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" : "bg-gray-300"}`} />
          <p className="font-semibold text-gray-900 text-sm truncate">{branch.name}</p>
        </div>
        {!shiftLoading && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2
            ${hasOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {hasOpen ? "Open" : "Closed"}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {shiftLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ) : hasOpen && openShift ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-gray-500">Teller</span>
              <span className="font-semibold text-gray-800 text-right truncate">{openShift.teller_name}</span>
              <span className="text-gray-500">Running</span>
              <span className="font-mono text-gray-600 text-right">{dur(openShift.opened_at)}</span>
              <span className="text-gray-500">Opening</span>
              <span className="font-mono text-gray-600 text-right">{egp(openShift.opening_cash)}</span>
            </div>
            <div className="pt-1.5 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Today's Sales</span>
                <span className="font-bold text-blue-600 text-sm font-mono">{egp(todaySales)}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
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
          <p className="text-sm text-gray-400 text-center py-2">No active shift</p>
        )}

        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-700">
              {lowStock.length} item{lowStock.length > 1 ? "s" : ""} low on stock
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
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

function RecentOrders({ branches }) {
  const [activeBranchId, setActiveBranchId] = React.useState(null);
  const [shiftId, setShiftId] = React.useState(null);

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
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingBag size={14} className="text-blue-600 flex-shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm truncate">Recent Orders</h3>
          {shiftId && (
            <span className="text-xs text-gray-400 font-mono hidden sm:block truncate">
              {activeBranchId && branches?.find((b) => b.id === activeBranchId)?.name}
            </span>
          )}
        </div>
        <Link to="/shifts" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0 ml-2">
          All <ArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-16" /></div>
              <Skeleton className="h-4 w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : !shiftId ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <ShoppingBag size={24} className="text-gray-200" />
          <p className="text-sm">No open shift found</p>
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <ShoppingBag size={24} className="text-gray-200" />
          <p className="text-sm">No orders yet this shift</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {recent.map((order) => {
            const isVoided = order.status === "voided";
            return (
              <div key={order.id}
                className={`flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50 transition-colors ${isVoided ? "opacity-50" : ""}`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs
                  ${isVoided ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>
                  #{order.order_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full
                      ${PAYMENT_STYLE[order.payment_method] || "bg-gray-100 text-gray-600"}`}>
                      {norm(order.payment_method || "")}
                    </span>
                    {isVoided && (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Voided</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtTime(order.created_at)}</p>
                </div>
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
      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-amber-500 flex-shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm">Low Stock</h3>
          {low.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{low.length}</span>
          )}
        </div>
        <Link to="/inventory" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0 ml-2">
          Inventory <ArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : low.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <CheckCircle2 size={24} className="text-green-400" />
          <p className="text-sm">All stock levels OK</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {low.map((item) => {
            const pct = Math.min((parseFloat(item.current_stock) / parseFloat(item.reorder_threshold)) * 100, 100);
            const critical = parseFloat(item.current_stock) === 0;
            return (
              <div key={item.id} className="px-4 sm:px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate mr-2">{item.name}</p>
                  <span className={`text-xs font-bold font-mono flex-shrink-0 ${critical ? "text-red-600" : "text-amber-600"}`}>
                    {item.current_stock} {UNIT[item.unit] ?? item.unit}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${critical ? "bg-red-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SalesSummary({ branches }) {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["dashboard-sales-agg", branches?.map((b) => b.id)],
    enabled:  !!branches?.length,
    staleTime: 60_000,
    queryFn: async () => {
      let totalSales = 0, totalOrders = 0, totalCash = 0, totalCard = 0, openBranches = 0;
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
    { label: "Total Sales", value: egp(salesData?.totalSales),  color: "text-blue-600"   },
    { label: "Orders",      value: salesData?.totalOrders ?? 0, color: "text-green-600"  },
    { label: "Cash",        value: egp(salesData?.totalCash),   color: "text-gray-700"   },
    { label: "Card",        value: egp(salesData?.totalCard),   color: "text-violet-600" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Today's Sales</h3>
          {!isLoading && salesData && (
            <span className="text-xs text-gray-400">{salesData.openBranches} active</span>
          )}
        </div>
        <Link to="/shifts" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0">
          Details <ArrowRight size={11} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {items.map(({ label, value, color }) => (
          <div key={label} className="bg-white px-4 sm:px-5 py-3 sm:py-4">
            {isLoading ? (
              <><Skeleton className="h-5 w-20 mb-1" /><Skeleton className="h-3 w-12 mt-1" /></>
            ) : (
              <><p className={`text-base sm:text-lg font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p></>
            )}
          </div>
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
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoading ? "bg-gray-200 animate-pulse" : hasOpen ? "bg-green-500" : "bg-gray-300"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{branch.name}</p>
        {!isLoading && hasOpen && shift && (
          <p className="text-xs text-gray-400 truncate">{shift.teller_name} · {dur(shift.opened_at)}</p>
        )}
        {!isLoading && !hasOpen && <p className="text-xs text-gray-400">No active shift</p>}
      </div>
      {isLoading ? <Skeleton className="h-5 w-14" /> : (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0
          ${hasOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {hasOpen ? "Open" : "Closed"}
        </span>
      )}
    </div>
  );
}

function SuperAdminStats() {
  const { data: orgs,  isLoading: orgsLoading  } = useQuery({ queryKey: ["orgs"],       queryFn: () => getOrgs().then((r) => r.data) });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ["users", null], queryFn: () => getUsers(null).then((r) => r.data) });
  const stats = [
    { icon: Building2, label: "Organizations", value: orgs?.length,  sub: "Active brands",   color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   loading: orgsLoading,  to: "/orgs"  },
    { icon: Users,     label: "Total Users",   value: users?.length, sub: "Staff accounts",  color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", loading: usersLoading, to: "/users" },
    { icon: GitBranch, label: "Orgs Active",   value: orgs?.filter(o => o.is_active).length,  sub: "Live now", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", loading: orgsLoading },
    { icon: Coffee,    label: "Active Users",  value: users?.filter(u => u.is_active).length, sub: "Accounts", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", loading: usersLoading },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
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
    <div className="bg-white rounded-2xl border border-green-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-green-600" />
        </div>
      </div>
      <div>
        {loading || countLoading ? (
          <><Skeleton className="h-7 w-10 mb-2" /><Skeleton className="h-3 w-24 mb-1" /></>
        ) : (
          <>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">{shiftCount ?? 0}</p>
            <p className="text-gray-600 font-semibold text-xs sm:text-sm mt-1.5 sm:mt-2">Active Shifts</p>
            <p className="text-gray-400 text-xs mt-0.5">of {branches?.length ?? 0} branches</p>
          </>
        )}
      </div>
    </div>
  );
}

function OrgAdminStats({ orgId }) {
  const { data: users,    isLoading: usersLoading    } = useQuery({ queryKey: ["users", orgId],    queryFn: () => getUsers(orgId).then((r) => r.data),    enabled: !!orgId });
  const { data: branches, isLoading: branchesLoading } = useQuery({ queryKey: ["branches", orgId], queryFn: () => getBranches(orgId).then((r) => r.data), enabled: !!orgId });
  const stats = [
    { icon: Users,     label: "Staff",    value: users?.length,    sub: `${users?.filter(u => u.is_active).length ?? 0} active`,    color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", loading: usersLoading,    to: "/users"    },
    { icon: GitBranch, label: "Branches", value: branches?.length, sub: `${branches?.filter(b => b.is_active).length ?? 0} active`,  color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   loading: branchesLoading, to: "/branches" },
    { icon: Coffee,    label: "Operating",value: branches?.filter(b => b.is_active).length, sub: "Today", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", loading: branchesLoading },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
      <ActiveShiftsCard branches={branches} loading={branchesLoading} />
    </div>
  );
}

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

  const isSuperAdmin   = role === "super_admin";
  const isOrgLevel     = ["org_admin", "branch_manager"].includes(role);
  const showBranchGrid = isOrgLevel && (branches?.length ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

      {/* Welcome hero */}
      <div className="rounded-2xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a56db 0%, #3b28cc 100%)" }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-xs sm:text-sm font-medium mb-1">Dashboard</p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 leading-snug">{greet(user?.name)}</h2>
            <p className="text-blue-100 text-xs sm:text-sm capitalize">{role?.replace(/_/g, " ")} · Rue POS</p>
          </div>
          {!branchesLoading && branches?.length > 0 && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2 self-start">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-white">{branches.length} branch{branches.length !== 1 ? "es" : ""}</span>
            </div>
          )}
        </div>
      </div>

      {isSuperAdmin && <SuperAdminStats />}
      {isOrgLevel   && <OrgAdminStats orgId={orgId} />}

      {showBranchGrid && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Branch Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {branchesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-44 animate-pulse" />
                ))
              : branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)
            }
          </div>
        </div>
      )}

      {isOrgLevel && branches?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6">
            <SalesSummary branches={branches} />
            {branches.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center gap-2">
                  <Clock size={14} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Branch Status</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {branches.map((branch) => <BranchStatusRow key={branch.id} branch={branch} />)}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4 sm:space-y-6">
            <RecentOrders branches={branches} />
            <LowStockPanel branches={branches} />
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-blue-600" />
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
                  {a.label}<ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">System Status</h3>
            </div>
            {["API Server", "Database", "Auth Service"].map((s) => (
              <div key={s} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{s}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">Online</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
ENDOFFILE

echo "  ✓  Dashboard.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  4. Shifts.jsx  — replace tables with mobile cards, fix drawer width
# ─────────────────────────────────────────────────────────────────────────────
# Patch the ShiftRow component to stack on mobile and the drawer to be full-width
# We use Python for targeted replacements since the file is large
python3 - << 'PYEOF'
import re, pathlib

p = pathlib.Path("src/pages/shifts/Shifts.jsx")
src = p.read_text()

# 1. ShiftRow — replace fixed grid with responsive card on mobile
old_row = '''  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
        padding: "14px 20px",
        background: even ? "#fff" : "#FAFAFA",
        borderBottom: "1px solid #F5F5F5",
        cursor: "pointer", transition: "background 0.12s",
        alignItems: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
      onMouseLeave={(e) => (e.currentTarget.style.background = even ? "#fff" : "#FAFAFA")}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.teller_name}</span>
      <span style={{ fontSize: 12, color: "#6B7280" }}>{fmtDT(s.opened_at)}</span>
      <span style={{ fontSize: 12, color: "#6B7280" }}>{dur(s.opened_at, s.closed_at)}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{egp(s.opening_cash)}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>
        {orders.length > 0 ? egp(totalSales) : "—"}
      </span>
      <Badge status={s.status} />
      <span style={{ fontSize: 12, color: "#9CA3AF", textAlign: "right" }}>View →</span>
    </div>
  );'''

new_row = '''  return (
    <>
      {/* Mobile card */}
      <div
        className="sm:hidden"
        onClick={onClick}
        style={{
          padding: "14px 16px",
          background: even ? "#fff" : "#FAFAFA",
          borderBottom: "1px solid #F5F5F5",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{s.teller_name}</span>
          <Badge status={s.status} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{fmtDT(s.opened_at)}</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Duration: {dur(s.opened_at, s.closed_at)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#1a56db", margin: 0 }}>{orders.length > 0 ? egp(totalSales) : "—"}</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Opening: {egp(s.opening_cash)}</p>
          </div>
        </div>
      </div>
      {/* Desktop row */}
      <div
        className="hidden sm:grid"
        onClick={onClick}
        style={{
          gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
          padding: "14px 20px",
          background: even ? "#fff" : "#FAFAFA",
          borderBottom: "1px solid #F5F5F5",
          cursor: "pointer", transition: "background 0.12s",
          alignItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
        onMouseLeave={(e) => (e.currentTarget.style.background = even ? "#fff" : "#FAFAFA")}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.teller_name}</span>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{fmtDT(s.opened_at)}</span>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{dur(s.opened_at, s.closed_at)}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{egp(s.opening_cash)}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>
          {orders.length > 0 ? egp(totalSales) : "—"}
        </span>
        <Badge status={s.status} />
        <span style={{ fontSize: 12, color: "#9CA3AF", textAlign: "right" }}>View →</span>
      </div>
    </>
  );'''

src = src.replace(old_row, new_row)

# 2. Shift list header — hide on mobile
old_header = '''        <Card>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
            padding: "10px 20px",
            background: "#F9FAFB", borderBottom: "1px solid #F0F0F0",
          }}>
            {["Teller", "Opened", "Duration", "Opening Cash", "Total Sales", "Status", ""].map((h) => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 700, color: "#9CA3AF",
                letterSpacing: 0.4, textTransform: "uppercase",
              }}>
                {h}
              </span>
            ))}
          </div>
          {shifts.map((s, i) => (
            <ShiftRow key={s.id} s={s} even={i % 2 === 0} onClick={() => setSelectedShift(s)} />
          ))}
        </Card>'''

new_header = '''        <Card>
          <div className="hidden sm:grid" style={{
            gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
            padding: "10px 20px",
            background: "#F9FAFB", borderBottom: "1px solid #F0F0F0",
          }}>
            {["Teller", "Opened", "Duration", "Opening Cash", "Total Sales", "Status", ""].map((h) => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 700, color: "#9CA3AF",
                letterSpacing: 0.4, textTransform: "uppercase",
              }}>
                {h}
              </span>
            ))}
          </div>
          {shifts.map((s, i) => (
            <ShiftRow key={s.id} s={s} even={i % 2 === 0} onClick={() => setSelectedShift(s)} />
          ))}
        </Card>'''

src = src.replace(old_header, new_header)

# 3. ShiftDetail drawer — make full-width on mobile
old_drawer = '''        width: "min(820px, 96vw)",'''
new_drawer = '''        width: "min(820px, 100vw)",'''
src = src.replace(old_drawer, new_drawer)

# 4. ShiftDetail header actions — wrap on mobile
old_actions = '''          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>'''
new_actions = '''          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60vw" }}>'''
src = src.replace(old_actions, new_actions)

# 5. Stats grid in detail — single col on mobile
old_stats_grid = '''          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>'''
new_stats_grid = '''          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>'''
src = src.replace(old_stats_grid, new_stats_grid)

# 6. Main page padding
old_main = '''    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>'''
new_main = '''    <div style={{ padding: "16px", maxWidth: 1100, margin: "0 auto" }} className="sm:p-7">'''
src = src.replace(old_main, new_main)

# 7. Shift detail inner grid — single col on mobile
old_detail_grid = '''              {[
                ["Teller",             shift.teller_name],
                ["Opened At",          fmtDT(shift.opened_at)],'''
new_detail_grid = '''              {/* Details grid — 1 col on mobile, 2 on desktop */}
              {[
                ["Teller",             shift.teller_name],
                ["Opened At",          fmtDT(shift.opened_at)],'''
src = src.replace(old_detail_grid, new_detail_grid)

old_detail_grid_style = '''            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>'''
new_detail_grid_style = '''            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "10px 24px" }}>'''
src = src.replace(old_detail_grid_style, new_detail_grid_style)

p.write_text(src)
print("  patched Shifts.jsx")
PYEOF

echo "  ✓  Shifts.jsx (mobile cards + responsive drawer)"

# ─────────────────────────────────────────────────────────────────────────────
#  5. Recipes.jsx  — split panel stacks vertically on mobile
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/recipes/Recipes.jsx")
src = p.read_text()

# Replace the root layout div to stack on mobile
old_root = '''    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "#F9FAFB" }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div style={{
        width: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>'''

new_root = '''    <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 56px)", overflow: "hidden", background: "#F9FAFB" }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="flex-shrink-0 lg:w-64" style={{
        background: "#fff",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxHeight: "40vh",
      }} style2="lg:maxHeight:none lg:borderBottom:none lg:borderRight:1px solid #F0F0F0">'''

src = src.replace(old_root, new_root)

# Simpler fix: use className for responsive layout
old_root2 = '''    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "#F9FAFB" }}>

      {/* ── Left panel ─────────────────────────────────────── */}
      <div style={{
        width: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>'''

# Try direct replacement
src2 = p.read_text()
src2 = src2.replace(
    '    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "#F9FAFB" }}>',
    '    <div className="flex flex-col lg:flex-row" style={{ height: "calc(100dvh - 56px)", overflow: "hidden", background: "#F9FAFB" }}>'
)
src2 = src2.replace(
    '''      <div style={{
        width: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>''',
    '''      <div className="lg:w-64 flex-shrink-0" style={{
        background: "#fff",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxHeight: "40dvh",
      }}>\n      {/* On desktop: sidebar; on mobile: horizontal-scroll list at top */}'''
)
# Remove lg:borderRight hack — just add it as a className override
src2 = src2.replace(
    '      {/* On desktop: sidebar; on mobile: horizontal-scroll list at top */}',
    ''
)

# Right panel
src2 = src2.replace(
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>',
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>'
)

p.write_text(src2)
print("  patched Recipes.jsx")
PYEOF

echo "  ✓  Recipes.jsx (stacked on mobile)"

# ─────────────────────────────────────────────────────────────────────────────
#  6. Inventory.jsx  — tab bar scrollable on mobile, tables responsive
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/inventory/Inventory.jsx")
src = p.read_text()

# Make tab bar horizontally scrollable on mobile
src = src.replace(
    '          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">',
    '          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">'
)

# Make header flex wrap properly
src = src.replace(
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">',
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col gap-3">'
)

# Table wrapper — ensure overflow scroll
src = src.replace(
    '          <div className="overflow-x-auto">',
    '          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">',
    1  # first occurrence only
)

# Add min-width to tables so they scroll rather than squish
src = src.replace(
    '            <table className="w-full text-sm">',
    '            <table className="w-full text-sm" style={{ minWidth: 520 }}>',
    1
)

# Padding fix on mobile
src = src.replace(
    '    <div className="p-6 lg:p-8 space-y-6">',
    '    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">'
)

p.write_text(src)
print("  patched Inventory.jsx")
PYEOF

echo "  ✓  Inventory.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  7. Menu pages — sidebar collapses on mobile, category bar scrolls
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/menu/components/items/MenuItemsTab.jsx")
src = p.read_text()

# Category sidebar: hide on mobile, show as horizontal scroll bar instead
old_layout = '''      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1.5">'''

new_layout = '''      {/* Mobile: horizontal category scroll */}
      <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 px-0.5 -mx-0.5">
        <button
          onClick={() => setSelCat(null)}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all
            ${!selCat ? "bg-white shadow border border-gray-200 text-gray-900" : "bg-gray-100 text-gray-500"}`}
        >All</button>
        {categories?.map((cat) => (
          <button key={cat.id} onClick={() => setSelCat(cat.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all
              ${selCat === cat.id ? "bg-white shadow border border-gray-200 text-gray-900" : "bg-gray-100 text-gray-500"}`}>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Category sidebar — desktop only */}
        <div className="hidden sm:block w-52 flex-shrink-0 space-y-1.5">'''

src = src.replace(old_layout, new_layout)

# Close the hidden div properly after the sidebar
src = src.replace(
    '''        {/* Items panel */}
        <div className="flex-1 min-w-0">''',
    '''        </div>{/* end desktop sidebar */}
        {/* Items panel */}
        <div className="flex-1 min-w-0">'''
)

# Remove duplicate close on the flex container
src = src.replace(
    '''      </div>

      {/* Modals / Drawer */}''',
    '''      </div>{/* end flex gap-6 */}

      {/* Modals / Drawer */}'''
)

# Items grid — 1 col on mobile
src = src.replace(
    '              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">',
    '              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3 sm:p-6">'
)

p.write_text(src)
print("  patched MenuItemsTab.jsx")
PYEOF

python3 - << 'PYEOF'
import pathlib

# ConfigureDrawer — full width on mobile
p = pathlib.Path("src/pages/menu/components/items/ConfigureDrawer.jsx")
src = p.read_text()
src = src.replace(
    '      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">',
    '      <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-lg bg-white shadow-2xl z-50 flex flex-col">'
)
p.write_text(src)
print("  patched ConfigureDrawer.jsx")
PYEOF

echo "  ✓  Menu components"

# ─────────────────────────────────────────────────────────────────────────────
#  8. Branches.jsx, Users.jsx, Orgs.jsx, Permissions.jsx
#     — tables scroll, modals fit iPhone, header wraps
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib, re

FILES = [
    "src/pages/branches/Branches.jsx",
    "src/pages/users/Users.jsx",
    "src/pages/orgs/Orgs.jsx",
    "src/pages/permissions/Permissions.jsx",
]

REPLACEMENTS = [
    # Page padding
    ('className="p-6 lg:p-8 space-y-6"',         'className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"'),
    ('className="p-6 lg:p-8 space-y-4"',         'className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"'),
    # Table overflow already present for most — ensure touch scrolling
    ('className="overflow-x-auto"',               'className="overflow-x-auto"'),
    # Modal max height for small phones
    ('max-h-[90vh] overflow-y-auto',             'max-h-[92dvh] overflow-y-auto'),
    # Header bar padding
    ('className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4"',
     'className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"'),
    # Search width
    ('className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"',
     'className="border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"'),
]

for fpath in FILES:
    p = pathlib.Path(fpath)
    if not p.exists():
        print(f"  skip {fpath} (not found)")
        continue
    src = p.read_text()
    for old, new in REPLACEMENTS:
        src = src.replace(old, new)
    p.write_text(src)
    print(f"  patched {fpath}")
PYEOF

echo "  ✓  Branches / Users / Orgs / Permissions"

# ─────────────────────────────────────────────────────────────────────────────
#  9. Permissions.jsx  — resource cards single-col on mobile
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/permissions/Permissions.jsx")
src = p.read_text()

# Grid: 1 col on mobile, 2 on lg
src = src.replace(
    '      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">',
    '      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">'
)

# Action toggles inside card: 1 col on small phones
src = src.replace(
    '              <div className="px-5 py-4 grid grid-cols-2 gap-3">',
    '              <div className="px-3 sm:px-5 py-3 sm:py-4 grid grid-cols-2 gap-2 sm:gap-3">'
)

# Card header padding
src = src.replace(
    '              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">',
    '              <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-gray-50">'
)

p.write_text(src)
print("  patched Permissions.jsx")
PYEOF

echo "  ✓  Permissions.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  10. Login.jsx  — already decent, but tighten mobile padding
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/auth/Login.jsx")
src = p.read_text()

src = src.replace(
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12"',
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 py-8 sm:py-12"'
)

src = src.replace(
    'className="w-full max-w-sm"',
    'className="w-full max-w-sm px-1 sm:px-0"'
)

src = src.replace(
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-8 border border-gray-100"',
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 sm:p-8 border border-gray-100"'
)

p.write_text(src)
print("  patched Login.jsx")
PYEOF

echo "  ✓  Login.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  11. Sidebar.jsx  — fix hamburger button not overlapping content
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/components/Sidebar.jsx")
src = p.read_text()

# Make toggle button bigger touch target on mobile
src = src.replace(
    '''          width: 36,
            height: 36,''',
    '''          width: 40,
            height: 40,'''
)

# Ensure drawer is full-height including safe area
src = src.replace(
    '''            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 50,
            width: 272,''',
    '''            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 50,
            width: "min(272px, 85vw)",'''
)

p.write_text(src)
print("  patched Sidebar.jsx")
PYEOF

echo "  ✓  Sidebar.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  12. BulkActionBar.jsx  — shrink on mobile
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/menu/components/shared/BulkActionBar.jsx")
src = p.read_text()

src = src.replace(
    '    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">',
    '    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] sm:w-auto">'
)

src = src.replace(
    '      <div className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3">',
    '      <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl px-3 sm:px-4 py-3 justify-between sm:justify-start">'
)

p.write_text(src)
print("  patched BulkActionBar.jsx")
PYEOF

echo "  ✓  BulkActionBar.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  13. Add viewport meta to index.html if not already there
# ─────────────────────────────────────────────────────────────────────────────
if [ -f "index.html" ]; then
  if ! grep -q "viewport-fit=cover" index.html; then
    python3 - << 'PYEOF'
import pathlib, re
p = pathlib.Path("index.html")
src = p.read_text()
old = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
new = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />'
if old in src:
    src = src.replace(old, new)
    p.write_text(src)
    print("  updated viewport meta in index.html")
elif 'viewport' not in src:
    src = src.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />')
    p.write_text(src)
    print("  added viewport meta to index.html")
PYEOF
  fi
fi

echo "  ✓  index.html viewport"

echo ""
echo "✅  Responsive rewrite complete!"
echo ""
echo "Key changes:"
echo "  • All pages: 4px mobile padding, fluid grids, touch targets"
echo "  • Shifts: desktop table + mobile card view per row"
echo "  • Recipes: stacked panel on mobile (40/60 split)"
echo "  • Inventory: horizontally scrollable tab bar + tables"
echo "  • Menu: horizontal category scroll bar on mobile"
echo "  • Permissions: 1-col resource cards on mobile"
echo "  • Sidebar: drawer is min(272px, 85vw) — never clips on iPhone"
echo "  • Modals: max-h uses dvh units so keyboard doesn't clip them"
echo "  • index.html: viewport-fit=cover for iPhone notch"
echo ""
echo "Run: npm run dev  and test on iPhone."
ENDOFFILE

echo "  Script written."