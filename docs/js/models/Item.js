// @ts-check
import { getItemIcon } from '../services/assets.js';

/**
 * Item / Resource entity representing an alchemical reagent, material, or equipment.
 */
export class Item {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.description]
   * @param {number} [data.dropCount]
   * @param {number} [data.craftedCount]
   * @param {number} [data.usedInCount]
   * @param {number} [data.gatherCount]
   * @param {import('../types.js').RecipeUnlock | null} [data.recipeUnlock]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.description = data.description || '';
    this.icon = getItemIcon(this.id);
    this.dropCount = data.dropCount ?? 0;
    this.craftedCount = data.craftedCount ?? 0;
    this.usedInCount = data.usedInCount ?? 0;
    this.gatherCount = data.gatherCount ?? 0;

    /** @type {import('../types.js').RecipeUnlock | null} */
    this.recipeUnlock = data.recipeUnlock ?? null;
  }

  get isDropped() {
    return this.dropCount > 0;
  }

  get isCrafted() {
    return this.craftedCount > 0;
  }

  get isIngredient() {
    return this.usedInCount > 0;
  }

  get isGatherable() {
    return this.gatherCount > 0;
  }
}
