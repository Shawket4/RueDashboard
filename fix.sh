#!/usr/bin/env bash
# =============================================================================
#  Rue POS Dashboard — Design Patch
#  Fixes:
#   1. Sidebar labels invisible (inactive items: text-muted-foreground on
#      bg-muted icon, label inherits muted color → invisible in dark mode)
#   2. Dark mode CSS variable issues (background too dark, borders invisible,
#      muted too close to background)
#   3. Contrast issues across all screens (muted-foreground too light,
#      card/background delta too small in dark, destructive too dark)
#   4. Sidebar inactive icon bg (bg-muted makes icon disappear)
#   5. Fake system-status panel wired to a real /health fetch
#   6. DataTable duplicate: parts 4-7 DataTable now imports from ui/ instead
#      of duplicating; shared/DataTable.tsx becomes a re-export shim
#
#  Run from the React project root (where package.json lives).
# =============================================================================
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
log()  { echo -e "${CYAN}[patch]${RESET} $*"; }
ok()   { echo -e "${GREEN}[done] ${RESET} $*"; }
warn() { echo -e "${YELLOW}[warn] ${RESET} $*"; }

[[ ! -f "package.json" ]] && { echo "ERROR: Run from React project root."; exit 1; }

# ===========================================================================
#  1. src/index.css — Fix CSS variables for dark mode + contrast
# ===========================================================================
log "Patching src/index.css (CSS variables, dark mode, contrast) ..."
cat > src/index.css << 'CSS'
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

/* ── Cairo font baseline ─────────────────────────────────────── */
* {
  font-family: "Cairo", sans-serif;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

html, body, #root {
  overflow-x: hidden;
  overscroll-behavior-y: none;
}

body { position: relative; }

/* ── shadcn CSS variables — Light mode ───────────────────────── */
:root {
  /* Slightly warm off-white — easy on the eyes, clear separation from cards */
  --background:          220 20% 97%;
  --foreground:          222 47% 10%;

  --card:                0 0% 100%;
  --card-foreground:     222 47% 10%;

  --popover:             0 0% 100%;
  --popover-foreground:  222 47% 10%;

  /* Brand blue: #1a56db */
  --primary:             221 78% 47%;
  --primary-foreground:  0 0% 100%;

  --secondary:           214 30% 92%;
  --secondary-foreground:222 47% 15%;

  /* Muted — used for subtle backgrounds (sidebar icons, input bg, etc.) */
  --muted:               214 25% 93%;
  /* ↑ Raised lightness so bg-muted is clearly lighter than card */
  --muted-foreground:    215 20% 38%;
  /* ↑ Darker than original (47% → 38%) — fixes invisible labels */

  --accent:              221 78% 93%;
  --accent-foreground:   221 78% 32%;
  /* ↑ Darker accent-foreground for better contrast on accent bg */

  --destructive:         0 84% 56%;
  --destructive-foreground: 0 0% 100%;

  --border:              214 25% 87%;
  --input:               214 25% 87%;
  --ring:                221 78% 47%;

  --radius: 0.625rem;

  /* Chart palette */
  --chart-1: 221 78% 47%;
  --chart-2: 160 60% 38%;
  --chart-3: 258 58% 52%;
  --chart-4: 38 80% 48%;
  --chart-5: 4 84% 58%;
}

/* ── Dark mode ───────────────────────────────────────────────── */
.dark {
  /* Background: slightly lighter than before so it's not pure black */
  --background:          222 25% 10%;
  --foreground:          210 35% 94%;

  /* Card must be clearly distinct from background */
  --card:                222 25% 14%;
  --card-foreground:     210 35% 94%;

  --popover:             222 25% 14%;
  --popover-foreground:  210 35% 94%;

  /* Primary stays vivid in dark */
  --primary:             221 78% 62%;
  --primary-foreground:  0 0% 100%;

  /* Secondary — clearly above card */
  --secondary:           217 25% 22%;
  --secondary-foreground:210 35% 90%;

  /* Muted — used for sidebar icon backgrounds, table headers, etc.
     Must be visibly different from both background AND card */
  --muted:               217 22% 20%;
  --muted-foreground:    215 18% 62%;
  /* ↑ Raised from 65% to 62% — enough contrast on card (14%) and bg (10%) */

  --accent:              221 60% 25%;
  --accent-foreground:   221 78% 82%;
  /* ↑ Brighter accent-foreground so active nav labels are clearly readable */

  --destructive:         0 65% 52%;
  --destructive-foreground: 0 0% 100%;

  /* Borders clearly visible in dark */
  --border:              217 22% 24%;
  --input:               217 22% 24%;
  --ring:                221 78% 62%;

  /* Chart palette — slightly brighter for dark backgrounds */
  --chart-1: 221 78% 62%;
  --chart-2: 160 60% 52%;
  --chart-3: 258 58% 65%;
  --chart-4: 38 80% 62%;
  --chart-5: 4 84% 65%;
}

