// @ts-check
import { formatWorldResourceId } from '../services/formatters.js';
import { Item } from './Item.js';

/**
 * Companion monster trait requirement to harvest a world resource node.
 */
export class WorldResourceRequirement {
  /**
   * @param {string} element - e.g. 'Any', 'Fire', 'Water', 'Nature', 'Moon'
   * @param {string} attackType - e.g. 'Any', 'Strike', 'Slash', 'Projectile'
   * @param {number} count - Required number of companion monsters
   */
  constructor(element, attackType, count) {
    this.element = element;
    this.attackType = attackType;
    this.count = count;
  }

  get monsterCountLabel() {
    return `${this.count}x Monster${this.count > 1 ? 's' : ''}`;
  }
}

/**
 * Resource item drop entry from a world resource node.
 */
export class WorldResourceDrop {
  /**
   * @param {Item} item
   * @param {'Base' | 'Rare' | 'Epic'} pool
   */
  constructor(item, pool) {
    this.item = item;
    this.pool = pool;
  }

  get poolLabel() {
    return `${this.pool} Pool`;
  }
}

/**
 * Overworld harvestable resource node entity.
 */
export class WorldResource {
  /**
   * @param {Object} data
   * @param {string} data.id - e.g. 'WR_Stone_Big'
   * @param {number} [data.maxHealth]
   * @param {number} [data.dropAmount]
   * @param {number} [data.dropExp]
   * @param {WorldResourceRequirement[]} [data.requirements]
   * @param {WorldResourceDrop[]} [data.drops]
   */
  constructor(data) {
    this.id = data.id;
    this.displayName = formatWorldResourceId(this.id);
    this.maxHealth = data.maxHealth ?? 0;
    this.dropAmount = data.dropAmount ?? 0;
    this.dropExp = data.dropExp ?? 0;
    this.requirements = data.requirements || [];
    this.drops = data.drops || [];
  }
}
