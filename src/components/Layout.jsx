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
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center px-6 lg:px-8 h-16">
            <div className="lg:hidden w-8" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">{meta.title}</h1>
              {meta.sub && <p className="text-gray-400 text-xs mt-0.5">{meta.sub}</p>}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

