// @ts-check
import { computed, defineComponent, ref } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../store.js';
import { getRarityBadgeClass } from './ItemChip.js';
import { CraftingRecipeCard } from './CraftingRecipeCard.js';
import { WildSpawnCard } from './WildSpawnCard.js';
import { WorldResourceCard } from './WorldResourceCard.js';
import { NotFoundCard } from './NotFoundCard.js';

const TEMPLATE = /* html */ `
  <div>
    <div class="mb3">
      <RouterLink to="/items" class="link light-blue f6 b dim">
        &larr; Back to Resources &amp; Items
      </RouterLink>
    </div>

    <NotFoundCard
      v-if="!item"
      title="Resource Not Found"
      :id="itemId"
      entity-type="resource record"
      back-to="/items"
      back-label="Return to Resources"
    />

    <div v-else>
      <header class="pa4 bg-dark-gray ba b--white-10 br3 mb4">
        <div class="flex flex-wrap items-center justify-between">
          <div class="flex items-center">
            <img
              :src="item.icon"
              :alt="item.name"
              class="icon-64 br3 bg-near-black ba b--white-10 mr3 pa2 flex-shrink-0 pixelated"
            />
            <div>
              <div class="f7 gray code mb1">{{ item.id }}</div>
              <h1 class="f2 fw8 ma0 near-white">{{ item.name }}</h1>
            </div>
          </div>

          <div class="flex items-center mt3 mt0-ns">
            <span class="dib ph3 pv1 br2 bg-near-black ba b--white-10 f6 silver mr2">
              Drops: {{ droppedByMonsters.length }}
            </span>
            <span class="dib ph3 pv1 br2 bg-near-black ba b--white-10 f6 silver">
              Used In: {{ usedInRecipes.length }}
            </span>
          </div>
        </div>

        <p class="f5 silver lh-copy mw7 mt3 mb0">
          {{ item.description || 'No description recorded.' }}
        </p>
      </header>

      <div class="flex flex-column flex-row-l nl2-l nr2-l">
        <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa4 mb3 mb0-l mh2-l">
          <h2 class="f5 fw7 mt0 mb3 near-white">
            Dropped By Monsters ({{ droppedByMonsters.length }})
          </h2>

          <div v-if="droppedByMonsters.length > 0" class="mb4">
            <div
              v-for="entry in droppedByMonsters"
              :key="entry.monster.id + '_' + entry.rarity"
              class="pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex items-center justify-between flex-wrap">
                <div class="flex items-center">
                  <img
                    :src="entry.monster.profileImage"
                    :alt="entry.monster.name"
                    class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 flex-shrink-0 pixelated"
                    loading="lazy"
                  />
                  <div>
                    <div class="flex items-center flex-wrap">
                      <RouterLink
                        :to="'/monsters/' + entry.monster.id"
                        class="link near-white hover-light-purple b f5 mr2"
                      >
                        {{ entry.monster.name }} &rarr;
                      </RouterLink>
                      <button
                        v-if="entry.monster.wildSpawns.length > 0"
                        type="button"
                        @click="toggleMonsterSpawns(entry.monster.id)"
                        class="bn bg-transparent light-blue hover-white pointer f7 pv1 ph2 br2 bg-white-05 ba b--white-10 inline-flex items-center"
                        :title="isSpawnsExpanded(entry.monster.id) ? 'Hide wild spawns' : 'View wild spawns'"
                      >
                        <span>{{ entry.monster.wildSpawns.length }} {{ entry.monster.wildSpawns.length === 1 ? 'spawn' : 'spawns' }}</span>
                        <span class="ml1">{{ isSpawnsExpanded(entry.monster.id) ? '▴' : '▾' }}</span>
                      </button>
                      <span v-else class="f7 gray i">No wild spawns</span>
                    </div>
                    <div class="f7 silver mt1">
                      Tier {{ entry.monster.tier }} &bull; {{ entry.monster.element }} ({{ entry.monster.attackType }})
                    </div>
                  </div>
                </div>
                <span :class="getRarityBadgeClass(entry.rarity)" class="mt2 mt0-ns">
                  {{ entry.rarity }} Loot
                </span>
              </div>

              <!-- Collapsible wild spawns drill-down -->
              <div
                v-if="isSpawnsExpanded(entry.monster.id) && entry.monster.wildSpawns.length > 0"
                class="mt3 pt2 bt b--white-10"
              >
                <div class="f7 gray mb2">Wild Encounter Locations:</div>
                <div class="flex flex-column">
                  <WildSpawnCard
                    v-for="spawn in entry.monster.wildSpawns"
                    :key="spawn.key"
                    :spawn="spawn"
                    variant="row"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4"
          >
            Not dropped by any monsters.
          </div>

          <h2 class="f5 fw7 mt4 mb3 near-white">
            Gathered From World Resources ({{ gatheredFromResources.length }})
          </h2>

          <div v-if="gatheredFromResources.length > 0" class="mb4">
            <WorldResourceCard
              v-for="entry in gatheredFromResources"
              :key="entry.resource.id + '_' + entry.pool"
              :resource="entry.resource"
              :pool="entry.pool"
            />
          </div>

          <div
            v-else
            class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4"
          >
            Not gatherable from overworld resource nodes.
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">
            Crafted In Room Recipes ({{ craftedInRecipes.length }})
          </h2>

          <div v-if="craftedInRecipes.length > 0">
            <CraftingRecipeCard
              v-for="rec in craftedInRecipes"
              :key="rec.id"
              :recipe="rec"
            />
          </div>

          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6">
            Not crafted directly in any room.
          </div>
        </section>

        <section class="w-100 w-50-l bg-dark-gray ba b--white-10 br3 pa4 mh2-l">
          <h2 class="f5 fw7 mt0 mb3 near-white">
            Used As Ingredient In ({{ usedInRecipes.length }})
          </h2>

          <div v-if="usedInRecipes.length > 0">
            <div
              v-for="entry in usedInRecipes"
              :key="entry.recipe.id"
              class="flex items-center justify-between pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex items-center">
                <img
                  :src="entry.recipe.outputIcon"
                  :alt="entry.recipe.outputName"
                  :class="[
                    'icon-32 br2 bg-dark-gray ba b--white-10 mr3 flex-shrink-0 pixelated',
                    entry.recipe.outputType === 'Monster' ? '' : 'pa1'
                  ]"
                  loading="lazy"
                />
                <div>
                  <RouterLink
                    :to="entry.recipe.outputRoute"
                    class="link near-white hover-light-purple b f6"
                  >
                    {{ entry.recipe.outputName }}
                    <span v-if="entry.recipe.outputQuantity > 1">(&times;{{ entry.recipe.outputQuantity }})</span>
                    &rarr;
                  </RouterLink>
                  <div class="f7 silver mt1">
                    Requires <strong class="gold">{{ entry.quantity }}&times;</strong> in
                    <RouterLink
                      :to="'/rooms/' + entry.recipe.roomId"
                      class="link light-blue hover-white inline-flex items-center"
                    >
                      <img
                        v-if="entry.recipe.roomIcon"
                        :src="entry.recipe.roomIcon"
                        :alt="entry.recipe.roomName"
                        class="mr1 dib v-mid flex-shrink-0 pixelated icon-14"
                      />
                      {{ entry.recipe.roomName }}
                    </RouterLink>
                  </div>
                </div>
              </div>
              <span class="dib ph2 pv1 br-pill f7 b bg-mid-gray near-white ba b--white-20">
                {{ entry.recipe.outputType }}
              </span>
            </div>
          </div>

          <div v-else class="pa3 bg-near-black ba b--white-10 br2 silver f6">
            Not currently used as an ingredient in any recipe.
          </div>
        </section>
      </div>
    </div>
  </div>
`;

