// @ts-check
import { formatSkillDescription, formatTargetting } from '../services/formatters.js';

/**
 * Active Skill entity with combat stats, scaling, and targetting.
 */
export class ActiveSkill {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.description]
   * @param {string} [data.targetting]
   * @param {string} [data.element]
   * @param {string} [data.damageType]
   * @param {string} [data.scaling]
   * @param {number} [data.power]
   * @param {number} [data.cost]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.description = data.description || '';
    this.formattedDescription = formatSkillDescription(this.description);
    this.targetting = data.targetting || '';
    this.targettingLabel = formatTargetting(this.targetting);
    this.element = data.element || 'Neutral';
    this.damageType = data.damageType || 'Strike';
    this.scaling = data.scaling || 'None';
    this.power = data.power ?? 0;
    this.cost = data.cost ?? 0;
  }
}

/**
 * Passive Skill entity representing inherent monster perks or abilities.
 */
export class PassiveSkill {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.description]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.description = data.description || '';
    this.formattedDescription = formatSkillDescription(this.description);
  }
}
