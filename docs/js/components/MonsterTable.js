// @ts-check
import { ref, computed, defineComponent } from 'vue';
import { db } from '../store.js';
import { SortableTable } from './SortableTable.js';
import { TypeBadge } from './TypeBadge.js';
import { ItemChip } from './ItemChip.js';
import { getStatIcon, MONSTER_MANAGER_ICON } from '../services/assets.js';

/** @type {import('./SortableTable.js').TableColumn<import('../models/Monster.js').Monster>[]} */
const COLUMNS = [
  { key: 'name', label: 'Monster' },
  { key: 'element', label: 'Element' },
  { key: 'attackType', label: 'Attack' },
  { key: 'tier', label: 'Tier', align: 'center' },
  { key: 'health', label: 'HP', align: 'right' },
  { key: 'soul', align: 'right', icon: getStatIcon('Soul'), title: 'Soul' },
  { key: 'strength', align: 'right', icon: getStatIcon('Strength'), title: 'Strength' },
  { key: 'defense', align: 'right', icon: getStatIcon('Defense'), title: 'Defense' },
  { key: 'mind', align: 'right', icon: getStatIcon('Mind'), title: 'Mind' },
  { key: 'agility', align: 'right', icon: getStatIcon('Agility'), title: 'Agility' },
  { key: 'statTotal', label: 'Total', align: 'right' },
  { key: 'lootSummary', label: 'Loot Drops' }
];

const TEMPLATE = /* html */ `
  <div>
    <header class="flex flex-column flex-row-ns items-end-ns justify-between mb4">
      <div class="mb3 mb0-ns">
        <h1 class="f3 fw8 ma0 near-white flex items-center">
          <img
            :src="MONSTER_MANAGER_ICON"
            alt="Monsters"
            class="mr2 dib v-mid flex-shrink-0 pixelated icon-24"
          />
          <span>Monsterpedia</span>
        </h1>
        <p class="f6 silver mt1 mb0">
          Showing {{ filteredMonsters.length }} of {{ db.monsters.length }} monsters
        </p>
      </div>

      <div class="flex flex-wrap items-center">
        <input
          v-model="searchQuery"
          type="search"
          class="input-reset bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 mr2 mb2 mb0-ns w5-ns"
          placeholder="Search name, loot, description..."
          aria-label="Search monsters"
        />

        <select
          v-model="selectedElement"
          class="bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 mr2 mb2 mb0-ns"
          aria-label="Filter by element"
        >
          <option v-for="el in availableElements" :key="el" :value="el">
            {{ el === 'ALL' ? 'All Elements' : el }}
          </option>
        </select>

        <select
          v-model="selectedAttackType"
          class="bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6 mr2 mb2 mb0-ns"
          aria-label="Filter by attack type"
        >
          <option v-for="atk in availableAttackTypes" :key="atk" :value="atk">
            {{ atk === 'ALL' ? 'All Attack Types' : atk }}
          </option>
        </select>

        <select
          v-model="selectedTier"
          class="bg-dark-gray near-white ba b--white-20 br2 pa2 ph3 f6"
          aria-label="Filter by tier"
        >
          <option v-for="t in availableTiers" :key="t" :value="t">
            {{ t === 'ALL' ? 'All Tiers' : 'Tier ' + t }}
          </option>
        </select>
      </div>
    </header>

    <SortableTable
      :rows="filteredMonsters"
      :columns="COLUMNS"
      empty-message="No monsters match your current filter criteria."
    >
      <template #row="{ row: monster }">
        <td class="pa3">
          <div class="flex items-center">
            <img
              :src="monster.profileImage"
              :alt="monster.name"
              class="icon-32 br2 bg-near-black ba b--white-10 mr3 flex-shrink-0 pixelated"
              loading="lazy"
            />
            <div>
              <RouterLink
                :to="'/monsters/' + monster.id"
                class="link b near-white hover-light-purple db"
              >
                {{ monster.name }}
              </RouterLink>
              <div class="f7 gray code">{{ monster.id }}</div>
            </div>
          </div>
        </td>
        <td class="pa3">
          <TypeBadge :type="monster.element" />
        </td>
        <td class="pa3 silver">
          <TypeBadge :type="monster.attackType" :pill="false" />
        </td>
        <td class="pa3 tc">
          <span
            class="dib ph2 pv1 br-pill f7 bg-mid-gray near-white ba b--white-20 nowrap"
            :title="'Tier ' + monster.tier"
          >
            {{ '⭐'.repeat(monster.tier) }}
          </span>
        </td>
        <td class="pa3 tr b near-white">{{ monster.health }}</td>
        <td class="pa3 tr b near-white">{{ monster.soul }}</td>
        <td class="pa3 tr b near-white">{{ monster.strength }}</td>
        <td class="pa3 tr b near-white">{{ monster.defense }}</td>
        <td class="pa3 tr b near-white">{{ monster.mind }}</td>
        <td class="pa3 tr b near-white">{{ monster.agility }}</td>
        <td class="pa3 tr b light-purple">{{ monster.statTotal }}</td>
        <td class="pa3">
          <div v-if="monster.loots.length > 0" class="flex flex-wrap">
            <ItemChip
              v-for="loot in monster.loots"
              :key="loot.rarity + '_' + loot.item.id"
              :item-id="loot.item.id"
              :name="loot.item.name"
              :rarity="loot.rarity"
            />
          </div>
        </td>
      </template>
    </SortableTable>
  </div>
`;

export const MonsterTable = defineComponent({
  name: 'MonsterTable',
  components: { SortableTable, TypeBadge, ItemChip },
  setup() {
    const searchQuery = ref('');
    const selectedElement = ref('ALL');
    const selectedAttackType = ref('ALL');
    const selectedTier = ref('ALL');

    const availableElements = computed(() => {
      const elements = new Set(db.monsters.map((m) => m.element));
      return ['ALL', ...Array.from(elements).sort()];
    });

    const availableAttackTypes = computed(() => {
      const types = new Set(db.monsters.map((m) => m.attackType));
      return ['ALL', ...Array.from(types).sort()];
    });

    const availableTiers = computed(() => {
      const tiers = new Set(db.monsters.map((m) => m.tier));
      return ['ALL', ...Array.from(tiers).sort((a, b) => a - b).map(String)];
    });

    const filteredMonsters = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      return db.monsters.filter((m) => {
        const matchesElement =
          selectedElement.value === 'ALL' || m.element === selectedElement.value;
        const matchesAttack =
          selectedAttackType.value === 'ALL' ||
          m.attackType === selectedAttackType.value;
        const matchesTier =
          selectedTier.value === 'ALL' || String(m.tier) === selectedTier.value;
        const matchesQuery =
          !query ||
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.passive.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.lootSummary.toLowerCase().includes(query) ||
          m.element.toLowerCase().includes(query);
        return matchesElement && matchesAttack && matchesTier && matchesQuery;
      });
    });

    return {
      db,
      COLUMNS,
      searchQuery,
      selectedElement,
      selectedAttackType,
      selectedTier,
      availableElements,
      availableAttackTypes,
      availableTiers,
      filteredMonsters,
      MONSTER_MANAGER_ICON
    };
  },
  template: TEMPLATE
});
