import client from "./client";

export const getShiftSummary    = (shiftId)          => client.get(`/reports/shifts/${shiftId}/summary`);
export const getShiftInventory  = (shiftId)          => client.get(`/reports/shifts/${shiftId}/inventory`);
export const getShiftDeductions = (shiftId)          => client.get(`/reports/shifts/${shiftId}/deductions`);
export const getBranchSales     = (branchId, params) => client.get(`/reports/branches/${branchId}/sales`, { params });
export const getBranchStock     = (branchId)         => client.get(`/reports/branches/${branchId}/stock`);