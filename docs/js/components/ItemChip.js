// @ts-check
import { defineComponent, computed } from 'vue';
import { getItemIcon } from '../services/assets.js';

/** @type {Record<string, string>} */
export const LOOT_RARITY_CLASSES = {
  Common: 'b--white-20 near-white',
  Rare: 'b--light-blue light-blue',
  Epic: 'b--light-purple light-purple'
};

/** @type {Record<string, string>} */
export const LOOT_RARITY_BADGES = {
  Common: 'bg-mid-gray light-silver b--silver',
  Rare: 'bg-navy light-blue b--light-blue',
  Epic: 'bg-purple washed-red b--light-purple'
};

/**
 * Returns CSS classes for a loot rarity badge pill.
 * @param {string} rarity
 * @returns {string}
 */
export function getRarityBadgeClass(rarity) {
  const color = LOOT_RARITY_BADGES[rarity] || 'bg-mid-gray near-white b--silver';
  return `dib ph2 pv1 br-pill f7 b ba ${color}`;
}

/**
 * Returns CSS classes for an interactive loot or ingredient chip.
 * @param {string} [rarity]
 * @returns {string}
 */
export function getRarityChipClass(rarity) {
  const color = (rarity && LOOT_RARITY_CLASSES[rarity]) || 'b--white-10 near-white';
  return `link inline-flex items-center ph2 pv1 br2 bg-near-black ba hover-b--purple f7 mr1 mb1 ${color}`;
}

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
