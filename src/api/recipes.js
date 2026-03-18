import client from "./client";

// ── Drink recipes ─────────────────────────────────────────────
export const getDrinkRecipes   = (menuItemId)                           => client.get(`/recipes/drinks/${menuItemId}`);
export const upsertDrinkRecipe = (menuItemId, data)                     => client.post(`/recipes/drinks/${menuItemId}`, data);
export const deleteDrinkRecipe = (menuItemId, size, inventoryItemId)    => client.delete(`/recipes/drinks/${menuItemId}/${size}/${inventoryItemId}`);

// ── Addon base ingredients ────────────────────────────────────
export const getAddonIngredients   = (addonItemId)                      => client.get(`/recipes/addons/${addonItemId}`);
export const upsertAddonIngredient = (addonItemId, data)                => client.post(`/recipes/addons/${addonItemId}`, data);
export const deleteAddonIngredient = (addonItemId, inventoryItemId)     => client.delete(`/recipes/addons/${addonItemId}/${inventoryItemId}`);

// ── Drink option ingredient overrides ─────────────────────────
export const getOverrides   = (drinkOptionItemId)                       => client.get(`/recipes/overrides/${drinkOptionItemId}`);
export const upsertOverride = (drinkOptionItemId, data)                 => client.post(`/recipes/overrides/${drinkOptionItemId}`, data);
export const deleteOverride = (drinkOptionItemId, inventoryItemId, size) =>
  client.delete(`/recipes/overrides/${drinkOptionItemId}/${inventoryItemId}`, {
    params: size ? { size } : {},
  });