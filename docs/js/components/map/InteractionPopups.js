// @ts-check
import { defineComponent, computed } from 'vue';
import { dbIndexes } from '../../store.js';
import { getItemIcon, getIcon } from '../../services/assets.js';
import {
  PopupShell,
  PopupSection,
  RowLink,
  resolveRecipe,
  resolveItemOrRecipe,
  resolveMonster
} from './PopupShell.js';

const COIN_ICON = getItemIcon('Coin');

// ==========================================
// 1. QuestPopup
// ==========================================
const QUEST_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="questTitle" :dialogue="questDialogue">
    <PopupSection v-if="questRequirements.length > 0" title="Requires:">
      <RowLink
        v-for="(req, idx) in questRequirements"
        :key="idx"
        :to="req.to"
        :icon="req.icon"
        :title="req.title"
      >
        <span class="f8 silver">&times;{{ req.amount }}</span>
      </RowLink>
    </PopupSection>
    <PopupSection v-if="questHasRewards" title="Rewards:">
      <div v-if="questExpReward" class="mb1">
        <span class="dib ph2 pv05 br-pill f8 b bg-purple-20 light-purple ba b--purple-30 mr1 mb1">
          +{{ questExpReward }} EXP
        </span>
      </div>
      <RowLink
        v-if="questRecipeReward"
        :to="questRecipeReward.to"
        :icon="questRecipeReward.icon"
        :title="questRecipeReward.title"
      >
        <span class="f7 light-blue">Recipe</span>
      </RowLink>
      <RowLink
        v-for="(rew, idx) in questResourceRewards"
        :key="idx"
        :to="rew.to"
        :icon="rew.icon"
        :title="rew.title"
      >
        <span class="f8 silver">&times;{{ rew.amount }}</span>
      </RowLink>
    </PopupSection>
  </PopupShell>
`;

export const QuestPopup = defineComponent({
  name: 'QuestPopup',
  components: { PopupShell, PopupSection, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const questInfo = computed(() => props.poi.properties.QuestInfo);
    const questTitle = computed(() =>
      questInfo.value?.Name ? 'Quest: ' + questInfo.value.Name : 'Quest NPC'
    );
    const questDialogue = computed(() => props.poi.properties.Text || questInfo.value?.Description || '');

    const questRequirements = computed(() => {
      const q = questInfo.value;
      if (!q) return [];
      /** @type {Array<{ to: string, icon: string, title: string, amount: number }>} */
      const list = [];
      const monsterReqs = q.MonsterRequierements || q.Monsters;
      if (Array.isArray(monsterReqs)) {
        for (const req of monsterReqs) {
          const m = resolveMonster(req.Key);
          list.push({
            to: m.to,
            icon: m.icon,
            title: m.name,
            amount: req.Value
          });
        }
      }
      const resourceReqs = q.ResourceRequierements || q.Resources;
      if (Array.isArray(resourceReqs)) {
        for (const req of resourceReqs) {
          list.push({
            ...resolveItemOrRecipe(req.Key),
            amount: req.Value
          });
        }
      }
      return list;
    });

    const questExpReward = computed(() => questInfo.value?.RewardEXP || questInfo.value?.Reward?.Exp || 0);
    const questRecipeReward = computed(() =>
      resolveRecipe(questInfo.value?.RewardRecipe || questInfo.value?.Reward?.Recipe)
    );

    const questResourceRewards = computed(() => {
      const res = questInfo.value?.RewardResources || questInfo.value?.Reward?.Resources;
      if (!Array.isArray(res)) return [];
      return res.map((/** @type {any} */ entry) => ({
        ...resolveItemOrRecipe(entry.Key),
        amount: entry.Value
      }));
    });

    const questHasRewards = computed(
      () =>
        questExpReward.value > 0 ||
        Boolean(questRecipeReward.value) ||
        questResourceRewards.value.length > 0
    );

    return {
      questTitle,
      questDialogue,
      questRequirements,
      questHasRewards,
      questExpReward,
      questRecipeReward,
      questResourceRewards
    };
  },
  template: QUEST_TEMPLATE
});

// ==========================================
// 2. ShopPopup
// ==========================================
const SHOP_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="Merchant Shop" :dialogue="poi.properties.Text">
    <div v-if="shopWares.length === 0" class="f7 gray">No wares listed.</div>
    <template v-else>
      <RowLink
        v-for="(ware, idx) in shopWares"
        :key="idx"
        :to="ware.to"
        :icon="ware.icon"
        :title="ware.title"
      >
        <span class="f7 b gold flex-shrink-0 inline-flex items-center">
          <img :src="COIN_ICON" class="pixelated icon-14 mr1 v-mid" alt="Coin" />
          {{ ware.price }}
        </span>
        <span v-if="ware.amount > 0" class="f8 gray ml1">(&times;{{ ware.amount }})</span>
      </RowLink>
    </template>
  </PopupShell>
`;

