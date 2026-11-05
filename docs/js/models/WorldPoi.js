// @ts-check
import { extractBlueprintName } from '../services/unreal.js';
import { CATEGORIES } from '../services/mapUtils.js';

/**
 * Resolves the functional category for a Blueprint POI class.
 *
 * @param {string} type
 * @returns {import('../types.js').PoiCategory}
 */
export function getPoiCategory(type) {
  if (type.startsWith('BP_InstancedInteractiveFoliageComponent_')) {
    return 'resource';
  }

  switch (extractBlueprintName(type)) {
    case 'BP_Spawner':
      return 'spawner';
    case 'BP_AlchemistTower_Interact':
      return 'tower';
    case 'BP_WorldChest':
      return 'chest';
    case 'BP_Recipe':
      return 'recipe';
    case 'BP_Interactable_ExpObelisk':
      return 'obelisk';
    case 'BP_NPC_StaticDialogue_Shop':
      return 'shop';
    case 'BP_NPC_StaticDialogue_Inn':
      return 'inn';
    case 'BP_NPC_StaticDialogue_Navigator_Island':
    case 'BP_NPC_StaticDialogue_Navigator_Baq':
      return 'ferry';
    case 'BP_NPC_Battle':
    case 'BP_NPC_Battle_FKingdom':
    case 'BP_NPC_Battle_Knight':
      return 'battle';
    case 'BP_NPC_StaticDialogue_FetchShowQuest':
      return 'quest';
    case 'BP_DungeonDoor':
      return 'dungeon';
    case 'BP_DungeonDoor_Exit':
      return 'dungeon_exit';
    case 'BP_ColisseumDoor':
      return 'coliseum';
    case 'BP_DungeonManager':
    case 'BP_Coliseum':
    case 'BP_Coliseum_Child':
      return 'manager';
    case 'BP_ZoneDiscoveryVolume':
      return 'zone';
    default:
      throw new Error(`[WorldPoi] Unrecognized POI blueprint class: "${type}"`);
  }
}

/**
 * Domain model representing an interactive world point of interest (POI) in the overworld.
 */
export class WorldPoi {
  /**
   * @param {object} params
   * @param {string} params.id Unique POI identifier (e.g. "BP_Spawner_C_UAID_...")
   * @param {string} params.type Blueprint POI class name (e.g. "BP_Spawner_C")
   * @param {import('../types.js').PoiCategory} [params.category] Explicit category override
   * @param {string} [params.label] Editor/designer label (e.g. "BP_Spawner359")
   * @param {string} params.cell Level cell filename (e.g. "F4OE1V48ONG3HGD5CL8Z77FKJ")
   * @param {import('../types.js').WorldCoordinates} params.location World coordinates (x, y, z)
   * @param {string} [params.tag] Spawner tag or reference tag (e.g. "Spawn.Xantic.Marlo")
   * @param {Record<string, any>} [params.properties] Normalized blueprint properties dictionary
   */
  constructor({ id, type, category, label, cell, location, tag = '', properties = {} }) {
    this.id = id;
    this.type = type;
    this.category = category || getPoiCategory(type);
    this.label = label || id;
    this.cell = cell;
    this.location = location;
    this.tag = tag;
    this.properties = properties;
  }

  /**
   * Whether this POI is hidden/invisible in the overworld in-game.
   * Only categories configured with `canBeHidden` can be hidden in-game.
   * @returns {boolean}
   */
  get isHidden() {
    return this.properties.bHidden === true && CATEGORIES[this.category]?.canBeHidden === true;
  }

  /**
   * For resource nodes, the DT_WorldResources row key (e.g. 'WR_Iron').
   * @returns {string}
   */
  get resourceTableKey() {
    return this.properties.resourceTableKey || '';
  }

  /**
   * List of items sold by merchant shops.
   * @returns {import('../types.js').WorldShopItem[]}
   */
  get shopItems() {
    return this.properties.ShopPool?.map((/** @type {any} */ entry) => ({
      itemId: entry.Item,
      price: entry.Price,
      amount: entry.Amount
    })) ?? [];
  }

  /**
   * List of monster team members for battle encounters (trainers or overworld bosses).
   * @returns {import('../types.js').WorldBattleMember[]}
   */
  get battleTeam() {
    return this.properties['Enemy Team']?.map((/** @type {any} */ entry) => ({
      monsterId: entry.Class,
      level: entry.Level,
      isBoss: entry.Boss,
      mutation: entry.Mutation
    })) ?? [];
  }

  /**
   * List of battle rounds for Coliseum arena managers, with each round's team normalized to WorldBattleMember[].
   * @returns {Array<{ round: number, team: import('../types.js').WorldBattleMember[] }>}
   */
  get coliseumRounds() {
    return this.properties.Battles?.map((/** @type {any} */ battle, /** @type {number} */ index) => ({
      round: index + 1,
      team: battle.Team?.map((/** @type {any} */ entry) => ({
        monsterId: entry.Class,
        level: entry.Level,
        isBoss: entry.Boss,
        mutation: entry.Mutation
      })) ?? []
    })) ?? [];
  }
}
