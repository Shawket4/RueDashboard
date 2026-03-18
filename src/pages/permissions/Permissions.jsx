import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, ShieldCheck, ShieldOff, Shield } from "lucide-react";
import { getMatrix, upsertPermission, deletePermission } from "../../api/permissions";
import { getUser } from "../../api/users";

const RESOURCES = [
    { key: "orgs",                  label: "Organizations",        icon: "🏢" },
    { key: "branches",              label: "Branches",             icon: "🏪" },
    { key: "users",                 label: "Users",                icon: "👥" },
    { key: "permissions",           label: "Permissions",          icon: "🔐" },
    { key: "categories",            label: "Categories",           icon: "🗂️" },
    { key: "menu_items",            label: "Menu Items",           icon: "☕" },
    { key: "addon_items",           label: "Addon Items",          icon: "➕" },
    { key: "shifts",                label: "Shifts",               icon: "🕐" },
    { key: "shift_counts",          label: "Shift Inventory Counts", icon: "📦" },
    { key: "orders",                label: "Orders",               icon: "🧾" },
    { key: "order_items",           label: "Order Items",          icon: "📋" },
    { key: "payments",              label: "Payments",             icon: "💳" },
    { key: "inventory",             label: "Inventory",            icon: "🏗️" },
    { key: "inventory_adjustments", label: "Adjustments",          icon: "⚖️" },
    { key: "inventory_transfers",   label: "Transfers",            icon: "🚚" },
    { key: "recipes",               label: "Recipes",              icon: "📝" },
    { key: "soft_serve_batches",    label: "Soft Serve Batches",   icon: "🍦" },
  ];

const ACTIONS = ["create", "read", "update", "delete"];

