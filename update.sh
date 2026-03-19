#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  fix_mobile.sh  — targeted mobile fixes
#  Run from your project root (where src/ lives)
#  Fixes:
#    1. Header + hamburger — proper spacing, no overlap
#    2. Dashboard low-stock panel — scrollable, all items visible
#    3. Menu tab bar — wraps/scrolls, no text overflow
#    4. General small-screen polish throughout
# ─────────────────────────────────────────────────────────────────────────────
set -e
S="src"
echo "▶  Applying mobile fixes…"

# ── 1. index.html — viewport-fit=cover for notch/island ──────────────────────
if [ -f "index.html" ]; then
  python3 - << 'PYEOF'
import pathlib, re
p = pathlib.Path("index.html")
s = p.read_text()
s = re.sub(
  r'<meta name="viewport"[^>]+>',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
  s
)
p.write_text(s)
print("  ✓ index.html viewport")
PYEOF
fi

# ── 2. index.css — global mobile resets ──────────────────────────────────────
cat > "$S/index.css" << 'EOF'
@import "tailwindcss";

* {
  font-family: 'Cairo', sans-serif;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

html, body, #root {
  overflow-x: hidden;
  overscroll-behavior-y: none;
}

/* Prevent iOS bounce from hiding content */
body { position: relative; }

/* Safe area padding utilities */
.pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
.pt-safe { padding-top: env(safe-area-inset-top); }

/* Smooth momentum scrolling on iOS */
.scroll-ios { -webkit-overflow-scrolling: touch; }

