import { Pencil, Trash2, Settings } from "lucide-react";
import { fmtEGP } from "../../constants";
import ActiveBadge from "../shared/ActiveBadge";

export default function ItemCard({ item, isSelected, onSelect, onEdit, onDelete, onConfigure }) {
  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden group relative
        ${item.is_active ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}
        ${isSelected ? "ring-2 ring-blue-500 border-blue-200" : ""}`}
    >
      {/* Checkbox */}
      <div
        className={`absolute top-3 left-3 z-10 transition-opacity
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
        />
      </div>

      {/* Image thumbnail — shown when image_url is set */}
      {item.image_url && (
        <div className="w-full h-28 overflow-hidden bg-gray-100">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <p className="font-semibold text-gray-900 text-sm leading-tight pl-5">{item.name}</p>
          <ActiveBadge active={item.is_active} />
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 pl-5">{item.description}</p>
        )}
        <p className="text-sm font-bold text-blue-600 mt-3 font-mono">{fmtEGP(item.base_price)}</p>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={() => onConfigure(item.id)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-xl transition-colors"
        >
          <Settings size={12} /> Configure
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

