import client from "./client";

export const getOrders   = (params) => client.get("/orders", { params });
export const getOrder    = (id)     => client.get(`/orders/${id}`);
export const createOrder = (data)   => client.post("/orders", data);
export const voidOrder   = (id, data) => client.post(`/orders/${id}/void`, data);