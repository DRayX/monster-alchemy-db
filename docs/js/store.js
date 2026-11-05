// @ts-check
import { reactive } from 'vue';
import { loadGameDatabase } from './services/loader.js';
import { CaseInsensitiveMap } from './services/unreal.js';

/**
 * @typedef {import('./models/Monster.js').Monster} Monster
 * @typedef {import('./models/Item.js').Item} Item
 * @typedef {import('./models/Room.js').Room} Room
 * @typedef {import('./models/Recipe.js').CraftingRecipe} CraftingRecipe
 * @typedef {import('./models/Recipe.js').FusionRecipe} FusionRecipe
 * @typedef {import('./models/Skill.js').ActiveSkill} ActiveSkill
 * @typedef {import('./models/Skill.js').PassiveSkill} PassiveSkill
 * @typedef {import('./models/WorldResource.js').WorldResource} WorldResource
 * @typedef {import('./models/Location.js').Location} Location
 * @typedef {import('./models/WorldPoi.js').WorldPoi} WorldPoi
 */

/**
 * Global fast-lookup indexes populated on database load for O(1) identifier queries.
 */
export const dbIndexes = {
  /** @type {CaseInsensitiveMap<Monster>} */
  monsters: new CaseInsensitiveMap(),
  /** @type {CaseInsensitiveMap<Item>} */
  items: new CaseInsensitiveMap(),
  /** @type {CaseInsensitiveMap<CraftingRecipe>} */
  recipes: new CaseInsensitiveMap(),
  /** @type {CaseInsensitiveMap<Location>} */
  locations: new CaseInsensitiveMap(),
  /** @type {CaseInsensitiveMap<WorldResource>} */
  worldResources: new CaseInsensitiveMap(),
  /** @type {CaseInsensitiveMap<WorldPoi>} */
  worldPois: new CaseInsensitiveMap()
};

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
  /** @type {WorldResource[]} */
  worldResources: [],
  /** @type {Location[]} */
  locations: [],
  /** @type {WorldPoi[]} */
  worldPois: [],
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
    ({
      monsters: db.monsters,
      items: db.items,
      rooms: db.rooms,
      recipes: db.recipes,
      fusions: db.fusions,
      activeSkills: db.activeSkills,
      passiveSkills: db.passiveSkills,
      worldResources: db.worldResources,
      locations: db.locations,
      worldPois: db.worldPois
    } = await loadGameDatabase());

    dbIndexes.monsters = new CaseInsensitiveMap(db.monsters.map((m) => [m.id, m]));
    dbIndexes.items = new CaseInsensitiveMap(db.items.map((i) => [i.id, i]));
    dbIndexes.recipes = new CaseInsensitiveMap(db.recipes.map((r) => [r.id, r]));
    dbIndexes.locations = new CaseInsensitiveMap(db.locations.map((l) => [l.id, l]));
    dbIndexes.worldResources = new CaseInsensitiveMap(db.worldResources.map((r) => [r.id, r]));
    dbIndexes.worldPois = new CaseInsensitiveMap(db.worldPois.map((p) => [p.id, p]));
  } catch (err) {
    db.error =
      err instanceof Error ? err.message : 'Unknown error loading Unreal data dumps';
  } finally {
    db.isLoading = false;
  }
}
