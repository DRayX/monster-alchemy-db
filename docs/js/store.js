// @ts-check
import { reactive } from 'vue';
import { loadGameDatabase } from './services/loader.js';

/**
 * @typedef {import('./models/Monster.js').Monster} Monster
 * @typedef {import('./models/Item.js').Item} Item
 * @typedef {import('./models/Room.js').Room} Room
 * @typedef {import('./models/Recipe.js').CraftingRecipe} CraftingRecipe
 * @typedef {import('./models/Recipe.js').FusionRecipe} FusionRecipe
 * @typedef {import('./models/Skill.js').ActiveSkill} ActiveSkill
 * @typedef {import('./models/Skill.js').PassiveSkill} PassiveSkill
 */

/**
 * Global reactive database store accessible by any component without prop-drilling.
 */
export const db = reactive({
  /** @type {Monster[]} */
  monsters: [],
  /** @type {Item[]} */
  items: [],
  /** @type {Room[]} */
  rooms: [],
  /** @type {CraftingRecipe[]} */
  recipes: [],
  /** @type {FusionRecipe[]} */
  fusions: [],
  /** @type {ActiveSkill[]} */
  activeSkills: [],
  /** @type {PassiveSkill[]} */
  passiveSkills: [],
  /** @type {boolean} */
  isLoading: true,
  /** @type {?string} */
  error: null
});

/**
 * Fetches and populates the reactive `db` store from `./extracted/Game/` JSON dumps.
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  db.isLoading = true;
  db.error = null;
  try {
    const { monsters, items, rooms, recipes, fusions, activeSkills, passiveSkills } = await loadGameDatabase();
    db.monsters = monsters;
    db.items = items;
    db.rooms = rooms;
    db.recipes = recipes;
    db.fusions = fusions;
    db.activeSkills = activeSkills;
    db.passiveSkills = passiveSkills;
  } catch (err) {
    db.error =
      err instanceof Error ? err.message : 'Unknown error loading Unreal data dumps';
  } finally {
    db.isLoading = false;
  }
}
