// @ts-check
import { defineComponent, ref } from 'vue';
import { getMonsterProfileImage } from '../services/assets.js';

const TEMPLATE = /* html */ `
  <div class="pa3 bg-near-black ba b--white-10 br2 mb2">
    <div class="flex items-center justify-between flex-wrap">
      <div class="f6 flex items-center flex-wrap">
        <!-- Input A -->
        <RouterLink
          v-if="fusion.inputAIsMonster"
          :to="'/monsters/' + fusion.inputA"
          class="link light-blue hover-white b inline-flex items-center"
        >
          <img
            :src="getMonsterProfileImage(fusion.inputA)"
            :alt="fusion.inputAName"
            class="br1 bg-dark-gray ba b--white-10 mr1 pixelated icon-24"
            loading="lazy"
          />
          <span>{{ fusion.inputAName }}</span>
        </RouterLink>
        <span v-else class="silver inline-flex items-center">
          <img
            v-for="icon in fusion.inputAIcons"
            :key="icon"
            :src="icon"
            class="mr1 pixelated icon-24 v-mid"
            alt=""
          />
          <span>{{ fusion.inputAName }}</span>
        </span>

        <span class="gray mh2">+</span>

        <!-- Input B -->
        <RouterLink
          v-if="fusion.inputBIsMonster"
          :to="'/monsters/' + fusion.inputB"
          class="link light-blue hover-white b inline-flex items-center"
        >
          <img
            :src="getMonsterProfileImage(fusion.inputB)"
            :alt="fusion.inputBName"
            class="br1 bg-dark-gray ba b--white-10 mr1 pixelated icon-24"
            loading="lazy"
          />
          <span>{{ fusion.inputBName }}</span>
        </RouterLink>
        <span v-else class="silver inline-flex items-center">
          <img
            v-for="icon in fusion.inputBIcons"
            :key="icon"
            :src="icon"
            class="mr1 pixelated icon-24 v-mid"
            alt=""
          />
          <span>{{ fusion.inputBName }}</span>
        </span>

        <!-- Combinations expand button for generic fusions -->
        <button
          v-if="fusion.baseCombinations && fusion.baseCombinations.length > 0"
          type="button"
          @click="toggleExpand"
          class="bn bg-transparent light-blue hover-white pointer f7 ml2 pv1 ph2 br2 bg-white-05 ba b--white-10 inline-flex items-center"
          :title="isExpanded ? 'Hide base combinations' : 'View base combinations'"
        >
          <span>{{ fusion.baseCombinations.length }} {{ fusion.baseCombinations.length === 1 ? 'combo' : 'combos' }}</span>
          <span class="ml1">{{ isExpanded ? '▴' : '▾' }}</span>
        </button>
      </div>

      <div class="flex items-center mt2 mt0-ns">
        <!-- Optional Fusion Type Badge -->
        <span
          v-if="showType && !showResult"
          class="dib ph2 pv1 br-pill f7 bg-dark-gray silver ba b--white-10"
        >
          {{ fusion.fusionType }}
        </span>

        <!-- Optional Result Link -->
        <RouterLink
          v-if="showResult"
          :to="'/monsters/' + fusion.resultId"
          class="link light-purple b f6 hover-white inline-flex items-center"
        >
          <span class="mr2">&rarr;</span>
          <img
            :src="getMonsterProfileImage(fusion.resultId)"
            :alt="fusion.resultName"
            class="br1 bg-dark-gray ba b--white-10 mr1 pixelated icon-24"
            loading="lazy"
          />
          <span>{{ fusion.resultName }}</span>
        </RouterLink>
      </div>
    </div>

    <!-- Collapsible base combinations drill-down -->
    <div v-if="isExpanded && fusion.baseCombinations && fusion.baseCombinations.length > 0" class="mt3 pt2 bt b--white-10">
      <div class="f7 gray mb2">Base input combinations producing this result:</div>
      <div class="flex flex-column">
        <div
          v-for="combo in fusion.baseCombinations"
          :key="combo.key"
          class="f7 silver pv1 flex items-center flex-wrap"
        >
          <span class="gray mr2">&bull;</span>
          <span class="inline-flex items-center">
            <img
              v-for="icon in combo.inputAIcons"
              :key="icon"
              :src="icon"
              class="mr1 pixelated icon-14 v-mid"
              alt=""
            />
            <span>{{ combo.inputAName }}</span>
          </span>
          <span class="gray mh2">+</span>
          <span class="inline-flex items-center">
            <img
              v-for="icon in combo.inputBIcons"
              :key="icon"
              :src="icon"
              class="mr1 pixelated icon-14 v-mid"
              alt=""
            />
            <span>{{ combo.inputBName }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
`;

export const FusionCard = defineComponent({
  name: 'FusionCard',
  props: {
    fusion: {
      type: Object,
      required: true
    },
    showResult: {
      type: Boolean,
      default: false
    },
    showType: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const isExpanded = ref(false);
    const toggleExpand = () => {
      isExpanded.value = !isExpanded.value;
    };

    return {
      getMonsterProfileImage,
      isExpanded,
      toggleExpand
    };
  },
  template: TEMPLATE
});
