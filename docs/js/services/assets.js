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

/**
 * Pre-resolved Blueprint class definition JSON asset URLs (`BP_*.json`).
 * @type {Record<string, string>}
 */
export const BLUEPRINT_URLS = Object.fromEntries(
  Object.entries(manifest.blueprints || {}).map(([k, p]) => [k, resolvePath(p)])
);

/**
 * Pre-resolved URL for overworld map texture (`Map.png`).
 */
export const WORLD_MAP_URL = resolvePath(manifest.worldMap);

/**
 * Pre-resolved URL for overworld POIs JSON (`MainLevel_Pois.json`).
 */
export const WORLD_POIS_URL = resolvePath(manifest.worldPois);

/**
 * 1x1 transparent SVG data URI used as a clean fallback for missing assets.
 */
export const TRANSPARENT_PIXEL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

/**
 * Returns the icon URL for a game decorator/UI icon (element, attack type, stat, status effect).
 * @param {string} name
 * @returns {string}
 */
export function getIcon(name) {
  // The EAttackType enum defines 'Projectile', but RDT_DialogueDecoratorImage registers its decorator icon as 'Shoot'.
  const key = name === 'Projectile' ? 'Shoot' : name;
  return resolvePath(manifest.uiIcons[/** @type {keyof typeof manifest.uiIcons} */ (key)]);
}

/**
 * Returns the relative URL for a crafting room icon.
 * @param {string} roomId
 * @returns {string}
 */
export function getRoomIcon(roomId) {
  return resolvePath(manifest.roomIcons[/** @type {keyof typeof manifest.roomIcons} */ (roomId)]) || TRANSPARENT_PIXEL;
}

export const MONSTER_MANAGER_ICON = getRoomIcon('MonsterManager');
export const PLAYER_ICON = resolvePath(manifest.generalIcons.Player) || TRANSPARENT_PIXEL;
export const TOWER_ICON = resolvePath(manifest.generalIcons.Tower) || TRANSPARENT_PIXEL;
export const SHOP_ICON = resolvePath(manifest.generalIcons.Shop) || TRANSPARENT_PIXEL;
export const MAP_ICON = resolvePath(manifest.generalIcons.Map) || TRANSPARENT_PIXEL;
export const SPAWNER_ICON = resolvePath(manifest.generalIcons.Spawner) || TRANSPARENT_PIXEL;
export const CHEST_ICON = resolvePath(manifest.generalIcons.Chest) || TRANSPARENT_PIXEL;
export const SCROLL_ICON = resolvePath(manifest.generalIcons.Scroll) || TRANSPARENT_PIXEL;
export const OBELISK_ICON = resolvePath(manifest.generalIcons.Obelisk) || TRANSPARENT_PIXEL;
export const QUEST_ICON = resolvePath(manifest.generalIcons.Quest) || TRANSPARENT_PIXEL;
export const FIGHT_ICON = resolvePath(manifest.generalIcons.Fight) || TRANSPARENT_PIXEL;
export const DUNGEON_ICON = resolvePath(manifest.generalIcons.Dungeon) || TRANSPARENT_PIXEL;
export const INN_ICON = resolvePath(manifest.generalIcons.Inn) || TRANSPARENT_PIXEL;
export const FERRY_ICON = resolvePath(manifest.generalIcons.Ferry) || TRANSPARENT_PIXEL;

/**
 * Returns the relative URL for a monster's profile image (`P_<id>.png`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterProfileImage(monsterId) {
  return resolvePath(manifest.monsterIcons[/** @type {keyof typeof manifest.monsterIcons} */ (monsterId)]) || TRANSPARENT_PIXEL;
}

/**
 * Returns the relative URL for a monster's idle sprite sheet (`T_<id>_...png`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterSpriteImage(monsterId) {
  return resolvePath(manifest.monsterSprites[/** @type {keyof typeof manifest.monsterSprites} */ (monsterId)]) || TRANSPARENT_PIXEL;
}

/**
 * Returns the relative URL for an item/resource icon (`T_<id>.png`).
 * @param {string} itemId
 * @returns {string}
 */
export function getItemIcon(itemId) {
  return resolvePath(manifest.resourceIcons[/** @type {keyof typeof manifest.resourceIcons} */ (itemId)]) || TRANSPARENT_PIXEL;
}
