export const ADDON_TYPES  = ["coffee_type", "milk_type", "extra"];
export const TYPE_LABEL   = { coffee_type: "Coffee Type", milk_type: "Milk Type", extra: "Extra" };
export const SIZE_LABELS  = ["small", "medium", "large", "extra_large"];
export const SIZE_DISPLAY = { small: "S", medium: "M", large: "L", extra_large: "XL" };

export const toEGP      = (p) => (p / 100).toFixed(2);
export const toPiastres = (v) => Math.round(parseFloat(v) * 100) || 0;
export const fmtEGP     = (p) => `${toEGP(p)} EGP`;
