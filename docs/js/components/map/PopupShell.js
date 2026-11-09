// @ts-check
import { defineComponent, computed } from 'vue';
import { dbIndexes } from '../../store.js';
import {
  CATEGORY_COLORS,
  renderIconHtml,
  getPoiCustomIcon,
  resolveRecipe
} from '../../services/mapUtils.js';

export const RowLink = defineComponent({
  name: 'RowLink',
  props: {
    to: { type: String, required: true },
    icon: { type: String, default: '' },
    title: { type: String, required: true }
  },
  template: /* html */ `
    <RouterLink :to="to" class="flex items-center link near-white hover-bg-white-10 pa1 br2 mb1">
      <img v-if="icon" :src="icon" class="icon-24 pixelated mr2 flex-shrink-0" alt="" />
      <span class="flex-auto f7 b">{{ title }}</span>
      <slot />
    </RouterLink>
  `
});

export const MonsterAvatar = defineComponent({
  name: 'MonsterAvatar',
  props: {
    id: { type: String, required: true },
    icon: { type: String, required: true },
    title: { type: String, required: true },
    rarity: { type: String, default: '' }
  },
  computed: {
    borderClass() {
      if (this.rarity === 'Epic') return 'ba bw1 b--light-purple';
      if (this.rarity === 'Rare') return 'ba bw1 b--light-blue';
      return 'ba b--white-30';
    }
  },
  template: /* html */ `
    <RouterLink :to="'/monsters/' + id" class="link dim dib mr1 mb1" :title="title">
      <img :src="icon" class="pixelated icon-24 br2 bg-near-black v-mid" :class="borderClass" :alt="title" />
    </RouterLink>
  `
});

export const PopupSection = defineComponent({
  name: 'PopupSection',
  props: {
    title: { type: String, default: '' }
  },
  template: /* html */ `
    <div class="mt2">
      <div v-if="title || $slots.title" class="f7 silver mb1">
        <slot name="title"><span class="b">{{ title }}</span></slot>
      </div>
      <slot />
    </div>
  `
});

/**
 * Resolves an item ID or recipe key into standardized display properties for loot/wares rows.
 * @param {string} id
 */
export function resolveItemOrRecipe(id) {
  const recipe = resolveRecipe(id);
  if (recipe) {
    return { to: recipe.to, icon: recipe.icon, title: recipe.title, isRecipe: true };
  }
  const item = dbIndexes.items.get(id);
  return {
    to: `/items/${item ? item.id : id}`,
    icon: item?.icon || '',
    title: item?.name || id,
    isRecipe: false
  };
}

/**
 * Resolves a monster ID into standardized display properties.
 * @param {string} id
 */
export function resolveMonster(id) {
  const monster = dbIndexes.monsters.get(id);
  return {
    id: monster ? monster.id : id,
    to: `/monsters/${monster ? monster.id : id}`,
    name: monster ? monster.name : id,
    icon: monster?.profileImage || ''
  };
}

/**
 * @typedef {object} FormattedCombatant
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} title
 * @property {number} level
 * @property {boolean} isBoss
 */

/**
 * Normalizes combatant members into standardized combatant display objects in O(1).
 * @param {import('../../types.js').WorldBattleMember[]} [team]
 * @returns {FormattedCombatant[]}
 */
export function formatBattleTeam(team) {
  if (!Array.isArray(team)) return [];
  return team.map((m) => {
    const resolved = resolveMonster(m.monsterId);
    const level = m.level ?? 0;
    return {
      id: resolved.id,
      name: resolved.name,
      icon: resolved.icon,
      title: `${resolved.name} • Lv. ${level}`,
      level,
      isBoss: m.isBoss
    };
  });
}

const TEMPLATE = /* html */ `
  <div style="min-width: 240px; max-width: 320px;">
    <!-- Popup Header -->
    <div class="f6 b mb1 flex items-center" :class="headerColorClass">
      <span v-if="headerIconHtml" class="mr1 flex items-center" v-html="headerIconHtml"></span>
      <span>{{ popupTitle }}</span>
    </div>
    <div class="f7 silver mb2">{{ poi.label }}</div>
    <div v-if="poi.isNightOnly || poi.isHidden" class="mb2 flex items-center flex-wrap">
      <span v-if="poi.isNightOnly" class="f8 bg-dark-blue washed-blue ph2 pv1 br-pill b dib mr1 mb1">
        🌙 Night Only
      </span>
      <span v-if="poi.isHidden" class="f8 bg-dark-red washed-red ph2 pv1 br-pill b dib mr1 mb1">
        Hidden
      </span>
    </div>

    <!-- Scrollable Content Body -->
    <div class="overflow-y-auto thin-scrollbar pr1" style="max-height: 200px;">
      <slot name="dialogue">
        <div v-if="dialogueText" class="f7 silver i mb2" v-html="dialogueText"></div>
      </slot>
      <slot />
    </div>
  </div>
`;

export const PopupShell = defineComponent({
  name: 'PopupShell',
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    },
    title: { type: String, default: '' },
    colorClass: { type: String, default: '' },
    customIcon: { type: String, default: '' },
    dialogue: { type: String, default: '' }
  },
  setup(props) {
    const headerColorClass = computed(() => props.colorClass || CATEGORY_COLORS[props.poi.category]);

    const headerIconHtml = computed(() => {
      const icon = props.customIcon || getPoiCustomIcon(props.poi);
      return renderIconHtml(props.poi.category, icon, 'icon-16');
    });

    const dialogueText = computed(() => {
      if (!props.dialogue) return '';
      const trimmed = props.dialogue.trim();
      if (
        trimmed.startsWith('"') ||
        trimmed.startsWith('“') ||
        trimmed.startsWith('&ldquo;') ||
        trimmed.startsWith('&quot;')
      ) {
        return trimmed;
      }
      return `"${trimmed}"`;
    });

    const popupTitle = computed(() => props.title || props.poi.label);

    return {
      headerColorClass,
      headerIconHtml,
      popupTitle,
      dialogueText
    };
  },
  template: TEMPLATE
});