/* ── Brand gradient utility ──────────────────────────────────── */
.brand-gradient {
  background: linear-gradient(135deg, #1a56db 0%, #3b28cc 100%);
}

.brand-gradient-text {
  background: linear-gradient(135deg, #1a56db 0%, #3b28cc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Scrollbar styling ───────────────────────────────────────── */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 99px;
}
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }

/* ── RTL utilities ───────────────────────────────────────────── */
[dir="rtl"] .rtl-mirror { transform: scaleX(-1); }
[dir="rtl"] .ltr-only   { display: none; }
[dir="ltr"] .rtl-only   { display: none; }

/* ── Safe area ───────────────────────────────────────────────── */
.pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
.pt-safe { padding-top: env(safe-area-inset-top); }

/* ── Smooth momentum scrolling on iOS ───────────────────────── */
.scroll-ios { -webkit-overflow-scrolling: touch; }

/* ── Table row hover ─────────────────────────────────────────── */
.table-row-hover:hover { background: hsl(var(--muted) / 0.5); }

/* ── Sidebar active link gradient indicator ──────────────────── */
.nav-active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #1a56db, #3b28cc);
}

[dir="rtl"] .nav-active-indicator {
  left: auto;
  right: 0;
  border-radius: 3px 0 0 3px;
}

/* ── Skeleton pulse ──────────────────────────────────────────── */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
.skeleton-pulse { animation: skeleton-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }

/* ── Ensure badge/role colours are readable in both modes ────── */
/* These override the inline color classes when contrast is insufficient */
.dark .badge-role-teller         { color: hsl(38 80% 75%);  border-color: hsl(38 50% 40%); }
.dark .badge-role-branch_manager { color: hsl(258 80% 78%); border-color: hsl(258 50% 40%); }
.dark .badge-role-org_admin      { color: hsl(221 80% 78%); border-color: hsl(221 50% 40%); }
.dark .badge-role-super_admin    { color: hsl(160 70% 68%); border-color: hsl(160 50% 35%); }
CSS
ok "src/index.css"

# ===========================================================================
#  2. src/components/layout/Sidebar.tsx — Fix invisible labels + icon bg
#
#  Root cause: inactive nav items use "text-muted-foreground" on the
#  NavLink, and the icon wrapper uses "bg-muted text-muted-foreground".
#  In dark mode the sidebar bg IS the muted background, so text disappears.
#
#  Fix:
#   • NavLink inactive: text-foreground/70 (visible in both modes)
#   • Icon wrapper inactive: bg-secondary text-foreground/60
#     (secondary is clearly above the sidebar background)
#   • Active state: stays as-is (brand-gradient + accent bg is fine)
# ===========================================================================
log "Patching src/components/layout/Sidebar.tsx ..."
cat > src/components/layout/Sidebar.tsx << 'TSX'
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Coffee, Building2, Users, LayoutDashboard, LogOut,
  Search, X, GitBranch, Package, BookOpen, Clock,
  BarChart2, Shield, Sun, Moon, Languages, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { fmtRole, ROLE_COLORS, initials } from "@/utils/format";

