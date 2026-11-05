// @ts-check
import { defineComponent, computed } from 'vue';
import { getItemIcon } from '../services/assets.js';
import { getRarityChipClass } from '../services/formatters.js';

const TEMPLATE = /* html */ `
  <RouterLink
    v-if="clickable"
    :to="'/items/' + itemId"
    :class="chipClass"
    :title="titleText"
  >
    <img
      :src="iconUrl"
      :alt="displayName"
      class="mr1 flex-shrink-0 pixelated"
      :style="{
        width: iconSize + 'px',
        height: iconSize + 'px'
      }"
      loading="lazy"
    />
    <span>
      <strong v-if="quantity > 0" class="gold mr1">{{ quantity }}&times;</strong>
      <span>{{ displayName }}</span>
    </span>
  </RouterLink>
  <span
    v-else
    :class="chipClass"
    :title="titleText"
  >
    <img
      :src="iconUrl"
      :alt="displayName"
      class="mr1 flex-shrink-0 pixelated"
      :style="{
        width: iconSize + 'px',
        height: iconSize + 'px'
      }"
      loading="lazy"
    />
    <span>
      <strong v-if="quantity > 0" class="gold mr1">{{ quantity }}&times;</strong>
      <span>{{ displayName }}</span>
    </span>
  </span>
`;

export const ItemChip = defineComponent({
  name: 'ItemChip',
  props: {
    itemId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      default: 0
    },
    rarity: {
      type: String,
      default: ''
    },
    iconSize: {
      type: Number,
      default: 18
    },
    clickable: {
      type: Boolean,
      default: true
    },
    customClass: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const iconUrl = computed(() => getItemIcon(props.itemId));

    const displayName = computed(() => {
      if (props.name) return props.name;
      return props.itemId.replace(/([a-z])([A-Z])/g, '$1 $2');
    });

    const chipClass = computed(() => {
      return `${getRarityChipClass(props.rarity)} ${props.customClass}`.trim();
    });

    const titleText = computed(() => {
      if (props.rarity) return `${props.rarity} Loot`;
      return displayName.value;
    });

    return {
      iconUrl,
      displayName,
      chipClass,
      titleText
    };
  },
  template: TEMPLATE
});
