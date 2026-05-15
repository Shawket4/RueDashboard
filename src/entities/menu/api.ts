import { apiClient } from "@/shared/api/client";
import type { AddonItem, AddonSlot, Category, ItemSize, MenuItem, MenuItemFull, MenuItemOptionalField, PublicMenuResponse } from "@/shared/types";

export const categoryApi = {
  list: (orgId: string) =>
    apiClient.get<Category[]>("/categories", { params: { org_id: orgId } }).then((r) => r.data),
  create: (data: { org_id: string; name: string; display_order?: number }) =>
    apiClient.post<Category>("/categories", data).then((r) => r.data),
  update: (id: string, data: Partial<Category>) =>
    apiClient.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/categories/${id}`).then(() => undefined),
};

export const menuItemApi = {
  list: (orgId: string, categoryId?: string | null) =>
    apiClient
      .get<MenuItem[]>("/menu-items", {
        params: { org_id: orgId, ...(categoryId ? { category_id: categoryId } : {}) },
      })
      .then((r) => r.data),
  get: (id: string) => apiClient.get<MenuItemFull>(`/menu-items/${id}`).then((r) => r.data),
  create: (data: Partial<MenuItem> & { org_id: string; name: string; base_price: number }) =>
    apiClient.post<MenuItemFull>("/menu-items", data).then((r) => r.data),
  update: (id: string, data: Partial<MenuItem>) =>
    apiClient.patch<MenuItem>(`/menu-items/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/menu-items/${id}`).then(() => undefined),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return apiClient
      .post<{ image_url: string }>(`/uploads/menu-items/${id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  upsertSize: (itemId: string, data: { label: string; price_override: number; display_order?: number }) =>
    apiClient.post<ItemSize>(`/menu-items/${itemId}/sizes`, data).then((r) => r.data),
  removeSize: (itemId: string, sizeId: string) =>
    apiClient.delete(`/menu-items/${itemId}/sizes/${sizeId}`).then(() => undefined),
};

export const addonApi = {
  list: (orgId: string, type?: string | null) =>
    apiClient
      .get<AddonItem[]>("/addon-items", { params: { org_id: orgId, ...(type ? { type } : {}) } })
      .then((r) => r.data),
  create: (data: Partial<AddonItem> & { org_id: string; name: string; addon_type: string; default_price: number }) =>
    apiClient.post<AddonItem>("/addon-items", data).then((r) => r.data),
  update: (id: string, data: Partial<AddonItem>) =>
    apiClient.patch<AddonItem>(`/addon-items/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/addon-items/${id}`).then(() => undefined),
};

export const slotApi = {
  list: (menuItemId: string) =>
    apiClient.get<AddonSlot[]>(`/menu-items/${menuItemId}/addon-slots`).then((r) => r.data),
  create: (
    menuItemId: string,
    data: {
      addon_type: string;
      label?: string | null;
      is_required?: boolean;
      min_selections?: number;
      max_selections?: number | null;
      display_order?: number;
    },
  ) => apiClient.post<AddonSlot>(`/menu-items/${menuItemId}/addon-slots`, data).then((r) => r.data),
  update: (
    menuItemId: string,
    slotId: string,
    data: Partial<{
      label: string | null;
      is_required: boolean;
      min_selections: number;
      max_selections: number | null;
      display_order: number;
    }>,
  ) =>
    apiClient
      .patch<AddonSlot>(`/menu-items/${menuItemId}/addon-slots/${slotId}`, data)
      .then((r) => r.data),
  remove: (menuItemId: string, slotId: string) =>
    apiClient.delete(`/menu-items/${menuItemId}/addon-slots/${slotId}`).then(() => undefined),
};

export const optionalApi = {
  list: (menuItemId: string) =>
    apiClient.get<MenuItemOptionalField[]>(`/menu-items/${menuItemId}/optionals`).then((r) => r.data),
  upsert: (
    menuItemId: string,
    data: {
      name: string;
      ingredient_name?: string | null;
      org_ingredient_id?: string | null;
      ingredient_unit?: string | null;
      quantity_used?: number | null;
      is_active?: boolean;
    },
  ) =>
    apiClient
      .post<MenuItemOptionalField>(`/menu-items/${menuItemId}/optionals`, data)
      .then((r) => r.data),
  remove: (menuItemId: string, fieldId: string) =>
    apiClient.delete(`/menu-items/${menuItemId}/optionals/${fieldId}`).then(() => undefined),
};

export const publicMenuApi = {
  get: (orgId: string) =>
    apiClient.get<PublicMenuResponse>(`/menu/public/${orgId}`).then((r) => r.data),
};