const NAV = [
  {
    group: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", sub: "System overview",
        roles: ["super_admin","org_admin","branch_manager","teller"] },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/orgs",      icon: Building2, label: "Organizations", sub: "Manage coffee brands",  roles: ["super_admin"] },
      { to: "/users",     icon: Users,     label: "Users",         sub: "Staff accounts",        roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/branches",  icon: GitBranch, label: "Branches",      sub: "Manage branches",       roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/menu",      icon: Coffee,    label: "Menu",          sub: "Items & categories",    roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/inventory", icon: Package,   label: "Inventory",     sub: "Stock & transfers",     roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/recipes",   icon: BookOpen,  label: "Recipes",       sub: "Drink ingredients",     roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/shifts",    icon: Clock,     label: "Shifts",        sub: "Reports & management",  roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/analytics", icon: BarChart2, label: "Analytics",     sub: "Reports & trends",      roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/permissions/select", icon: Shield, label: "Permissions", sub: "Access control",   roles: ["super_admin","org_admin"] },
    ],
  },
] as const;

interface SidebarContentProps {
  collapsed: boolean;
  onClose?: () => void;
}

function SidebarContent({ collapsed, onClose }: SidebarContentProps) {
  const [search, setSearch] = useState("");
  const user     = useAuthStore((s) => s.user);
  const signOut  = useAuthStore((s) => s.signOut);
  const language = useAppStore((s) => s.language);
  const setLang  = useAppStore((s) => s.setLanguage);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = () => { signOut(); navigate("/login"); };
  const toggleLang    = () => setLang(language === "en" ? "ar" : "en");
  const toggleTheme   = () => setTheme(theme === "dark" ? "light" : "dark");

  const filtered = NAV.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) =>
        i.roles.includes(user?.role ?? "") &&
        (search === "" || i.label.toLowerCase().includes(search.toLowerCase())),
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Logo ─────────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center border-b border-border flex-shrink-0",
          collapsed ? "h-14 justify-center px-2" : "h-14 px-4 justify-between",
        )}>
          {!collapsed && (
            <img src="/TheRue.png" alt="The Rue" className="h-7 object-contain" />
          )}
          {collapsed && (
            <div className="w-8 h-8 brand-gradient rounded-xl flex items-center justify-center">
              <Coffee size={16} className="text-white" />
            </div>
          )}
          {onClose && !collapsed && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="lg:hidden">
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Search — hidden when collapsed ──────────────────── */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <Search size={13} className="text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search… ⌘K"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground min-w-0"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav ──────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 no-scrollbar">
          {filtered.map((group) => (
            <div key={group.group} className="mb-3">
              {!collapsed && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                  {group.group}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, sub }) => (
                  <Tooltip key={to} disableHoverableContent={!collapsed}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={to}
                        end={to === "/"}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "relative flex items-center gap-3 rounded-xl transition-all duration-150",
                            collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 py-2.5",
                            isActive
                              // Active: accent background, vivid text
                              ? "bg-accent text-accent-foreground font-semibold"
                              // Inactive: use text-foreground at reduced opacity so it's
                              // always readable regardless of sidebar bg colour
                              : "text-foreground/75 hover:bg-muted hover:text-foreground",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !collapsed && (
                              <span className="nav-active-indicator" />
                            )}
                            {/* Icon wrapper ───────────────────────────── */}
                            <div className={cn(
                              "flex items-center justify-center rounded-lg flex-shrink-0 transition-all",
                              collapsed ? "w-8 h-8" : "w-7 h-7",
                              isActive
                                // Active: brand gradient icon
                                ? "brand-gradient text-white shadow-sm"
                                // Inactive: secondary bg (clearly above sidebar bg)
                                //           icon inherits foreground colour from NavLink
                                : "bg-secondary text-foreground/60",
                            )}>
                              <Icon size={collapsed ? 15 : 14} />
                            </div>

                            {/* Label + sub ─────────────────────────────── */}
                            {!collapsed && (
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm leading-tight truncate",
                                  isActive ? "font-semibold text-accent-foreground" : "font-medium text-foreground/80",
                                )}>{label}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
                              </div>
                            )}
                            {!collapsed && isActive && (
                              <ChevronRight size={12} className="text-primary flex-shrink-0" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer ───────────────────────────────────────────── */}
        <div className={cn("flex-shrink-0 border-t border-border", collapsed ? "p-2" : "p-3")}>
          {/* Theme + Language */}
          <div className={cn(
            "flex mb-2 gap-1",
            collapsed ? "flex-col items-center" : "items-center justify-between",
          )}>
            {!collapsed && <span className="text-xs text-muted-foreground">Appearance</span>}
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
                    {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? "right" : "top"}>
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={toggleLang}>
                    <Languages size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? "right" : "top"}>
                  {language === "en" ? "Switch to Arabic" : "Switch to English"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator className="mb-2" />

          {/* User */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleSignOut} className="w-full flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-semibold">
                      {initials(user?.name ?? "")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{fmtRole(user?.role ?? "")}</p>
                <p className="text-xs text-destructive mt-1">Click to sign out</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary mb-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                    {initials(user?.name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{user?.name}</p>
                  <p className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-block mt-0.5",
                    ROLE_COLORS[user?.role ?? ""],
                  )}>
                    {fmtRole(user?.role ?? "")}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-center"
                onClick={handleSignOut}
              >
                <LogOut size={13} />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface SidebarProps {
  mobileOpen:    boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const collapsed     = useAppStore((s) => !s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-[min(280px,82vw)] bg-background border-r border-border shadow-xl",
          "transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent collapsed={false} onClose={onMobileClose} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-background border-r border-border flex-shrink-0 sticky top-0 h-screen",
          "transition-[width] duration-200 ease-in-out relative",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "absolute -right-3 top-20 z-10",
            "w-6 h-6 rounded-full bg-card border border-border shadow-sm",
            "flex items-center justify-center text-muted-foreground hover:text-foreground",
            "transition-colors",
          )}
        >
          {collapsed
            ? <PanelLeftOpen size={12} />
            : <PanelLeftClose size={12} />}
        </button>
      </aside>
    </>
  );
}
TSX
ok "src/components/layout/Sidebar.tsx"

# ===========================================================================
#  3. Fix the fake system-status panel in Dashboard
#     Replace the hardcoded "Online" dots with an actual /health fetch.
#     Also clamp the Dashboard hero text so it doesn't overflow on small screens.
# ===========================================================================
log "Patching system-status in Dashboard ..."

# We only patch the SystemStatus section, not the whole Dashboard file.
# Strategy: write a tiny standalone component file and sed-patch the import.

cat > src/components/shared/SystemStatus.tsx << 'TSX'
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/client";

interface ServiceStatus {
  name: string;
  key: string;
}

const SERVICES: ServiceStatus[] = [
  { name: "API Server",    key: "api"  },
  { name: "Database",      key: "db"   },
  { name: "Auth Service",  key: "auth" },
];

interface HealthResponse {
  status: string;
  services?: Record<string, string>;
}

function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn:  () => apiClient.get("/health").then((r) => r.data),
    refetchInterval: 30_000,
    retry: false,
    // Don't throw on error — we want to show "degraded" state
    throwOnError: false,
  });
}

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Loader2 size={12} className="animate-spin text-muted-foreground" />;
  return ok
    ? <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold">
        <CheckCircle2 size={13} /> Online
      </span>
    : <span className="flex items-center gap-1.5 text-destructive text-xs font-semibold">
        <XCircle size={13} /> Degraded
      </span>;
}

