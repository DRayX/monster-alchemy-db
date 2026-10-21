// @ts-check
import { ref, computed, defineComponent, watch } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../store.js';
import { getMonsterProfileImage, getItemIcon, getStatIcon } from '../services/assets.js';
import { TypeBadge } from './TypeBadge.js';
import { ItemChip, getRarityBadgeClass } from './ItemChip.js';
import { StatBar } from './StatBar.js';
import { FusionCard } from './FusionCard.js';
import { NotFoundCard } from './NotFoundCard.js';

/**
 * @typedef {{ key: 'health' | 'strength' | 'defense' | 'mind' | 'soul' | 'agility', label: string, color: string, icon?: string }} StatBarConfig
 */

/** @type {StatBarConfig[]} */
const STAT_BARS = [
  { key: 'health', label: 'Health (HP)', color: 'bg-green', icon: '' },
  { key: 'strength', label: 'Strength', color: 'bg-light-red', icon: getStatIcon('Strength') },
  { key: 'defense', label: 'Defense', color: 'bg-light-blue', icon: getStatIcon('Defense') },
  { key: 'mind', label: 'Mind', color: 'bg-light-purple', icon: getStatIcon('Mind') },
  { key: 'soul', label: 'Soul', color: 'bg-purple', icon: getStatIcon('Soul') },
  { key: 'agility', label: 'Agility', color: 'bg-gold', icon: getStatIcon('Agility') }
];

