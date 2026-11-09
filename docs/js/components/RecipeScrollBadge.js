// @ts-check
import { defineComponent, computed, ref } from 'vue';
import {
  SCROLL_ICON,
  SHOP_ICON,
  QUEST_ICON,
  DIALOGUE_ICON,
  FIGHT_ICON,
  DUNGEON_ICON,
  TOWER_ICON,
  getItemIcon,
  getRoomIcon
} from '../services/assets.js';

const COIN_ICON = getItemIcon('Coin');

const TEMPLATE = /* html */ `
  <span
    v-if="unlock"
    ref="triggerRef"
    class="dib inline-flex items-center"
    :class="customClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <component
      :is="unlock.to ? 'RouterLink' : 'span'"
      :to="unlock.to"
      class="dib flex-shrink-0"
      :class="{ 'link dim pointer': unlock.to }"
      :aria-label="sourceInfo.title"
      @click="onClick"
    >
      <img :src="SCROLL_ICON" alt="Recipe Scroll" class="pixelated v-mid" :class="iconSizeClass" />
    </component>

    <teleport to="body">
      <div
        v-if="isHovered && unlock"
        :style="popupStyle"
        class="bg-near-black ba b--white-20 br2 pa3 near-white f7"
        style="box-shadow: 0 8px 24px rgba(0,0,0,0.85); line-height: 1.4;"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb2 pb1 bb b--white-10">
          <div class="flex items-center">
            <img :src="sourceInfo.icon" class="icon-16 pixelated mr2 flex-shrink-0" alt="" />
            <span class="b" :class="sourceInfo.colorClass">{{ sourceInfo.title }}</span>
          </div>
          <div class="flex items-center flex-shrink-0">
            <span
              v-if="unlock.poi?.isNightOnly"
              class="f8 bg-dark-blue washed-blue ph1 pv05 br-pill b dib ml1"
            >
              🌙 Night Only
            </span>
            <span
              v-if="unlock.poi?.isHidden"
              class="f8 bg-dark-red washed-red ph1 pv05 br-pill b dib ml1"
            >
              Hidden
            </span>
          </div>
        </div>

        <!-- Shop -->
        <div v-if="unlock.type === 'shop'" class="mb2">
          <div class="b gold inline-flex items-center">
            <img :src="COIN_ICON" class="icon-14 pixelated mr1 v-mid" alt="Coin" />
            {{ unlock.price ?? 0 }} Coins
          </div>
        </div>

        <!-- Tower Room -->
        <div v-else-if="unlock.type === 'tower_room'" class="mb2">
          <div class="flex items-center mb1">
            <img
              v-if="roomIcon"
              :src="roomIcon"
              class="icon-24 pixelated mr2 br1 bg-black-40 ba b--white-10 pa05 flex-shrink-0"
              alt=""
            />
            <div>
              <div class="b near-white">{{ unlock.roomName }}</div>
              <div class="f8 silver">Alchemist Tower</div>
            </div>
          </div>
          <div class="f8 silver">Available once this room is built in the tower.</div>
        </div>

        <!-- Quest -->
        <div v-else-if="unlock.type === 'quest'" class="mb2">
          <div v-if="questName" class="b light-blue mb1">{{ questName }}</div>
          <div class="silver">Reward for completing quest.</div>
        </div>

        <!-- Battle -->
        <div v-else-if="unlock.type === 'battle'" class="mb2 silver">
          Reward for winning battle encounter.
        </div>

        <!-- NPC -->
        <div v-else-if="unlock.type === 'npc'" class="mb2 silver">
          Gift from talking to NPC.
        </div>

        <!-- Coliseum -->
        <div v-else-if="unlock.type === 'coliseum'" class="mb2 silver">
          Rewarded for completing Coliseum arena challenges.
        </div>

        <!-- Dungeon -->
        <div v-else-if="unlock.type === 'dungeon'" class="mb2 silver">
          Reward for completing {{ unlock.dungeonName || 'dungeon' }}.
        </div>

        <!-- Cinematic -->
        <div v-else-if="unlock.type === 'cinematic'" class="mb2 silver">
          Reward during cutscene.
        </div>

        <!-- Starting -->
        <div v-else-if="unlock.type === 'starting'" class="mb2 silver">
          Unlocked by default at the start of the game.
        </div>

        <!-- Ground Scroll / Recipe -->
        <div v-else class="mb2 silver">
          Recipe scroll on the ground.
          <div v-if="unlock.poi?.isHidden" class="f8 yellow mt1">Hidden until discovered in-game.</div>
        </div>

        <!-- Coordinates if available -->
        <div v-if="coordinatesText" class="f8 gray code mt1">
          📍 {{ coordinatesText }}
        </div>

        <!-- Footer action hint -->
        <div
          v-if="actionHint"
          class="mt2 pt2 bt b--white-10 f8 flex items-center justify-between"
          :class="actionColorClass"
        >
          <span>{{ actionHint }}</span>
          <span class="f7">&rarr;</span>
        </div>
      </div>
    </teleport>
  </span>
`;

