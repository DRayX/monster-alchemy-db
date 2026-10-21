// @ts-check

/**
 * Active Skill entity with combat stats, scaling, and targetting.
 */
export class ActiveSkill {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.description]
   * @param {string} [data.formattedDescription]
   * @param {string} [data.targetting]
   * @param {string} [data.targettingLabel]
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
    this.formattedDescription = data.formattedDescription || '';
    this.targetting = data.targetting || '';
    this.targettingLabel = data.targettingLabel || '';
    this.element = data.element || 'Neutral';
    this.damageType = data.damageType || 'Strike';
    this.scaling = data.scaling || 'None';
    this.power = data.power ?? 0;
    this.cost = data.cost ?? 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      formattedDescription: this.formattedDescription,
      targetting: this.targetting,
      targettingLabel: this.targettingLabel,
      element: this.element,
      damageType: this.damageType,
      scaling: this.scaling,
      power: this.power,
      cost: this.cost
    };
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
   * @param {string} [data.formattedDescription]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.description = data.description || '';
    this.formattedDescription = data.formattedDescription || '';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      formattedDescription: this.formattedDescription
    };
  }
}
