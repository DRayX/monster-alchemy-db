// @ts-check
import {
  getMonsterProfileImage,
  getItemIcon,
  resolveUnrealAssetPath,
  STRUCT_URLS,
  ENUM_URLS,
  DATA_TABLE_URLS
} from './assets.js';
import {
  formatSkillDescription,
  formatTargetting,
  formatFusionInput
} from './formatters.js';
import { Monster, MonsterLoot, LearnedSkill } from '../models/Monster.js';
import { Item } from '../models/Item.js';
import { Room } from '../models/Room.js';
import { CraftingRecipe, RecipeIngredient, FusionRecipe, GenericFusionInputs } from '../models/Recipe.js';
import { ActiveSkill, PassiveSkill } from '../models/Skill.js';

/**
 * Utilities for loading and normalizing the real Unreal Engine DataTable, Struct, & Enum
 * JSON dumps under `./extracted/Game/` without modifying the source files.
 *
 * @typedef {import('../types.js').UnrealText} UnrealText
 * @typedef {import('../types.js').RawUnrealPropValue} RawUnrealPropValue
 * @typedef {import('../types.js').RawUnrealRow} RawUnrealRow
 * @typedef {import('../types.js').UnrealDataTableAsset} UnrealDataTableAsset
 * @typedef {import('../types.js').UnrealStructAsset} UnrealStructAsset
 * @typedef {import('../types.js').UnrealEnumAsset} UnrealEnumAsset
 * @typedef {import('../types.js').UnrealFlipbookAsset} UnrealFlipbookAsset
 * @typedef {import('../types.js').NormalizedUnrealRow} NormalizedUnrealRow
 */

/**
 * Extracts a clean string from an Unreal Engine FText object using SourceString.
 * @param {RawUnrealPropValue} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function extractUnrealText(value, fallback = 'Unknown') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'SourceString' in value) {
    return value.SourceString || fallback;
  }
  return fallback;
}

/**
 * Parses an Unreal `UserDefinedEnum` JSON export into a lookup map from
 * `"EnumName::NewEnumeratorX"` and `"NewEnumeratorX"` to its display string.
 *
 * @param {UnrealEnumAsset[]} rawEnumJson
 * @returns {Record<string, string>}
 */
export function parseUnrealEnum(rawEnumJson) {
  /** @type {Record<string, string>} */
  const map = {};
  const entry = rawEnumJson[0];
  if (!entry) return map;

  const enumName = entry.Name || '';
  const displayList = entry.Properties?.DisplayNameMap;
  if (Array.isArray(displayList)) {
    for (const item of displayList) {
      if (item && typeof item.Key === 'string') {
        const label = extractUnrealText(item.Value, item.Key);
        map[item.Key] = label;
        if (enumName) {
          map[`${enumName}::${item.Key}`] = label;
        }
      }
    }
  }
  return map;
}

/**
 * Extracts and normalizes all rows from an Unreal DataTable JSON export using its
 * corresponding `UserDefinedStruct` (`S_*.json`) definition:
 * - Maps each exact serialized property key (`Name_44_...`) to its clean base name (`Name`)
 * - Automatically extracts `SourceString` for `TextProperty` fields
 * - Automatically resolves enum display strings for `ByteProperty` fields
 *
 * @param {UnrealDataTableAsset[]} rawTableJson
 * @param {UnrealStructAsset[]} rawStructJson
 * @param {Record<string, string>} [enumLookup]
 * @returns {Record<string, NormalizedUnrealRow>}
 */
export function extractNormalizedRows(rawTableJson, rawStructJson, enumLookup = {}) {
  const structEntry = rawStructJson[0];
  const childProps = structEntry?.ChildProperties ?? [];

  /** @type {Array<{ fullName: string, baseName: string, type: string }>} */
  const propSpecs = [];
  for (const prop of childProps) {
    propSpecs.push({
      fullName: prop.Name,
      baseName: prop.Name.replace(/_\d+_[0-9A-Fa-f]{32}$/, ''),
      type: prop.Type
    });
  }

  /** @type {Record<string, RawUnrealRow>} */
  const rawRows = {};
  for (const entry of rawTableJson) {
    if (entry.Rows) {
      Object.assign(rawRows, entry.Rows);
    }
  }

  /** @type {Record<string, NormalizedUnrealRow>} */
  const normalized = {};
  for (const [rowId, rawRow] of Object.entries(rawRows)) {
    /** @type {NormalizedUnrealRow} */
    const cleanRow = {};
    for (const spec of propSpecs) {
      const val = rawRow[spec.fullName];
      if (spec.type === 'TextProperty') {
        cleanRow[spec.baseName] = extractUnrealText(val, '');
      } else if (spec.type === 'ByteProperty' && typeof val === 'string') {
        cleanRow[spec.baseName] = enumLookup[val] || val;
      } else {
        cleanRow[spec.baseName] = val;
      }
    }
    normalized[rowId] = cleanRow;
  }

  return normalized;
}

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
 * @param {Record<string, string>} urls
 * @returns {Promise<Record<string, any>>}
 */
