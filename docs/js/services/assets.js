// @ts-check

/**
 * Game asset and sprite URL resolvers.
 */

const BLUEPRINTS_BASE_PATH = './extracted/Game/Blueprints';

/**
 * Unreal Engine UserDefinedStruct definition JSON asset paths (`S_*.json`).
 * @type {Record<string, string>}
 */
export const STRUCT_URLS = {
  monsterStruct: `${BLUEPRINTS_BASE_PATH}/Monsters/S_Monster_Table.json`,
  rewardStruct: `${BLUEPRINTS_BASE_PATH}/Monsters/S_MonsterRewards.json`,
  fusionStruct: `${BLUEPRINTS_BASE_PATH}/Monsters/S_FusionTable.json`,
  resourceStruct: './extracted/Game/Sprites/Tables/S_ResourceData.json',
  recipeStruct: `${BLUEPRINTS_BASE_PATH}/Items/S_CraftRecipe.json`,
  roomStruct: `${BLUEPRINTS_BASE_PATH}/Tables/S_RoomTable.json`,
  activeSkillStruct: `${BLUEPRINTS_BASE_PATH}/Skills/S_ActiveSkillTable.json`,
  monsterSkillLevelStruct: `${BLUEPRINTS_BASE_PATH}/Skills/S_MonsterSkillLevelTable.json`,
  passiveSkillStruct: `${BLUEPRINTS_BASE_PATH}/Skills/S_PassiveSkillTable.json`
};

/**
 * Unreal Engine UserDefinedEnum definition JSON asset paths (`E*.json`).
 * @type {Record<string, string>}
 */
export const ENUM_URLS = {
  monsterTypeEnum: `${BLUEPRINTS_BASE_PATH}/Monsters/EMonsterType.json`,
  attackTypeEnum: `${BLUEPRINTS_BASE_PATH}/Monsters/EAttackType.json`,
  recipeTypeEnum: `${BLUEPRINTS_BASE_PATH}/Items/ERecipeType.json`,
  roomTypeEnum: `${BLUEPRINTS_BASE_PATH}/Items/ERoomType.json`,
  scalingEnum: `${BLUEPRINTS_BASE_PATH}/Skills/EScaling.json`,
  targettingTypeEnum: `${BLUEPRINTS_BASE_PATH}/Skills/ETargettingType.json`
};

/**
 * Unreal Engine DataTable export JSON asset paths (`DT_*.json`).
 * @type {Record<string, string>}
 */
export const DATA_TABLE_URLS = {
  monsterTable: `${BLUEPRINTS_BASE_PATH}/Monsters/DT_MonsterTable.json`,
  monsterRewards: `${BLUEPRINTS_BASE_PATH}/Monsters/DT_MonsterRewards.json`,
  fusionExplicit: `${BLUEPRINTS_BASE_PATH}/Monsters/DT_Fusion_Explicit.json`,
  fusionGeneric: `${BLUEPRINTS_BASE_PATH}/Monsters/DT_Fusion_Generic.json`,
  fusionGenericConverted: `${BLUEPRINTS_BASE_PATH}/Monsters/DT_Fusion_Generic_Converted.json`,
  resourceData: './extracted/Game/Sprites/Tables/DT_ResourceData.json',
  craftRecipes: `${BLUEPRINTS_BASE_PATH}/Items/DT_CraftRecipes.json`,
  roomsTable: `${BLUEPRINTS_BASE_PATH}/Tables/DT_Rooms.json`,
  monsterSkillLevels: `${BLUEPRINTS_BASE_PATH}/Skills/DT_MonsterSkillLevels.json`,
  activeSkills: `${BLUEPRINTS_BASE_PATH}/Skills/Tables/DT_ActiveSkills.json`,
  passiveSkills: `${BLUEPRINTS_BASE_PATH}/Skills/Tables/DT_PassiveSkills.json`
};

const TYPE_ICON_BASE_PATH = `${BLUEPRINTS_BASE_PATH}/Widgets/Resources/Icons/TypeIcons`;

/** @type {Record<string, string>} */
export const TYPE_ICONS = {
  // Elements
  Neutral: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Normal.png`,
  Fire: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Fire.png`,
  Water: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Water.png`,
  Nature: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Nature.png`,
  Energy: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Energy.png`,
  Moon: `${TYPE_ICON_BASE_PATH}/Attack/T_EType_Moon.png`,

  // Attack / Damage Types
  Slash: `${TYPE_ICON_BASE_PATH}/Attack/T_AType_Slash_Icon.png`,
  Strike: `${TYPE_ICON_BASE_PATH}/Attack/T_AType_Strike.png`,
  Projectile: `${TYPE_ICON_BASE_PATH}/Attack/T_AType_Projectile.png`,
  Magic: `${TYPE_ICON_BASE_PATH}/Attack/T_AType_Magic.png`,

  // Status Effects
  Poison: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Poison_Icon.png`,
  Burn: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Burn_Icon.png`,
  Shock: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Shock_Icon.png`,
  Freeze: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Freeze_Icon.png`,
  Slow: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Slow_Icon.png`,
  Weak: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Weak_Icon.png`,
  Rage: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Rage_Icon.png`,
  Barrier: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Barrier_Icon.png`,
  Regeneration: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Regeneration_Icon.png`,
  Thorns: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Thorns_Icon.png`,
  Ambush: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Blind_Icon.png`,
  Charge: `${TYPE_ICON_BASE_PATH}/Effects/T_EType_Charged_Icon.png`
};

