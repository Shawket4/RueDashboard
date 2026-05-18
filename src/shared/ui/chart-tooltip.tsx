import type { TooltipProps } from "recharts";
import { fmtMoney } from "@/shared/lib/format";

type ValueFormatter = "money" | "number" | "auto";

// Recharts calls the tooltip component with its own props (active, payload,
// label, etc.). We don't extend their interface because we use 'formatter'
// for a different purpose (our own enum, not their signature). Instead we
// accept their props via type intersection.
type ChartTooltipProps = TooltipProps<number, string> & {
  /**
   * How to format values. "auto" infers from the dataKey:
   *   - keys containing "revenue" / "cash" / "card" / "talabat" / "amount" → money
   *   - otherwise → raw number
   */
  valueFormat?: ValueFormatter;
};

/**
 * Recharts custom tooltip matching the Sufrix design:
 *   - Rounded popover card with soft border
 *   - Small coloured dot per series
 *   - Bold tabular-nums values on the right
 */
export function ChartTooltip({ active, payload, label, valueFormat = "auto" }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formatValue = (dataKey: string | number | undefined, raw: number | string | undefined): string => {
    const num = typeof raw === "number" ? raw : Number(raw) || 0;
    if (valueFormat === "money") return fmtMoney(num);
    if (valueFormat === "number") return String(num);
    const k = String(dataKey ?? "").toLowerCase();
    const looksLikeMoney =
      k.includes("revenue") ||
      k.includes("discount") ||
      k.includes("tax") ||
      k.includes("amount") ||
      k.includes("tip") ||
      k.includes("cash") ||
      k.includes("card") ||
      k.includes("talabat") ||
      k.includes("wallet") ||
      k.includes("mixed");
    return looksLikeMoney ? fmtMoney(num) : String(num);
  };

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      {label !== undefined && (
        <p className="font-semibold mb-2 text-xs text-muted-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={`${p.dataKey ?? p.name}-${i}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: p.color ?? "currentColor" }}
              />
              <span className="text-xs">{p.name}</span>
            </div>
            <span className="font-bold text-xs tabular">
              {formatValue(p.dataKey, p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
