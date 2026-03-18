import client from "./client";

export const getMatrix          = (userId)       => client.get(`/permissions/matrix/${userId}`);
export const getUserPermissions = (userId)       => client.get(`/permissions/user/${userId}`);
export const upsertPermission   = (userId, data) => client.put(`/permissions/user/${userId}`, data);
export const deletePermission   = (userId, resource, action) =>
  client.delete(`/permissions/user/${userId}/${resource}/${action}`);
export const getRolePermissions = ()     => client.get("/permissions/roles");
export const upsertRolePermission = (data) => client.put("/permissions/roles", data);