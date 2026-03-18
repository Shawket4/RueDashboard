import { CheckSquare, Eye, EyeOff, Trash2 } from "lucide-react";

export default function BulkActionBar({ selectedIds, onActivate, onDeactivate, onDelete, onClear }) {
  const count = selectedIds.size;
  if (count === 0) return null;
  const ids = [...selectedIds];

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] sm:w-auto">
      <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl px-3 sm:px-4 py-3 justify-between sm:justify-start">
        <div className="flex items-center gap-2 pr-3 border-r border-white/20">
          <CheckSquare size={15} className="text-blue-400" />
          <span className="text-sm font-semibold">{count} selected</span>
        </div>
        <button
          onClick={() => onActivate(ids)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors text-green-400"
        >
          <Eye size={13} /> Activate
        </button>
        <button
          onClick={() => onDeactivate(ids)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors text-yellow-400"
        >
          <EyeOff size={13} /> Deactivate
        </button>
        <button
          onClick={() => { if (confirm(`Delete ${count} item(s)? This cannot be undone.`)) onDelete(ids); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors text-red-400"
        >
          <Trash2 size={13} /> Delete
        </button>
        <div className="pl-3 border-l border-white/20">
          <button onClick={onClear} className="text-xs text-white/50 hover:text-white transition-colors px-1">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
