export const APP_TZ = "Africa/Cairo";
export const DEFAULT_CURRENCY = "EGP";
export const DEFAULT_LOCALE_EN = "en-GB";
export const DEFAULT_LOCALE_AR = "ar-EG";

export const LS_KEYS = {
  token: "sufrix.token",
  auth: "sufrix.auth",
  app: "sufrix.app",
  theme: "sufrix.theme",
} as const;

export const ROLES = ["super_admin", "org_admin", "branch_manager", "teller"] as const;
export type Role = (typeof ROLES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "digital_wallet",
  "mixed",
  "talabat_online",
  "talabat_cash",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  cash: "hsl(142 71% 45%)",
  card: "hsl(221 78% 47%)",
  digital_wallet: "hsl(258 58% 52%)",
  mixed: "hsl(38 80% 50%)",
  talabat_online: "hsl(22 88% 52%)",
  talabat_cash: "hsl(22 60% 38%)",
};

export const SHIFT_STATUSES = ["open", "closed", "force_closed"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const ORDER_STATUSES = ["completed", "voided"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ADJUSTMENT_TYPES = ["add", "remove", "transfer_in", "transfer_out"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const INVENTORY_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const PRINTER_BRANDS = ["star", "epson"] as const;
export type PrinterBrand = (typeof PRINTER_BRANDS)[number];

export const SIZE_LABELS = ["small", "medium", "large", "extra_large", "one_size"] as const;
export const GLOBAL_ADDON_TYPES = ["coffee_type", "milk_type", "extra"] as const;

export const QUERY_KEYS = {
  me: ["me"] as const,
  orgs: ["orgs"] as const,
  org: (id: string) => ["org", id] as const,
  branches: (orgId?: string | null) => ["branches", orgId ?? "all"] as const,
  branch: (id: string) => ["branch", id] as const,
  users: (orgId?: string | null) => ["users", orgId ?? "all"] as const,
  user: (id: string) => ["user", id] as const,
  userBranches: (id: string) => ["user-branches", id] as const,
  permissions: (userId: string) => ["permissions", userId] as const,
  rolePerms: ["role-permissions"] as const,
  categories: (orgId: string) => ["categories", orgId] as const,
  publicMenu: (orgId: string) => ["public-menu", orgId] as const,
  menuItems: (orgId: string, catId?: string | null) => ["menu-items", orgId, catId ?? "all"] as const,
  menuItem: (id: string) => ["menu-item", id] as const,
  addons: (orgId: string, type?: string | null) => ["addons", orgId, type ?? "all"] as const,
  slots: (itemId: string) => ["slots", itemId] as const,
  optionals: (itemId: string) => ["optionals", itemId] as const,
  drinkRecipes: (itemId: string) => ["drink-recipes", itemId] as const,
  addonRecipes: (addonId: string) => ["addon-recipes", addonId] as const,
  catalog: (orgId: string) => ["catalog", orgId] as const,
  stock: (branchId: string) => ["stock", branchId] as const,
  adjustments: (branchId: string) => ["adjustments", branchId] as const,
  transfers: (branchId: string, dir?: string) => ["transfers", branchId, dir ?? "all"] as const,
  shifts: (branchId: string) => ["shifts", branchId] as const,
  shift: (id: string) => ["shift", id] as const,
  shiftPreFill: (branchId: string) => ["shift-prefill", branchId] as const,
  shiftReport: (id: string) => ["shift-report", id] as const,
  shiftMovements: (id: string) => ["shift-movements", id] as const,
  orders: (params: unknown) => ["orders", params] as const,
  order: (id: string) => ["order", id] as const,
  discounts: (orgId: string) => ["discounts", orgId] as const,
  branchSales: (branchId: string, params: unknown) => ["branch-sales", branchId, params] as const,
  branchTimeseries: (branchId: string, params: unknown) => ["branch-timeseries", branchId, params] as const,
  branchTellers: (branchId: string, params: unknown) => ["branch-tellers", branchId, params] as const,
  branchAddons: (branchId: string, params: unknown) => ["branch-addons", branchId, params] as const,
  branchStock: (branchId: string) => ["branch-stock-report", branchId] as const,
  orgComparison: (orgId: string, params: unknown) => ["org-comparison", orgId, params] as const,
  health: ["health"] as const,
} as const;