const TEMPLATE = /* html */ `
  <div>
    <div class="mb3">
      <RouterLink to="/monsters" class="link light-blue f6 b dim">
        &larr; Back to Monsterpedia
      </RouterLink>
    </div>

    <NotFoundCard
      v-if="!monster"
      title="Monster Not Found"
      :id="monsterId"
      entity-type="monster record"
      back-to="/monsters"
      back-label="Return to Monsters"
    />

    <div v-else>
      <header class="pa4 bg-dark-gray ba b--white-10 br3 mb4">
        <div class="flex flex-wrap items-center justify-between">
          <div class="flex items-center">
            <img
              :src="monster.profileImage"
              :alt="monster.name"
              class="icon-64 br3 bg-near-black ba b--white-10 mr3 pa1 flex-shrink-0 pixelated"
            />
            <div>
              <div class="f7 gray code mb1">{{ monster.id }}</div>
              <h1 class="f2 fw8 ma0 near-white">{{ monster.name }}</h1>
              <div class="f6 silver mt2 flex flex-wrap items-center" style="gap: 6px;">
                <span>Element:</span>
                <TypeBadge :type="monster.element" :pill="false" :icon-size="16" custom-class="b near-white" />
                <span class="silver">&bull;</span>
                <span>Attack Type:</span>
                <TypeBadge :type="monster.attackType" :pill="false" :icon-size="16" custom-class="b near-white" />
                <span class="silver">&bull;</span>
                <span>Passive:</span>
                <TypeBadge :type="monster.passiveSkill?.name || monster.passive" :pill="false" :icon-size="16" custom-class="b light-purple" />
              </div>
            </div>
          </div>

          <div class="flex items-center mt3 mt0-ns">
            <span class="dib ph3 pv1 br-pill f6 b bg-mid-gray near-white ba b--white-20">
              Tier {{ monster.tier }} {{ '⭐'.repeat(monster.tier) }}
            </span>
          </div>
        </div>

        <p v-if="monster.description" class="f5 silver lh-copy mw7 mt3 mb0">
          {{ monster.description }}
        </p>

        <div
          v-if="spriteImage"
          class="mt3 pt3 bt b--white-10"
        >
          <div class="f7 b silver ttu tracked mb2">Sprite Sheet</div>
          <div class="dib pa3 bg-near-black ba b--white-10 br3">
            <img
              :src="spriteImage"
              :alt="monster.name + ' Sprite'"
              class="db pixelated"
              style="height: 90px; width: auto;"
            />
          </div>
        </div>
      </header>

      <div class="flex flex-column flex-row-l nl2-l nr2-l">
        <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa4 mb3 mb0-l mh2-l">
          <div class="flex items-center justify-between mb3">
            <h2 class="f5 fw7 ma0 near-white">Base Attributes</h2>
            <span class="dib ph2 pv1 br-pill f7 b bg-near-black light-purple ba b--white-10">
              Total: {{ monster.statTotal }}
            </span>
          </div>

          <div class="mb4">
            <StatBar
              v-for="stat in STAT_BARS"
              :key="stat.key"
              :label="stat.label"
              :icon="stat.icon"
              :value="monster[stat.key]"
              :color="stat.color"
            />
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">Skills & Progression</h2>

          <!-- Passive Trait -->
          <div class="pa3 bg-near-black ba b--white-10 br2 mb3">
            <div class="flex items-center justify-between mb2">
              <div class="flex items-center">
                <span class="dib ph2 pv1 br-pill f7 b bg-purple white mr2">
                  Passive
                </span>
                <TypeBadge
                  :type="monster.passiveSkill?.name || monster.passive"
                  :pill="false"
                  :icon-size="16"
                  custom-class="b f6 near-white"
                />
              </div>
            </div>
            <div
              v-if="monster.passiveSkill?.formattedDescription"
              class="f6 silver lh-copy"
              v-html="monster.passiveSkill.formattedDescription"
            ></div>
            <div
              v-else-if="monster.passive && monster.passive !== 'None'"
              class="f6 silver-60 i"
            >
              No detailed description available.
            </div>
            <div v-else class="f6 silver-60 i">
              None
            </div>
          </div>

          <!-- Active Learned Skills Progression -->
          <div v-if="monster.skills && monster.skills.length > 0" class="mb4">
            <div
              v-for="{ level, levelLabel, skill } in monster.skills"
              :key="level + '_' + skill.id"
              class="pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex flex-wrap items-center justify-between mb2">
                <div class="flex items-center">
                  <span class="dib ph2 pv1 br-pill f7 b bg-dark-blue light-blue ba b--light-blue mr2">
                    {{ levelLabel }}
                  </span>
                  <span class="b f6 near-white">{{ skill.name }}</span>
                </div>
                <div class="flex items-center f7 mt1 mt0-ns">
                  <span v-if="skill.cost > 0" class="ph2 pv1 br2 bg-black-40 light-blue b mr2">
                    {{ skill.cost }} Cost
                  </span>
                  <span v-if="skill.power > 0" class="ph2 pv1 br2 bg-black-40 light-red b">
                    {{ skill.power }} Power
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center mb2" style="gap: 4px;">
                <TypeBadge v-if="skill.element" :type="skill.element" :icon-size="12" />
                <TypeBadge v-if="skill.damageType" :type="skill.damageType" :icon-size="12" />
                <span
                  v-if="skill.scaling && skill.scaling !== 'None'"
                  class="dib ph2 pv1 br-pill f7 b ba bg-black-40 gold b--gold inline-flex items-center"
                >
                  <img
                    v-if="getStatIcon(skill.scaling)"
                    :src="getStatIcon(skill.scaling)"
                    :alt="skill.scaling"
                    class="mr1 flex-shrink-0 pixelated icon-12"
                  />
                  Scaling: {{ skill.scaling }}
                </span>
                <span
                  v-if="skill.targettingLabel"
                  class="dib ph2 pv1 br-pill f7 b ba bg-black-40 washed-blue b--white-20"
                >
                  {{ skill.targettingLabel }}
                </span>
              </div>

              <div
                v-if="skill.formattedDescription"
                class="f6 silver lh-copy mt2 pt2 bt b--white-10"
                v-html="skill.formattedDescription"
              ></div>
            </div>
          </div>
          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4">
            No skill progression recorded for this monster.
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">Loot Rewards</h2>
          <div v-if="monster.loots.length > 0">
            <div
              v-for="loot in monster.loots"
              :key="loot.rarity + '_' + loot.item.id"
              class="flex items-center justify-between pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex items-center">
                <img
                  :src="loot.item.icon"
                  :alt="loot.item.name"
                  class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 pa1 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <RouterLink
                  :to="'/items/' + loot.item.id"
                  class="link near-white hover-light-purple b f6"
                >
                  {{ loot.item.name }} &rarr;
                </RouterLink>
              </div>
              <span :class="rarityBadgeClass(loot.rarity)">
                {{ loot.rarity }} Loot
              </span>
            </div>
          </div>
          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6">
            No loot drops recorded for this monster.
          </div>
        </section>

        <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa4 mh2-l">
          <h2 class="f5 fw7 mt0 mb3 near-white">
            Room Crafting Recipes ({{ summoningRecipes.length }})
          </h2>
          <div v-if="summoningRecipes.length > 0" class="mb4">
            <div
              v-for="rec in summoningRecipes"
              :key="rec.id"
              class="pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex items-center justify-between mb2">
                <RouterLink
                  :to="'/rooms/' + rec.roomId"
                  class="link light-purple b f6 hover-white inline-flex items-center"
                >
                  <img
                    v-if="rec.roomIcon"
                    :src="rec.roomIcon"
                    :alt="rec.roomName"
                    class="mr2 dib v-mid flex-shrink-0 pixelated icon-16"
                  />
                  {{ rec.roomName }} &rarr;
                </RouterLink>
                <span class="f7 silver inline-flex items-center">
                  <img
                    :src="getStatIcon('Work')"
                    alt="Work"
                    class="mr1 flex-shrink-0 pixelated icon-12"
                  />
                  Work: {{ rec.work }}
                </span>
              </div>
              <div class="flex flex-wrap">
                <ItemChip
                  v-for="ing in rec.ingredients"
                  :key="ing.item.id"
                  :item-id="ing.item.id"
                  :name="ing.item.name"
                  :quantity="ing.quantity"
                  custom-class="mr2 mb1"
                />
              </div>
            </div>
          </div>
          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4">
            Not crafted directly in a ritual circle.
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">
            Created By Fusion ({{ fusionResults.length }})
          </h2>
          <div v-if="fusionResults.length > 0" class="mb4">
            <FusionCard
              v-for="fus in fusionResults"
              :key="fus.id"
              :fusion="fus"
            />
          </div>
          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4">
            No fusion recipes produce this monster.
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">
            Used In Explicit Fusions ({{ usedInFusions.length }})
          </h2>
          <div v-if="usedInFusions.length > 0">
            <FusionCard
              v-for="fus in usedInFusions"
              :key="fus.id"
              :fusion="fus"
              :show-result="true"
            />
          </div>
          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6">
            Not used as a specific parent in explicit fusions.
          </div>
        </section>
      </div>
    </div>
  </div>
`;

