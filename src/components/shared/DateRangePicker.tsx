import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/utils/format";

interface DateRangePickerProps {
  from?:     string | null;
  to?:       string | null;
  onChange:  (from: string | null, to: string | null) => void;
}

const PRESETS = [
  { label: "Today",      days: 0 },
  { label: "7 days",     days: 7 },
  { label: "30 days",    days: 30 },
  { label: "90 days",    days: 90 },
];

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const apply = (days: number) => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    onChange(start.toISOString(), now.toISOString());
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <Button key={p.label} variant="outline" size="sm" onClick={() => apply(p.days)} className="h-8 text-xs">
          {p.label}
        </Button>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange(null, null)} className="h-8 text-xs">
        All time
      </Button>
      {from && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar size={11} />
          {fmtDate(from)} → {to ? fmtDate(to) : "now"}
        </span>
      )}
    </div>
  );
}
