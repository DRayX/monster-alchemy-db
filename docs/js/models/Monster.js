// @ts-check
import { getMonsterProfileImage } from '../services/assets.js';
import { loadMonsterSpriteImage } from '../services/loader.js';
import { ActiveSkill, PassiveSkill } from './Skill.js';
import { Item } from './Item.js';

/**
 * Loot drop entry for a Monster with resolved item entity and rarity.
 */
export class MonsterLoot {
  /**
   * @param {'Common' | 'Rare' | 'Epic'} rarity
   * @param {Item} item
   */
  constructor(rarity, item) {
    /** @type {'Common' | 'Rare' | 'Epic'} */
    this.rarity = rarity || 'Common';
    this.item = item;
  }

  get rarityLabel() {
    return `${this.rarity} Loot`;
  }

  toJSON() {
    return {
      itemId: this.item.id,
      itemName: this.item.name,
      rarity: this.rarity
    };
  }
}

/**
 * Learned skill progression entry pairing a required level with a Skill entity.
 */
export class LearnedSkill {
  /**
   * @param {number} level
   * @param {ActiveSkill | PassiveSkill} skill
   */
  constructor(level, skill) {
    this.level = level || 1;
    this.skill = skill;
  }

  get levelLabel() {
    return this.level === 1 ? 'Base' : `Lv. ${this.level}`;
  }

  toJSON() {
    return {
      level: this.level,
      skillId: this.skill?.id || ''
    };
  }
}

/**
 * Monster entity representing a summonable or fusible specimen in Monster Alchemy.
 */
export class Monster {
  /**
   * Cached Promise for the idle sprite sheet .png path.
   * @type {Promise<string> | undefined}
   */
  cachedSpriteImage = undefined;

  /**
   * Lazy-loads the idle sprite sheet .png path on demand.
   * @returns {Promise<string>}
   */
  get spriteImage() {
    return (this.cachedSpriteImage ??= loadMonsterSpriteImage(this.id));
  }

  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} [data.name]
   * @param {string} [data.element]
   * @param {string} [data.attackType]
   * @param {number} [data.tier]
   * @param {number} [data.health]
   * @param {number} [data.soul]
   * @param {number} [data.strength]
   * @param {number} [data.defense]
   * @param {number} [data.mind]
   * @param {number} [data.agility]
   * @param {PassiveSkill | null} [data.passiveSkill]
   * @param {LearnedSkill[]} [data.skills]
   * @param {string} [data.description]
   * @param {string} [data.profileImage]
   * @param {MonsterLoot[]} [data.loots]
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.id;
    this.element = data.element || 'Neutral';
    this.attackType = data.attackType || 'Strike';
    this.tier = data.tier ?? 1;

    this.health = data.health ?? 0;
    this.soul = data.soul ?? 0;
    this.strength = data.strength ?? 0;
    this.defense = data.defense ?? 0;
    this.mind = data.mind ?? 0;
    this.agility = data.agility ?? 0;

    // Pre-computed own-properties for fast table sorting and zero getter overhead
    this.statTotal = this.health + this.soul + this.strength + this.defense + this.mind + this.agility;

    this.passiveSkill = data.passiveSkill ?? null;
    this.passive = this.passiveSkill?.name || 'None';
    this.skills = data.skills || [];
    this.description = data.description || '';

    this.profileImage = data.profileImage || getMonsterProfileImage(this.id);

    this.loots = data.loots || [];
    this.lootSummary = this.loots.map((l) => l.item.name).join(', ');
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      element: this.element,
      attackType: this.attackType,
      tier: this.tier,
      health: this.health,
      soul: this.soul,
      strength: this.strength,
      defense: this.defense,
      mind: this.mind,
      agility: this.agility,
      passive: this.passive,
      passiveSkill: this.passiveSkill,
      skills: this.skills,
      description: this.description,
      loots: this.loots
    };
  }
}
