// @ts-check
const HIDDEN_CATEGORIES = new Set(['chest', 'recipe']);

/**
 * Domain model representing an interactive world point of interest (POI) in the overworld.
 */
export class WorldPoi {
  /**
   * @param {object} params
   * @param {string} params.id Unique POI identifier (e.g. "BP_Spawner_C_UAID_...")
   * @param {string} params.type Blueprint POI class name (e.g. "BP_Spawner_C")
   * @param {import('../types.js').PoiCategory} params.category Functional POI category
   * @param {string} [params.label] Editor/designer label (e.g. "BP_Spawner359")
   * @param {string} params.cell Level cell filename (e.g. "F4OE1V48ONG3HGD5CL8Z77FKJ")
   * @param {import('../types.js').WorldCoordinates} params.location World coordinates (x, y, z)
   * @param {string} [params.tag] Spawner tag or reference tag (e.g. "Spawn.Xantic.Marlo")
   * @param {Record<string, any>} [params.properties] Normalized blueprint properties dictionary
   */
  constructor({ id, type, category, label, cell, location, tag = '', properties = {} }) {
    this.id = id;
    this.type = type;
    this.category = category;
    this.label = label || id;
    this.cell = cell;
    this.location = location;
    this.tag = tag;
    this.properties = properties;
  }

  /**
   * Whether this POI is hidden/invisible in the overworld in-game.
   * Only chests and recipes can be hidden in-game.
   * @returns {boolean}
   */
  get isHidden() {
    return this.properties.bHidden === true && HIDDEN_CATEGORIES.has(this.category);
  }

  /**
   * For resource nodes, the DT_WorldResources row key (e.g. 'WR_Iron').
   * @returns {string}
   */
  get resourceTableKey() {
    return this.properties.resourceTableKey || '';
  }

  /**
   * Whether this POI is a secondary linked element/target (such as a dungeon exit,
   * spring target, arcane door/bridge, or arcane cube) rather than a primary interactive source.
   * Secondary linked targets are displayed on the map but excluded from category counts.
   * @returns {boolean}
   */
  get isLinkedSecondary() {
    if (this.type === 'BP_DungeonDoor_Exit_C') return true;
    if (this.type === 'BP_Spring_Target_C') return true;
    if (this.type.startsWith('BP_ArcaneObject')) return true;
    if (this.type === 'BP_ArcaneCube_C') return true;
    return false;
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
