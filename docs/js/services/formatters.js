// @ts-check
import { getTypeIcon } from './assets.js';

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
  Projectile: 'bg-dark-green light-green b--light-green',
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
  Charge: 'bg-gold near-black b--gold'
};

/**
 * Formats skill descriptions that contain Unreal rich text tags like `<img id="Poison"/>`
 * into clean HTML with colored badges and extracted icons.
 *
 * @param {string} desc
 * @returns {string}
 */
export function formatSkillDescription(desc) {
  if (!desc) return '';
  return desc.replace(/<img\s+id="([^"]+)"\s*\/>\s*(\b\1\b)?/gi, (match, tag, trailingWord) => {
    const word = trailingWord || tag;
    const iconUrl = getTypeIcon(tag);
    const colorClass = TYPE_COLOR_CLASSES[tag] || '';

    const iconContent = iconUrl
      ? `<img src="${iconUrl}" alt="${word}" class="dib v-mid mr1 pixelated icon-14" />`
      : '';

    return `<span class="dib ph1 pv0 br1 f7 b ba ${colorClass}" style="vertical-align: middle;">${iconContent}${word}</span>`;
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
    const icon = getTypeIcon(element);
    if (icon) icons.push(icon);
  }
  if (attack !== 'Any') {
    parts.push(attack);
    const icon = getTypeIcon(attack);
    if (icon) icons.push(icon);
  }

  return { name: parts.join(' '), icons };
}
