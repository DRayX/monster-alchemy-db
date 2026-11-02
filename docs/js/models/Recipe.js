// @ts-check
import { Item } from './Item.js';
import { getMonsterProfileImage, getItemIcon, getRoomIcon } from '../services/assets.js';
import { formatGenericFusionInput, getGenericFusionInputIcons } from '../services/formatters.js';

/** @type {Record<'Resource' | 'Monster' | 'Structure', (id: string) => string>} */
const OUTPUT_ICON_RESOLVERS = {
  Resource: getItemIcon,
  Monster: getMonsterProfileImage,
  Structure: getRoomIcon
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
   * @param {string} [data.outputIcon]
   * @param {string} [data.outputRoute]
   * @param {number} [data.outputQuantity]
   * @param {number} [data.work]
   * @param {RecipeIngredient[]} [data.ingredients]
   * @param {string} [data.ingredientsSummary]
   */
  constructor(data) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.roomName = data.roomName || data.roomId;
    this.roomIcon = data.roomIcon || '';
    this.outputId = data.outputId;
    this.outputName = data.outputName || data.outputId;
    this.outputType = data.outputType || 'Resource';
    this.outputIcon = data.outputIcon || OUTPUT_ICON_RESOLVERS[this.outputType](this.outputId);
    this.outputRoute = data.outputRoute || `/items/${this.outputId}`;
    this.outputQuantity = Number(data.outputQuantity) || 1;
    this.work = Number(data.work) || 0;

    this.ingredients = data.ingredients || [];
    this.ingredientsSummary =
      data.ingredientsSummary ||
      this.ingredients.map((i) => i.summary).join(', ');
  }
}

/**
 * Generic fusion input combination representing a specific input pair in a generic recipe group.
 */
export class GenericFusionInputs {
  /**
   * @param {Object} data
   * @param {string} data.key
   * @param {string} data.inputA
   * @param {string} data.inputB
   * @param {string[]} [data.inputAIcons]
   * @param {string[]} [data.inputBIcons]
   */
  constructor(data) {
    this.key = data.key;
    this.inputA = data.inputA;
    this.inputAName = formatGenericFusionInput(data.inputA);
    /** @type {string[]} */
    this.inputAIcons = data.inputAIcons || getGenericFusionInputIcons(data.inputA);
    this.inputB = data.inputB;
    this.inputBName = formatGenericFusionInput(data.inputB);
    /** @type {string[]} */
    this.inputBIcons = data.inputBIcons || getGenericFusionInputIcons(data.inputB);
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
   * @param {string} data.inputA
   * @param {string} data.inputAName
   * @param {boolean} data.inputAIsMonster
   * @param {string[]} [data.inputAIcons]
   * @param {string} data.inputB
   * @param {string} data.inputBName
   * @param {boolean} data.inputBIsMonster
   * @param {string[]} [data.inputBIcons]
   * @param {string} data.resultId
   * @param {string} data.resultName
   * @param {GenericFusionInputs[]} [data.baseCombinations]
   */
  constructor(data) {
    this.id = data.id || `${data.inputA}+${data.inputB}=${data.resultId}`;
    this.fusionType = data.fusionType;
    this.inputA = data.inputA;
    this.inputAName = data.inputAName;
    this.inputAIsMonster = Boolean(data.inputAIsMonster);
    /** @type {string[]} */
    this.inputAIcons = data.inputAIcons || (this.inputAIsMonster ? [] : getGenericFusionInputIcons(data.inputA));
    this.inputB = data.inputB;
    this.inputBName = data.inputBName;
    this.inputBIsMonster = Boolean(data.inputBIsMonster);
    /** @type {string[]} */
    this.inputBIcons = data.inputBIcons || (this.inputBIsMonster ? [] : getGenericFusionInputIcons(data.inputB));
    this.resultId = data.resultId;
    this.resultName = data.resultName;
    this.baseCombinations = data.baseCombinations || [];
  }
}
