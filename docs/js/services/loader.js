// @ts-check
import {
  DATA_TABLE_URLS,
  STRUCT_URLS,
  ENUM_URLS
} from './assets.js';
import { parseUnrealEnum, extractNormalizedRows } from './unreal.js';
import { Monster, MonsterLoot, LearnedSkill, MonsterWildSpawn } from '../models/Monster.js';
import { Item } from '../models/Item.js';
import { Room } from '../models/Room.js';
import { CraftingRecipe, RecipeIngredient, FusionOperand, FusionRecipe, GenericFusionInputs } from '../models/Recipe.js';
import { ActiveSkill, PassiveSkill } from '../models/Skill.js';

/**
 * @typedef {import('../types.js').NormalizedUnrealRow} NormalizedUnrealRow
 */

/**
 * Fetches and parses a JSON resource from the given URL.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }
  return res.json();
}

/**
 * Loads a dictionary of URLs into an object mapping each key to its parsed JSON data.
 * @template T
 * @param {Record<string, string>} urls
 * @returns {Promise<Record<string, T>>}
 */
async function loadJsonMap(urls) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(urls).map(async ([key, url]) => [key, await loadJson(url)])
    )
  );
}

/**
 * Loads and processes all game tables, structs, and enums from `./extracted/Game/`.
 * @returns {Promise<{ monsters: Monster[], items: Item[], rooms: Room[], recipes: CraftingRecipe[], fusions: FusionRecipe[], activeSkills: ActiveSkill[], passiveSkills: PassiveSkill[] }>}
 */
