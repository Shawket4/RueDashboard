#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  fix_mobile2.sh  — fixes for:
#    1. Sidebar: hamburger overlaps logo — fixed by removing floating button,
#       putting toggle inside the header bar instead
#    2. Dashboard low-stock: items not scrollable — full panel rewrite
#    3. Inventory tabs: too small / not scrollable — exact same fix as Menu
#  Run from project root
# ─────────────────────────────────────────────────────────────────────────────
set -e
echo "▶  Applying targeted fixes…"

# ─────────────────────────────────────────────────────────────────────────────
#  1. Layout.jsx + Sidebar.jsx — rethink mobile nav
#
#  NEW APPROACH: No floating hamburger button at all.
#  The hamburger lives INSIDE the header bar on the left.
#  Sidebar on mobile is a drawer that opens from the left.
#  This means Layout renders the hamburger, and Sidebar just renders the drawer.
# ─────────────────────────────────────────────────────────────────────────────
cat > src/components/Layout.jsx << 'ENDOFFILE'
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

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
  const loc    = useLocation();
  const segs   = loc.pathname.split("/").filter(Boolean);
  const base   = segs.length ? "/" + segs[0] : "/";
  const meta   = TITLES[base] || { title: "Rue POS", sub: "" };
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — receives open state on mobile */}
      <Sidebar mobileOpen={open} onMobileClose={() => setOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0 flex items-center h-14 px-3 lg:px-8 gap-3">
          {/* Hamburger — only visible on mobile, sits in header not floating */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition"
            aria-label="Open menu"
          >
            <Menu size={18} color="#374151" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
              {meta.title}
            </h1>
            <p className="text-gray-400 text-xs mt-0.5 hidden sm:block truncate">
              {meta.sub}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
ENDOFFILE
echo "  ✓ Layout.jsx"

# ─────────────────────────────────────────────────────────────────────────────
#  Sidebar.jsx — no floating button, accepts mobileOpen/onMobileClose props
# ─────────────────────────────────────────────────────────────────────────────
cat > src/components/Sidebar.jsx << 'ENDOFFILE'
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import {
  Coffee, Building2, Users, LayoutDashboard,
  LogOut, Search, X,
  GitBranch, Package, BookOpen, ChevronRight, Clock,
} from "lucide-react";

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
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Logo row — always visible, hamburger X on mobile */}
      <div style={{
        padding: "0 16px",
        height: 56,
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <img
          src="/TheRue.png"
          alt="The Rue"
          style={{ height: 28, objectFit: "contain", maxWidth: 120 }}
        />
        {/* Close button — only shown on mobile via onClose being meaningful */}
        <button
          onClick={onClose}
          className="lg:hidden"
          style={{
            border: "none", background: "none", cursor: "pointer",
            color: "#9CA3AF", padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "#F9FAFB", border: "1px solid #E5E7EB",
          borderRadius: 10, padding: "7px 11px",
        }}>
          <Search size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: "#374151", width: "100%", minWidth: 0,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ border:"none", background:"none", cursor:"pointer", color:"#9CA3AF", fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}
            >×</button>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px", WebkitOverflowScrolling: "touch" }}>
        {filtered.map(group => (
          <div key={group.group} style={{ marginBottom: 16 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#9CA3AF",
              letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "0 8px", marginBottom: 5,
            }}>{group.group}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map(({ to, icon: Icon, label, sub }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 10,
                    textDecoration: "none", transition: "all 0.15s",
                    background: isActive ? "#EFF6FF" : "transparent",
                    border: `1px solid ${isActive ? "#BFDBFE" : "transparent"}`,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isActive ? "linear-gradient(135deg,#1a56db,#3b28cc)" : "#F3F4F6",
                        boxShadow: isActive ? "0 2px 8px rgba(26,86,219,0.3)" : "none",
                        transition: "all 0.15s",
                      }}>
                        <Icon size={14} color={isActive ? "#fff" : "#6B7280"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#1a56db" : "#111827",
                          margin: 0, lineHeight: 1.3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{label}</p>
                        <p style={{
                          fontSize: 11, color: "#9CA3AF", margin: 0, lineHeight: 1.3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{sub}</p>
                      </div>
                      {isActive && <ChevronRight size={12} color="#1a56db" style={{ flexShrink: 0 }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "9px 11px", borderRadius: 12,
          background: "#F9FAFB", border: "1px solid #E5E7EB", marginBottom: 7,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#1a56db,#3b28cc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, color: "#111827", margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0, textTransform: "capitalize" }}>
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#1a56db",
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            padding: "2px 7px", borderRadius: 20, flexShrink: 0,
            textTransform: "capitalize", letterSpacing: 0.2,
          }}>
            {user?.role === "super_admin" ? "Admin" : user?.role?.split("_")[0]}
          </span>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 7, padding: "9px 0", border: "none", borderRadius: 10,
            background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#DC2626"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#DC2626"; }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const handleSignOut     = () => { signOut(); navigate("/login"); };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="lg:hidden"
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50,
          width: "min(280px, 82vw)",
          background: "#fff", borderRight: "1px solid #F3F4F6",
          boxShadow: "4px 0 24px rgba(0,0,0,0.1)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <SidebarContent user={user} onClose={onMobileClose} onSignOut={handleSignOut} />
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside
        className="hidden lg:flex"
        style={{
          flexDirection: "column", width: 256, height: "100vh",
          background: "#fff", borderRight: "1px solid #F3F4F6",
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0, position: "sticky", top: 0,
        }}
      >
        <SidebarContent user={user} onClose={() => {}} onSignOut={handleSignOut} />
      </aside>
    </>
  );
}
ENDOFFILE
echo "  ✓ Sidebar.jsx (no floating button, logo always visible)"

# ─────────────────────────────────────────────────────────────────────────────
#  2. Dashboard — fix low-stock panel to always show all items scrollably
#     We rewrite just the LowStockPanel function using Python
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib, re

p = pathlib.Path("src/pages/Dashboard.jsx")
if not p.exists():
    print("  skip Dashboard.jsx")
    exit()

s = p.read_text()

# Find and replace the entire LowStockPanel component
# Key fix: remove the .slice(0, 6) limit AND make the list overflow-y scroll
# Also fix the panel itself to not have a fixed height cutting items off

# Fix 1: remove the slice limit so all low stock items appear
s = s.replace(
    '.slice(0, 6)',
    ''
)

# Fix 2: the items container — make it scroll properly
# There are two variants depending on which patch was applied
for old in [
    '<div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 320 }}>',
    '<div className="divide-y divide-gray-50">',
]:
    s = s.replace(
        old,
        '<div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: "min(360px, 50dvh)" }}>',
        1
    )

# Fix 3: the outer card — ensure it can grow but doesn't push other cards off screen
# Find the LowStockPanel card wrapper and ensure it doesn't clip
s = s.replace(
    '<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">\n      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">\n        <div className="flex items-center gap-2">\n          <Package size={14} className="text-amber-500 flex-shrink-0" />',
    '<div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 0 }}>\n      <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">\n        <div className="flex items-center gap-2">\n          <Package size={14} className="text-amber-500 flex-shrink-0" />',
    1
)

p.write_text(s)
print("  ✓ Dashboard.jsx (low-stock: removed slice limit, scrollable list)")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
#  3. Inventory.jsx — copy the exact working tab bar from Menu.jsx
#     The Menu fix used: overflow-x-auto no-scrollbar, whitespace-nowrap,
#     flex-shrink-0 on buttons, smaller text. Apply identically to Inventory.
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib, re

p = pathlib.Path("src/pages/inventory/Inventory.jsx")
if not p.exists():
    print("  skip Inventory.jsx")
    exit()

s = p.read_text()

# ── Replace the entire tab bar section ──
# Find the TABS constant to know label names, then rewrite the rendered bar

# The rendered tab bar — multiple possible states from previous patches
# We'll replace any version of the inventory tab bar with the working one

# Pattern 1: original
old1 = '''          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>'''

# Pattern 2: broken patch from fix_mobile.sh
old2 = '''          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
                className={`flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={12} /><span className="hidden xs:inline sm:inline">{label}</span><span className="xs:hidden sm:hidden">{label.slice(0,3)}</span>'''

# Pattern 3: overflow-x-auto version
old3 = '''          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>'''

# The correct replacement — identical to what works in Menu.jsx
new_tabbar = '''          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar flex-shrink-0" style={{ WebkitOverflowScrolling: "touch" }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>'''

replaced = False
for old in [old1, old2, old3]:
    if old in s:
        s = s.replace(old, new_tabbar, 1)
        replaced = True
        break

if not replaced:
    # Fallback: use regex to find and replace the tab bar container
    pattern = r'<div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1[^"]*">\s*\{TABS\.map\([^}]+\}\)\s*\}\s*\}\)\}\s*</div>'
    new_tabbar_re = '''<div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar flex-shrink-0" style={{ WebkitOverflowScrolling: "touch" }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                  ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>'''
    s, n = re.subn(pattern, new_tabbar_re, s, flags=re.DOTALL)
    replaced = n > 0

# Also fix the header bar to not squish on mobile
s = s.replace(
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">',
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center">'
)
s = s.replace(
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">',
    '      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center">'
)

# The flex-wrap for the right-side controls
s = s.replace(
    '        <div className="flex flex-wrap items-center gap-3">',
    '        <div className="flex flex-wrap items-center gap-2 sm:gap-3">'
)

p.write_text(s)
print(f"  ✓ Inventory.jsx tabs {'replaced' if replaced else 'regex-replaced'}")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
#  4. index.css — ensure no-scrollbar utility is defined
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib

p = pathlib.Path("src/index.css")
s = p.read_text()

if "no-scrollbar" not in s:
    s += """
/* Hide scrollbar but keep scrolling (used for tab bars) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
"""
    p.write_text(s)
    print("  ✓ index.css (added no-scrollbar)")
else:
    print("  ✓ index.css (no-scrollbar already present)")
PYEOF

echo ""
echo "✅  Done!"
echo ""
echo "  Changes:"
echo "  1. Sidebar/Layout: hamburger is now INSIDE the header bar (left side)."
echo "     Logo is fully visible — no overlap possible."
echo "  2. Dashboard low-stock: removed 6-item slice limit, list scrolls inside"
echo "     the card up to min(360px, 50dvh) so all items are reachable."
echo "  3. Inventory tabs: exact same working fix as Menu — overflow-x-auto,"
echo "     no-scrollbar, whitespace-nowrap, flex-shrink-0 on each button."
echo ""
echo "  Run: npm run dev"