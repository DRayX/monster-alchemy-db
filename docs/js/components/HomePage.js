// @ts-check
import { computed, defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { db } from '../store.js';
import { TypeBadge } from './TypeBadge.js';
import { ItemChip } from './ItemChip.js';

/**
 * @typedef {import('../types.js').PageId} PageId
 */

const FEATURED_MONSTER_IDS = [
  'Stormwing',
  'TwilightArmor',
  'MoltenDemon',
  'GreatDryad',
  'StrongYeti',
  'CursedScale'
];

const TEMPLATE = /* html */ `
  <div>
    <header class="pa4 bg-dark-gray ba b--white-10 br3 mb4">
      <h1 class="f2 fw8 mt0 mb2 near-white">Monster Alchemy Databse</h1>
      <p class="f5 silver lh-copy mw7 mt0 mb4">
        Interactive reference database of creatures, alchemical resources, crafting rooms, and chimeric fusions parsed directly from Monster Alchemy's Unreal Engine data tables.
      </p>
      <div class="flex flex-wrap">
        <RouterLink
          to="/monsters"
          class="link dib ph3 pv2 br2 bg-purple white b f6 mr3 mb2 dim"
        >
          Explore Monsters ({{ db.monsters.length }})
        </RouterLink>
        <RouterLink
          to="/items"
          class="link dib ph3 pv2 br2 bg-mid-gray near-white ba b--white-20 b f6 mb2 dim"
        >
          Browse Resources &amp; Items ({{ db.items.length }})
        </RouterLink>
      </div>
    </header>

    <section class="flex flex-column flex-row-ns justify-between mb4 nl2-ns nr2-ns">
      <div
        @click="goTo('monsters')"
        role="button"
        tabindex="0"
        class="flex-auto bg-dark-gray ba b--white-10 hover-b--purple br3 pa3 mb3 mb0-ns mh2-ns pointer dim"
      >
        <div class="f7 silver ttu tracked">Monsters</div>
        <div class="f2 fw8 near-white mv1">{{ db.monsters.length }}</div>
        <div class="f7 gray">Across {{ Object.keys(elementCounts).length }} Elemental Affinities</div>
      </div>

      <div
        @click="goTo('items')"
        role="button"
        tabindex="0"
        class="flex-auto bg-dark-gray ba b--white-10 hover-b--purple br3 pa3 mb3 mb0-ns mh2-ns pointer dim"
      >
        <div class="f7 silver ttu tracked">Resources &amp; Items</div>
        <div class="f2 fw8 near-white mv1">{{ db.items.length }}</div>
        <div class="f7 gray">Materials, Reagents, &amp; Consumables</div>
      </div>

      <div class="flex-auto bg-dark-gray ba b--white-10 br3 pa3 mh2-ns">
        <div class="f7 silver ttu tracked">Recipes</div>
        <div class="f2 fw8 near-white mv1">{{ totalRecipes }}</div>
        <div class="f7 gray">Across {{ db.rooms.length }} Alchemical Rooms</div>
      </div>
    </section>

    <div class="flex flex-column flex-row-l nl2-l nr2-l">
      <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa3 mb3 mb0-l mh2-l">
        <div class="flex items-center justify-between mb3">
          <h2 class="f5 fw7 ma0">Featured Monsters</h2>
          <RouterLink to="/monsters" class="link light-blue f6 b dim">View All &rarr;</RouterLink>
        </div>
        <div>
          <div
            v-for="mon in featuredMonsters"
            :key="mon.id"
            class="flex items-center justify-between pa3 bg-near-black ba b--white-10 br2 mb2"
          >
            <div class="flex items-center">
              <img
                :src="mon.profileImage"
                :alt="mon.name"
                class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 flex-shrink-0 pixelated"
                loading="lazy"
              />
              <div>
                <RouterLink
                  :to="'/monsters/' + mon.id"
                  class="link b near-white hover-light-purple"
                >
                  {{ mon.name }}
                </RouterLink>
                <div class="f7 silver mt1 flex flex-wrap items-center">
                  <TypeBadge :type="mon.attackType" :pill="false" :icon-size="12" custom-class="mr2" />
                  <span class="mr1">&bull;</span>
                  <template v-if="mon.loots.length > 0">
                    <span class="mr1">Drops:</span>
                    <ItemChip
                      v-for="loot in mon.loots"
                      :key="loot.rarity + loot.item.id"
                      :item-id="loot.item.id"
                      :name="loot.item.name"
                      :icon-size="14"
                      custom-class="mr1"
                    />
                  </template>
                  <span v-else>No recorded drops</span>
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <TypeBadge :type="mon.element" :icon-size="12" custom-class="mr2" />
            </div>
          </div>
        </div>
      </section>

      <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa3 mh2-l">
        <div class="flex items-center justify-between mb3">
          <h2 class="f5 fw7 ma0">Elemental Distribution</h2>
        </div>
        <div>
          <div
            v-for="(count, element) in elementCounts"
            :key="element"
            class="flex items-center mb3"
          >
            <div class="w4">
              <TypeBadge :type="element" :icon-size="12" />
            </div>
            <div class="flex-auto bg-near-black br-pill overflow-hidden mh3" style="height: 10px;">
              <div
                class="bg-purple h-100 br-pill"
                :style="{ width: Math.round(count / Math.max(db.monsters.length, 1) * 100) + '%' }"
              ></div>
            </div>
            <span class="f6 silver tr w2">{{ count }}</span>
          </div>
        </div>

        <div class="mt4 pt3 bt b--white-10">
          <div class="flex items-center justify-between mb3">
            <h2 class="f5 fw7 ma0">Attack Type Distribution</h2>
          </div>
          <div>
            <div
              v-for="(count, attackType) in attackTypeCounts"
              :key="attackType"
              class="flex items-center mb3"
            >
              <div class="w4">
                <TypeBadge :type="attackType" :icon-size="12" />
              </div>
              <div class="flex-auto bg-near-black br-pill overflow-hidden mh3" style="height: 10px;">
                <div
                  class="bg-light-blue h-100 br-pill"
                  :style="{ width: Math.round(count / Math.max(db.monsters.length, 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="f6 silver tr w2">{{ count }}</span>
            </div>
          </div>
        </div>

        <div class="mt4 pt3 bt b--white-10">
          <div class="flex items-center justify-between mb3">
            <h2 class="f5 fw7 ma0">Tier Distribution</h2>
          </div>
          <div>
            <div
              v-for="(count, tier) in tierCounts"
              :key="tier"
              class="flex items-center mb3"
            >
              <div class="w4">
                <span class="dib ph2 pv1 br-pill f7 b bg-mid-gray near-white ba b--white-20">
                  Tier {{ tier }} {{ '⭐'.repeat(Number(tier)) }}
                </span>
              </div>
              <div class="flex-auto bg-near-black br-pill overflow-hidden mh3" style="height: 10px;">
                <div
                  class="bg-gold h-100 br-pill"
                  :style="{ width: Math.round(count / Math.max(db.monsters.length, 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="f6 silver tr w2">{{ count }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

export const HomePage = defineComponent({
  name: 'HomePage',
  components: { TypeBadge, ItemChip },
  setup() {
    const router = useRouter();

    const elementCounts = computed(() => {
      /** @type {Record<string, number>} */
      const counts = {};
      for (const m of db.monsters) {
        counts[m.element] = (counts[m.element] || 0) + 1;
      }
      return counts;
    });

    const attackTypeCounts = computed(() => {
      /** @type {Record<string, number>} */
      const counts = {};
      for (const m of db.monsters) {
        counts[m.attackType] = (counts[m.attackType] || 0) + 1;
      }
      return counts;
    });

    const tierCounts = computed(() => {
      /** @type {Record<number, number>} */
      const counts = {};
      for (const m of db.monsters) {
        counts[m.tier] = (counts[m.tier] || 0) + 1;
      }
      return counts;
    });

    const totalRecipes = computed(() =>
      db.rooms.reduce((sum, r) => sum + r.totalRecipeCount, 0)
    );

    const featuredMonsters = computed(() =>
      FEATURED_MONSTER_IDS.map((id) => db.monsters.find((m) => m.id === id))
    );

    /**
     * @param {PageId} page
     */
    function goTo(page) {
      router.push({ name: page });
    }

    return {
      db,
      elementCounts,
      attackTypeCounts,
      tierCounts,
      totalRecipes,
      featuredMonsters,
      goTo
    };
  },
  template: TEMPLATE
});
