import client from "./client";

// Existing
export const getShiftSummary    = (shiftId)          => client.get(`/reports/shifts/${shiftId}/summary`);
export const getShiftInventory  = (shiftId)          => client.get(`/reports/shifts/${shiftId}/inventory`);
export const getShiftDeductions = (shiftId)          => client.get(`/reports/shifts/${shiftId}/deductions`);
export const getBranchSales     = (branchId, params) => client.get(`/reports/branches/${branchId}/sales`, { params });
export const getBranchStock     = (branchId)         => client.get(`/reports/branches/${branchId}/stock`);

// New analytics endpoints
export const getBranchTimeseries  = (branchId, params) => client.get(`/reports/branches/${branchId}/sales/timeseries`, { params });
export const getBranchTellers     = (branchId, params) => client.get(`/reports/branches/${branchId}/tellers`, { params });
export const getBranchAddonSales  = (branchId, params) => client.get(`/reports/branches/${branchId}/addons`, { params });
export const getOrgComparison     = (orgId,    params) => client.get(`/reports/orgs/${orgId}/comparison`, { params });
