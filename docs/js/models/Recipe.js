// @ts-check
import { Item } from './Item.js';
import { getMonsterProfileImage, getItemIcon, getRoomIcon } from '../services/assets.js';
import { parseGenericFusionToken } from '../services/formatters.js';

/** @type {Record<'Resource' | 'Monster' | 'Structure', (id: string) => string>} */
const OUTPUT_ICON_RESOLVERS = {
  Resource: getItemIcon,
  Monster: getMonsterProfileImage,
  Structure: getRoomIcon
};

/** @type {Record<'Resource' | 'Monster' | 'Structure', string>} */
const OUTPUT_ROUTE_PREFIXES = {
  Resource: '/items/',
  Monster: '/monsters/',
  Structure: '/rooms/'
};

/**
 * Recipe Ingredient entity representing a resource required for crafting.
 */
export class RecipeIngredient {
  /**
   * @param {number} quantity
   * @param {Item} item
   */
  constructor(quantity, item) {
    this.quantity = quantity || 1;
    this.item = item;
    this.summary = `${this.quantity}x ${this.item.name}`;
  }
}

/**
 * Crafting Recipe entity representing an item, monster summoning, or structure craft.
 */
export class CraftingRecipe {
  /**
   * @param {Object} data
   * @param {string} data.id
   * @param {string} data.roomId
   * @param {string} [data.roomName]
   * @param {string} [data.roomIcon]
   * @param {string} data.outputId
   * @param {string} [data.outputName]
   * @param {'Resource' | 'Monster' | 'Structure'} [data.outputType]
   * @param {number} [data.outputQuantity]
   * @param {number} [data.work]
   * @param {RecipeIngredient[]} [data.ingredients]
   */
  constructor(data) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.roomName = data.roomName || data.roomId;
    this.roomIcon = data.roomIcon || '';
    this.outputId = data.outputId;
    this.outputName = data.outputName || data.outputId;
    this.outputType = data.outputType || 'Resource';
    this.outputIcon = OUTPUT_ICON_RESOLVERS[this.outputType](this.outputId);
    this.outputRoute = `${OUTPUT_ROUTE_PREFIXES[this.outputType]}${this.outputId}`;
    this.outputQuantity = Number(data.outputQuantity) || 1;
    this.work = Number(data.work) || 0;

    this.ingredients = data.ingredients || [];
    this.ingredientsSummary = this.ingredients.map((i) => i.summary).join(', ');
  }
}

/**
 * Operand in a fusion recipe (either a specific monster or a generic archetype).
 */
export class FusionOperand {
  /**
   * @param {string} id
   * @param {string} [monsterName]
   */
  constructor(id, monsterName) {
    this.id = id;
    this.isMonster = monsterName !== undefined;
    if (this.isMonster) {
      this.name = /** @type {string} */ (monsterName);
      this.icons = [getMonsterProfileImage(id)];
    } else {
      const parsed = parseGenericFusionToken(id);
      this.name = parsed.name;
      this.icons = parsed.icons;
    }
  }
}

/**
 * Generic fusion input combination representing a specific input pair in a generic recipe group.
 */
export class GenericFusionInputs {
  /**
   * @param {Object} data
   * @param {string} data.key
   * @param {FusionOperand} data.inputA
   * @param {FusionOperand} data.inputB
   */
  constructor(data) {
    this.key = data.key;
    this.inputA = data.inputA;
    this.inputB = data.inputB;
  }
}

/**
 * Fusion Recipe entity representing an explicit or generic monster combination.
 */
export class FusionRecipe {
  /**
   * @param {Object} data
   * @param {string} [data.id]
   * @param {'Explicit' | 'Generic'} data.fusionType
   * @param {FusionOperand} data.inputA
   * @param {FusionOperand} data.inputB
   * @param {string} data.resultId
   * @param {string} data.resultName
   * @param {GenericFusionInputs[]} [data.baseCombinations]
   */
  constructor(data) {
    this.id = data.id || `${data.inputA.id}+${data.inputB.id}=${data.resultId}`;
    this.fusionType = data.fusionType;
    this.inputA = data.inputA;
    this.inputB = data.inputB;
    this.inputAName = data.inputA.name;
    this.inputBName = data.inputB.name;
    this.resultId = data.resultId;
    this.resultName = data.resultName;
    this.resultIcon = getMonsterProfileImage(data.resultId);
    this.baseCombinations = data.baseCombinations || [];
  }
}
