// @ts-check
import { ref, computed, defineComponent } from 'vue';
import { db } from '../store.js';
import { SortableTable } from './SortableTable.js';

/** @type {import('./SortableTable.js').TableColumn<import('../models/Item.js').Item>[]} */
const COLUMNS = [
  { key: 'name', label: 'Resource / Item' },
  { key: 'dropCount', label: 'Drops', align: 'right' },
  { key: 'craftedCount', label: 'Recipes', align: 'right' },
  { key: 'usedInCount', label: 'Used In', align: 'right' },
  { key: 'description', label: 'Description', sortable: false }
];

const TEMPLATE = /* html */ `
  <div>
    <header class="flex flex-column flex-row-ns items-end-ns justify-between mb4">
      <div class="mb3 mb0-ns">
        <h1 class="f3 fw8 ma0 near-white">Resources &amp; Alchemical Items</h1>
        <p class="f6 silver mt1 mb0">
          Showing {{ filteredItems.length }} of {{ db.items.length }} resources
        </p>
      </div>

      <div class="flex flex-wrap items-center">
        <input
          v-model="searchQuery"
          type="search"
          class="input-reset bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 mr2 mb2 mb0-ns w5-ns"
          placeholder="Search name, description..."
          aria-label="Search items"
        />

        <select
          v-model="selectedSource"
          class="bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6"
          aria-label="Filter by source"
        >
          <option value="ALL">All Resources</option>
          <option value="DROPPED">Dropped by Monsters</option>
          <option value="CRAFTED">Crafted in Rooms</option>
          <option value="INGREDIENT">Used as Ingredient</option>
        </select>
      </div>
    </header>

    <SortableTable
      :rows="filteredItems"
      :columns="COLUMNS"
      empty-message="No resources match your current filter criteria."
    >
      <template #row="{ row: item }">
        <td class="pa3">
          <div class="flex items-center">
            <img
              :src="item.icon"
              :alt="item.name"
              class="icon-32 br2 bg-near-black ba b--white-10 mr3 pa1 flex-shrink-0 pixelated"
              loading="lazy"
            />
            <div>
              <RouterLink
                :to="'/items/' + item.id"
                class="link b near-white hover-light-purple db"
              >
                {{ item.name }}
              </RouterLink>
              <div class="f7 gray code">{{ item.id }}</div>
            </div>
          </div>
        </td>
        <td class="pa3 tr b near-white">
          <span v-if="item.dropCount > 0" class="dib ph2 pv1 br-pill f7 bg-near-black ba b--white-10 light-blue">
            {{ item.dropCount }}
          </span>
        </td>
        <td class="pa3 tr b near-white">
          <span v-if="item.craftedCount > 0" class="dib ph2 pv1 br-pill f7 bg-near-black ba b--white-10 light-purple">
            {{ item.craftedCount }}
          </span>
        </td>
        <td class="pa3 tr b near-white">
          <span v-if="item.usedInCount > 0" class="dib ph2 pv1 br-pill f7 bg-near-black ba b--white-10 gold">
            {{ item.usedInCount }}
          </span>
        </td>
        <td class="pa3 silver mw6">{{ item.description }}</td>
      </template>
    </SortableTable>
  </div>
`;

export const ItemTable = defineComponent({
  name: 'ItemTable',
  components: { SortableTable },
  setup() {
    const searchQuery = ref('');
    const selectedSource = ref('ALL');

    const filteredItems = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      return db.items.filter((item) => {
        const matchesSource =
          selectedSource.value === 'ALL' ||
          (selectedSource.value === 'DROPPED' && item.dropCount > 0) ||
          (selectedSource.value === 'CRAFTED' && item.craftedCount > 0) ||
          (selectedSource.value === 'INGREDIENT' && item.usedInCount > 0);
        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query);
        return matchesSource && matchesQuery;
      });
    });

    return {
      db,
      COLUMNS,
      searchQuery,
      selectedSource,
      filteredItems
    };
  },
  template: TEMPLATE
});
