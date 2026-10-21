// @ts-check

/**
 * Room entity representing an alchemical crafting chamber or fusion lab.
 */
export class Room {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.prefix]
   * @param {string} [data.icon]
   * @param {import('./Recipe.js').CraftingRecipe[]} [data.recipes]
   * @param {import('./Recipe.js').FusionRecipe[]} [data.fusionRecipes]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.prefix = data.prefix || '';
    this.icon = data.icon || '';
    this.recipes = data.recipes || [];
    this.fusionRecipes = data.fusionRecipes || [];
  }

  get totalRecipeCount() {
    return this.recipes.length + this.fusionRecipes.length;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      prefix: this.prefix,
      icon: this.icon,
      recipes: this.recipes,
      fusionRecipes: this.fusionRecipes
    };
  }
}
