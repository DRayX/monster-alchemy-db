// @ts-check
import { defineComponent, computed } from 'vue';

const TEMPLATE = /* html */ `
  <div class="mb3">
    <div class="flex justify-between items-center f6 mb1">
      <span class="silver inline-flex items-center">
        <img
          v-if="icon"
          :src="icon"
          :alt="label"
          class="mr2 flex-shrink-0 pixelated icon-16"
        />
        <span v-else class="mr2 dib flex-shrink-0 icon-16"></span>
        {{ label }}
      </span>
      <span class="b near-white">{{ value }}{{ unit }}</span>
    </div>
    <div class="bg-near-black br-pill overflow-hidden" style="height: 10px;">
      <div
        :class="[color, 'h-100 br-pill']"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
  </div>
`;

export const StatBar = defineComponent({
  name: 'StatBar',
  template: TEMPLATE,
  props: {
    label: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    color: {
      type: String,
      default: 'bg-purple'
    },
    icon: {
      type: String,
      default: ''
    },
    max: {
      type: Number,
      default: 130
    },
    unit: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const percent = computed(() =>
      Math.min(100, Math.max(0, Math.round((props.value / Math.max(props.max, 1)) * 100)))
    );

    return {
      percent
    };
  }
});
