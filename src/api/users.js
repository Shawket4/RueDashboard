import client from "./client";

export const getUsers        = (orgId)        => client.get("/users", { params: orgId ? { org_id: orgId } : {} });
export const getUser         = (id)           => client.get(`/users/${id}`);
export const createUser      = (data)         => client.post("/users", data);
export const updateUser      = (id, data)     => client.patch(`/users/${id}`, data);
export const deleteUser      = (id)           => client.delete(`/users/${id}`);
export const assignBranch    = (userId, branchId) => client.post(`/users/${userId}/branches`, { branch_id: branchId });
export const unassignBranch  = (userId, branchId) => client.delete(`/users/${userId}/branches/${branchId}`);
export const getUserBranches = (userId)       => client.get(`/users/${userId}/branches`);