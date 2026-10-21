// @ts-check
import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../store.js';
import { getMonsterProfileImage, getItemIcon, getStatIcon } from '../services/assets.js';
import { getRarityBadgeClass } from './ItemChip.js';
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
              class="flex items-center justify-between pa3 bg-near-black ba b--white-10 br2 mb2"
            >
              <div class="flex items-center">
                <img
                  :src="entry.monster.profileImage"
                  :alt="entry.monster.name"
                  class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <div>
                  <RouterLink
                    :to="'/monsters/' + entry.monster.id"
                    class="link near-white hover-light-purple b f5"
                  >
                    {{ entry.monster.name }} &rarr;
                  </RouterLink>
                  <div class="f7 silver mt1">
                    Tier {{ entry.monster.tier }} &bull; {{ entry.monster.element }} ({{ entry.monster.attackType }})
                  </div>
                </div>
              </div>
              <span :class="rarityBadgeClass(entry.rarity)">
                {{ entry.rarity }} Loot
              </span>
            </div>
          </div>

          <div
            v-else
            class="pa3 bg-near-black ba b--white-10 br2 silver f6 mb4"
          >
            Not dropped by any monsters.
          </div>

          <h2 class="f5 fw7 mt0 mb3 near-white">
            Crafted In Room Recipes ({{ craftedInRecipes.length }})
          </h2>

          <div v-if="craftedInRecipes.length > 0">
            <div
              v-for="rec in craftedInRecipes"
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
                  {{ rec.roomName }} (&times;{{ rec.outputQuantity }}) &rarr;
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
                <RouterLink
                  v-for="ing in rec.ingredients"
                  :key="ing.item.id"
                  :to="'/items/' + ing.item.id"
                  class="link inline-flex items-center ph2 pv1 br2 bg-dark-gray ba b--white-10 hover-b--purple f7 near-white mr2 mb1"
                >
                  <img
                    :src="ing.item.icon"
                    :alt="ing.item.name"
                    class="mr1 flex-shrink-0 pixelated icon-18"
                    loading="lazy"
                  />
                  <span><strong class="gold">{{ ing.quantity }}&times;</strong> {{ ing.item.name }}</span>
                </RouterLink>
                <span v-if="rec.ingredients.length === 0" class="f7 silver">
                  No resource inputs required
                </span>
              </div>
            </div>
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
                  v-if="entry.recipe.outputType === 'Monster'"
                  :src="getMonsterProfileImage(entry.recipe.outputId)"
                  :alt="entry.recipe.outputName"
                  class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <img
                  v-else-if="entry.recipe.outputType === 'Resource'"
                  :src="getItemIcon(entry.recipe.outputId)"
                  :alt="entry.recipe.outputName"
                  class="icon-32 br2 bg-dark-gray ba b--white-10 mr3 pa1 flex-shrink-0 pixelated"
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
                      class="link light-blue hover-white"
                    >
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
  components: { NotFoundCard },
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

    return {
      itemId,
      item,
      droppedByMonsters,
      craftedInRecipes,
      usedInRecipes,
      rarityBadgeClass: getRarityBadgeClass,
      getMonsterProfileImage,
      getItemIcon,
      getStatIcon
    };
  },
  template: TEMPLATE
});