export const RecipeScrollBadge = defineComponent({
  name: 'RecipeScrollBadge',
  props: {
    unlock: {
      /** @type {import('vue').PropType<import('../types.js').RecipeUnlock | null | undefined>} */
      type: Object,
      default: null
    },
    size: {
      type: Number,
      default: 16
    },
    customClass: {
      type: String,
      default: 'ml2'
    }
  },
  setup(props) {
    const iconSizeClass = computed(() => `icon-${props.size}`);
    const isHovered = ref(false);
    /** @type {import('vue').Ref<HTMLElement | null>} */
    const triggerRef = ref(null);
    /** @type {import('vue').Ref<Record<string, string>>} */
    const popupStyle = ref({});

    const sourceInfo = computed(() => {
      const u = props.unlock;
      if (!u) return { icon: SCROLL_ICON, title: 'Recipe', colorClass: 'light-purple' };
      switch (u.type) {
        case 'shop':
          return { icon: SHOP_ICON, title: 'Merchant Shop', colorClass: 'gold' };
        case 'quest':
          return { icon: QUEST_ICON, title: 'Quest Reward', colorClass: 'light-blue' };
        case 'battle':
          return { icon: FIGHT_ICON, title: 'Battle Reward', colorClass: 'light-red' };
        case 'npc':
          return { icon: DIALOGUE_ICON, title: 'NPC Gift', colorClass: 'light-blue' };
        case 'coliseum':
          return { icon: FIGHT_ICON, title: 'Coliseum Reward', colorClass: 'gold' };
        case 'dungeon':
          return { icon: DUNGEON_ICON, title: 'Dungeon Reward', colorClass: 'light-red' };
        case 'cinematic':
          return { icon: QUEST_ICON, title: 'Cutscene Reward', colorClass: 'light-purple' };
        case 'tower_room':
          return {
            icon: u.roomId ? getRoomIcon(u.roomId) : TOWER_ICON,
            title: 'Alchemist Tower',
            colorClass: 'light-purple'
          };
        case 'starting':
          return { icon: SCROLL_ICON, title: 'Starter Recipe', colorClass: 'silver' };
        case 'recipe':
        default:
          return { icon: SCROLL_ICON, title: 'Overworld Scroll', colorClass: 'light-blue' };
      }
    });

    const questName = computed(() => {
      const qInfo = props.unlock?.poi?.properties?.QuestInfo;
      if (!qInfo?.Name) return '';
      return qInfo.Name.startsWith('Quest') ? qInfo.Name : `Quest: ${qInfo.Name}`;
    });

    const coordinatesText = computed(() => {
      const loc = props.unlock?.poi?.location;
      if (!loc) return '';
      return `X: ${Math.round(loc.x)}, Y: ${Math.round(loc.y)}`;
    });

    const roomIcon = computed(() => {
      if (props.unlock?.type === 'tower_room' && props.unlock.roomId) {
        return getRoomIcon(props.unlock.roomId);
      }
      return '';
    });

    const actionHint = computed(() => {
      const to = props.unlock?.to;
      if (!to) return '';
      if (to.startsWith('/map')) return 'Click to view on Map';
      if (to.startsWith('/rooms')) return 'Click to view Room';
      return 'Click to view details';
    });

    const actionColorClass = computed(() => {
      const to = props.unlock?.to;
      if (to?.startsWith('/map')) return 'light-blue';
      if (to?.startsWith('/rooms')) return 'light-purple';
      return 'silver';
    });

    function updatePosition() {
      if (!triggerRef.value) return;
      const rect = triggerRef.value.getBoundingClientRect();
      const width = 250;

      let left = rect.left + rect.width / 2 - width / 2;
      if (left < 12) left = 12;
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }

      const placeAbove = rect.top > 160;
      const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

      popupStyle.value = {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        transform: placeAbove ? 'translateY(-100%)' : 'none',
        width: `${width}px`,
        zIndex: '9999',
        pointerEvents: 'none'
      };
    }

    function onMouseEnter() {
      if (!props.unlock) return;
      updatePosition();
      isHovered.value = true;
    }

    function onMouseLeave() {
      isHovered.value = false;
    }

    function onClick() {
      isHovered.value = false;
    }

    return {
      SCROLL_ICON,
      COIN_ICON,
      iconSizeClass,
      isHovered,
      triggerRef,
      popupStyle,
      sourceInfo,
      questName,
      coordinatesText,
      roomIcon,
      actionHint,
      actionColorClass,
      onMouseEnter,
      onMouseLeave,
      onClick
    };
  },
  template: TEMPLATE
});