const STAT_ICON_BASE_PATH = './extracted/Game/Art/UI/Input_Icons';

/** @type {Record<string, string>} */
export const STAT_ICONS = {
  Strength: `${STAT_ICON_BASE_PATH}/T_Stat_Attack.png`,
  Defense: `${STAT_ICON_BASE_PATH}/T_Stat_Defense.png`,
  Mind: `${STAT_ICON_BASE_PATH}/T_Stat_Mind.png`,
  Soul: `${STAT_ICON_BASE_PATH}/T_Stat_Soul.png`,
  Agility: `${STAT_ICON_BASE_PATH}/T_Stat_Speed.png`,
  Work: `${STAT_ICON_BASE_PATH}/T_Stat_Work.png`
};

/**
 * Returns the icon URL for a stat (Strength, Defense, Mind, Soul, Agility, Work).
 * @param {string} statName
 * @returns {string}
 */
export function getStatIcon(statName) {
  return STAT_ICONS[statName] || '';
}

const UI_ICON_BASE_PATH = './extracted/Game/Art/UI';

export const MONSTER_MANAGER_ICON = `${UI_ICON_BASE_PATH}/T_Icon_Manager.png`;
export const PLAYER_ICON = `${UI_ICON_BASE_PATH}/T_Icon_Player.png`;
export const TOWER_ICON = `${UI_ICON_BASE_PATH}/T_Icon_Tower.png`;
export const SHOP_ICON = `${UI_ICON_BASE_PATH}/T_Icon_Shop.png`;

/**
 * Map of monster IDs to asset folder and file names on disk when their casing
 * differs from the standard `DT_MonsterTable` ID convention.
 * Properties identical to monsterId are omitted.
 * @type {Record<string, { dir?: string, icon?: string, flipbook?: string }>}
 */
export const MONSTER_ASSET_OVERRIDES = {
  SmallTooth: { dir: 'Smalltooth', icon: 'Smalltooth', flipbook: 'Smalltooth' },
  Electrofly: { dir: 'ElectroFly' },
  Slimbones: { dir: 'SlimBones', icon: 'SlimBones', flipbook: 'SlimBones' },
  Snapjaw: { dir: 'SnapJaw', icon: 'SnapJaw', flipbook: 'SnapJaw' },
  Sharptail: { dir: 'SharpTail', icon: 'SharpTail', flipbook: 'SharpTail' },
  Deathbloom: { dir: 'DeathBloom', flipbook: 'DeathBloom' }
};

/**
 * Returns the relative URL for a monster's profile image (`P_<id>.png`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterProfileImage(monsterId) {
  const override = MONSTER_ASSET_OVERRIDES[monsterId];
  const dir = override?.dir || monsterId;
  const file = override?.icon || monsterId;
  return `./extracted/Game/Art/Sprites/${dir}/P_${file}.png`;
}

/**
 * Returns the relative URL for a monster's idle flipbook JSON definition (`FB_<id>_Idle.json`).
 * @param {string} monsterId
 * @returns {string}
 */
export function getMonsterFlipbookUrl(monsterId) {
  const override = MONSTER_ASSET_OVERRIDES[monsterId];
  const dir = override?.dir || monsterId;
  const file = override?.flipbook || monsterId;
  return `./extracted/Game/Art/Sprites/${dir}/FB_${file}_Idle.json`;
}

/**
 * Map of item IDs to custom texture asset names when the asset file name
 * differs from the standard `T_<itemId>.png` convention (omitting the `T_` prefix).
 * @type {Record<string, string>}
 */
export const ITEM_ICON_OVERRIDES = {
  Stone: 'Pebble',
  BlackWood: 'Blackwood'
};

/**
 * Returns the relative URL for an item/resource icon (`T_<id>.png`).
 * @param {string} itemId
 * @returns {string}
 */
export function getItemIcon(itemId) {
  const file = ITEM_ICON_OVERRIDES[itemId] || itemId;
  return `./extracted/Game/Art/Resources/T_${file}.png`;
}


/**
 * Returns the icon URL for an element, attack type, or status effect.
 * @param {string} name
 * @returns {string}
 */
export function getTypeIcon(name) {
  return TYPE_ICONS[name] || '';
}

/**
 * Resolves an Unreal object reference to a relative URL under `./extracted`.
 * e.g. `{ ObjectPath: "/Game/Art/UI/T_Icon_RoomManager.0" }` -> `./extracted/Game/Art/UI/T_Icon_RoomManager.png`
 * @param {?import('../types.js').UnrealObjectRef} [assetRef]
 * @returns {string}
 */
export function resolveUnrealAssetPath(assetRef) {
  if (!assetRef?.ObjectPath) return '';
  return `./extracted${assetRef.ObjectPath.replace(/\.\d+$/, '.png')}`;
}

/**
 * 1x1 transparent SVG data URI used as a clean fallback for missing assets.
 */
export const TRANSPARENT_PIXEL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

/**
 * Replaces a broken image element's source with a transparent pixel.
 * @param {Event} event
 */
export function handleBrokenImage(event) {
  const target = /** @type {HTMLElement | null} */ (event.target);
  if (target && target.tagName === 'IMG') {
    const img = /** @type {HTMLImageElement} */ (target);
    if (img.src !== TRANSPARENT_PIXEL) {
      img.src = TRANSPARENT_PIXEL;
    }
  }
}

/**
 * Installs a global capture listener that automatically intercepts broken image 404s
 * anywhere in the app and replaces them with a transparent pixel.
 */
export function setupGlobalImageFallback() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleBrokenImage, true);
  }
}