export async function loadGameDatabase() {
  const [structs, enums, tables] = await Promise.all([
    loadJsonMap(STRUCT_URLS),
    loadJsonMap(ENUM_URLS),
    loadJsonMap(DATA_TABLE_URLS)
  ]);

  /** @type {Record<string, string>} */
  const enumLookup = {};
  for (const rawEnum of Object.values(enums)) {
    Object.assign(enumLookup, parseUnrealEnum(rawEnum));
  }

  // Pre-normalize all DataTables in a single pass using dynamic RowStruct lookups
  /** @type {Record<string, Record<string, NormalizedUnrealRow>>} */
  const normalized = {};
  for (const [tableName, rawTableJson] of Object.entries(tables)) {
    normalized[tableName] = extractNormalizedRows(rawTableJson, structs, enumLookup);
  }

  // Process Active Skills
  /** @type {Map<string, ActiveSkill>} */
  const activeSkillsById = new Map();
  for (const [id, row] of Object.entries(normalized.DT_ActiveSkills || {})) {
    activeSkillsById.set(
      id,
      new ActiveSkill({
        id,
        name: row.Name,
        description: row.Description || '',
        targetting: row.Targetting || '',
        element: row.MonsterType || 'Neutral',
        damageType: row.DamageType || 'Strike',
        scaling: row.Scaling || 'None',
        power: row.Power ?? 0,
        cost: row.Cost ?? 0
      })
    );
  }

  // Process Passive Skills
  /** @type {Map<string, PassiveSkill>} */
  const passiveSkillsById = new Map();
  for (const [id, row] of Object.entries(normalized.DT_PassiveSkills || {})) {
    passiveSkillsById.set(
      id,
      new PassiveSkill({
        id,
        name: row.Name,
        description: row.Description || ''
      })
    );
  }

  // 1. Process Items / Resources
  /** @type {Map<string, Item>} */
  const itemById = new Map();

  for (const [id, row] of Object.entries(normalized.DT_ResourceData || {})) {
    itemById.set(
      id,
      new Item({
        id,
        name: row.Name || id,
        description: row.Description || ''
      })
    );
  }

  // 2. Process Monsters & Rewards
  /** @type {Monster[]} */
  const monsters = [];
  /** @type {Map<string, Monster>} */
  const monsterById = new Map();
  /** @type {Map<string, string>} */
  const monsterNameMap = new Map();

  for (const [id, row] of Object.entries(normalized.DT_MonsterTable || {})) {
    const name = row.Name || id;
    const reward = normalized.DT_MonsterRewards?.[id];

    /** @type {MonsterLoot[]} */
    const loots = [];
    for (const [rarity, key] of [
      ['Common', reward?.CommonLoot],
      ['Rare', reward?.RareLoot],
      ['Epic', reward?.EpicLoot]
    ]) {
      const itm = itemById.get(key);
      if (!itm) continue;
      itm.dropCount += 1;
      loots.push(new MonsterLoot(rarity, itm));
    }

    const passiveSkill = passiveSkillsById.get(row.Passive) ?? null;

    const skillRow = normalized.DT_MonsterSkillLevels?.[id];
    /** @type {LearnedSkill[]} */
    const skills = [];
    if (skillRow) {
      for (const [level, skillKey] of [
        [1, skillRow.BaseSkill],
        [skillRow.SkillLevel1, skillRow.Skill1],
        [skillRow.SkillLevel2, skillRow.Skill2],
        [skillRow.SkillLevel3, skillRow.Skill3],
        [skillRow.SkillLevel4, skillRow.Skill4]
      ]) {
        const skill = activeSkillsById.get(skillKey) || passiveSkillsById.get(skillKey);
        if (!skill) continue;
        skills.push(new LearnedSkill(Number(level), skill));
      }
    }

    monsterNameMap.set(id, name);

    const monster = new Monster({
      id,
      name,
      element: row.Type || 'Neutral',
      attackType: row.AttackType || 'Strike',
      tier: row.Tier ?? 1,
      health: row.Health ?? 0,
      soul: row.Soul ?? 0,
      strength: row.Strength ?? 0,
      defense: row.Defense ?? 0,
      mind: row.Mind ?? 0,
      agility: row.Agility ?? 0,
      passiveSkill,
      skills,
      description: row.Description || '',
      loots
    });

    monsters.push(monster);
    monsterById.set(id, monster);
  }

  // Populate Wild Spawns directly from DT_Spawns
  for (const [spawnId, row] of Object.entries(normalized.DT_Spawns || {})) {
    const minLevel = row.MinLv || 1;
    const maxLevel = row.MaxLv || minLevel;

    for (const [prop, monsterId] of Object.entries(row)) {
      const match = /^(Common|Rare|Epic)(N?)(\d*)$/.exec(prop);
      if (!match) continue;

      const monster = monsterById.get(monsterId);
      if (!monster) continue;

      const [, rarity, isNight] = match;
      const timeOfDay = isNight ? 'Night' : 'Day';
      monster.wildSpawns.push(
        new MonsterWildSpawn({
          id: spawnId,
          slot: prop,
          minLevel,
          maxLevel,
          timeOfDay,
          rarity: /** @type {'Common' | 'Rare' | 'Epic'} */ (rarity)
        })
      );
    }
  }

  // 3. Process Rooms
  /** @type {Map<string, Room>} */
  const roomById = new Map();
  for (const [roomId, row] of Object.entries(normalized.DT_Rooms || {})) {
    roomById.set(
      roomId,
      new Room({
        id: roomId,
        name: row.Name || roomId,
        prefix: row.Prefix || ''
      })
    );
  }

  // 4. Process Crafting Recipes
  /** @type {CraftingRecipe[]} */
  const recipes = [];

  for (const [recipeId, row] of Object.entries(normalized.DT_CraftRecipes || {})) {
    if (!recipeId || recipeId === '#N/A') continue;
    const resultId = row.Result || 'None';
    if (!resultId || resultId === 'None') continue;

    const roomId = row.Room || 'Room';
    const room = roomById.get(roomId);
    const roomName = room ? room.name : roomId;
    const roomIcon = room ? room.icon : '';

    /** @type {'Resource' | 'Monster' | 'Structure'} */
    const outputType =
      row.Type === 'Monster' || row.Type === 'Structure' ? row.Type : 'Resource';

    let outputName = resultId;
    if (outputType === 'Monster') {
      outputName = monsterNameMap.get(resultId) || resultId;
    } else if (outputType === 'Structure') {
      outputName = roomById.get(resultId)?.name || resultId;
    } else {
      const itm = itemById.get(resultId);
      if (!itm) continue;
      itm.craftedCount += 1;
      outputName = itm.name;
    }

    /** @type {RecipeIngredient[]} */
    const ingredients = [];
    for (const [resId, amt] of [
      [row.Resource1, row.Amount1],
      [row.Resource2, row.Amount2],
      [row.Resource3, row.Amount3],
      [row.Resource4, row.Amount4]
    ]) {
      const ingItem = itemById.get(resId);
      if (!ingItem) continue;
      ingItem.usedInCount += 1;
      ingredients.push(new RecipeIngredient(Number(amt), ingItem));
    }

    /** @type {CraftingRecipe} */
    const recipe = new CraftingRecipe({
      id: recipeId,
      roomId,
      roomName,
      roomIcon,
      outputId: resultId,
      outputName,
      outputType,
      outputQuantity: row.AmountResult ?? 1,
      work: row.Work ?? 0,
      ingredients
    });

    recipes.push(recipe);
    if (room) {
      room.recipes.push(recipe);
    }
  }

  // 5. Process Monster Fusions
  /** @type {FusionRecipe[]} */
  const fusions = [];

  // Precomputed lowercase lookup to resolve casing discrepancies in raw fusion tables in O(1)
  const canonicalMonsterIds = new Map(
    Array.from(monsterNameMap.keys(), (id) => [id.toLowerCase(), id])
  );

  /**
   * @param {string} rawToken
   * @returns {FusionOperand}
   */
  function createFusionOperand(rawToken) {
    const canonicalId = canonicalMonsterIds.get(rawToken.toLowerCase()) || rawToken;
    return new FusionOperand(canonicalId, monsterNameMap.get(canonicalId));
  }

  /**
   * @param {string} comboKey
   * @param {string} resultRaw
   * @param {'Explicit' | 'Generic'} fusionType
   * @param {GenericFusionInputs[]} [baseCombinations]
   */
  function createFusionRecipe(comboKey, resultRaw, fusionType, baseCombinations = []) {
    const [rawA, rawB] = comboKey.split('+');
    const canonicalResult = canonicalMonsterIds.get(resultRaw.toLowerCase()) || resultRaw;

    return new FusionRecipe({
      id: `${comboKey}=${canonicalResult}`,
      fusionType,
      inputA: createFusionOperand(rawA),
      inputB: createFusionOperand(rawB),
      resultId: canonicalResult,
      resultName: monsterNameMap.get(canonicalResult) || canonicalResult,
      baseCombinations
    });
  }

  // 1. Add Explicit Fusions
  for (const [comboKey, row] of Object.entries(normalized.DT_Fusion_Explicit || {})) {
    fusions.push(createFusionRecipe(comboKey, row.Result, 'Explicit'));
  }

  // 2. Add Generic Fusions consulting DT_Fusion_Generic_Converted
  // Group by converted pattern + result monster (e.g. 1NatureAny+1AnySlash=Corolus)
  // Preserves full in-game recipe matches and records all matching base combinations for UI expansion.
  /** @type {Map<string, { pattern: string, result: string, baseCombinations: GenericFusionInputs[] }>} */
  const genericGroups = new Map();

  for (const [comboKey, row] of Object.entries(normalized.DT_Fusion_Generic || {})) {
    const canonicalResult = canonicalMonsterIds.get(row.Result.toLowerCase()) || row.Result;

    // Look up normalized pattern in converter table (checking both operand orders)
    let normPattern = normalized.DT_Fusion_Generic_Converted?.[comboKey]?.Result;
    if (!normPattern) {
      const [pA, pB] = comboKey.split('+');
      normPattern = normalized.DT_Fusion_Generic_Converted?.[`${pB}+${pA}`]?.Result;
    }
    const pattern = normPattern || comboKey;

    const groupKey = `${pattern}=${canonicalResult}`;
    let group = genericGroups.get(groupKey);
    if (!group) {
      group = { pattern, result: canonicalResult, baseCombinations: [] };
      genericGroups.set(groupKey, group);
    }

    const [baseA, baseB] = comboKey.split('+');

    group.baseCombinations.push(
      new GenericFusionInputs({
        key: comboKey,
        inputA: createFusionOperand(baseA),
        inputB: createFusionOperand(baseB)
      })
    );
  }

  for (const group of genericGroups.values()) {
    fusions.push(createFusionRecipe(group.pattern, group.result, 'Generic', group.baseCombinations));
  }

  const fusionRoom = roomById.get('FusionRoom');
  if (fusionRoom) {
    fusionRoom.fusionRecipes = fusions;
  }

  const rooms = Array.from(roomById.values());

  const items = Array.from(itemById.values());

  const activeSkills = Array.from(activeSkillsById.values());
  const passiveSkills = Array.from(passiveSkillsById.values());

  return { monsters, items, rooms, recipes, fusions, activeSkills, passiveSkills };
}
