// @ts-check
import { ref, computed, watch, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../store.js';
import { getIcon } from '../services/assets.js';
import { getOutputTypeBadgeClass, getFusionTypeBadgeClass } from '../services/formatters.js';
import { SortableTable } from './SortableTable.js';
import { ItemChip } from './ItemChip.js';
import { FusionOperandBadge } from './FusionOperandBadge.js';
import { NotFoundCard } from './NotFoundCard.js';
import { RecipeScrollBadge } from './RecipeScrollBadge.js';

/** @type {import('./SortableTable.js').TableColumn<import('../models/Recipe.js').CraftingRecipe>[]} */
const CRAFT_COLUMNS = [
  { key: 'outputName', label: 'Crafted Result' },
  { key: 'outputType', label: 'Type' },
  { key: 'outputQuantity', label: 'Yield', align: 'right' },
  { key: 'ingredientsSummary', label: 'Required Resources' },
  { key: 'work', label: 'Work', align: 'right', icon: getIcon('Work') }
];

/** @type {import('./SortableTable.js').TableColumn<import('../models/Recipe.js').FusionRecipe>[]} */
const FUSION_COLUMNS = [
  { key: 'resultName', label: 'Resulting Monster' },
  { key: 'fusionType', label: 'Fusion Type' },
  { key: 'inputAName', label: 'First Specimen / Trait' },
  { key: 'inputBName', label: 'Second Specimen / Trait' }
];

const TEMPLATE = /* html */ `
  <div>
    <NotFoundCard
      v-if="!room"
      title="Room Not Found"
      :id="roomId"
      entity-type="crafting room"
      back-to="/"
      back-label="Return Home"
    />

    <div v-else>
      <header class="pa4 bg-dark-gray ba b--white-10 br3 mb4">
        <div class="flex flex-wrap items-center justify-between">
          <div class="flex items-center">
            <img
              v-if="room.icon"
              :src="room.icon"
              :alt="room.name"
              class="icon-72 br3 bg-near-black ba b--white-10 mr3 pa1 flex-shrink-0 pixelated"
            />
            <div>
              <div class="f7 gray code mb1">{{ room.id }}</div>
              <div class="flex items-center">
                <h1 class="f2 fw8 ma0 near-white">{{ room.name }}</h1>
                <RecipeScrollBadge :unlock="room.recipeUnlock" :size="24" />
              </div>
            </div>
          </div>

          <div class="mt3 mt0-ns">
            <span class="dib ph3 pv1 br-pill f6 b bg-purple white">
              <template v-if="isFusionRoom">
                {{ room.fusionRecipes?.length || 0 }} Fusion Combinations
              </template>
              <template v-else>
                {{ room.recipes.length }} {{ room.recipes.length === 1 ? 'Recipe' : 'Recipes' }}
              </template>
            </span>
          </div>
        </div>

        <div v-if="buildRecipe" class="mt3 pt3 bt b--white-10 f6 silver flex flex-wrap items-center">
          <span class="mr2 inline-flex items-center">
            <img
              :src="getIcon('Work')"
              alt="Work"
              class="mr1 flex-shrink-0 pixelated icon-14"
            />
            Construction Cost (Work {{ buildRecipe.work }}):
          </span>
          <ItemChip
            v-for="ing in buildRecipe.ingredients"
            :key="ing.item.id"
            :item-id="ing.item.id"
            :name="ing.item.name"
            :quantity="ing.quantity"
            custom-class="mr2"
          />
        </div>
      </header>

      <!-- Chimeric Chamber (Fusion Room) Table -->
      <template v-if="isFusionRoom">
        <div class="flex flex-column flex-row-ns items-end-ns justify-between mb3">
          <div class="mb3 mb0-ns">
            <h2 class="f4 fw7 ma0 near-white">{{ room.name }} Fusions</h2>
            <p class="f6 silver mt1 mb0">
              Showing {{ filteredFusions.length }} of {{ room.fusionRecipes?.length || 0 }} fusions
            </p>
          </div>

          <div class="flex flex-wrap items-center">
            <input
              v-model="searchQuery"
              type="search"
              class="input-reset bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 mr2 mb2 mb0-ns w5-ns"
              placeholder="Search monster or trait..."
              aria-label="Search fusions"
            />

            <select
              v-model="selectedFusionType"
              class="bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6"
              aria-label="Filter by fusion type"
            >
              <option value="ALL">All Fusion Types</option>
              <option value="Explicit">Explicit (Specific Monsters)</option>
              <option value="Generic">Generic (Element / Attack)</option>
            </select>
          </div>
        </div>

        <SortableTable
          :rows="filteredFusions"
          :columns="FUSION_COLUMNS"
          empty-message="No fusion combinations match your current filter criteria."
        >
          <template #row="{ row: fusion }">
            <td class="pa3">
              <div class="flex items-center">
                <img
                  :src="fusion.resultIcon"
                  :alt="fusion.resultName"
                  class="icon-36 br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <div>
                  <div class="flex items-center">
                    <RouterLink
                      :to="'/monsters/' + fusion.resultId"
                      class="link b near-white hover-light-purple"
                    >
                      {{ fusion.resultName }}
                    </RouterLink>
                    <RecipeScrollBadge :unlock="fusion.recipeUnlock" />
                  </div>
                  <div class="f7 gray code">{{ fusion.resultId }}</div>
                </div>
              </div>
            </td>
            <td class="pa3">
              <span :class="getFusionTypeBadgeClass(fusion.fusionType)">
                {{ fusion.fusionType }}
              </span>
            </td>
            <td class="pa3">
              <FusionOperandBadge :operand="fusion.inputA" />
            </td>
            <td class="pa3">
              <FusionOperandBadge :operand="fusion.inputB" />
            </td>
          </template>
        </SortableTable>
      </template>

      <!-- Standard Crafting Room Table -->
      <template v-else>
        <div class="flex flex-column flex-row-ns items-end-ns justify-between mb3">
          <div class="mb3 mb0-ns">
            <h2 class="f4 fw7 ma0 near-white">{{ room.name }} Recipes</h2>
            <p class="f6 silver mt1 mb0">
              Showing {{ filteredRecipes.length }} of {{ room.recipes.length }} recipes
            </p>
          </div>

          <div class="flex flex-wrap items-center">
            <input
              v-model="searchQuery"
              type="search"
              class="input-reset bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 w5-ns"
              placeholder="Search output or resource..."
              aria-label="Search recipes"
            />
          </div>
        </div>

        <SortableTable
          :rows="filteredRecipes"
          :columns="CRAFT_COLUMNS"
          empty-message="No recipes match your current filter criteria."
        >
          <template #row="{ row: recipe }">
            <td class="pa3">
              <div class="flex items-center">
                <img
                  :src="recipe.outputIcon"
                  :alt="recipe.outputName"
                  class="icon-36 br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <div>
                  <div class="flex items-center">
                    <RouterLink
                      :to="recipe.outputRoute"
                      class="link b near-white hover-light-purple"
                    >
                      {{ recipe.outputName }}
                    </RouterLink>
                    <RecipeScrollBadge :unlock="recipe.recipeUnlock" />
                  </div>
                  <div class="f7 gray code">{{ recipe.id }}</div>
                </div>
              </div>
            </td>
            <td class="pa3">
              <span :class="getOutputTypeBadgeClass(recipe.outputType)">
                {{ recipe.outputType }}
              </span>
            </td>
            <td class="pa3 tr b near-white">
              &times;{{ recipe.outputQuantity }}
            </td>
            <td class="pa3">
              <div class="flex flex-wrap">
                <ItemChip
                  v-for="ing in recipe.ingredients"
                  :key="ing.item.id"
                  :item-id="ing.item.id"
                  :name="ing.item.name"
                  :quantity="ing.quantity"
                  custom-class="mr2 mb1"
                />
              </div>
            </td>
            <td class="pa3 tr b silver nowrap">
              {{ recipe.work }}
            </td>
          </template>
        </SortableTable>
      </template>
    </div>
  </div>
`;

export const RoomDetail = defineComponent({
  name: 'RoomDetail',
  components: { SortableTable, ItemChip, FusionOperandBadge, NotFoundCard, RecipeScrollBadge },
  template: TEMPLATE,
  setup() {
    const route = useRoute();
    const searchQuery = ref('');
    const selectedFusionType = ref('ALL');

    const roomId = computed(() => String(route.params.id || ''));

    watch(roomId, () => {
      searchQuery.value = '';
      selectedFusionType.value = 'ALL';
    });

    const room = computed(() =>
      db.rooms.find((r) => r.id === roomId.value)
    );

    const isFusionRoom = computed(
      () =>
        room.value?.id === 'FusionRoom' &&
        (room.value?.fusionRecipes?.length ?? 0) > 0
    );

    const buildRecipe = computed(() =>
      db.recipes.find(
        (rec) => rec.outputType === 'Structure' && rec.outputId === roomId.value
      )
    );

    const filteredRecipes = computed(() => {
      const recipes = room.value?.recipes ?? [];
      const query = searchQuery.value.trim().toLowerCase();
      if (!query) return recipes;
      return recipes.filter(
        (recipe) =>
          recipe.outputName.toLowerCase().includes(query) ||
          recipe.outputId.toLowerCase().includes(query) ||
          recipe.outputType.toLowerCase().includes(query) ||
          recipe.ingredientsSummary.toLowerCase().includes(query) ||
          recipe.id.toLowerCase().includes(query)
      );
    });

    const filteredFusions = computed(() => {
      const fusions = room.value?.fusionRecipes ?? [];
      const query = searchQuery.value.trim().toLowerCase();
      return fusions.filter((f) => {
        const matchesType =
          selectedFusionType.value === 'ALL' ||
          f.fusionType === selectedFusionType.value;
        const matchesQuery =
          !query ||
          f.resultName.toLowerCase().includes(query) ||
          f.inputAName.toLowerCase().includes(query) ||
          f.inputBName.toLowerCase().includes(query) ||
          f.fusionType.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      });
    });

    return {
      CRAFT_COLUMNS,
      FUSION_COLUMNS,
      roomId,
      room,
      isFusionRoom,
      buildRecipe,
      searchQuery,
      selectedFusionType,
      filteredRecipes,
      filteredFusions,
      getIcon,
      getOutputTypeBadgeClass,
      getFusionTypeBadgeClass
    };
  }
});
