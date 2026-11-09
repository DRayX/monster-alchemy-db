// @ts-check
import { getRoomIcon } from '../services/assets.js';

/**
 * Room entity representing an alchemical crafting chamber or fusion lab.
 */
export class Room {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.prefix]
   * @param {import('./Recipe.js').CraftingRecipe[]} [data.recipes]
   * @param {import('./Recipe.js').FusionRecipe[]} [data.fusionRecipes]
   * @param {import('../types.js').RecipeUnlock | null} [data.recipeUnlock]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.prefix = data.prefix || '';
    this.icon = getRoomIcon(this.id);
    this.recipes = data.recipes || [];
    this.fusionRecipes = data.fusionRecipes || [];

    /** @type {import('../types.js').RecipeUnlock | null} */
    this.recipeUnlock = data.recipeUnlock ?? null;
  }

  get totalRecipeCount() {
    return this.recipes.length + this.fusionRecipes.length;
  }
}
