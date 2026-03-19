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
