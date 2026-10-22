// @ts-check
import manifest from '../../meta/asset_manifest.json' with { type: 'json' };

/**
 * Game asset and sprite URL resolvers.
 */

const EXTRACTED_BASE = './extracted';

/**
 * Helper to prefix canonical ObjectPaths with `./extracted`.
 * @param {string | undefined} path
 * @returns {string}
 */
function resolvePath(path) {
  return path ? `${EXTRACTED_BASE}${path}` : '';
}

/**
 * Pre-resolved DataTable asset URLs (`DT_*.json`).
 * @type {Record<string, string>}
 */
export const DATA_TABLE_URLS = Object.fromEntries(
  Object.entries(manifest.dataTables).map(([k, p]) => [k, resolvePath(p)])
);

/**
 * Pre-resolved UserDefinedStruct definition JSON asset URLs (`S_*.json`).
 * @type {Record<string, string>}
 */
export const STRUCT_URLS = Object.fromEntries(
  Object.entries(manifest.structs).map(([k, p]) => [k, resolvePath(p)])
);

/**
 * Pre-resolved UserDefinedEnum definition JSON asset URLs (`E*.json`).
 * @type {Record<string, string>}
 */
export const ENUM_URLS = Object.fromEntries(
  Object.entries(manifest.enums).map(([k, p]) => [k, resolvePath(p)])
);

/** @type {Record<string, string>} */
const monsterIcons = manifest.monsterIcons;

/** @type {Record<string, string>} */
const monsterSprites = manifest.monsterSprites;

/** @type {Record<string, string>} */
const resourceIcons = manifest.resourceIcons;

/** @type {Record<string, string>} */
const typeIcons = manifest.uiIcons?.types || {};

/** @type {Record<string, string>} */
const statIcons = manifest.uiIcons?.stats || {};

/** @type {Record<string, string>} */
const roomIcons = manifest.uiIcons?.rooms || {};

/**
 * Returns the icon URL for a stat (Strength, Defense, Mind, Soul, Agility, Work).
 * @param {string} statName
 * @returns {string}
 */
export function getStatIcon(statName) {
  return resolvePath(statIcons[statName]);
}

/**
 * 1x1 transparent SVG data URI used as a clean fallback for missing assets.
 */
export const TRANSPARENT_PIXEL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

/**
 * Returns the relative URL for a crafting room icon.
 * @param {string} roomId
 * @returns {string}
 */
export function getRoomIcon(roomId) {
  return resolvePath(roomIcons[roomId]) || TRANSPARENT_PIXEL;
}

export const MONSTER_MANAGER_ICON = getRoomIcon('MonsterManager');
export const PLAYER_ICON = resolvePath(manifest.uiIcons?.general?.Player) || TRANSPARENT_PIXEL;
export const TOWER_ICON = resolvePath(manifest.uiIcons?.general?.Tower) || TRANSPARENT_PIXEL;
export const SHOP_ICON = resolvePath(manifest.uiIcons?.general?.Shop) || TRANSPARENT_PIXEL;

/**
 * Returns the relative URL for a monster's profile image (`P_<id>.png`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterProfileImage(monsterId) {
  return resolvePath(monsterIcons[monsterId]) || TRANSPARENT_PIXEL;
}

/**
 * Returns the relative URL for a monster's idle sprite sheet (`T_<id>_...png`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterSpriteImage(monsterId) {
  return resolvePath(monsterSprites[monsterId]) || TRANSPARENT_PIXEL;
}

/**
 * Returns the relative URL for an item/resource icon (`T_<id>.png`).
 * @param {string} itemId
 * @returns {string}
 */
export function getItemIcon(itemId) {
  return resolvePath(resourceIcons[itemId]) || TRANSPARENT_PIXEL;
}

/**
 * Returns the icon URL for an element, attack type, or status effect.
 * @param {string} name
 * @returns {string}
 */
export function getTypeIcon(name) {
  return resolvePath(typeIcons[name]);
}
