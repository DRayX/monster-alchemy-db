// @ts-check
import { defineComponent, computed } from 'vue';
import { getTypeIcon } from '../services/assets.js';
import { TYPE_COLOR_CLASSES } from '../services/formatters.js';

/**
 * Returns the CSS classes for an element or attack type badge pill.
 * @param {string} type
 * @returns {string}
 */
export function getElementBadgeClass(type) {
  const color = TYPE_COLOR_CLASSES[type] || 'bg-mid-gray near-white b--silver';
  return `inline-flex items-center ph2 pv1 br-pill f7 b ba ${color}`;
}

const TEMPLATE = /* html */ `
  <span :class="badgeClass">
    <img
      v-if="iconUrl"
      :src="iconUrl"
      :alt="displayText"
      class="mr1 flex-shrink-0 v-mid pixelated"
      :style="{
        width: iconSize + 'px',
        height: iconSize + 'px'
      }"
    />
    <span>{{ displayText }}</span>
  </span>
`;

export const TypeBadge = defineComponent({
  name: 'TypeBadge',
  template: TEMPLATE,
  props: {
    type: {
      type: String,
      required: true
    },
    label: {
      type: String,
      default: ''
    },
    iconSize: {
      type: Number,
      default: 14
    },
    showIcon: {
      type: Boolean,
      default: true
    },
    pill: {
      type: Boolean,
      default: true
    },
    customClass: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const iconUrl = computed(() => {
      if (!props.showIcon || !props.type) return '';
      return getTypeIcon(props.type);
    });

    const displayText = computed(() => props.label || props.type || '');

    const badgeClass = computed(() => {
      if (props.pill) {
        return `${getElementBadgeClass(props.type)} ${props.customClass}`.trim();
      }
      return `inline-flex items-center ${props.customClass}`.trim();
    });

    return {
      iconUrl,
      displayText,
      badgeClass
    };
  }
});
