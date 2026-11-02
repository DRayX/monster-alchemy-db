// @ts-check
import { defineComponent } from 'vue';
import { getStatIcon } from '../services/assets.js';
import { ItemChip } from './ItemChip.js';

const WORK_ICON = getStatIcon('Work');

const TEMPLATE = /* html */ `
  <div class="pa3 bg-near-black ba b--white-10 br2 mb2">
    <div class="flex items-center justify-between mb2">
      <RouterLink
        :to="'/rooms/' + recipe.roomId"
        class="link light-purple b f6 hover-white inline-flex items-center"
      >
        <img
          v-if="recipe.roomIcon"
          :src="recipe.roomIcon"
          :alt="recipe.roomName"
          class="mr2 dib v-mid flex-shrink-0 pixelated icon-16"
        />
        <span>
          {{ recipe.roomName }}
          <span v-if="recipe.outputType === 'Resource'">(&times;{{ recipe.outputQuantity }})</span>
          &rarr;
        </span>
      </RouterLink>
      <span class="f7 silver inline-flex items-center">
        <img
          :src="WORK_ICON"
          alt="Work"
          class="mr1 flex-shrink-0 pixelated icon-12"
        />
        Work: {{ recipe.work }}
      </span>
    </div>
    <div class="flex flex-wrap">
      <ItemChip
        v-for="ing in recipe.ingredients"
        :key="ing.item.id"
        :item-id="ing.item.id"
        :name="ing.item.name"
        :quantity="ing.quantity"
        custom-class="mr2 mb1"
      />
    </div>
  </div>
`;

export const CraftingRecipeCard = defineComponent({
  name: 'CraftingRecipeCard',
  components: { ItemChip },
  props: {
    recipe: {
      /** @type {import('vue').PropType<import('../models/Recipe.js').CraftingRecipe>} */
      type: Object,
      required: true
    }
  },
  setup() {
    return {
      WORK_ICON
    };
  },
  template: TEMPLATE
});
