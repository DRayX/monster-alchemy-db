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
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.description = data.description || '';
    this.icon = getItemIcon(this.id);
    this.dropCount = data.dropCount ?? 0;
    this.craftedCount = data.craftedCount ?? 0;
    this.usedInCount = data.usedInCount ?? 0;
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

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dropCount: this.dropCount,
      craftedCount: this.craftedCount,
      usedInCount: this.usedInCount
    };
  }
}
