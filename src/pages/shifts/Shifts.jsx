import React from "react";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentShift, getBranchShifts, openShift,
  forceCloseShift, getCashMovements, addCashMovement,
} from "../../api/shifts";
import { getBranches } from "../../api/branches";
import client from "../../api/client";
import { useAuth } from "../../store/auth";

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const egp = (n = 0) =>
  `EGP ${(n / 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  : "—";

const fmtDT = (iso) => iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : "—";

const dur = (start, end) => {
  const ms = new Date(end || Date.now()) - new Date(start);
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const norm = (s = "") =>
  s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const STATUS = {
  open:         { bg: "#F0FDF4", color: "#059669", border: "#BBF7D0", dot: "#22C55E", label: "Open" },
  closed:       { bg: "#EFF6FF", color: "#1a56db", border: "#BFDBFE", dot: "#3B82F6", label: "Closed" },
  force_closed: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA", dot: "#F97316", label: "Force Closed" },
};

// ─────────────────────────────────────────────────────────────
//  PDF EXPORT — uses html2canvas so Cairo + Arabic render
// ─────────────────────────────────────────────────────────────
function buildPDFHTML(shift, orders, movements, branchName) {
  const e  = egp;
  const valid  = orders.filter((o) => o.status !== "voided");
  const voided = orders.filter((o) => o.status === "voided");
  const totalSales  = valid.reduce((s, o) => s + (o.total_amount   || 0), 0);
  const totalTax    = valid.reduce((s, o) => s + (o.tax_amount     || 0), 0);
  const totalDisc   = valid.reduce((s, o) => s + (o.discount_amount || 0), 0);
  const cashSales   = valid.filter((o) => o.payment_method === "cash").reduce((s, o) => s + (o.total_amount || 0), 0);
  const cardSales   = valid.filter((o) => o.payment_method === "card").reduce((s, o) => s + (o.total_amount || 0), 0);
  const digSales    = valid.filter((o) => o.payment_method === "digital_wallet").reduce((s, o) => s + (o.total_amount || 0), 0);
  const discrepancy = (shift.closing_cash_declared || 0) - (shift.closing_cash_system || 0);
  const movNet      = movements.reduce((s, m) => s + (m.amount || 0), 0);

  const pill = (label, value, accent = "#1a56db", lightBg = "#EFF6FF") => `
    <div style="background:${lightBg};border-radius:10px;padding:10px 14px;border-left:3px solid ${accent};">
      <div style="font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;">${label}</div>
      <div style="font-size:14px;font-weight:800;color:${accent};">${value}</div>
    </div>`;

  const statCard = (label, value, accent = "#1a56db") => `
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:14px 16px;border-top:3px solid ${accent};">
      <div style="font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">${label}</div>
      <div style="font-size:16px;font-weight:800;color:${accent};">${value}</div>
    </div>`;

  const orderHTML = orders.map((o) => {
    const isVoided = o.status === "voided";
    const items    = Array.isArray(o.items) ? o.items : [];
    const itemsHTML = items.map((item) => {
      const sizeStr = item.size_label ? ` <span style="color:#9CA3AF;">(${norm(item.size_label)})</span>` : "";
      const addonsHTML = (item.addons || []).map((a) => `
        <div style="font-size:11px;color:#9CA3AF;padding-left:24px;margin-top:2px;">
          + ${a.addon_name || ""}${(a.unit_price || 0) > 0 ? ` <span style="color:#1a56db;">+${egp(a.unit_price)}</span>` : ""}
        </div>`).join("");
      const noteHTML = item.notes ? `
        <div style="font-size:11px;color:#9CA3AF;padding-left:24px;font-style:italic;margin-top:2px;">
          Note: ${item.notes}
        </div>` : "";
      return `
        <div style="padding:6px 0;border-bottom:1px solid #F5F5F5;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;">
              <span style="background:#EFF6FF;color:#1a56db;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;margin-right:8px;">×${item.quantity || 1}</span>
              <span style="font-size:13px;font-weight:600;">${item.item_name || ""}${sizeStr}</span>
            </div>
            <span style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;margin-left:12px;">${egp(item.line_total || 0)}</span>
          </div>
          ${addonsHTML}${noteHTML}
        </div>`;
    }).join("");

    const totalsHTML = items.length > 0 ? `
      <div style="background:#F9FAFB;border-radius:8px;padding:8px 12px;margin-top:8px;display:flex;justify-content:flex-end;gap:24px;font-size:11px;">
        ${(o.discount_amount || 0) > 0 ? `<span style="color:#D97706;">Disc: -${egp(o.discount_amount)}</span>` : ""}
        <span style="color:#6B7280;">Tax: ${egp(o.tax_amount || 0)}</span>
        <span style="color:#6B7280;">Sub: ${egp(o.subtotal || 0)}</span>
        <span style="color:#1a56db;font-weight:800;">Total: ${egp(o.total_amount || 0)}</span>
      </div>` : "";

    return `
      <div style="border:1px solid ${isVoided ? "#FCA5A5" : "#BFDBFE"};border-radius:12px;overflow:hidden;margin-bottom:12px;">
        <div style="background:${isVoided ? "#FEF2F2" : "#EFF6FF"};padding:10px 14px;display:flex;align-items:center;gap:10px;">
          <span style="background:${isVoided ? "#DC2626" : "#1a56db"};color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;">#${o.order_number || "?"}</span>
          <span style="font-size:12px;color:#6B7280;">${fmtTime(o.created_at)}</span>
          ${o.customer_name ? `<span style="font-size:12px;color:#374151;font-weight:600;">${o.customer_name}</span>` : ""}
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
            <span style="background:#DBEAFE;color:#1a56db;font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;">${(o.payment_method || "").toUpperCase()}</span>
            ${isVoided ? `<span style="background:#DC2626;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;">VOIDED</span>` : ""}
            <span style="font-size:14px;font-weight:800;color:${isVoided ? "#9CA3AF" : "#111827"};${isVoided ? "text-decoration:line-through;" : ""}">${egp(o.total_amount || 0)}</span>
          </div>
        </div>
        ${items.length > 0 ? `<div style="padding:10px 14px;">${itemsHTML}${totalsHTML}</div>` : ""}
      </div>`;
  }).join("");

  const movHTML = movements.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #1a56db;">Cash Movements</h3>
      ${movements.map((m, i) => {
        const isIn = (m.amount || 0) > 0;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #F5F5F5;">
            <span style="font-size:18px;color:${isIn ? "#059669" : "#DC2626"};">${isIn ? "↑" : "↓"}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;">${m.note || ""}</div>
              <div style="font-size:11px;color:#9CA3AF;">${m.moved_by_name || ""}  ·  ${fmtDT(m.created_at)}</div>
            </div>
            <span style="font-size:14px;font-weight:800;color:${isIn ? "#059669" : "#DC2626"};">${isIn ? "+" : ""}${egp(m.amount || 0)}</span>
          </div>`;
      }).join("")}
      <div style="display:flex;justify-content:flex-end;padding:8px 0;font-size:13px;font-weight:800;color:${movNet >= 0 ? "#059669" : "#DC2626"};">
        Net: ${movNet >= 0 ? "+" : ""}${egp(movNet)}
      </div>
    </div>` : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; width: 794px; padding: 0; }
      </style>
    </head>
    <body>
      <div id="pdf-root" style="width:794px;background:#fff;padding:0;">

        <!-- Header -->
        <div style="background:#fff;padding:28px 36px 20px;border-bottom:3px solid #1a56db;display:flex;align-items:center;justify-content:space-between;">
          <img src="/TheRue.png" style="height:36px;object-fit:contain;" />
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:900;color:#111827;">Shift Report</div>
            <div style="font-size:13px;color:#6B7280;margin-top:2px;">${branchName}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">Generated: ${new Date().toLocaleString("en-GB")}</div>
          </div>
        </div>

        <div style="padding:24px 36px;">

          <!-- Shift info pills -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
            ${pill("Teller",            shift.teller_name || "—")}
            ${pill("Status",            (shift.status || "").replace(/_/g, " ").toUpperCase(),
              shift.status === "open" ? "#059669" : shift.status === "force_closed" ? "#EA580C" : "#1a56db",
              shift.status === "open" ? "#F0FDF4" : shift.status === "force_closed" ? "#FFF7ED" : "#EFF6FF")}
            ${pill("Duration",          dur(shift.opened_at, shift.closed_at))}
            ${pill("Opened",            fmtDT(shift.opened_at))}
            ${pill("Closed",            fmtDT(shift.closed_at))}
            ${pill("Opening Cash",      egp(shift.opening_cash || 0))}
            ${pill("Declared Closing",  shift.closing_cash_declared != null ? egp(shift.closing_cash_declared) : "Not set")}
            ${pill("System Closing",    shift.closing_cash_system   != null ? egp(shift.closing_cash_system)   : "Not set")}
            ${pill("Discrepancy",
              shift.closing_cash_system != null
                ? `${discrepancy >= 0 ? "+" : ""}${egp(discrepancy)}`
                : "—",
              discrepancy === 0 ? "#059669" : discrepancy > 0 ? "#D97706" : "#DC2626",
              discrepancy === 0 ? "#F0FDF4" : discrepancy > 0 ? "#FFFBEB" : "#FEF2F2")}
            ${shift.notes ? pill("Notes", shift.notes) : ""}
            ${shift.force_close_reason ? pill("Force Close Reason", shift.force_close_reason, "#DC2626", "#FEF2F2") : ""}
          </div>

          <!-- Sales summary -->
          <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #1a56db;">Sales Summary</h3>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
            ${statCard("Total Sales",   egp(totalSales),           "#1a56db")}
            ${statCard("Orders",        `${valid.length}`,         "#059669")}
            ${statCard("Cash",          egp(cashSales),            "#374151")}
            ${statCard("Card",          egp(cardSales),            "#7C3AED")}
            ${statCard("Digital",       egp(digSales),             "#374151")}
            ${statCard("Tax",           egp(totalTax),             "#D97706")}
            ${statCard("Discounts",     egp(totalDisc),            "#6B7280")}
            ${statCard("Voided",        `${voided.length}`,        voided.length > 0 ? "#DC2626" : "#6B7280")}
          </div>

          <!-- Cash movements -->
          ${movHTML}

          <!-- Orders -->
          ${orders.length > 0 ? `
            <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #1a56db;">
              Orders (${orders.length})
            </h3>
            ${orderHTML}
          ` : ""}

        </div>

        <!-- Footer -->
        <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:#9CA3AF;">The Rue Coffee  —  Confidential</span>
          <span style="font-size:11px;color:#9CA3AF;">${fmtDate(shift.opened_at)}  ·  ${branchName}</span>
        </div>

      </div>
    </body>
    </html>`;
}

