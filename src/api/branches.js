import client from "./client";

export const getBranches   = (orgId)   => client.get("/branches", { params: { org_id: orgId } });
export const getBranch     = (id)      => client.get(`/branches/${id}`);
export const createBranch  = (data)    => client.post("/branches", data);
export const updateBranch  = (id, data)=> client.put(`/branches/${id}`, data);
export const deleteBranch  = (id)      => client.delete(`/branches/${id}`);