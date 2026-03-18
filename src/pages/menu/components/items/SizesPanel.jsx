import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { upsertSize, deleteSize } from "../../../../api/menu";
import { SIZE_LABELS, SIZE_DISPLAY, toEGP, toPiastres, fmtEGP } from "../../constants";

export default function SizesPanel({ item }) {
  const qc = useQueryClient();
  const [prices, setPrices] = useState(() => {
    const map = {};
    (item?.sizes ?? []).forEach((s) => { map[s.label] = toEGP(s.price_override); });
    return map;
  });

  const upsertMutation = useMutation({
    mutationFn: ({ label, price }) =>
      upsertSize(item.id, {
        label,
        price_override: toPiastres(price),
        display_order:  SIZE_LABELS.indexOf(label),
      }),
    onSuccess: () => qc.invalidateQueries(["menu-item", item.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: (sid) => deleteSize(item.id, sid),
    onSuccess:  () => qc.invalidateQueries(["menu-item", item.id]),
  });

  const existingSize = (label) => item?.sizes?.find((s) => s.label === label);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-4">
        Set size-specific prices. Leave a size out to use the base price of{" "}
        <span className="font-mono font-semibold text-gray-600">{fmtEGP(item?.base_price ?? 0)}</span>.
      </p>

      {SIZE_LABELS.map((label) => {
        const existing = existingSize(label);
        return (
          <div
            key={label}
            className={`rounded-xl border p-4 transition-all ${existing ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-white"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                ${existing ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                {SIZE_DISPLAY[label]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 capitalize">{label.replace("_", " ")}</p>
                {existing && <p className="text-xs text-blue-600 font-mono">{fmtEGP(existing.price_override)}</p>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.01" placeholder="EGP"
                  value={prices[label] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [label]: e.target.value }))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                />
                <button
                  onClick={() => prices[label] && upsertMutation.mutate({ label, price: prices[label] })}
                  disabled={!prices[label]}
                  className="px-3 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-40 transition"
                  style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}
                >
                  {existing ? "Update" : "Add"}
                </button>
                {existing && (
                  <button
                    onClick={() => deleteMutation.mutate(existing.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
