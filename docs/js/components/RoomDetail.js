// @ts-check
import { ref, computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../store.js';
import { getMonsterProfileImage, getItemIcon, getStatIcon } from '../services/assets.js';
import { SortableTable } from './SortableTable.js';
import { ItemChip } from './ItemChip.js';
import { NotFoundCard } from './NotFoundCard.js';

/** @type {import('./SortableTable.js').TableColumn<import('../models/Recipe.js').CraftingRecipe>[]} */
const CRAFT_COLUMNS = [
  { key: 'outputName', label: 'Crafted Result' },
  { key: 'outputType', label: 'Type' },
  { key: 'outputQuantity', label: 'Yield', align: 'right' },
  { key: 'ingredientsSummary', label: 'Required Resources' },
  { key: 'work', label: 'Work', align: 'right', icon: getStatIcon('Work') }
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
            <div
              v-if="room.icon"
              class="icon-64 br3 bg-near-black ba b--white-10 flex items-center justify-center mr3 f2 flex-shrink-0 overflow-hidden pa1"
            >
              <img
                :src="room.icon"
                :alt="room.name"
                class="w-100 h-100 pixelated"
              />
            </div>
            <div>
              <div class="f7 gray code mb1">{{ room.id }}</div>
              <h1 class="f2 fw8 ma0 near-white">{{ room.name }}</h1>
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
              :src="getStatIcon('Work')"
              alt="Work"
              class="mr1 flex-shrink-0 pixelated icon-14"
            />
            Construction Cost (Work {{ buildRecipe.work }}):
          </span>
          <RouterLink
            v-for="ing in buildRecipe.ingredients"
            :key="ing.item.id"
            :to="'/items/' + ing.item.id"
            class="link inline-flex items-center ph2 pv1 br2 bg-near-black ba b--white-10 hover-b--purple f7 near-white mr2"
          >
            <img
              :src="ing.item.icon"
              :alt="ing.item.name"
              class="mr1 flex-shrink-0 pixelated icon-18"
              loading="lazy"
            />
            <span><strong class="gold">{{ ing.quantity }}&times;</strong> {{ ing.item.name }}</span>
          </RouterLink>
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
                  :src="getMonsterProfileImage(fusion.resultId)"
                  :alt="fusion.resultName"
                  class="icon-32 br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <div>
                  <RouterLink
                    :to="'/monsters/' + fusion.resultId"
                    class="link b near-white hover-light-purple db"
                  >
                    {{ fusion.resultName }}
                  </RouterLink>
                  <div class="f7 gray code">{{ fusion.resultId }}</div>
                </div>
              </div>
            </td>
            <td class="pa3">
              <span
                :class="[
                  'dib ph2 pv1 br-pill f7 b ba',
                  fusion.fusionType === 'Explicit'
                    ? 'bg-purple washed-red b--light-purple'
                    : 'bg-navy light-blue b--light-blue'
                ]"
              >
                {{ fusion.fusionType }}
              </span>
            </td>
            <td class="pa3">
              <RouterLink
                v-if="fusion.inputAIsMonster"
                :to="'/monsters/' + fusion.inputA"
                class="link b light-blue hover-white inline-flex items-center"
              >
                <img
                  :src="getMonsterProfileImage(fusion.inputA)"
                  :alt="fusion.inputAName"
                  class="br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated icon-24"
                  loading="lazy"
                />
                <span>{{ fusion.inputAName }}</span>
              </RouterLink>
              <span v-else class="silver inline-flex items-center">
                <img
                  v-for="icon in fusion.inputAIcons"
                  :key="icon"
                  :src="icon"
                  class="mr2 pixelated icon-24 v-mid flex-shrink-0"
                  alt=""
                />
                <span>{{ fusion.inputAName }}</span>
              </span>
            </td>
            <td class="pa3">
              <RouterLink
                v-if="fusion.inputBIsMonster"
                :to="'/monsters/' + fusion.inputB"
                class="link b light-blue hover-white inline-flex items-center"
              >
                <img
                  :src="getMonsterProfileImage(fusion.inputB)"
                  :alt="fusion.inputBName"
                  class="br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated icon-24"
                  loading="lazy"
                />
                <span>{{ fusion.inputBName }}</span>
              </RouterLink>
              <span v-else class="silver inline-flex items-center">
                <img
                  v-for="icon in fusion.inputBIcons"
                  :key="icon"
                  :src="icon"
                  class="mr2 pixelated icon-24 v-mid flex-shrink-0"
                  alt=""
                />
                <span>{{ fusion.inputBName }}</span>
              </span>
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
                  v-if="recipe.outputType === 'Monster'"
                  :src="getMonsterProfileImage(recipe.outputId)"
                  :alt="recipe.outputName"
                  class="icon-32 br2 bg-near-black ba b--white-10 mr2 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <img
                  v-else-if="recipe.outputType === 'Resource'"
                  :src="getItemIcon(recipe.outputId)"
                  :alt="recipe.outputName"
                  class="icon-32 br2 bg-near-black ba b--white-10 mr2 pa1 flex-shrink-0 pixelated"
                  loading="lazy"
                />
                <div
                  v-else-if="recipe.outputType === 'Structure'"
                  class="icon-32 br2 bg-near-black ba b--white-10 mr2 flex items-center justify-center flex-shrink-0 overflow-hidden pa1"
                >
                  <img
                    v-if="getRoom(recipe.outputId)?.icon"
                    :src="getRoom(recipe.outputId)?.icon"
                    :alt="recipe.outputName"
                    class="w-100 h-100 pixelated"
                    loading="lazy"
                  />
                </div>
                <div>
                  <RouterLink
                    :to="recipe.outputRoute"
                    class="link b near-white hover-light-purple db"
                  >
                    {{ recipe.outputName }}
                  </RouterLink>
                  <div class="f7 gray code">{{ recipe.id }}</div>
                </div>
              </div>
            </td>
            <td class="pa3">
              <span
                :class="[
                  'dib ph2 pv1 br-pill f7 b ba',
                  recipe.outputType === 'Monster'
                    ? 'bg-purple washed-red b--light-purple'
                    : recipe.outputType === 'Structure'
                    ? 'bg-gold near-black b--gold'
                    : 'bg-navy light-blue b--light-blue'
                ]"
              >
                {{ recipe.outputType }}
              </span>
            </td>
            <td class="pa3 tr b near-white">
              &times;{{ recipe.outputQuantity }}
            </td>
            <td class="pa3">
              <div v-if="recipe.ingredients.length > 0" class="flex flex-wrap">
                <ItemChip
                  v-for="ing in recipe.ingredients"
                  :key="ing.item.id"
                  :item-id="ing.item.id"
                  :name="ing.item.name"
                  :quantity="ing.quantity"
                  custom-class="mr2 mb1"
                />
              </div>
              <span v-else class="f7 gray">None (Base Gathering)</span>
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
  components: { SortableTable, ItemChip, NotFoundCard },
  template: TEMPLATE,
  setup() {
    const route = useRoute();
    const searchQuery = ref('');
    const selectedFusionType = ref('ALL');

    const roomId = computed(() => String(route.params.id || ''));

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

    /**
     * @param {string} id
     * @returns {import('../models/Room.js').Room | undefined}
     */
    function getRoom(id) {
      return db.rooms.find((r) => r.id === id);
    }

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
      getMonsterProfileImage,
      getItemIcon,
      getStatIcon,
      getRoom
    };
  }
});
