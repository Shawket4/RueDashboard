import client from "./client";

// Inventory Items
export const getInventoryItems   = (branchId)       => client.get(`/inventory/branches/${branchId}/items`);
export const createInventoryItem = (branchId, data) => client.post(`/inventory/branches/${branchId}/items`, data);
export const updateInventoryItem = (id, data)       => client.patch(`/inventory/items/${id}`, data);
export const deleteInventoryItem = (id)             => client.delete(`/inventory/items/${id}`);

// Adjustments
export const getAdjustments   = (branchId)       => client.get(`/inventory/branches/${branchId}/adjustments`);
export const createAdjustment = (branchId, data) => client.post(`/inventory/branches/${branchId}/adjustments`, data);

// Transfers
export const getTransfers   = (branchId, direction) => client.get(`/inventory/branches/${branchId}/transfers`, { params: { direction } });
export const createTransfer = (data)                => client.post("/inventory/transfers", data);
export const getTransfer    = (id)                  => client.get(`/inventory/transfers/${id}`);
export const confirmTransfer = (id, data)           => client.patch(`/inventory/transfers/${id}/confirm`, data);
export const rejectTransfer  = (id, data)           => client.patch(`/inventory/transfers/${id}/reject`, data);

// Soft Serve
export const getSoftServePools   = (branchId)       => client.get(`/soft-serve/branches/${branchId}/pools`);
export const getSoftServeBatches = (branchId)       => client.get(`/soft-serve/branches/${branchId}/batches`);
export const createSoftServeBatch = (branchId, data) => client.post(`/soft-serve/branches/${branchId}/batches`, data);