async function exportShiftPDF(shift, orders, movements, branchName) {
  const [html2canvas, jsPDFModule] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);
  const { jsPDF } = jsPDFModule;

  // Build hidden iframe with the HTML
  const html = buildPDFHTML(shift, orders, movements, branchName);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;border:none;";
  document.body.appendChild(iframe);

  await new Promise((resolve) => {
    iframe.onload = resolve;
    iframe.srcdoc = html;
  });

  // Wait for fonts to load
  await new Promise((r) => setTimeout(r, 1200));

  const root = iframe.contentDocument.getElementById("pdf-root");

  // Capture full height
  const canvas = await html2canvas(root, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: "#ffffff",
    windowWidth:     794,
    width:           794,
    height:          root.scrollHeight,
    scrollY:         0,
  });

  document.body.removeChild(iframe);

  // A4 dimensions in mm: 210 × 297
  const A4W = 210;
  const A4H = 297;
  const imgW = A4W;
  const imgH = (canvas.height / canvas.width) * imgW;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageCount = Math.ceil(imgH / A4H);
  for (let p = 0; p < pageCount; p++) {
    if (p > 0) doc.addPage();
    // Slice canvas for this page
    const srcY      = p * (canvas.width * (A4H / imgW));
    const srcH      = canvas.width * (A4H / imgW);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width  = canvas.width;
    pageCanvas.height = Math.min(srcH, canvas.height - srcY);
    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
    const pageImgH = (pageCanvas.height / canvas.width) * imgW;
    doc.addImage(pageCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, pageImgH);
  }

  doc.save(`rue-shift-${(shift.id || "").slice(0, 8)}-${fmtDate(shift.opened_at).replace(/ /g, "-")}.pdf`);
}

