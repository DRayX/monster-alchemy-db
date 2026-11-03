// @ts-check
import { defineComponent, computed } from 'vue';
import { TypeBadge } from './TypeBadge.js';
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
      <span :class="['near-white b mr2', variant === 'row' ? 'f7' : 'f6']">
        {{ resource.displayName }}
      </span>
      <span class="f7 silver mr2">
        {{ resource.dropAmount }}x Drop &bull; {{ resource.maxHealth }} HP &bull; +{{ resource.dropExp }} Exp
      </span>
    </div>

    <div class="flex items-center flex-wrap" :class="variant === 'row' ? 'mt1 mt0-ns' : 'mt2 mt0-ns'">
      <!-- Companion Monster Requirements -->
      <div v-for="(req, idx) in resource.requirements" :key="idx" class="inline-flex items-center mr2">
        <span
          class="dib br-pill f7 b mr1"
          :class="variant === 'row' ? 'ph1 pv0 bg-black-40 light-gray ba b--white-10' : 'ph2 pv1 bg-dark-gray light-gray ba b--white-10'"
        >
          {{ req.monsterCountLabel }}{{ req.element === 'Any' && req.attackType === 'Any' ? ' (Any)' : '' }}
        </span>
        <TypeBadge
          v-if="req.element !== 'Any'"
          :type="req.element"
          :pill="true"
          :icon-size="variant === 'row' ? 12 : 14"
          :custom-class="variant === 'row' ? 'ph1 pv0 f7 mr1' : 'mr1'"
        />
        <TypeBadge
          v-if="req.attackType !== 'Any'"
          :type="req.attackType"
          :pill="true"
          :icon-size="variant === 'row' ? 12 : 14"
          :custom-class="variant === 'row' ? 'ph1 pv0 f7 mr1' : 'mr1'"
        />
      </div>

      <!-- Drop Pool Badge -->
      <span v-if="pool" :class="[rarityClass, variant === 'row' ? 'ph1 pv0' : '']">
        {{ pool }} Pool
      </span>
    </div>
  </div>
`;

export const WorldResourceCard = defineComponent({
  name: 'WorldResourceCard',
  components: { TypeBadge },
  props: {
    resource: {
      /** @type {import('vue').PropType<import('../models/WorldResource.js').WorldResource>} */
      type: Object,
      required: true
    },
    pool: {
      type: /** @type {import('vue').PropType<'Base' | 'Rare' | 'Epic' | null>} */ (String),
      default: null
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
  setup(props) {
    const rarityClass = computed(() => {
      if (props.pool === 'Rare') return getRarityBadgeClass('Rare');
      if (props.pool === 'Epic') return getRarityBadgeClass('Epic');
      return getRarityBadgeClass('Common');
    });

    return {
      rarityClass
    };
  },
  template: TEMPLATE
});