async function loadJsonMap(urls) {
  const entries = await Promise.all(
    Object.entries(urls).map(async ([key, url]) => [key, await loadJson(url)])
  );
  return Object.fromEntries(entries);
}

/**
 * Fetches `FB_<monsterId>_Idle.json` for a monster and extracts the relative sprite sheet `.png` path
 * from `Properties.KeyFrames[0].Sprite.ObjectPath` (e.g. `/Game/Art/Sprites/Amalgameye/T_Amalgameye_50x45_Sprite_0.1`
 * -> `./extracted/Game/Art/Sprites/Amalgameye/T_Amalgameye_50x45.png`).
 * Returns an empty string if the flipbook asset does not exist.
 *
 * @param {string} monsterId
 * @returns {Promise<string>}
 */
export async function loadMonsterSpriteImage(monsterId) {
  /** @type {UnrealFlipbookAsset[] | null} */
  let flipbook = null;
  try {
    flipbook = await loadJson(
      `./extracted/Game/Art/Sprites/${monsterId}/FB_${monsterId}_Idle.json`
    );
  } catch {
    // Handles 404s when a monster lacks a flipbook asset on disk
    return '';
  }

  const objectPath = flipbook?.[0]?.Properties?.KeyFrames?.[0]?.Sprite?.ObjectPath;
  if (!objectPath) return '';
  return `./extracted${objectPath.replace(/_Sprite_\d+\.\d+$/, '.png')}`;
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

  // Combined enum lookup table
  /** @type {Record<string, string>} */
  const enumLookup = {};
  for (const rawEnum of Object.values(enums)) {
    Object.assign(enumLookup, parseUnrealEnum(rawEnum));
  }

  // Pre-normalize all DataTables using their S_* struct definitions
  const resourceRows = extractNormalizedRows(tables.resourceData, structs.resourceStruct, enumLookup);
  const rewardRows = extractNormalizedRows(tables.monsterRewards, structs.rewardStruct, enumLookup);
  const monsterRows = extractNormalizedRows(tables.monsterTable, structs.monsterStruct, enumLookup);
  const roomRows = extractNormalizedRows(tables.roomsTable, structs.roomStruct, enumLookup);
  const recipeRows = extractNormalizedRows(tables.craftRecipes, structs.recipeStruct, enumLookup);
  const explicitFusionRows = extractNormalizedRows(tables.fusionExplicit, structs.fusionStruct, enumLookup);
  const genericFusionRows = extractNormalizedRows(tables.fusionGeneric, structs.fusionStruct, enumLookup);
  const genericFusionConvertedRows = extractNormalizedRows(tables.fusionGenericConverted, structs.fusionStruct, enumLookup);
  const activeSkillRows = extractNormalizedRows(tables.activeSkills, structs.activeSkillStruct, enumLookup);
  const passiveSkillRows = extractNormalizedRows(tables.passiveSkills, structs.passiveSkillStruct, enumLookup);
  const skillLevelRows = extractNormalizedRows(tables.monsterSkillLevels, structs.monsterSkillLevelStruct, enumLookup);

  // Process Active Skills
  /** @type {Map<string, ActiveSkill>} */
  const activeSkillsById = new Map();
  for (const [id, row] of Object.entries(activeSkillRows)) {
    if (!id || id === 'None') continue;
    const rawDesc = row.Description || '';
    activeSkillsById.set(
      id,
      new ActiveSkill({
        id,
        name: row.Name || id.replace(/([a-z])([A-Z])/g, '$1 $2'),
        description: rawDesc,
        formattedDescription: formatSkillDescription(rawDesc),
        targetting: row.Targetting || '',
        targettingLabel: formatTargetting(row.Targetting || ''),
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
  for (const [id, row] of Object.entries(passiveSkillRows)) {
    if (!id || id === 'None') continue;
    const rawDesc = row.Description || '';
    passiveSkillsById.set(
      id,
      new PassiveSkill({
        id,
        name: row.Name || id.replace(/([a-z])([A-Z])/g, '$1 $2'),
        description: rawDesc,
        formattedDescription: formatSkillDescription(rawDesc)
      })
    );
  }

  // 1. Process Items / Resources
  /** @type {Map<string, Item>} */
  const itemById = new Map();

  for (const [id, row] of Object.entries(resourceRows)) {
    if (!id || id === 'None') continue;
    itemById.set(
      id,
      new Item({
        id,
        name: row.Name || id,
        description: row.Description || '',
        icon: getItemIcon(id)
      })
    );
  }

  /**
   * @param {string} itemId
   * @returns {Item}
   */
  function ensureItem(itemId) {
    let existing = itemById.get(itemId);
    if (!existing) {
      existing = new Item({ id: itemId });
      itemById.set(itemId, existing);
    }
    return existing;
  }

  // 2. Process Monsters & Rewards
  /** @type {Monster[]} */
  const monsters = [];
  /** @type {Map<string, string>} */
  const monsterNameMap = new Map();

  for (const [id, row] of Object.entries(monsterRows)) {
    const name = row.Name || id;
    const reward = rewardRows[id];
    const profileImage = getMonsterProfileImage(id);

    /** @type {Array<{ key: string | undefined, rarity: 'Common' | 'Rare' | 'Epic' }>} */
    const lootSlots = [
      { key: reward?.CommonLoot, rarity: 'Common' },
      { key: reward?.RareLoot, rarity: 'Rare' },
      { key: reward?.EpicLoot, rarity: 'Epic' }
    ];

    /** @type {MonsterLoot[]} */
    const loots = [];
    for (const slot of lootSlots) {
      if (slot.key && slot.key !== 'None') {
        const itm = ensureItem(slot.key);
        itm.dropCount += 1;
        loots.push(new MonsterLoot(slot.rarity, itm));
      }
    }

    const rawPassive = row.Passive || 'None';
    /** @type {PassiveSkill | null} */
    let passiveSkill = null;
    if (rawPassive && rawPassive !== 'None') {
      const found = passiveSkillsById.get(rawPassive);
      if (found) {
        passiveSkill = found;
      } else {
        passiveSkill = new PassiveSkill({ id: rawPassive });
      }
    }

    const skillRow = skillLevelRows[id];
    /** @type {LearnedSkill[]} */
    const skills = [];
    if (skillRow) {
      /** @type {Array<{ level: number, skillKey: string | undefined }>} */
      const skillSlots = [
        { level: 1, skillKey: skillRow.BaseSkill },
        { level: skillRow.SkillLevel1 || 1, skillKey: skillRow.Skill1 },
        { level: skillRow.SkillLevel2 || 1, skillKey: skillRow.Skill2 },
        { level: skillRow.SkillLevel3 || 1, skillKey: skillRow.Skill3 },
        { level: skillRow.SkillLevel4 || 1, skillKey: skillRow.Skill4 }
      ];

      for (const slot of skillSlots) {
        if (slot.skillKey && slot.skillKey !== 'None') {
          const skill =
            activeSkillsById.get(slot.skillKey) ||
            passiveSkillsById.get(slot.skillKey) ||
            new ActiveSkill({ id: slot.skillKey });
          skills.push(new LearnedSkill(slot.level, skill));
        }
      }
    }

    monsterNameMap.set(id, name);

    const health = row.Health ?? 0;
    const soul = row.Soul ?? 0;
    const strength = row.Strength ?? 0;
    const defense = row.Defense ?? 0;
    const mind = row.Mind ?? 0;
    const agility = row.Agility ?? 0;

    monsters.push(
      new Monster({
        id,
        name,
        element: row.Type || 'Neutral',
        attackType: row.AttackType || 'Strike',
        tier: row.Tier ?? 1,
        health,
        soul,
        strength,
        defense,
        mind,
        agility,
        passiveSkill,
        skills,
        description: row.Description || '',
        profileImage,
        loots
      })
    );
  }

  // 3. Process Rooms
  /** @type {Map<string, Room>} */
  const roomById = new Map();
  for (const [roomId, row] of Object.entries(roomRows)) {
    const iconUrl = resolveUnrealAssetPath(row.Icon);
    roomById.set(
      roomId,
      new Room({
        id: roomId,
        name: row.Name || roomId,
        prefix: row.Prefix || '',
        icon: iconUrl
      })
    );
  }

  // 4. Process Crafting Recipes
  /** @type {CraftingRecipe[]} */
  const recipes = [];

  for (const [recipeId, row] of Object.entries(recipeRows)) {
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
    let outputRoute = `/items/${resultId}`;

    if (outputType === 'Monster') {
      outputName = monsterNameMap.get(resultId) || resultId;
      outputRoute = `/monsters/${resultId}`;
    } else if (outputType === 'Structure') {
      outputName = roomById.get(resultId)?.name || resultId;
      outputRoute = `/rooms/${resultId}`;
    } else {
      const itm = ensureItem(resultId);
      itm.craftedCount += 1;
      outputName = itm.name;
      outputRoute = `/items/${resultId}`;
    }

    /** @type {Array<{ resId: string | undefined, amt: number | undefined }>} */
    const rawSlots = [
      { resId: row.Resource1, amt: row.Amount1 },
      { resId: row.Resource2, amt: row.Amount2 },
      { resId: row.Resource3, amt: row.Amount3 },
      { resId: row.Resource4, amt: row.Amount4 }
    ];

    /** @type {RecipeIngredient[]} */
    const ingredients = [];
    for (const slot of rawSlots) {
      if (slot.resId && slot.resId !== 'None' && slot.amt && slot.amt > 0) {
        const ingItem = ensureItem(slot.resId);
        ingItem.usedInCount += 1;
        ingredients.push(new RecipeIngredient(slot.amt, ingItem));
      }
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
      outputRoute,
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
   * @param {string} comboKey
   * @param {string} resultRaw
   * @param {'Explicit' | 'Generic'} fusionType
   * @param {GenericFusionInputs[]} [baseCombinations]
   */
  function createFusionRecipe(comboKey, resultRaw, fusionType, baseCombinations = []) {
    const [rawA, rawB] = comboKey.split('+');
    const canonicalA = canonicalMonsterIds.get(rawA.toLowerCase()) || rawA;
    const canonicalB = canonicalMonsterIds.get(rawB.toLowerCase()) || rawB;
    const canonicalResult = canonicalMonsterIds.get(resultRaw.toLowerCase()) || resultRaw;

    const infoA = formatFusionInput(canonicalA, monsterNameMap);
    const infoB = formatFusionInput(canonicalB, monsterNameMap);

    return new FusionRecipe({
      id: `${comboKey}=${canonicalResult}`,
      fusionType,
      inputA: canonicalA,
      inputAName: infoA.name,
      inputAIsMonster: infoA.isMonster,
      inputB: canonicalB,
      inputBName: infoB.name,
      inputBIsMonster: infoB.isMonster,
      resultId: canonicalResult,
      resultName: monsterNameMap.get(canonicalResult) || canonicalResult,
      baseCombinations
    });
  }

  // 1. Add Explicit Fusions
  for (const [comboKey, row] of Object.entries(explicitFusionRows)) {
    fusions.push(createFusionRecipe(comboKey, row.Result, 'Explicit'));
  }

  // 2. Add Generic Fusions consulting DT_Fusion_Generic_Converted
  // Group by converted pattern + result monster (e.g. 1NatureAny+1AnySlash=Corolus)
  // Preserves full in-game recipe matches and records all matching base combinations for UI expansion.
  /** @type {Map<string, { pattern: string, result: string, baseCombinations: GenericFusionInputs[] }>} */
  const genericGroups = new Map();

  for (const [comboKey, row] of Object.entries(genericFusionRows)) {
    const canonicalResult = canonicalMonsterIds.get(row.Result.toLowerCase()) || row.Result;

    // Look up normalized pattern in converter table (checking both operand orders)
    let normPattern = genericFusionConvertedRows[comboKey]?.Result;
    if (!normPattern) {
      const [pA, pB] = comboKey.split('+');
      normPattern = genericFusionConvertedRows[`${pB}+${pA}`]?.Result;
    }
    const pattern = normPattern || comboKey;

    const groupKey = `${pattern}=${canonicalResult}`;
    let group = genericGroups.get(groupKey);
    if (!group) {
      group = { pattern, result: canonicalResult, baseCombinations: [] };
      genericGroups.set(groupKey, group);
    }

    const [baseA, baseB] = comboKey.split('+');
    const canonicalBaseA = canonicalMonsterIds.get(baseA.toLowerCase()) || baseA;
    const canonicalBaseB = canonicalMonsterIds.get(baseB.toLowerCase()) || baseB;

    group.baseCombinations.push(
      new GenericFusionInputs({
        key: comboKey,
        inputA: canonicalBaseA,
        inputB: canonicalBaseB
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