export const MonsterDetail = defineComponent({
  name: 'MonsterDetail',
  components: { TypeBadge, ItemChip, StatBar, FusionCard, NotFoundCard },
  setup() {
    const route = useRoute();

    const monsterId = computed(() => String(route.params.id || ''));

    const monster = computed(() =>
      db.monsters.find((m) => m.id === monsterId.value)
    );

    const summoningRecipes = computed(() =>
      db.recipes.filter(
        (rec) => rec.outputType === 'Monster' && rec.outputId === monsterId.value
      )
    );

    const fusionResults = computed(() =>
      db.fusions.filter((f) => f.resultId === monsterId.value)
    );

    const usedInFusions = computed(() =>
      db.fusions.filter(
        (f) =>
          (f.inputAIsMonster && f.inputA === monsterId.value) ||
          (f.inputBIsMonster && f.inputB === monsterId.value)
      )
    );

    const spriteImage = ref('');

    watch(
      monster,
      async (m) => {
        spriteImage.value = (await m?.spriteImage) || '';
      },
      { immediate: true }
    );

    return {
      monsterId,
      monster,
      spriteImage,
      summoningRecipes,
      fusionResults,
      usedInFusions,
      rarityBadgeClass: getRarityBadgeClass,
      getMonsterProfileImage,
      getItemIcon,
      getStatIcon,
      STAT_BARS
    };
  },
  template: TEMPLATE
});
