// @ts-check
import { defineComponent } from 'vue';

const TEMPLATE = /* html */ `
  <RouterLink
    v-if="operand.isMonster"
    :to="'/monsters/' + operand.id"
    class="link light-blue hover-white b inline-flex items-center"
  >
    <img
      :src="operand.icons[0]"
      :alt="operand.name"
      :class="['br1 bg-dark-gray ba b--white-10 mr1 flex-shrink-0 pixelated', iconClass]"
      loading="lazy"
    />
    <span>{{ operand.name }}</span>
  </RouterLink>
  <span v-else class="silver inline-flex items-center">
    <img
      v-for="icon in operand.icons"
      :key="icon"
      :src="icon"
      :class="['mr1 pixelated v-mid flex-shrink-0', iconClass]"
      alt=""
    />
    <span>{{ operand.name }}</span>
  </span>
`;

export const FusionOperandBadge = defineComponent({
  name: 'FusionOperandBadge',
  props: {
    operand: {
      /** @type {import('vue').PropType<import('../models/Recipe.js').FusionOperand>} */
      type: Object,
      required: true
    },
    iconClass: {
      type: String,
      default: 'icon-24'
    }
  },
  template: TEMPLATE
});
