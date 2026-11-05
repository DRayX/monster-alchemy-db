// @ts-check
import { defineComponent, computed } from 'vue';
import { SpawnerPopup, DungeonPopup, ColiseumPopup, BattlePopup } from './EncounterPopups.js';
import {
  QuestPopup,
  ShopPopup,
  ResourcePopup,
  ChestPopup,
  RecipePopup,
  ObeliskPopup,
  GeneralPopup
} from './InteractionPopups.js';

/** @type {Record<string, any>} */
const CATEGORY_COMPONENTS = {
  spawner: SpawnerPopup,
  dungeon: DungeonPopup,
  coliseum: ColiseumPopup,
  battle: BattlePopup,
  resource: ResourcePopup,
  foliage: ResourcePopup,
  shop: ShopPopup,
  quest: QuestPopup,
  chest: ChestPopup,
  recipe: RecipePopup,
  obelisk: ObeliskPopup
};

const TEMPLATE = /* html */ `
  <component :is="activeComponent" :poi="poi" />
`;

export const WorldMapPopup = defineComponent({
  name: 'WorldMapPopup',
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const activeComponent = computed(() => CATEGORY_COMPONENTS[props.poi.category] || GeneralPopup);

    return {
      activeComponent
    };
  },
  template: TEMPLATE
});
