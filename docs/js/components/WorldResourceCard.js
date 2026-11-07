// @ts-check
import { defineComponent, computed } from 'vue';
import { TypeBadge } from './TypeBadge.js';
import { getRarityBadgeClass } from '../services/formatters.js';

const TEMPLATE = /* html */ `
  <div class="pa3 bg-near-black ba b--white-10 br2 mb2 flex flex-wrap items-center justify-between">
    <div class="flex items-center flex-wrap mr2">
      <span class="near-white b mr2 f6">
        {{ resource.displayName }}
      </span>
      <span class="f7 silver mr2">
        {{ resource.dropAmount }}x Drop &bull; {{ resource.maxHealth }} HP &bull; +{{ resource.dropExp }} Exp
      </span>
    </div>

    <div class="flex items-center flex-wrap mt2 mt0-ns">
      <!-- Companion Monster Requirements -->
      <div v-for="(req, idx) in resource.requirements" :key="idx" class="inline-flex items-center mr2">
        <span class="dib ph2 pv1 br-pill f7 b mr1 nowrap bg-dark-gray light-gray ba b--white-10">
          {{ req.monsterCountLabel }}{{ req.element === 'Any' && req.attackType === 'Any' ? ' (Any)' : '' }}
        </span>
        <TypeBadge
          v-if="req.element !== 'Any'"
          :type="req.element"
          custom-class="mr1"
        />
        <TypeBadge
          v-if="req.attackType !== 'Any'"
          :type="req.attackType"
          custom-class="mr1"
        />
      </div>

      <!-- Drop Pool Badge -->
      <span :class="rarityClass">
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
      type: /** @type {import('vue').PropType<'Base' | 'Rare' | 'Epic'>} */ (String),
      required: true
    }
  },
  setup(props) {
    const rarityClass = computed(() =>
      getRarityBadgeClass(props.pool === 'Base' ? 'Common' : props.pool)
    );

    return {
      rarityClass
    };
  },
  template: TEMPLATE
});
