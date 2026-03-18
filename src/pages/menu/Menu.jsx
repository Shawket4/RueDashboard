import { useState } from "react";
import { Coffee, Tag, Puzzle } from "lucide-react";
import { useAuth } from "../../store/auth.jsx";
import MenuItemsTab  from "./components/items/MenuItemsTab";
import CategoriesTab from "./components/categories/CategoriesTab";
import AddonsTab     from "./components/addons/AddonsTab";

const TABS = [
  { id: "items",      label: "Menu Items",    Icon: Coffee  },
  { id: "categories", label: "Categories",    Icon: Tag     },
  { id: "addons",     label: "Addon Catalog", Icon: Puzzle  },
];

export default function Menu() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState("items");
  const orgId = me?.org_id || "";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header + tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">Menu Management</h2>
          <p className="text-gray-400 text-xs mt-0.5">Manage your categories, drinks and addons</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
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
        </div>
      </div>

      {/* Tab content */}
      {tab === "items"      && <MenuItemsTab  orgId={orgId} />}
      {tab === "categories" && <CategoriesTab orgId={orgId} />}
      {tab === "addons"     && <AddonsTab     orgId={orgId} />}
    </div>
  );
}