/* Hide scrollbar but keep scrolling (for tab bars) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
EOF
echo "  ✓ index.css"

# ── 3. Layout.jsx — fix header so hamburger never overlaps title ──────────────
cat > "$S/components/Layout.jsx" << 'EOF'
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const TITLES = {
  "/":            { title: "Dashboard",     sub: "System overview" },
  "/orgs":        { title: "Organizations", sub: "Manage all coffee brands" },
  "/users":       { title: "Users",         sub: "Manage staff accounts" },
  "/branches":    { title: "Branches",      sub: "Manage branch locations" },
  "/menu":        { title: "Menu",          sub: "Categories, items and addons" },
  "/inventory":   { title: "Inventory",     sub: "Stock levels and transfers" },
  "/recipes":     { title: "Recipes",       sub: "Drink ingredients" },
  "/shifts":      { title: "Shifts",        sub: "Reports and shift management" },
  "/permissions": { title: "Permissions",   sub: "User access control" },
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
        {/* Header — 56px tall on mobile, 64px on desktop */}
        <header className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0"
          style={{ height: 56 }}>
          <div className="flex items-center h-full gap-0">
            {/* Hamburger placeholder — exactly 56px wide on mobile, 0 on desktop */}
            <div className="w-14 lg:w-0 flex-shrink-0" />
            {/* Title — centered on mobile with equal offset, left on desktop */}
            <div className="flex-1 min-w-0 pr-4 lg:pr-8 lg:pl-8">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                {meta.title}
              </h1>
              {meta.sub && (
                <p className="text-gray-400 text-xs mt-0.5 hidden sm:block truncate">
                  {meta.sub}
                </p>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-ios">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
EOF
echo "  ✓ Layout.jsx"

# ── 4. Sidebar.jsx — hamburger at correct position, never overlaps header text ─
cat > "$S/components/Sidebar.jsx" << 'EOF'
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import {
  Coffee, Building2, Users, LayoutDashboard,
  LogOut, Search, Menu, X,
  GitBranch, Package, BookOpen, ChevronRight, Clock,
} from "lucide-react";

function useIsDesktop() {
  const [ok, setOk] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const h = () => setOk(window.innerWidth >= 1024);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return ok;
}

const NAV = [
  {
    group: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", sub: "System overview", roles: ["super_admin","org_admin","branch_manager","teller"] },
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
    ],
  },
];

function SidebarContent({ user, onClose, onSignOut }) {
  const [search, setSearch] = useState("");
  const filtered = NAV.map(g => ({
    ...g,
    items: g.items.filter(i =>
      i.roles.includes(user?.role) &&
      (search === "" || i.label.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Logo row */}
      <div style={{
        height: 56,
        padding: "0 16px",
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <img src="/TheRue.png" alt="The Rue" style={{ height: 26, objectFit:"contain" }} />
        <button
          className="lg:hidden"
          onClick={onClose}
          style={{ border:"none", background:"none", cursor:"pointer", color:"#9CA3AF", padding:8, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:10, padding:"7px 11px" }}>
          <Search size={13} color="#9CA3AF" style={{ flexShrink:0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ border:"none", outline:"none", background:"transparent", fontSize:13, color:"#374151", width:"100%", minWidth:0 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ border:"none", background:"none", cursor:"pointer", color:"#9CA3AF", fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"8px 10px", WebkitOverflowScrolling:"touch" }}>
        {filtered.map(group => (
          <div key={group.group} style={{ marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", textTransform:"uppercase", padding:"0 8px", marginBottom:5 }}>
              {group.group}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {group.items.map(({ to, icon: Icon, label, sub }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10,
                    textDecoration:"none", transition:"all 0.15s",
                    background: isActive ? "#EFF6FF" : "transparent",
                    border: `1px solid ${isActive ? "#BFDBFE" : "transparent"}`,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <div style={{
                        width:32, height:32, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                        background: isActive ? "linear-gradient(135deg,#1a56db,#3b28cc)" : "#F3F4F6",
                        boxShadow: isActive ? "0 2px 8px rgba(26,86,219,0.3)" : "none",
                        transition:"all 0.15s",
                      }}>
                        <Icon size={14} color={isActive ? "#fff" : "#6B7280"} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight: isActive ? 700 : 500, color: isActive ? "#1a56db" : "#111827", margin:0, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {label}
                        </p>
                        <p style={{ fontSize:11, color:"#9CA3AF", margin:0, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {sub}
                        </p>
                      </div>
                      {isActive && <ChevronRight size={12} color="#1a56db" style={{ flexShrink:0 }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding:"10px 12px", borderTop:"1px solid #F3F4F6", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:12, background:"#F9FAFB", border:"1px solid #E5E7EB", marginBottom:7 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#1a56db,#3b28cc)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:800, flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#111827", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.name}</p>
            <p style={{ fontSize:11, color:"#6B7280", margin:0, textTransform:"capitalize" }}>{user?.role?.replace(/_/g," ")}</p>
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:"#1a56db", background:"#EFF6FF", border:"1px solid #BFDBFE", padding:"2px 7px", borderRadius:20, flexShrink:0, textTransform:"capitalize", letterSpacing:0.2 }}>
            {user?.role === "super_admin" ? "Admin" : user?.role?.split("_")[0]}
          </span>
        </div>
        <button
          onClick={onSignOut}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"9px 0", border:"none", borderRadius:10, background:"#FEF2F2", color:"#DC2626", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background="#DC2626"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background="#FEF2F2"; e.currentTarget.style.color="#DC2626"; }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);
  const isDesktop         = useIsDesktop();
  const handleSignOut     = () => { signOut(); navigate("/login"); };

  return (
    <>
      {/* Mobile hamburger — sits inside header height (56px), left edge */}
      {!isDesktop && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 60,
            width: 56,
            height: 56,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Menu size={17} color="#374151" />
          </div>
        </button>
      )}

      {/* Overlay */}
      {!isDesktop && open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(2px)" }}
        />
      )}

      {/* Mobile drawer */}
      {!isDesktop && (
        <aside style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 55,
          width: "min(280px, 82vw)",
          background: "#fff",
          borderRight: "1px solid #F3F4F6",
          boxShadow: "4px 0 24px rgba(0,0,0,0.1)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <SidebarContent user={user} onClose={() => setOpen(false)} onSignOut={handleSignOut} />
        </aside>
      )}

      {/* Desktop sidebar */}
      {isDesktop && (
        <aside style={{
          display: "flex",
          flexDirection: "column",
          width: 256,
          height: "100vh",
          background: "#fff",
          borderRight: "1px solid #F3F4F6",
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0,
          position: "sticky",
          top: 0,
        }}>
          <SidebarContent user={user} onClose={() => {}} onSignOut={handleSignOut} />
        </aside>
      )}
    </>
  );
}
EOF
echo "  ✓ Sidebar.jsx"

# ── 5. Dashboard — fix LowStockPanel scroll, fix SalesSummary ─────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/Dashboard.jsx")
if not p.exists():
    print("  skip Dashboard.jsx (not found)")
    exit()

s = p.read_text()

# Fix 1: page padding tighter on mobile
s = s.replace(
    'className="p-6 lg:p-8 space-y-6"',
    'className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6"'
)
s = s.replace(
    'className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"',
    'className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6"'
)

# Fix 2: LowStockPanel — make the divide-y container scrollable with a max-height
# Find the low stock items list container and add overflow
s = s.replace(
    '''      ) : low.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <CheckCircle2 size={24} className="text-green-400" />
          <p className="text-sm">All stock levels OK</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">''',
    '''      ) : low.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <CheckCircle2 size={24} className="text-green-400" />
          <p className="text-sm">All stock levels OK</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 320 }}>'''
)

# Fix 3: branch grid — tighter gap on mobile
s = s.replace(
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"',
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"'
)

# Fix 4: stat card grid — 2 cols always, no overflow
s = s.replace(
    'className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"',
    'className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"'
)

# Fix 5: welcome hero text smaller on very small screens
s = s.replace(
    'className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 leading-snug"',
    'className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1 leading-snug"'
)

p.write_text(s)
print("  ✓ Dashboard.jsx (low-stock scroll, spacing)")
PYEOF

# ── 6. Menu.jsx — tab bar scrollable, no text overflow ────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/menu/Menu.jsx")
if not p.exists():
    print("  skip Menu.jsx")
    exit()

s = p.read_text()

# Replace the tab bar container to scroll on mobile
s = s.replace(
    '''        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>''',
    '''        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar flex-shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>'''
)

# Header also needs to wrap better
s = s.replace(
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">',
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">'
)

p.write_text(s)
print("  ✓ Menu.jsx (tab bar scrollable)")
PYEOF

# ── 7. Inventory.jsx — tab bar scrollable ─────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/inventory/Inventory.jsx")
if not p.exists():
    print("  skip Inventory.jsx")
    exit()

s = p.read_text()

# Scrollable tab bar
s = s.replace(
    '          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">',
    '          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar">'
)

# Tab buttons — shrink text on mobile
s = s.replace(
    '''                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} />{label}''',
    '''                className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={12} /><span className="hidden xs:inline sm:inline">{label}</span><span className="xs:hidden sm:hidden">{label.slice(0,3)}</span>'''
)

# Page padding
s = s.replace(
    '    <div className="p-6 lg:p-8 space-y-6">',
    '    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">'
)

# Tables — ensure min-width so they scroll not squish
s = s.replace(
    '<table className="w-full text-sm">',
    '<table className="w-full text-sm" style={{ minWidth: 480 }}>'
)

# Header
s = s.replace(
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">',
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">'
)

p.write_text(s)
print("  ✓ Inventory.jsx (tab scrollable, table min-width)")
PYEOF

# ── 8. Shifts.jsx — tighter padding, mobile-friendly header ──────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/shifts/Shifts.jsx")
if not p.exists():
    print("  skip Shifts.jsx")
    exit()

s = p.read_text()

# Main page padding
s = s.replace(
    '    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>',
    '    <div style={{ padding: "12px 14px", maxWidth: 1100, margin: "0 auto" }} className="sm:p-7">'
)
s = s.replace(
    '    <div style={{ padding: "16px", maxWidth: 1100, margin: "0 auto" }} className="sm:p-7">',
    '    <div style={{ padding: "12px 14px", maxWidth: 1100, margin: "0 auto" }} className="sm:p-7">'
)

# Header row — wrap on mobile
s = s.replace(
    '      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>',
    '      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>'
)

# h1 font size
s = s.replace(
    '          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Shifts</h1>',
    '          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>Shifts</h1>'
)

# Branch select + open button row — always flex-wrap
s = s.replace(
    '        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>',
    '        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>'
)

# Branch select — full width on mobile
s = s.replace(
    '''            padding: "8px 14px", border: "1.5px solid #E5E7EB",
              borderRadius: 9, fontSize: 13, color: "#111827",
              background: "#fff", cursor: "pointer", outline: "none",''',
    '''            padding: "8px 12px", border: "1.5px solid #E5E7EB",
              borderRadius: 9, fontSize: 13, color: "#111827",
              background: "#fff", cursor: "pointer", outline: "none",
              maxWidth: "100%",'''
)

# Shift detail drawer — full width on mobile
s = s.replace(
    '        width: "min(820px, 100vw)",',
    '        width: "min(820px, 100dvw)",'
)
s = s.replace(
    '        width: "min(820px, 96vw)",',
    '        width: "min(820px, 100dvw)",'
)

# Shift detail header padding on mobile
s = s.replace(
    '          padding: "18px 24px", background: "#fff",',
    '          padding: "14px 16px", background: "#fff",'
)

# Shift detail inner content padding
s = s.replace(
    '          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>',
    '          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>'
)

p.write_text(s)
print("  ✓ Shifts.jsx (mobile padding + header)")
PYEOF

# ── 9. Branches + Users — tighter headers, modals slide up from bottom ────────
python3 - << 'PYEOF'
import pathlib

for fname in ["src/pages/branches/Branches.jsx", "src/pages/users/Users.jsx"]:
    p = pathlib.Path(fname)
    if not p.exists():
        print(f"  skip {fname}")
        continue

    s = p.read_text()

    # Page padding
    for old in [
        'className="p-6 lg:p-8 space-y-6"',
        'className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"',
    ]:
        s = s.replace(old, 'className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6"')

    # Modal — slide up from bottom on mobile
    s = s.replace(
        'className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"',
        'className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"'
    )
    # Modal panel — rounded top only on mobile
    s = s.replace(
        'className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 max-h-[90vh] overflow-y-auto"',
        'className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 max-h-[92dvh] overflow-y-auto"'
    )
    s = s.replace(
        'className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 max-h-[92dvh] overflow-y-auto"',
        'className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-100 max-h-[92dvh] overflow-y-auto"'
    )

    # Header bar
    s = s.replace(
        'className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4"',
        'className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3"'
    )

    # Table min-width
    s = s.replace(
        'className="w-full text-sm min-w-[600px]"',
        'className="w-full text-sm" style={{ minWidth: 520 }}'
    )

    p.write_text(s)
    print(f"  ✓ {fname}")
PYEOF

# ── 10. Permissions.jsx — single col on small screens ────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/permissions/Permissions.jsx")
if not p.exists():
    print("  skip Permissions.jsx")
    exit()

s = p.read_text()

s = s.replace(
    'className="p-6 lg:p-8 space-y-6"',
    'className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6"'
)
# Resource cards grid
s = s.replace(
    'className="grid grid-cols-1 lg:grid-cols-2 gap-4"',
    'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"'
)
# Action toggles inside each card
s = s.replace(
    'className="px-5 py-4 grid grid-cols-2 gap-3"',
    'className="px-3 sm:px-5 py-3 sm:py-4 grid grid-cols-2 gap-2 sm:gap-3"'
)
# Global presets bar
s = s.replace(
    'className="flex flex-col sm:flex-row sm:items-center gap-4"',
    'className="flex flex-col gap-3"'
)
# Preset buttons — wrap
s = s.replace(
    'className="flex items-center gap-2"',
    'className="flex items-center gap-2 flex-wrap"'
)

p.write_text(s)
print("  ✓ Permissions.jsx")
PYEOF

# ── 11. Recipes.jsx — stacked layout on mobile ────────────────────────────────
python3 - << 'PYEOF'
import pathlib, re

p = pathlib.Path("src/pages/recipes/Recipes.jsx")
if not p.exists():
    print("  skip Recipes.jsx")
    exit()

s = p.read_text()

# Root container — flex-col on mobile, flex-row on desktop
s = s.replace(
    '    <div className="flex flex-col lg:flex-row" style={{ height: "calc(100dvh - 56px)", overflow: "hidden", background: "#F9FAFB" }}>',
    '    <div style={{ display:"flex", flexDirection:"column", height:"calc(100dvh - 56px)", overflow:"hidden", background:"#F9FAFB" }} className="lg:flex-row">'
)
# Original if not yet patched
s = s.replace(
    '    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "#F9FAFB" }}>',
    '    <div style={{ display:"flex", flexDirection:"column", height:"calc(100dvh - 56px)", overflow:"hidden", background:"#F9FAFB" }} className="lg:flex-row">'
)

# Left panel — fixed height on mobile, full height on desktop
old_left = '''      <div style={{
        width: 260,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>'''
new_left = '''      <div className="lg:w-64 lg:flex-shrink-0 lg:border-r lg:border-b-0" style={{
        background: "#fff",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "42%",
        flexShrink: 0,
      }}>'''
s = s.replace(old_left, new_left)

# Also handle already-patched version
old_left2 = '''      <div className="lg:w-64 flex-shrink-0" style={{
        background: "#fff",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxHeight: "40dvh",
      }}>'''
s = s.replace(old_left2, new_left)

# Right panel
s = s.replace(
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>',
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, WebkitOverflowScrolling: "touch" }}>'
)
s = s.replace(
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>',
    '      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, WebkitOverflowScrolling: "touch" }}>'
)

p.write_text(s)
print("  ✓ Recipes.jsx")
PYEOF

# ── 12. Login.jsx — tighter mobile padding ────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/auth/Login.jsx")
if not p.exists():
    print("  skip Login.jsx")
    exit()

s = p.read_text()

s = s.replace(
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12"',
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 sm:py-12"'
)
s = s.replace(
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 py-8 sm:py-12"',
    'className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 sm:py-12"'
)
s = s.replace(
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-8 border border-gray-100"',
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-5 sm:p-8 border border-gray-100"'
)
s = s.replace(
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 sm:p-8 border border-gray-100"',
    'className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-5 sm:p-8 border border-gray-100"'
)

p.write_text(s)
print("  ✓ Login.jsx")
PYEOF

# ── 13. BulkActionBar — safe bottom on iPhone ─────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/pages/menu/components/shared/BulkActionBar.jsx")
if not p.exists():
    print("  skip BulkActionBar.jsx")
    exit()

s = p.read_text()

# Push up from iPhone home bar
for old in [
    'className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] sm:w-auto"',
    'className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"',
]:
    s = s.replace(old, 'className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] sm:w-auto" style={{ bottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}')

p.write_text(s)
print("  ✓ BulkActionBar.jsx")
PYEOF

echo ""
echo "✅  Mobile fixes applied!"
echo ""
echo "  Fix summary:"
echo "  • Header: hamburger is 56×56px flush with top-left, title offset correctly"
echo "  • Dashboard low-stock: scrollable container (max 320px), all items reachable"  
echo "  • Menu tab bar: horizontal scroll, no text overflow, smaller text on mobile"
echo "  • Inventory tab bar: same scroll fix"
echo "  • Shifts: tighter padding, header wraps on narrow screens"
echo "  • Recipes: stacked 42/58 split on mobile instead of side-by-side"
echo "  • Branches/Users: modals slide up from bottom (sheet-style) on mobile"
echo "  • Permissions: single-col cards on small screens"
echo "  • BulkActionBar: respects iPhone home bar safe area"
echo "  • index.css: iOS momentum scroll, no-scrollbar utility"
echo "  • index.html: viewport-fit=cover for notch"
echo ""
echo "  Run: npm run dev"