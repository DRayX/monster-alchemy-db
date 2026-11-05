// @ts-check
import { getIcon } from './assets.js';

/**
 * Text and rich-text parsing and formatting utilities.
 */

/** @type {Record<string, string>} */
export const TYPE_COLOR_CLASSES = {
  // Elements
  Neutral: 'bg-mid-gray light-silver b--silver',
  Fire: 'bg-dark-red light-red b--light-red',
  Water: 'bg-navy light-blue b--light-blue',
  Nature: 'bg-dark-green light-green b--light-green',
  Energy: 'bg-gold near-black b--gold',
  Moon: 'bg-purple washed-red b--light-purple',

  // Attack / Damage Types
  Slash: 'bg-dark-blue light-blue b--light-blue',
  Strike: 'bg-dark-red light-red b--light-red',
  Shoot: 'bg-dark-green light-green b--light-green',
  Magic: 'bg-purple washed-red b--light-purple',

  // Status Effects
  Poison: 'bg-dark-green light-green b--light-green',
  Burn: 'bg-dark-red light-red b--light-red',
  Shock: 'bg-gold near-black b--gold',
  Freeze: 'bg-navy light-blue b--light-blue',
  Slow: 'bg-navy light-blue b--light-blue',
  Weak: 'bg-dark-pink washed-pink b--pink',
  Rage: 'bg-dark-red washed-yellow b--orange',
  Barrier: 'bg-navy light-blue b--light-blue',
  Regeneration: 'bg-dark-green washed-green b--light-green',
  Thorns: 'bg-dark-green light-green b--light-green',
  Ambush: 'bg-mid-gray washed-red b--silver',
  Charge: 'bg-gold near-black b--gold',
  Accelerated: 'bg-dark-blue light-blue b--light-blue',
  Petrify: 'bg-mid-gray washed-red b--silver'
};

/**
 * Returns the CSS color classes for an element, attack type, or status effect badge.
 * @param {string} type
 * @returns {string}
 */
export function getTypeColorClass(type) {
  // The EAttackType enum defines 'Projectile', but RDT_DialogueDecoratorImage registers its decorator icon/style as 'Shoot'.
  const key = type === 'Projectile' ? 'Shoot' : type;
  return TYPE_COLOR_CLASSES[key] || '';
}

/** @type {Record<string, string>} */
export const LOOT_RARITY_CLASSES = {
  Common: 'b--white-20 near-white',
  Rare: 'b--light-blue light-blue',
  Epic: 'b--light-purple light-purple'
};

/** @type {Record<string, string>} */
export const LOOT_RARITY_BADGES = {
  Common: 'bg-mid-gray light-silver b--silver',
  Rare: 'bg-navy light-blue b--light-blue',
  Epic: 'bg-purple washed-red b--light-purple'
};

/**
 * Canonical sorting weights for game encounter and loot rarities (Common < Rare < Epic).
 * @type {Record<string, number>}
 */
export const RARITY_WEIGHT = {
  Common: 1,
  Rare: 2,
  Epic: 3
};

/**
 * Returns CSS classes for a loot rarity badge pill.
 * @param {string} rarity
 * @returns {string}
 */
export function getRarityBadgeClass(rarity) {
  const color = LOOT_RARITY_BADGES[rarity] || 'bg-mid-gray near-white b--silver';
  return `dib ph2 pv1 br-pill f7 b ba ${color}`;
}

/**
 * Returns CSS classes for an interactive loot or ingredient chip.
 * @param {string} [rarity]
 * @returns {string}
 */
export function getRarityChipClass(rarity) {
  const color = (rarity && LOOT_RARITY_CLASSES[rarity]) || 'b--white-10 near-white';
  return `link inline-flex items-center ph2 pv1 br2 bg-near-black ba hover-b--purple f7 mr1 mb1 ${color}`;
}

/**
 * Formats skill descriptions that contain Unreal rich text tags like `<img id="Poison"/>`
 * into clean HTML with colored badges and extracted icons.
 *
 * @param {string} desc
 * @returns {string}
 */
export function formatSkillDescription(desc) {
  if (!desc) return '';
  return desc.replace(/<img\s+id="([^"]+)"\s*\/>(\s*)(\b\1\b)?/gi, (_match, tag, whitespace, trailingWord) => {
    const word = trailingWord || tag;
    const iconUrl = getIcon(tag);
    const colorClass = getTypeColorClass(tag);

    const iconContent = iconUrl
      ? `<img src="${iconUrl}" alt="${word}" class="dib v-mid mr1 pixelated icon-14" />`
      : '';

    const badge = `<span class="dib ph1 pv0 br1 f7 b ba ${colorClass}" style="vertical-align: middle;">${iconContent}${word}</span>`;
    return trailingWord ? badge : `${badge}${whitespace}`;
  });
}

/**
 * Formats an Unreal targetting type enum value into a readable label.
 * @param {string} type
 * @returns {string}
 */
export function formatTargetting(type) {
  /** @type {Record<string, string>} */
  const map = {
    SingleEnemyFrontline: 'Single Enemy (Frontline)',
    SingleEnemyBackline: 'Single Enemy (Backline)',
    SingleEnemyFree: 'Single Enemy (Any)',
    EnemyFrontline: 'Enemy Frontline',
    EnemyBackline: 'Enemy Backline',
    AllEnemies: 'All Enemies',
    AllyFrontline: 'Ally Frontline',
    AllyBackline: 'Ally Backline',
    AllAllies: 'All Allies',
    AllMonsters: 'All Monsters',
    Self: 'Self',
    Custom: 'Custom'
  };
  return map[type] || type;
}

/**
 * Parses a generic fusion archetype token like `"1FireStrike"` or `"1WaterAny"`
 * into its human-readable label and trait icon URLs in a single pass.
 *
 * @param {string} token
 * @returns {{ name: string, icons: string[] }}
 */
export function parseGenericFusionToken(token) {
  const match = /^(\d+)(Neutral|Fire|Water|Nature|Energy|Moon|Any)(Any|Strike|Slash|Projectile|Magic)$/.exec(token);
  if (!match) {
    return { name: token, icons: [] };
  }
  const [, tier, element, attack] = match;
  const parts = [`Tier ${tier}`];
  /** @type {string[]} */
  const icons = [];

  if (element !== 'Any') {
    parts.push(element);
    const icon = getIcon(element);
    if (icon) icons.push(icon);
  }
  if (attack !== 'Any') {
    parts.push(attack);
    const icon = getIcon(attack);
    if (icon) icons.push(icon);
  }

  return { name: parts.join(' '), icons };
}

/**
 * Formats a spawner tag ID into a readable display label by stripping the
 * leading "Spawn." prefix and joining sub-tokens with a middot.
 * e.g. "Spawn.SPeninsula.Start" -> "SPeninsula · Start"
 *
 * @param {string} id
 * @returns {string}
 */
export function formatSpawnerId(id) {
  return id.replace(/^Spawn\./i, '').replace(/\./g, ' · ');
}

/**
 * Formats a world resource node tag ID into a readable display label by stripping the
 * leading "WR_" prefix, splitting camelCase words, and joining sub-tokens with a middot.
 * e.g. "WR_Stone_Big" -> "Stone · Big", "WR_BonePile" -> "Bone Pile"
 *
 * @param {string} id
 * @returns {string}
 */
export function formatWorldResourceId(id) {
  return id
    .replace(/^WR_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' · ');
}

