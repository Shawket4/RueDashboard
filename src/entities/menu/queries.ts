import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/config/constants";
import { addonApi, categoryApi, menuItemApi, optionalApi, publicMenuApi, slotApi } from "./api";

export const useCategories = (orgId: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.categories(orgId ?? ""), queryFn: () => categoryApi.list(orgId!), enabled: !!orgId });

export const useMenuItems = (orgId: string | null, categoryId?: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.menuItems(orgId ?? "", categoryId),
    queryFn: () => menuItemApi.list(orgId!, categoryId),
    enabled: !!orgId,
  });

export const useMenuItem = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.menuItem(id ?? ""), queryFn: () => menuItemApi.get(id!), enabled: !!id });

export const useAddons = (orgId: string | null, type?: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.addons(orgId ?? "", type),
    queryFn: () => addonApi.list(orgId!, type),
    enabled: !!orgId,
  });

export const useSlots = (menuItemId: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.slots(menuItemId ?? ""), queryFn: () => slotApi.list(menuItemId!), enabled: !!menuItemId });

export const useOptionals = (menuItemId: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.optionals(menuItemId ?? ""),
    queryFn: () => optionalApi.list(menuItemId!),
    enabled: !!menuItemId,
  });

export const usePublicMenu = (orgId: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.publicMenu(orgId ?? ""),
    queryFn: () => publicMenuApi.get(orgId!),
    enabled: !!orgId,
  });
