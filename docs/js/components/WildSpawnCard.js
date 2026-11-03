// @ts-check
import { defineComponent } from 'vue';
import { getRarityBadgeClass } from './ItemChip.js';

const TEMPLATE = /* html */ `
  <div
    :class="[
      variant === 'row'
        ? 'pv1 f7 flex items-center justify-between flex-wrap'
        : 'pa3 bg-near-black ba b--white-10 br2 mb2 flex flex-wrap items-center justify-between',
      customClass
    ]"
  >
    <div class="flex items-center flex-wrap mr2">
      <span v-if="variant === 'row'" class="gray mr2">&bull;</span>
      <span :class="['near-white b mr2', variant === 'row' ? 'f7' : 'f6']">{{ spawn.displayName }}</span>
      <span class="f7 gray mr2">{{ spawn.levelLabel }}</span>
    </div>
    <div class="flex items-center" :class="variant === 'row' ? 'mt1 mt0-ns' : 'mt2 mt0-ns'">
      <span
        class="dib br-pill f7 b mr1"
        :class="[
          spawn.timeOfDay === 'Day' ? 'bg-gold near-black' : 'bg-dark-blue washed-blue',
          variant === 'row' ? 'ph1 pv0' : 'ph2 pv1'
        ]"
      >
        {{ spawn.timeOfDay === 'Day' ? '☀️ Day' : '🌙 Night' }}
      </span>
      <span :class="getRarityBadgeClass(spawn.rarity)">
        {{ spawn.rarity }}
      </span>
    </div>
  </div>
`;

export const WildSpawnCard = defineComponent({
  name: 'WildSpawnCard',
  props: {
    spawn: {
      /** @type {import('vue').PropType<import('../models/Monster.js').MonsterWildSpawn>} */
      type: Object,
      required: true
    },
    variant: {
      type: /** @type {import('vue').PropType<'card' | 'row'>} */ (String),
      default: 'card'
    },
    customClass: {
      type: String,
      default: ''
    }
  },
  setup() {
    return {
      getRarityBadgeClass
    };
  },
  template: TEMPLATE
});