export const ShopPopup = defineComponent({
  name: 'ShopPopup',
  components: { PopupShell, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const shopWares = computed(() =>
      props.poi.shopItems.map((shopItem) => ({
        ...resolveItemOrRecipe(shopItem.itemId),
        price: shopItem.price,
        amount: shopItem.amount
      }))
    );

    return {
      COIN_ICON,
      shopWares
    };
  },
  template: SHOP_TEMPLATE
});

// ==========================================
// 3. ResourcePopup
// ==========================================
const RESOURCE_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="resourceTitle">
    <div v-if="resourceRequirements.length > 0" class="f7 silver mb2">
      <span class="b">Requires:</span>
      <span v-for="(req, idx) in resourceRequirements" :key="idx" class="dib mr2">
        {{ req.count }}&times;
        <img v-if="req.elemIcon" :src="req.elemIcon" class="pixelated icon-14 mr1 v-mid" :title="req.element" :alt="req.element" />
        <img v-if="req.atkIcon" :src="req.atkIcon" class="pixelated icon-14 mr1 v-mid" :title="req.attackType" :alt="req.attackType" />
        {{ req.label }}
      </span>
    </div>
    <div v-if="resourceDrops.length > 0">
      <RowLink
        v-for="(drop, idx) in resourceDrops"
        :key="idx"
        :to="'/items/' + drop.id"
        :icon="drop.icon"
        :title="drop.name"
      >
        <span v-if="drop.pool === 'Epic'" class="ph1 pv05 br-pill f8 b bg-purple-20 light-purple ba b--purple-30">Epic</span>
        <span v-else-if="drop.pool === 'Rare'" class="ph1 pv05 br-pill f8 b bg-navy light-blue ba b--light-blue-30">Rare</span>
        <span v-else class="ph1 pv05 br-pill f8 b bg-white-10 silver ba b--white-20">Base</span>
      </RowLink>
    </div>
    <div v-else class="f7 gray">Resource drops: {{ poi.label }}</div>
  </PopupShell>
`;

export const ResourcePopup = defineComponent({
  name: 'ResourcePopup',
  components: { PopupShell, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const currentResource = computed(() => dbIndexes.worldResources.get(props.poi.resourceTableKey));
    const resourceTitle = computed(
      () => (currentResource.value?.displayName || props.poi.label) + ' Node'
    );

    const resourceRequirements = computed(() => {
      const res = currentResource.value;
      if (!res) return [];
      return res.requirements.map((r) => {
        const hasElem = r.element && r.element !== 'Any';
        return {
          count: r.count,
          element: r.element,
          attackType: r.attackType,
          elemIcon: hasElem ? getIcon(r.element) : '',
          atkIcon: r.attackType ? getIcon(r.attackType) : '',
          label: [hasElem ? r.element : '', r.attackType].filter(Boolean).join(' ')
        };
      });
    });

    const resourceDrops = computed(() => {
      const res = currentResource.value;
      if (!res) return [];
      return res.drops.map((d) => ({
        id: d.item.id,
        name: d.item.name,
        icon: d.item.icon,
        pool: d.pool
      }));
    });

    return {
      resourceTitle,
      resourceRequirements,
      resourceDrops
    };
  },
  template: RESOURCE_TEMPLATE
});

// ==========================================
// 4. ChestPopup
// ==========================================
const CHEST_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="World Chest">
    <div v-if="chestItems.length === 0" class="f7 gray">Empty or dynamic loot pool.</div>
    <template v-else>
      <RowLink
        v-for="(item, idx) in chestItems"
        :key="idx"
        :to="item.to"
        :icon="item.icon"
        :title="item.title"
      >
        <span class="f7 b gold">&times;{{ item.amount }}</span>
      </RowLink>
    </template>
  </PopupShell>
`;

export const ChestPopup = defineComponent({
  name: 'ChestPopup',
  components: { PopupShell, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const chestItems = computed(() =>
      (props.poi.properties.ItemPool || []).map((/** @type {any} */ entry) => ({
        ...resolveItemOrRecipe(entry.Key),
        amount: entry.Value
      }))
    );

    return {
      chestItems
    };
  },
  template: CHEST_TEMPLATE
});

