import client from "./client";

export const getCategories    = (orgId)        => client.get("/categories",   { params: { org_id: orgId } });
export const createCategory   = (data)         => client.post("/categories",  data);
export const updateCategory   = (id, data)     => client.patch(`/categories/${id}`, data);
export const deleteCategory   = (id)           => client.delete(`/categories/${id}`);

export const getMenuItems     = (orgId, catId) => client.get("/menu-items",   { params: { org_id: orgId, ...(catId ? { category_id: catId } : {}) } });
export const getMenuItem      = (id)           => client.get(`/menu-items/${id}`);
export const createMenuItem   = (data)         => client.post("/menu-items",  data);
export const updateMenuItem   = (id, data)     => client.patch(`/menu-items/${id}`, data);
export const deleteMenuItem   = (id)           => client.delete(`/menu-items/${id}`);

// Image upload endpoint — POST /uploads/menu-items/:id
// multipart/form-data, field name: "image"
// Returns: { image_url: string }
export const uploadMenuItemImage = (id, file) => {
  const form = new FormData();
  form.append("image", file);
  return client.post(`/uploads/menu-items/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getAddonItems    = (orgId, type)  => client.get("/addon-items",  { params: { org_id: orgId, ...(type ? { addon_type: type } : {}) } });
export const createAddonItem  = (data)         => client.post("/addon-items", data);
export const updateAddonItem  = (id, data)     => client.patch(`/addon-items/${id}`, data);
export const deleteAddonItem  = (id)           => client.delete(`/addon-items/${id}`);

export const getOptionGroups    = (itemId)            => client.get(`/menu-items/${itemId}/option-groups`);
export const createOptionGroup  = (itemId, data)      => client.post(`/menu-items/${itemId}/option-groups`, data);
export const updateOptionGroup  = (itemId, gid, data) => client.patch(`/menu-items/${itemId}/option-groups/${gid}`, data);
export const deleteOptionGroup  = (itemId, gid)       => client.delete(`/menu-items/${itemId}/option-groups/${gid}`);
export const addOptionItem      = (itemId, gid, data)      => client.post(`/menu-items/${itemId}/option-groups/${gid}/items`, data);
export const updateOptionItem   = (itemId, gid, oid, data) => client.patch(`/menu-items/${itemId}/option-groups/${gid}/items/${oid}`, data);
export const deleteOptionItem   = (itemId, gid, oid)       => client.delete(`/menu-items/${itemId}/option-groups/${gid}/items/${oid}`);

export const upsertSize  = (itemId, data) => client.post(`/menu-items/${itemId}/sizes`, data);
export const deleteSize  = (itemId, sid)  => client.delete(`/menu-items/${itemId}/sizes/${sid}`);

