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
