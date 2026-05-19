import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Skeleton } from "./skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  loading?: boolean;
  className?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info" | "violet";
  onClick?: () => void;
}

const ACCENT_BG: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
};

export function StatCard({ label, value, sub, icon: Icon, trend, loading, className, accent = "primary", onClick }: StatCardProps) {
  if (loading)
    return (
      <div className={cn("rounded-xl border bg-card p-4 sm:p-5 space-y-3", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );

  const valStr = value?.toString() ?? "";
  const valueSizeClass =
    valStr.length > 16
      ? "text-base sm:text-lg"
      : valStr.length > 12
      ? "text-lg sm:text-xl"
      : valStr.length > 9
      ? "text-xl sm:text-2xl"
      : "text-2xl";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <p className={cn("font-bold mt-1 tabular font-sans tracking-tight break-words", valueSizeClass)}>{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          {trend && (
            <p className={cn("text-[10px] sm:text-xs font-semibold mt-1 truncate", trend.value >= 0 ? "text-success" : "text-destructive")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", ACCENT_BG[accent])}>
            <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
        )}
      </div>
    </div>
  );
}