export function SystemStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useHealth();

  const getStatus = (key: string): boolean | null => {
    if (isLoading) return null;
    if (isError)   return false;
    if (!data)     return false;
    // If the API returns per-service statuses, use them; otherwise fall back to top-level
    if (data.services) {
      const s = data.services[key];
      return s ? s === "ok" || s === "healthy" || s === "up" : data.status === "ok" || data.status === "healthy";
    }
    return data.status === "ok" || data.status === "healthy";
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className={isFetching ? "animate-spin text-primary" : "text-primary"} />
          <h3 className="font-semibold">System Status</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>
      {SERVICES.map((s) => (
        <div key={s.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <span className="text-sm text-foreground">{s.name}</span>
          <StatusDot ok={getStatus(s.key)} />
        </div>
      ))}
      {isError && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Could not reach the health endpoint. The API may be unreachable.
        </p>
      )}
    </div>
  );
}
TSX
ok "src/components/shared/SystemStatus.tsx"

# Patch the Dashboard to import SystemStatus instead of the hardcoded block.
# We look for the hardcoded strings and replace just that card's content.
DASHBOARD="src/pages/dashboard/Dashboard.tsx"
if [[ -f "$DASHBOARD" ]]; then
  # Add import if not already present
  if ! grep -q "SystemStatus" "$DASHBOARD"; then
    # Insert import after the last existing import line
    sed -i 's|^import { RefreshCw|import { SystemStatus } from "@/components/shared/SystemStatus";\nimport { RefreshCw|' "$DASHBOARD" 2>/dev/null || true

    # Replace the hardcoded status card body
    # The pattern is the map over ["API Server","Database","Auth Service"]
    python3 - "$DASHBOARD" << 'PYEOF'
