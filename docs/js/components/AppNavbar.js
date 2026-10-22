// @ts-check
import { defineComponent, ref, computed } from 'vue';
import { db } from '../store.js';
import {
  MONSTER_MANAGER_ICON,
  PLAYER_ICON,
  TOWER_ICON,
  SHOP_ICON
} from '../services/assets.js';
import buildInfo from '../../meta/build_info.json' with { type: 'json' };

/** SteamDB build ID for current game data snapshot. */
export const DATA_BUILD_ID = buildInfo.buildId || 'Unknown';

const TEMPLATE = /* html */ `
  <aside class="w5 vh-100 bg-dark-gray br b--white-10 flex flex-column justify-between flex-shrink-0">
    <!-- Header / Brand -->
    <div class="pa3 bb b--white-10 flex-shrink-0">
      <RouterLink to="/" class="flex items-center link near-white dim">
        <img
          :src="PLAYER_ICON"
          alt="Monster Alchemy"
          class="icon-32 mr3 dib v-mid flex-shrink-0 pixelated"
        />
        <div>
          <div class="b f5 tracked-tight">Monster Alchemy</div>
          <div class="f7 silver ttu tracked">Database</div>
        </div>
      </RouterLink>
    </div>

    <!-- Navigation Links -->
    <nav class="pa3 flex-auto overflow-y-auto" aria-label="Main Navigation">
      <div class="f7 b silver ttu tracked mb2 ph2">CODEX</div>

      <RouterLink
        to="/"
        exact-active-class="bg-purple white b"
        active-class=""
        class="flex items-center pa2 ph3 br2 link near-white hover-bg-black-30 mb1"
      >
        <img
          :src="TOWER_ICON"
          alt="Home"
          class="mr2 dib v-mid flex-shrink-0 pixelated icon-18"
        />
        <span class="flex-auto f6">Home</span>
      </RouterLink>

      <RouterLink
        to="/monsters"
        active-class="bg-purple white b"
        class="flex items-center pa2 ph3 br2 link near-white hover-bg-black-30 mb1"
      >
        <img
          :src="MONSTER_MANAGER_ICON"
          alt="Monsters"
          class="mr2 dib v-mid flex-shrink-0 pixelated icon-18"
        />
        <span class="flex-auto f6">Monsters</span>
        <span class="f7 bg-black-40 near-white ph2 pv1 br-pill ba b--white-20">
          {{ db.monsters.length }}
        </span>
      </RouterLink>

      <RouterLink
        to="/items"
        active-class="bg-purple white b"
        class="flex items-center pa2 ph3 br2 link near-white hover-bg-black-30 mb1"
      >
        <img
          :src="SHOP_ICON"
          alt="Items"
          class="mr2 dib v-mid flex-shrink-0 pixelated icon-18"
        />
        <span class="flex-auto f6">Items</span>
        <span class="f7 bg-black-40 near-white ph2 pv1 br-pill ba b--white-20">
          {{ db.items.length }}
        </span>
      </RouterLink>

      <!-- Crafting Rooms Section -->
      <div class="mt3 pt2 bt b--white-10">
        <button
          type="button"
          @click="toggleRoomsSection"
          class="w-100 bn bg-transparent flex items-center justify-between pa2 ph2 f7 b silver ttu tracked pointer hover-white"
        >
          <span>CRAFTING ROOMS</span>
          <span>{{ roomsExpanded ? '▾' : '▸' }}</span>
        </button>

        <div v-if="roomsExpanded" class="pl2 mt1 bl b--white-10 ml2">
          <RouterLink
            v-for="room in craftingRooms"
            :key="room.id"
            :to="'/rooms/' + room.id"
            active-class="bg-purple white b"
            class="flex items-center pa2 ph3 br2 link near-white hover-bg-black-30 mb1"
          >
            <img
              :src="room.icon"
              :alt="room.name"
              class="mr2 dib v-mid flex-shrink-0 pixelated icon-18"
            />
            <span class="flex-auto f6">{{ room.name }}</span>
            <span class="f7 bg-black-40 near-white ph2 pv1 br-pill ba b--white-20">
              {{ room.totalRecipeCount }}
            </span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="pa3 bt b--white-10 flex-shrink-0">
      <div class="f7 silver lh-copy">
        <span>Data Build ID: </span>
        <a
          :href="steamDbUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="link light-purple hover-washed-purple underline"
        >
          {{ DATA_BUILD_ID }}
        </a>
      </div>
    </div>
  </aside>
`;

export const AppNavbar = defineComponent({
  name: 'AppNavbar',
  template: TEMPLATE,
  setup() {
    const roomsExpanded = ref(true);
    const steamDbUrl = `https://steamdb.info/patchnotes/${DATA_BUILD_ID}/`;

    const craftingRooms = computed(() =>
      db.rooms.filter((r) => r.totalRecipeCount > 0)
    );

    function toggleRoomsSection() {
      roomsExpanded.value = !roomsExpanded.value;
    }

    return {
      db,
      craftingRooms,
      roomsExpanded,
      MONSTER_MANAGER_ICON,
      PLAYER_ICON,
      TOWER_ICON,
      SHOP_ICON,
      DATA_BUILD_ID,
      steamDbUrl,
      toggleRoomsSection
    };
  }
});