// ─────────────────────────────────────────────────────────────
//  SHARED UI
// ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS[status] || STATUS.closed;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1px solid #EEEEEE",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }) {
  return (
    <div style={{
      padding: "14px 20px", borderBottom: "1px solid #F0F0F0",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{title}</p>
      {action}
    </div>
  );
}

function StatCard({ label, value, sub, accent = "#1a56db" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #EEEEEE",
      borderRadius: 14, padding: "16px 20px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", margin: "0 0 6px", letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: accent, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: width,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid #F0F0F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{
            border: "none", background: "none", cursor: "pointer",
            color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: 0,
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{
          display: "block", fontSize: 11, fontWeight: 700,
          color: "#6B7280", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase",
        }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: "100%", padding: "10px 12px",
          border: "1.5px solid #E5E7EB", borderRadius: 9,
          fontSize: 13, color: "#111827", outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s",
          ...props.style,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#1a56db")}
        onBlur={(e)  => (e.target.style.borderColor = "#E5E7EB")}
      />
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, loading, style: s }) {
  const V = {
    primary: { background: "#1a56db", color: "#fff" },
    danger:  { background: "#DC2626", color: "#fff" },
    ghost:   { background: "#F3F4F6", color: "#374151" },
    outline: { background: "#fff", color: "#1a56db", border: "1.5px solid #BFDBFE" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "9px 18px", borderRadius: 9, border: "none",
        fontSize: 13, fontWeight: 600,
        cursor: (disabled || loading) ? "not-allowed" : "pointer",
        opacity: (disabled || loading) ? 0.6 : 1,
        transition: "all 0.15s",
        display: "inline-flex", alignItems: "center", gap: 6,
        ...V[variant], ...s,
      }}
    >
      {loading ? "…" : children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  OPEN SHIFT MODAL
// ─────────────────────────────────────────────────────────────
function OpenShiftModal({ branchId, suggested, onClose }) {
  const qc              = useQueryClient();
  const [cash, setCash] = useState(suggested ? (suggested / 100).toFixed(2) : "");
  const [edited, setEdited] = useState(false);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      openShift(branchId, {
        opening_cash:        Math.round(parseFloat(cash) * 100),
        opening_cash_edited: edited,
        edit_reason:         edited ? reason : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts", branchId] });
      qc.invalidateQueries({ queryKey: ["current-shift", branchId] });
      onClose();
    },
  });

  return (
    <Modal title="Open Shift" onClose={onClose}>
      <Input
        label="Opening Cash (EGP)"
        type="number" min="0" step="0.01"
        value={cash}
        onChange={(e) => {
          setCash(e.target.value);
          setEdited(suggested != null &&
            Math.round(parseFloat(e.target.value || 0) * 100) !== suggested);
        }}
        placeholder="0.00"
      />
      {edited && (
        <Input
          label="Reason for editing"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why does this differ from the suggested amount?"
        />
      )}
      {suggested > 0 && (
        <p style={{ fontSize: 12, color: "#6B7280", margin: "-6px 0 14px" }}>
          Suggested from last closing: {egp(suggested)}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn
          onClick={() => mut.mutate()}
          loading={mut.isPending}
          disabled={!cash || parseFloat(cash) < 0 || (edited && !reason)}
        >
          Open Shift
        </Btn>
      </div>
      {mut.isError && (
        <p style={{ color: "#DC2626", fontSize: 12, marginTop: 8 }}>
          {mut.error?.response?.data?.error || "Failed to open shift"}
        </p>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  CASH MOVEMENT MODAL
// ─────────────────────────────────────────────────────────────
function CashMovementModal({ shiftId, onClose }) {
  const qc                  = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");

  const mut = useMutation({
    mutationFn: () =>
      addCashMovement(shiftId, {
        amount: Math.round(parseFloat(amount) * 100),
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-movements", shiftId] });
      onClose();
    },
  });

  const isNeg = parseFloat(amount) < 0;

  return (
    <Modal title="Add Cash Movement" onClose={onClose}>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 16px" }}>
        Positive = cash in &nbsp;·&nbsp; Negative = cash out
      </p>
      <Input
        label="Amount (EGP)"
        type="number" step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 100.00 or -50.00"
        style={{ color: isNeg ? "#DC2626" : "#111827" }}
      />
      <Input
        label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason for cash movement…"
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn
          variant={isNeg ? "danger" : "primary"}
          onClick={() => mut.mutate()}
          loading={mut.isPending}
          disabled={!amount || !note}
        >
          {isNeg ? "Cash Out" : "Cash In"}
        </Btn>
      </div>
      {mut.isError && (
        <p style={{ color: "#DC2626", fontSize: 12, marginTop: 8 }}>
          {mut.error?.response?.data?.error || "Failed"}
        </p>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  FORCE CLOSE MODAL
// ─────────────────────────────────────────────────────────────
function ForceCloseModal({ shiftId, onClose }) {
  const qc                  = useQueryClient();
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => forceCloseShift(shiftId, { reason }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      onClose();
    },
  });

  return (
    <Modal title="Force Close Shift" onClose={onClose}>
      <div style={{
        background: "#FFF7ED", border: "1px solid #FED7AA",
        borderRadius: 10, padding: 14, marginBottom: 16,
      }}>
        <p style={{ fontSize: 13, color: "#92400E", margin: 0, fontWeight: 600 }}>
          ⚠️ Forcefully closes without a proper cash count.
        </p>
        <p style={{ fontSize: 12, color: "#92400E", margin: "4px 0 0" }}>
          Only use when the teller is unavailable or there is an emergency.
        </p>
      </div>
      <Input
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why does this shift need to be force closed?"
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={() => mut.mutate()} loading={mut.isPending} disabled={!reason}>
          Force Close
        </Btn>
      </div>
      {mut.isError && (
        <p style={{ color: "#DC2626", fontSize: 12, marginTop: 8 }}>
          {mut.error?.response?.data?.error || "Failed"}
        </p>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  SHIFT DETAIL DRAWER
// ─────────────────────────────────────────────────────────────
function ShiftDetail({ shift, branchName, onClose }) {
  const { user } = useAuth();
  const [showCash,  setShowCash]  = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: flatOrders = [] } = useQuery({
    queryKey: ["shift-orders-flat", shift.id],
    queryFn:  () => client.get("/orders", { params: { shift_id: shift.id } }).then((r) => r.data),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["shift-orders-full", shift.id],
    enabled:  flatOrders.length > 0,
    queryFn:  () =>
      Promise.all(flatOrders.map((o) => client.get(`/orders/${o.id}`).then((r) => r.data))),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["cash-movements", shift.id],
    queryFn:  () => getCashMovements(shift.id).then((r) => r.data),
  });

  const valid       = orders.filter((o) => o.status !== "voided");
  const voided      = orders.filter((o) => o.status === "voided");
  const totalSales  = valid.reduce((s, o) => s + (o.total_amount   || 0), 0);
  const cashSales   = valid.filter((o) => o.payment_method === "cash").reduce((s, o) => s + (o.total_amount || 0), 0);
  const cardSales   = valid.filter((o) => o.payment_method === "card").reduce((s, o) => s + (o.total_amount || 0), 0);
  const discrepancy = (shift.closing_cash_declared || 0) - (shift.closing_cash_system || 0);

  const handleExport = async () => {
    setExporting(true);
    try { await exportShiftPDF(shift, orders, movements, branchName); }
    catch (e) { console.error("PDF error:", e); }
    finally   { setExporting(false); }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "stretch", justifyContent: "flex-end",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "min(820px, 96vw)",
        background: "#F9FAFB",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Sticky header */}
        <div style={{
          padding: "18px 24px", background: "#fff",
          borderBottom: "1px solid #F0F0F0",
          display: "flex", alignItems: "center", gap: 14,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <button onClick={onClose} style={{
            border: "none", background: "#F3F4F6", borderRadius: 9,
            width: 34, height: 34, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#6B7280",
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>
                {fmtDate(shift.opened_at)}  —  {shift.teller_name}
              </p>
              <Badge status={shift.status} />
            </div>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>
              {branchName}  ·  {dur(shift.opened_at, shift.closed_at)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {shift.status === "open" && <>
              <Btn variant="ghost" onClick={() => setShowCash(true)} style={{ fontSize: 12 }}>
                + Cash Movement
              </Btn>
              {user?.role !== "teller" && (
                <Btn variant="danger" onClick={() => setShowForce(true)} style={{ fontSize: 12 }}>
                  Force Close
                </Btn>
              )}
            </>}
            <Btn
              variant="outline"
              onClick={handleExport}
              loading={exporting || loadingOrders}
              style={{ fontSize: 12 }}
            >
              {loadingOrders ? "Loading orders…" : "↓ Export PDF"}
            </Btn>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
            <StatCard label="Total Sales"  value={egp(totalSales)}         accent="#1a56db" />
            <StatCard label="Orders"       value={valid.length}             accent="#059669" />
            <StatCard label="Cash Sales"   value={egp(cashSales)}           accent="#D97706" />
            <StatCard label="Card Sales"   value={egp(cardSales)}           accent="#7C3AED" />
            <StatCard label="Opening Cash" value={egp(shift.opening_cash)}  accent="#374151" />
            <StatCard
              label="Discrepancy"
              value={shift.closing_cash_system != null ? egp(Math.abs(discrepancy)) : "—"}
              sub={discrepancy > 0 ? "Over" : discrepancy < 0 ? "Short" : shift.closing_cash_system != null ? "Exact" : ""}
              accent={discrepancy === 0 && shift.closing_cash_system != null ? "#059669" : discrepancy > 0 ? "#D97706" : "#DC2626"}
            />
          </div>

          {/* Shift details */}
          <Card>
            <CardHeader title="Shift Details" />
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
              {[
                ["Teller",             shift.teller_name],
                ["Opened At",          fmtDT(shift.opened_at)],
                ["Closed At",          fmtDT(shift.closed_at)],
                ["Duration",           dur(shift.opened_at, shift.closed_at)],
                ["Opening Cash",       egp(shift.opening_cash)],
                ["Closing Declared",   shift.closing_cash_declared != null ? egp(shift.closing_cash_declared) : "—"],
                ["Closing System",     shift.closing_cash_system   != null ? egp(shift.closing_cash_system)   : "—"],
                ["Voided Orders",      voided.length],
                ...(shift.opening_cash_was_edited ? [["Opening Cash Edited", shift.opening_cash_edit_reason || "Yes"]] : []),
                ...(shift.notes             ? [["Notes",              shift.notes]] : []),
                ...(shift.force_close_reason? [["Force Close Reason", shift.force_close_reason]] : []),
              ].map(([label, val]) => (
                <div key={label} style={{ borderBottom: "1px solid #F5F5F5", paddingBottom: 8 }}>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 13, color: "#111827", margin: 0, fontWeight: 500 }}>
                    {String(val ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Cash movements */}
          <Card>
            <CardHeader
              title="Cash Movements"
              action={shift.status === "open" && (
                <Btn variant="ghost" onClick={() => setShowCash(true)} style={{ fontSize: 12, padding: "6px 12px" }}>
                  + Add
                </Btn>
              )}
            />
            {movements.length === 0 ? (
              <p style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13, margin: 0 }}>No cash movements</p>
            ) : (
              movements.map((m, i) => {
                const isIn = (m.amount || 0) > 0;
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 20px",
                    borderBottom: i < movements.length - 1 ? "1px solid #F5F5F5" : "none",
                    background: i % 2 === 0 ? "#fff" : "#FAFAFA",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: isIn ? "#F0FDF4" : "#FFF7F7",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: isIn ? "#059669" : "#DC2626",
                    }}>
                      {isIn ? "↑" : "↓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{m.note}</p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                        {m.moved_by_name}  ·  {fmtDT(m.created_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isIn ? "#059669" : "#DC2626" }}>
                      {isIn ? "+" : ""}{egp(m.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader title={`Orders (${orders.length})`} />
            {loadingOrders ? (
              <p style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13, margin: 0 }}>
                Loading order details…
              </p>
            ) : orders.length === 0 ? (
              <p style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13, margin: 0 }}>No orders</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["#", "Time", "Customer", "Payment", "Items", "Subtotal", "Tax", "Total"].map((h) => (
                        <th key={h} style={{
                          padding: "9px 14px", textAlign: "left",
                          fontSize: 11, fontWeight: 700, color: "#6B7280",
                          letterSpacing: 0.4, textTransform: "uppercase",
                          borderBottom: "1px solid #F0F0F0", whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const isVoided = o.status === "voided";
                      const items    = Array.isArray(o.items) ? o.items : [];
                      return (
                        <tr key={o.id} style={{
                          background: i % 2 === 0 ? "#fff" : "#FAFAFA",
                          opacity: isVoided ? 0.5 : 1,
                        }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1a56db" }}>#{o.order_number}</td>
                          <td style={{ padding: "10px 14px", color: "#6B7280", whiteSpace: "nowrap" }}>{fmtTime(o.created_at)}</td>
                          <td style={{ padding: "10px 14px", color: "#374151" }}>{o.customer_name || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              background: "#EFF6FF", color: "#1a56db",
                              padding: "2px 8px", borderRadius: 20,
                            }}>
                              {o.payment_method}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#374151", maxWidth: 200 }}>
                            {items.map((it) => (
                              <div key={it.id} style={{ fontSize: 12, lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600 }}>×{it.quantity} {it.item_name}</span>
                                {it.size_label && <span style={{ color: "#9CA3AF" }}> ({it.size_label})</span>}
                                {(it.addons || []).map((a) => (
                                  <div key={a.id} style={{ fontSize: 11, color: "#9CA3AF", paddingLeft: 8 }}>
                                    + {a.addon_name}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </td>
                          <td style={{ padding: "10px 14px" }}>{egp(o.subtotal)}</td>
                          <td style={{ padding: "10px 14px" }}>{egp(o.tax_amount)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>{egp(o.total_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showCash  && <CashMovementModal shiftId={shift.id} onClose={() => setShowCash(false)} />}
      {showForce && <ForceCloseModal   shiftId={shift.id} onClose={() => setShowForce(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SHIFT ROW
// ─────────────────────────────────────────────────────────────
function ShiftRow({ s, even, onClick }) {
  const { data: orders = [] } = useQuery({
    queryKey: ["shift-orders-flat", s.id],
    queryFn:  () => client.get("/orders", { params: { shift_id: s.id } }).then((r) => r.data),
    staleTime: 300_000,
  });

  const totalSales = orders
    .filter((o) => o.status !== "voided")
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
        padding: "14px 20px",
        background: even ? "#fff" : "#FAFAFA",
        borderBottom: "1px solid #F5F5F5",
        cursor: "pointer", transition: "background 0.12s",
        alignItems: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
      onMouseLeave={(e) => (e.currentTarget.style.background = even ? "#fff" : "#FAFAFA")}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.teller_name}</span>
      <span style={{ fontSize: 12, color: "#6B7280" }}>{fmtDT(s.opened_at)}</span>
      <span style={{ fontSize: 12, color: "#6B7280" }}>{dur(s.opened_at, s.closed_at)}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{egp(s.opening_cash)}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a56db" }}>
        {orders.length > 0 ? egp(totalSales) : "—"}
      </span>
      <Badge status={s.status} />
      <span style={{ fontSize: 12, color: "#9CA3AF", textAlign: "right" }}>View →</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function Shifts() {
  const { user }                          = useAuth();
  const orgId                             = user?.org_id;
  const [branchId,      setBranchId]      = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });
  React.useEffect(() => {
    if (branches.length && !branchId) setBranchId(branches[0].id);
  }, [branches]);

  const activeBranch = branches.find((b) => b.id === branchId);

  const { data: currentData } = useQuery({
    queryKey:        ["current-shift", branchId],
    queryFn:         () => getCurrentShift(branchId).then((r) => r.data),
    enabled:         !!branchId,
    refetchInterval: 30_000,
  });

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", branchId],
    queryFn:  () => getBranchShifts(branchId).then((r) => r.data),
    enabled:  !!branchId,
  });

  const hasOpen      = currentData?.has_open_shift;
  const openShiftObj = currentData?.open_shift;

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Shifts</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>
            Manage and review shifts across branches
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={branchId || ""}
            onChange={(e) => setBranchId(e.target.value)}
            style={{
              padding: "8px 14px", border: "1.5px solid #E5E7EB",
              borderRadius: 9, fontSize: 13, color: "#111827",
              background: "#fff", cursor: "pointer", outline: "none",
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {!hasOpen && branchId && (
            <Btn onClick={() => setShowOpenModal(true)}>+ Open Shift</Btn>
          )}
        </div>
      </div>

      {/* Open shift banner */}
      {hasOpen && openShiftObj && (
        <div style={{
          background: "#F0FDF4", border: "1px solid #BBF7D0",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#22C55E", flexShrink: 0,
            boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#065F46", margin: 0 }}>Shift currently open</p>
            <p style={{ fontSize: 12, color: "#059669", margin: "2px 0 0" }}>
              {openShiftObj.teller_name}  ·  opened {fmtTime(openShiftObj.opened_at)}  ·  {dur(openShiftObj.opened_at)} running
            </p>
          </div>
          <Btn variant="ghost" onClick={() => setSelectedShift(openShiftObj)} style={{ fontSize: 12 }}>
            View Details →
          </Btn>
        </div>
      )}

      {/* Shift list */}
      {!branchId ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Select a branch</div>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Loading…</div>
      ) : shifts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60,
          background: "#fff", borderRadius: 16, border: "1px solid #EEEEEE",
          color: "#9CA3AF", fontSize: 14,
        }}>
          No shifts found for this branch
        </div>
      ) : (
        <Card>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 100px 130px 130px 110px 60px",
            padding: "10px 20px",
            background: "#F9FAFB", borderBottom: "1px solid #F0F0F0",
          }}>
            {["Teller", "Opened", "Duration", "Opening Cash", "Total Sales", "Status", ""].map((h) => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 700, color: "#9CA3AF",
                letterSpacing: 0.4, textTransform: "uppercase",
              }}>
                {h}
              </span>
            ))}
          </div>
          {shifts.map((s, i) => (
            <ShiftRow key={s.id} s={s} even={i % 2 === 0} onClick={() => setSelectedShift(s)} />
          ))}
        </Card>
      )}

      {selectedShift && (
        <ShiftDetail
          shift={selectedShift}
          branchName={activeBranch?.name || ""}
          onClose={() => setSelectedShift(null)}
        />
      )}

      {showOpenModal && branchId && (
        <OpenShiftModal
          branchId={branchId}
          suggested={currentData?.suggested_opening_cash}
          onClose={() => setShowOpenModal(false)}
        />
      )}
    </div>
  );
}