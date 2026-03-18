import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { getMenuItem } from "../../../../api/menu";
import Spinner from "../shared/Spinner";
import SizesPanel from "./SizesPanel";
import OptionsPanel from "./OptionsPanel";

export default function ConfigureDrawer({ itemId, orgId, onClose }) {
  const [drawerTab, setDrawerTab] = useState("sizes");

  const { data: item, isLoading } = useQuery({
    queryKey: ["menu-item", itemId],
    queryFn:  () => getMenuItem(itemId).then((r) => r.data),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{item?.name ?? "Configure"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sizes &amp; drink options</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[{ id: "sizes", label: "Sizes" }, { id: "options", label: "Options" }].map((t) => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${drawerTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <Spinner />
          ) : drawerTab === "sizes" ? (
            <SizesPanel item={item} />
          ) : (
            <OptionsPanel item={item} orgId={orgId} />
          )}
        </div>
      </div>
    </>
  );
}