const ACTION_STYLE = {
  create: { label: "Create", active: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" },
  read:   { label: "Read",   active: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-500"  },
  update: { label: "Update", active: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  delete: { label: "Delete", active: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500"   },
};

const PRESETS = [
  {
    label: "Full Access",
    icon: <ShieldCheck size={14} />,
    color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    granted: true,
    all: true,
  },
  {
    label: "Read Only",
    icon: <Shield size={14} />,
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    actions: ["read"],
    granted: true,
  },
  {
    label: "No Access",
    icon: <ShieldOff size={14} />,
    color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    granted: false,
    all: true,
  },
];

const ROLE_STYLE = {
  super_admin:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  org_admin:      "bg-violet-50 text-violet-700 border-violet-200",
  branch_manager: "bg-blue-50 text-blue-700 border-blue-200",
  teller:         "bg-green-50 text-green-700 border-green-200",
};

export default function Permissions() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn:  () => getUser(userId).then(r => r.data),
  });

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["matrix", userId],
    queryFn:  () => getMatrix(userId).then(r => r.data),
  });

  const upsert = useMutation({
    mutationFn: ({ resource, action, granted }) =>
      upsertPermission(userId, { resource, action, granted }),
    onSuccess: () => qc.invalidateQueries(["matrix", userId]),
  });

  const reset = useMutation({
    mutationFn: ({ resource, action }) => deletePermission(userId, resource, action),
    onSuccess: () => qc.invalidateQueries(["matrix", userId]),
  });

  const getCell = (resource, action) =>
    matrix?.find(m => m.resource === resource && m.action === action);

  const handleToggle = (resource, action) => {
    const cell = getCell(resource, action);
    upsert.mutate({ resource, action, granted: !cell?.effective });
  };

  const handleReset = (resource, action) => {
    reset.mutate({ resource, action });
  };

  // Apply a preset to a single resource
  const applyResourcePreset = (resource, preset) => {
    const actions = preset.all ? ACTIONS : (preset.actions ?? []);
    // For "no access" or "full access", set all actions
    // For "read only", grant read and deny the rest
    if (preset.all) {
      ACTIONS.forEach(action => upsert.mutate({ resource, action, granted: preset.granted }));
    } else {
      ACTIONS.forEach(action =>
        upsert.mutate({ resource, action, granted: preset.actions.includes(action) })
      );
    }
  };

  // Apply a preset to ALL resources
  const applyGlobalPreset = (preset) => {
    RESOURCES.forEach(({ key }) => applyResourcePreset(key, preset));
  };

  const getResourceSummary = (resourceKey) => {
    const cells = ACTIONS.map(a => getCell(resourceKey, a));
    const granted = cells.filter(c => c?.effective).length;
    if (granted === 0) return { label: "No Access", style: "bg-red-50 text-red-600 border-red-100" };
    if (granted === 4) return { label: "Full Access", style: "bg-green-50 text-green-600 border-green-100" };
    if (granted === 1 && cells[1]?.effective) return { label: "Read Only", style: "bg-blue-50 text-blue-600 border-blue-100" };
    return { label: `${granted}/4`, style: "bg-amber-50 text-amber-600 border-amber-100" };
  };

  if (isLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/users")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Permissions</h1>
            {user && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${ROLE_STYLE[user.role] || ""}`}>
                {user.role?.replace(/_/g, " ")}
              </span>
            )}
          </div>
          {user && <p className="text-gray-400 text-sm mt-0.5">{user.name} · Overrides take priority over role defaults</p>}
        </div>
      </div>

      {/* Global presets */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm">Global Presets</p>
            <p className="text-gray-400 text-xs mt-0.5">Apply a permission level to all resources at once</p>
          </div>
          <div className="flex items-center gap-2">
            {PRESETS.map(preset => (
              <button key={preset.label} onClick={() => applyGlobalPreset(preset)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${preset.color}`}>
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          Override (you set this)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          Role default
        </div>
        <div className="flex items-center gap-1.5">
          <RotateCcw size={11} /> Reset removes override, falls back to role default
        </div>
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {RESOURCES.map(({ key, label, icon }) => {
          const summary = getResourceSummary(key);
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{icon}</span>
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${summary.style}`}>
                    {summary.label}
                  </span>
                </div>
                {/* Per-resource presets */}
                <div className="flex items-center gap-1">
                  {PRESETS.map(preset => (
                    <button key={preset.label} onClick={() => applyResourcePreset(key, preset)}
                      title={preset.label}
                      className={`p-1.5 rounded-lg text-xs border transition ${preset.color}`}>
                      {preset.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action toggles */}
              <div className="px-3 sm:px-5 py-3 sm:py-4 grid grid-cols-2 gap-2 sm:gap-3">
                {ACTIONS.map(action => {
                  const cell      = getCell(key, action);
                  const effective = cell?.effective ?? false;
                  const hasOverride = cell?.user_override !== null && cell?.user_override !== undefined;
                  const roleDefault = cell?.role_default;
                  const style     = ACTION_STYLE[action];

                  return (
                    <div key={action}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer
                        ${effective ? style.active : "bg-gray-50 border-gray-200 text-gray-400"}`}
                      onClick={() => handleToggle(key, action)}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${effective ? style.dot : "bg-gray-300"}`} />
                        <span className="text-xs font-semibold">{style.label}</span>
                        {/* Source indicator */}
                        {hasOverride ? (
                          <span className="text-[10px] opacity-60">(override)</span>
                        ) : roleDefault !== null && roleDefault !== undefined ? (
                          <span className="text-[10px] opacity-60">(role)</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Reset button — only if override exists */}
                        {hasOverride && (
                          <button onClick={e => { e.stopPropagation(); handleReset(key, action); }}
                            className="opacity-50 hover:opacity-100 transition"
                            title="Reset to role default">
                            <RotateCcw size={11} />
                          </button>
                        )}
                        {/* Toggle pill */}
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${effective ? "bg-current opacity-40" : "bg-gray-300"}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all
                            ${effective ? "left-4" : "left-0.5"}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}