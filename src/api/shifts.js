import client from "./client";

export const getCurrentShift  = (branchId)       => client.get(`/shifts/branches/${branchId}/current`);
export const getBranchShifts  = (branchId)       => client.get(`/shifts/branches/${branchId}`);
export const getShift         = (id)             => client.get(`/shifts/${id}`);
export const openShift        = (branchId, data) => client.post(`/shifts/branches/${branchId}/open`, data);
export const closeShift       = (id, data)       => client.post(`/shifts/${id}/close`, data);
export const forceCloseShift  = (id, data)       => client.post(`/shifts/${id}/force-close`, data);
export const getCashMovements = (id)             => client.get(`/shifts/${id}/cash-movements`);
export const addCashMovement  = (id, data)       => client.post(`/shifts/${id}/cash-movements`, data);