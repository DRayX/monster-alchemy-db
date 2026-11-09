// @ts-check
import { getMonsterProfileImage, getMonsterSpriteImage } from '../services/assets.js';
import { formatSpawnerId } from '../services/formatters.js';
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
}

/**
 * Wild encounter location entry for a Monster.
 */
export class MonsterWildSpawn {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} data.slot
   * @param {number} data.minLevel
   * @param {number} data.maxLevel
   * @param {'Day' | 'Night' | null} [data.timeOfDay]
   * @param {'Common' | 'Rare' | 'Epic'} data.rarity
   */
  constructor(data) {
    this.id = data.id;
    this.slot = data.slot;
    this.displayName = formatSpawnerId(this.id);
    this.minLevel = data.minLevel;
    this.maxLevel = data.maxLevel;
    this.timeOfDay = data.timeOfDay ?? null;
    this.rarity = data.rarity;
  }

  get key() {
    return `${this.id}_${this.slot}`;
  }

  get levelLabel() {
    return this.minLevel === this.maxLevel
      ? `Lv. ${this.minLevel}`
      : `Lv. ${this.minLevel}–${this.maxLevel}`;
  }
}

/**
 * Monster entity representing a summonable or fusible specimen in Monster Alchemy.
 */
export class Monster {
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
   * @param {MonsterLoot[]} [data.loots]
   * @param {MonsterWildSpawn[]} [data.wildSpawns]
   * @param {import('../types.js').RecipeUnlock | null} [data.recipeUnlock]
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
    this.skills = data.skills || [];
    this.description = data.description || '';

    this.profileImage = getMonsterProfileImage(this.id);
    this.spriteImage = getMonsterSpriteImage(this.id);

    this.loots = data.loots || [];
    this.lootSummary = this.loots.map((l) => l.item.name).join(', ');

    /** @type {MonsterWildSpawn[]} */
    this.wildSpawns = data.wildSpawns || [];

    /** @type {import('../types.js').RecipeUnlock | null} */
    this.recipeUnlock = data.recipeUnlock ?? null;
  }
}