export const ItemDetail = defineComponent({
  name: 'ItemDetail',
  components: { CraftingRecipeCard, WildSpawnCard, WorldResourceCard, NotFoundCard },
  setup() {
    const route = useRoute();

    const itemId = computed(() => String(route.params.id || ''));

    const item = computed(() =>
      db.items.find((i) => i.id === itemId.value)
    );

    const droppedByMonsters = computed(() => {
      /** @type {Array<{ monster: import('../models/Monster.js').Monster, rarity: 'Common' | 'Rare' | 'Epic' }>} */
      const results = [];
      for (const mon of db.monsters) {
        for (const loot of mon.loots) {
          if (loot.item.id === itemId.value) {
            results.push({ monster: mon, rarity: loot.rarity });
          }
        }
      }
      return results;
    });

    const gatheredFromResources = computed(() => {
      /** @type {Array<{ resource: import('../models/WorldResource.js').WorldResource, pool: 'Base' | 'Rare' | 'Epic' }>} */
      const results = [];
      for (const res of db.worldResources) {
        for (const drop of res.drops) {
          if (drop.item.id === itemId.value) {
            results.push({ resource: res, pool: drop.pool });
          }
        }
      }
      return results;
    });

    const craftedInRecipes = computed(() =>
      db.recipes.filter(
        (rec) => rec.outputType === 'Resource' && rec.outputId === itemId.value
      )
    );

    const usedInRecipes = computed(() =>
      db.recipes.flatMap((recipe) => {
        const found = recipe.ingredients.find((ing) => ing.item.id === itemId.value);
        return found ? [{ recipe, quantity: found.quantity }] : [];
      })
    );

    const expandedMonsterIds = ref(/** @type {Set<string>} */ (new Set()));
    const toggleMonsterSpawns = (/** @type {string} */ monsterId) => {
      const next = new Set(expandedMonsterIds.value);
      if (next.has(monsterId)) {
        next.delete(monsterId);
      } else {
        next.add(monsterId);
      }
      expandedMonsterIds.value = next;
    };
    const isSpawnsExpanded = (/** @type {string} */ monsterId) =>
      expandedMonsterIds.value.has(monsterId);

    return {
      itemId,
      item,
      droppedByMonsters,
      gatheredFromResources,
      craftedInRecipes,
      usedInRecipes,
      toggleMonsterSpawns,
      isSpawnsExpanded,
      getRarityBadgeClass
    };
  },
  template: TEMPLATE
});