// ==========================================
// 5. RecipePopup
// ==========================================
const RECIPE_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="Recipe Pickup" :dialogue="poi.properties.Text">
    <RowLink
      v-if="resolvedRecipe"
      :to="resolvedRecipe.to"
      :icon="resolvedRecipe.icon"
      :title="resolvedRecipe.title"
    >
      <span :class="resolvedRecipe.badgeClass">{{ resolvedRecipe.badgeText }}</span>
    </RowLink>
    <div v-else class="f7 gray">Recipe: {{ poi.properties.Recipe }}</div>
  </PopupShell>
`;

export const RecipePopup = defineComponent({
  name: 'RecipePopup',
  components: { PopupShell, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const resolvedRecipe = computed(() => resolveRecipe(props.poi.properties.Recipe));

    return {
      resolvedRecipe
    };
  },
  template: RECIPE_TEMPLATE
});

// ==========================================
// 6. ObeliskPopup
// ==========================================
const OBELISK_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="EXP Obelisk" :dialogue="poi.properties.Text">
    <div class="mb1">
      <span class="dib ph2 pv05 br-pill f7 b bg-purple-20 light-purple ba b--purple-30">
        +{{ poi.properties.Exp || 0 }} EXP
      </span>
    </div>
  </PopupShell>
`;

export const ObeliskPopup = defineComponent({
  name: 'ObeliskPopup',
  components: { PopupShell },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  template: OBELISK_TEMPLATE
});

// ==========================================
// 7. NpcPopup
// ==========================================
const NPC_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="Dialogue NPC" :dialogue="npcDialogue">
    <PopupSection v-if="npcRecipeReward || npcItemGifts.length > 0" title="Rewards:">
      <RowLink
        v-if="npcRecipeReward"
        :to="npcRecipeReward.to"
        :icon="npcRecipeReward.icon"
        :title="npcRecipeReward.title"
      >
        <span :class="npcRecipeReward.badgeClass">{{ npcRecipeReward.badgeText }}</span>
      </RowLink>
      <RowLink
        v-for="(item, idx) in npcItemGifts"
        :key="idx"
        :to="item.to"
        :icon="item.icon"
        :title="item.title"
      >
        <span class="f7 b gold">&times;{{ item.amount }}</span>
      </RowLink>
    </PopupSection>
  </PopupShell>
`;

export const NpcPopup = defineComponent({
  name: 'NpcPopup',
  components: { PopupShell, PopupSection, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const npcDialogue = computed(
      () => props.poi.properties.Text || props.poi.properties.SecondText || ''
    );
    const npcRecipeReward = computed(() => resolveRecipe(props.poi.properties.Recipe));
    const npcItemGifts = computed(() =>
      (props.poi.properties.ItemPool || []).map((/** @type {any} */ entry) => ({
        ...resolveItemOrRecipe(entry.Key),
        amount: entry.Value
      }))
    );

    return {
      npcDialogue,
      npcRecipeReward,
      npcItemGifts
    };
  },
  template: NPC_TEMPLATE
});

// ==========================================
// 8. GeneralPopup (Inns, Towers, Ferries, Exits, and Fallbacks)
// ==========================================
const GENERAL_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="generalTitle" :dialogue="poi.properties.Text" />
`;

export const GeneralPopup = defineComponent({
  name: 'GeneralPopup',
  components: { PopupShell },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const generalTitle = computed(() => {
      const p = props.poi;
      switch (p.category) {
        case 'tower':
          return 'Alchemist Tower';
        case 'inn':
          return 'Innkeeper / Rest Point';
        case 'ferry':
          return p.type.includes('Baq') ? 'Baq Ferry Navigator' : 'Island Ferry Navigator';
        case 'spring':
          return p.type === 'BP_Spring_Target_C' ? 'Spring Target' : 'Launch Spring';
        case 'arcane':
          if (p.type === 'BP_ArcaneEye_C') return 'Arcane Eye';
          if (p.type === 'BP_ArcaneTrigger_C') return 'Arcane Trigger';
          if (p.type === 'BP_ArcaneCube_C') return 'Arcane Cube';
          if (p.type === 'BP_ArcaneObject_Bridge_C') return 'Arcane Bridge';
          if (p.type === 'BP_ArcaneObject_Door_C') return 'Arcane Door';
          if (p.type === 'BP_ForgottenKingdomDoor_C') return 'Forgotten Kingdom Door';
          return 'Arcane Puzzle';
        default:
          return p.label;
      }
    });

    return {
      generalTitle
    };
  },
  template: GENERAL_TEMPLATE
});
