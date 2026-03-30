import client from "@/lib/client";
import type { Order } from "@/types";

export const getOrders   = (params: Record<string, unknown>) => client.get<Order[]>("/orders", { params });
export const getOrder    = (id: string)                      => client.get<Order>(`/orders/${id}`);
export const createOrder = (data: Record<string, unknown>)  => client.post<Order>("/orders", data);
export const voidOrder   = (id: string, data: Record<string, unknown>) => client.post<Order>(`/orders/${id}/void`, data);