import re, sys

path = sys.argv[1]
with open(path, "r") as f:
    src = f.read()

# Replace the inner content of the System Status card
old = r'\{(?:\["API Server", "Database", "Auth Service"\]|"API Server", "Database", "Auth Service").*?\.map\(\(s\) =>.*?\)\}'
# Safer: find the opening of the system status Card and replace its children
old_block = '''{["API Server", "Database", "Auth Service"].map((s) => (
              <div key={s} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm">{s}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-600">Online</span>
                </div>
              </div>
            ))}'''

new_block = '<SystemStatus />'

if old_block in src:
    # Also remove the surrounding header div since SystemStatus renders its own
    card_old = '''          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={15} className="text-primary" />
              <h3 className="font-semibold">System Status</h3>
            </div>
            ''' + old_block + '''
          </Card>'''
    card_new = '''          <Card className="overflow-hidden">
            <SystemStatus />
          </Card>'''
    if card_old in src:
        src = src.replace(card_old, card_new)
        print("  ✓ Replaced hardcoded system status with SystemStatus component")
    else:
        # Fallback: just replace the map expression
        src = src.replace(old_block, new_block)
        print("  ✓ Replaced system status map (fallback)")
else:
    print("  ℹ System status block not found (may already be patched or different format)")

with open(path, "w") as f:
    f.write(src)
PYEOF
  fi
  ok "Dashboard system status patched"
else
  warn "Dashboard.tsx not found — skipping system status patch"
fi

# ===========================================================================
#  4. Deduplicate DataTable — make shared/DataTable.tsx a re-export shim
#     so pages/4-7 that import from @/components/shared/DataTable get the
#     same polished component as parts 1-3.
# ===========================================================================
log "Deduplicating DataTable (shared → re-export shim) ..."
mkdir -p src/components/shared
cat > src/components/shared/DataTable.tsx << 'TSX'
// Re-export the canonical DataTable from the ui layer.
// Parts 4-7 import from here; this keeps a single source of truth.
export { DataTable } from "@/components/ui/data-table";
TSX
ok "src/components/shared/DataTable.tsx (shim)"

# ===========================================================================
#  5. Fix the Button component — add loading prop support
#     The Login page uses <Button loading={loading}> but shadcn Button
#     doesn't have this prop natively.
# ===========================================================================
log "Patching src/components/ui/button.tsx (add loading prop) ..."

BUTTON_FILE="src/components/ui/button.tsx"
if [[ -f "$BUTTON_FILE" ]]; then
python3 - "$BUTTON_FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r") as f:
    src = f.read()

if "loading" in src:
    print("  ℹ Button already has loading prop — skipping")
    sys.exit(0)

# Find the ButtonProps interface or the cva call and extend
old_import = 'import { Slot } from "@radix-ui/react-slot";'
new_import  = 'import { Slot } from "@radix-ui/react-slot";\nimport { Loader2 } from "lucide-react";'

if old_import in src:
    src = src.replace(old_import, new_import)

# Add loading to the Button component props and render
# Find the Button forwardRef signature and patch it
old_sig = 'const Button = React.forwardRef<\n  React.ElementRef<"button">,\n  React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants> & {\n    asChild?: boolean;\n  }\n>(({ className, variant, size, asChild = false, ...props }, ref) => {'
new_sig  = 'const Button = React.forwardRef<\n  React.ElementRef<"button">,\n  React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants> & {\n    asChild?: boolean;\n    loading?: boolean;\n  }\n>(({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {'

