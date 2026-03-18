import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import {
  Coffee, Building2, Users, LayoutDashboard,
  LogOut, Search, Menu, X,
  GitBranch, Package, BookOpen, ChevronRight, Clock,
} from "lucide-react";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isDesktop;
}

const NAV = [
  {
    group: "Overview",
    items: [
      {
        to: "/",
        icon: LayoutDashboard,
        label: "Dashboard",
        sub: "System overview",
        roles: ["super_admin", "org_admin", "branch_manager", "teller"],
      },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/orgs",      icon: Building2,      label: "Organizations", sub: "Manage coffee brands",  roles: ["super_admin"] },
      { to: "/users",     icon: Users,           label: "Users",         sub: "Staff accounts",        roles: ["super_admin", "org_admin", "branch_manager"] },
      { to: "/branches",  icon: GitBranch,       label: "Branches",      sub: "Manage branches",       roles: ["super_admin", "org_admin", "branch_manager"] },
      { to: "/menu",      icon: Coffee,          label: "Menu",          sub: "Items & categories",    roles: ["super_admin", "org_admin", "branch_manager"] },
      { to: "/inventory", icon: Package,         label: "Inventory",     sub: "Stock & transfers",     roles: ["super_admin", "org_admin", "branch_manager"] },
      { to: "/recipes",   icon: BookOpen,        label: "Recipes",       sub: "Drink ingredients",     roles: ["super_admin", "org_admin", "branch_manager"] },
      { to: "/shifts", icon: Clock, label: "Shifts", sub: "Reports & management", roles: ["super_admin","org_admin","branch_manager"] }
    ],
  },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const [search,      setSearch]      = useState("");
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const isDesktop                     = useIsDesktop();

  const handleSignOut = () => { signOut(); navigate("/login"); };

  const filtered = NAV.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) =>
        i.roles.includes(user?.role) &&
        (search === "" || i.label.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((g) => g.items.length > 0);

  const Content = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <img
          src="/TheRue.png"
          alt="The Rue"
          style={{ height: 30, objectFit: "contain" }}
        />
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
          style={{
            border: "none", background: "none",
            cursor: "pointer", color: "#9CA3AF", padding: 4,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: 10,
          padding: "8px 12px",
        }}>
          <Search size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "#374151",
              width: "100%",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none", background: "none",
                cursor: "pointer", color: "#9CA3AF",
                fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {filtered.map((group) => (
          <div key={group.group} style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#9CA3AF",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0 8px",
              marginBottom: 6,
            }}>
              {group.group}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map(({ to, icon: Icon, label, sub }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    transition: "all 0.15s",
                    background: isActive ? "#EFF6FF" : "transparent",
                    border: `1px solid ${isActive ? "#BFDBFE" : "transparent"}`,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {/* Icon box */}
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: isActive
                          ? "linear-gradient(135deg, #1a56db, #3b28cc)"
                          : "#F3F4F6",
                        boxShadow: isActive
                          ? "0 2px 8px rgba(26,86,219,0.3)"
                          : "none",
                        transition: "all 0.15s",
                      }}>
                        <Icon size={15} color={isActive ? "#fff" : "#6B7280"} />
                      </div>

                      {/* Labels */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#1a56db" : "#111827",
                          margin: 0,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {label}
                        </p>
                        <p style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          margin: 0,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {sub}
                        </p>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <ChevronRight size={13} color="#1a56db" style={{ flexShrink: 0 }} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div style={{
        padding: "12px 14px",
        borderTop: "1px solid #F3F4F6",
      }}>
        {/* User card */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          marginBottom: 8,
        }}>
          {/* Avatar */}
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a56db, #3b28cc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {user?.name}
            </p>
            <p style={{
              fontSize: 11,
              color: "#6B7280",
              margin: 0,
              textTransform: "capitalize",
            }}>
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>

          {/* Role badge */}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#1a56db",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            padding: "2px 7px",
            borderRadius: 20,
            flexShrink: 0,
            textTransform: "capitalize",
            letterSpacing: 0.2,
          }}>
            {user?.role === "super_admin" ? "Admin" : user?.role?.split("_")[0]}
          </span>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "9px 0",
            border: "none",
            borderRadius: 10,
            background: "#FEF2F2",
            color: "#DC2626",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#DC2626";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FEF2F2";
            e.currentTarget.style.color = "#DC2626";
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle — only shown on small screens */}
      {!isDesktop && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 50,
            width: 40,
            height: 40,
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Menu size={17} color="#374151" />
        </button>
      )}

      {/* Mobile overlay */}
      {!isDesktop && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile drawer */}
      {!isDesktop && (
        <aside
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 50,
            width: "min(272px, 85vw)",
            background: "#fff",
            borderRight: "1px solid #F3F4F6",
            boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Content />
        </aside>
      )}

      {/* Desktop sidebar */}
      {isDesktop && (
        <aside
          style={{
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
          }}
        >
          <Content />
        </aside>
      )}
    </>
  );
}