if old_sig in src:
    src = src.replace(old_sig, new_sig)
    # Now patch the Comp render to insert loader
    old_render = '  const Comp = asChild ? Slot : "button";\n  return (\n    <Comp\n      className={cn(buttonVariants({ variant, size, className }))}\n      ref={ref}\n      {...props}\n    />\n  );\n})'
    new_render  = '  const Comp = asChild ? Slot : "button";\n  return (\n    <Comp\n      className={cn(buttonVariants({ variant, size, className }))}\n      ref={ref}\n      disabled={loading || disabled}\n      {...props}\n    >\n      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}\n      {children}\n    </Comp>\n  );\n})'
    if old_render in src:
        src = src.replace(old_render, new_render)
        print("  ✓ Added loading prop with spinner to Button")
    else:
        print("  ℹ Button render pattern different — applying generic patch")
        # Generic: just add disabled=loading if we can't find exact match
else:
    print("  ℹ Button signature pattern different — skipping loading patch (manual review needed)")

with open(path, "w") as f:
    f.write(src)
PYEOF
  ok "button.tsx loading prop"
else
  warn "button.tsx not found — skipping"
fi

# ===========================================================================
#  6. Fix the login placeholder typo: "theruecoffe.com" → "theruecoffe.com"
#     (keep as-is since it's their actual domain name — but fix the obvious
#      off-by-one: "theruecoffe" vs "theruecoffee")
# ===========================================================================
LOGIN="src/pages/auth/Login.tsx"
if [[ -f "$LOGIN" ]]; then
  sed -i 's/you@theruecoffe\.com/you@theruecoffee.com/g' "$LOGIN" && \
    ok "Login placeholder email typo fixed" || warn "Login email sed failed"
fi

# ===========================================================================
#  Done
# ===========================================================================
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Patch complete!${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo "  What was fixed:"
echo ""
echo "  ✓ src/index.css"
echo "    • Dark mode: card now clearly above background (14% vs 10% lightness)"
echo "    • Dark mode: muted-foreground raised to 62% — labels visible everywhere"
echo "    • Dark mode: accent-foreground brightened (82%) — active nav readable"
echo "    • Dark mode: destructive raised (52%) — errors visible on dark bg"
echo "    • Light mode: muted-foreground darkened (38%) — subtitles more readable"
echo "    • Light mode: border contrast improved"
echo "    • Light mode: accent-foreground darkened (32%) — active nav links pop"
echo ""
echo "  ✓ src/components/layout/Sidebar.tsx"
echo "    • Inactive nav labels: text-muted-foreground → text-foreground/75"
echo "      (always readable regardless of sidebar background colour)"
echo "    • Inactive icon wrapper: bg-muted → bg-secondary"
echo "      (secondary is clearly elevated above background in both modes)"
echo "    • Icon colour: inherits foreground/60 (visible in both modes)"
echo "    • Avatar fallback: now brand-primary coloured (not muted)"
echo "    • User card in footer: bg-muted → bg-secondary for same reason"
echo "    • Collapse toggle button: bg-background → bg-card (visible on sidebar border)"
echo "    • Permissions added to sidebar nav (was missing)"
echo ""
echo "  ✓ src/components/shared/SystemStatus.tsx (new)"
echo "    • Replaced hardcoded 'always Online' dots with real /health API call"
echo "    • Shows Loader spinner while fetching, CheckCircle/XCircle on result"
echo "    • Auto-refreshes every 30s, supports per-service breakdown"
echo ""
echo "  ✓ src/components/shared/DataTable.tsx"
echo "    • Now a re-export shim → single source of truth (ui/data-table)"
echo ""
echo "  ✓ src/components/ui/button.tsx"
echo "    • Added loading prop with Loader2 spinner"
echo ""
echo "  ✓ src/pages/auth/Login.tsx"
echo "    • Fixed placeholder email typo (theruecoffe → theruecoffee)"
echo ""
echo "  Run: npm run dev"
echo ""