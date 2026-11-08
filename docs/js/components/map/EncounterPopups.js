// @ts-check
import { defineComponent, computed } from 'vue';
import { dbIndexes } from '../../store.js';
import { getReferencedPoiId, getSpawnerEncounters, getPoiLocationId } from '../../services/mapUtils.js';
import {
  PopupShell,
  PopupSection,
  RowLink,
  MonsterAvatar,
  resolveRecipe,
  resolveMonster,
  formatBattleTeam
} from './PopupShell.js';

// ==========================================
// 1. SpawnerPopup
// ==========================================
const SPAWNER_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="poi.tag || poi.label">
    <div v-if="totalEncounters === 0" class="f7 silver i">No encounters recorded for this spawner.</div>
    <template v-else>
      <PopupSection v-if="dayEncounters.length > 0">
        <template #title>
          <span class="dib br-pill f8 b mr1 ph1 pv0 bg-gold-20 gold ba b--gold-30">☀️ Day</span>
          <span class="b">Encounters{{ levelLabel ? ' (' + levelLabel + ')' : '' }}:</span>
        </template>
        <div class="flex flex-wrap items-center">
          <MonsterAvatar
            v-for="enc in dayEncounters"
            :key="enc.monster.id"
            :id="enc.monster.id"
            :icon="enc.monster.profileImage"
            :title="enc.monster.name + ' • ' + enc.spawn.rarity"
            :rarity="enc.spawn.rarity"
          />
        </div>
      </PopupSection>
      <PopupSection v-if="nightEncounters.length > 0">
        <template #title>
          <span class="dib br-pill f8 b mr1 ph1 pv0 bg-dark-blue light-blue ba b--light-blue-20">🌙 Night</span>
          <span class="b">Encounters:</span>
        </template>
        <div class="flex flex-wrap items-center">
          <MonsterAvatar
            v-for="enc in nightEncounters"
            :key="enc.monster.id"
            :id="enc.monster.id"
            :icon="enc.monster.profileImage"
            :title="enc.monster.name + ' • ' + enc.spawn.rarity"
            :rarity="enc.spawn.rarity"
          />
        </div>
      </PopupSection>
    </template>
  </PopupShell>
`;

export const SpawnerPopup = defineComponent({
  name: 'SpawnerPopup',
  components: { PopupShell, PopupSection, MonsterAvatar },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const encounters = computed(() => getSpawnerEncounters(props.poi.tag));
    const totalEncounters = computed(() => encounters.value.length);

    const levelLabel = computed(() => {
      const first = encounters.value[0]?.spawn;
      if (!first) return '';
      const minLv = first.minLevel ?? 1;
      const maxLv = first.maxLevel ?? minLv;
      return minLv === maxLv ? `Lv. ${minLv}` : `Lv. ${minLv}–${maxLv}`;
    });

    const dayEncounters = computed(() => encounters.value.filter((e) => e.spawn.timeOfDay === 'Day'));
    const nightEncounters = computed(() => encounters.value.filter((e) => e.spawn.timeOfDay === 'Night'));

    return {
      totalEncounters,
      levelLabel,
      dayEncounters,
      nightEncounters
    };
  },
  template: SPAWNER_TEMPLATE
});

// ==========================================
// 2. DungeonPopup
// ==========================================
const DUNGEON_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="dungeonTitle">
    <div v-if="dungeonDepth" class="f7 silver mb2"><span class="b">{{ dungeonDepth.label }}:</span> {{ dungeonDepth.count }}</div>
    <RowLink
      v-if="dungeonBoss"
      :to="'/monsters/' + dungeonBoss.id"
      :icon="dungeonBoss.icon"
      :title="dungeonBoss.name"
    >
      <span class="f8 b washed-red bg-dark-red ph1 pv05 br-pill ba b--red-30">
        👑 Boss{{ dungeonBoss.level > 0 ? ' Lv. ' + dungeonBoss.level : '' }}
      </span>
    </RowLink>
    <PopupSection v-if="dungeonRewardRecipe" title="Reward:">
      <RowLink
        :to="dungeonRewardRecipe.to"
        :icon="dungeonRewardRecipe.icon"
        :title="dungeonRewardRecipe.title"
      >
        <span class="f7 light-blue">Recipe</span>
      </RowLink>
    </PopupSection>
    <PopupSection v-if="dungeonSpawns.length > 0" :title="'Encounters' + (dungeonLevelLabel ? ' (' + dungeonLevelLabel + ')' : '') + ':'">
      <div class="flex flex-wrap items-center">
        <MonsterAvatar
          v-for="enc in dungeonSpawns"
          :key="enc.monster.id"
          :id="enc.monster.id"
          :icon="enc.monster.profileImage"
          :title="enc.monster.name + ' • ' + enc.spawn.rarity"
          :rarity="enc.spawn.rarity"
        />
      </div>
    </PopupSection>
    <PopupSection v-else-if="dungeonPoolMonsters.length > 0" title="Encounters:">
      <div class="flex flex-wrap items-center">
        <MonsterAvatar
          v-for="m in dungeonPoolMonsters"
          :key="m.id"
          :id="m.id"
          :icon="m.icon"
          :title="m.name"
        />
      </div>
    </PopupSection>
  </PopupShell>
`;

export const DungeonPopup = defineComponent({
  name: 'DungeonPopup',
  components: { PopupShell, PopupSection, RowLink, MonsterAvatar },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const dungeonManager = computed(() => {
      const targetId = getReferencedPoiId(props.poi.properties.DungeonRef);
      return dbIndexes.worldPois.get(targetId);
    });

    const dungeonTitle = computed(() => {
      const locId = getPoiLocationId(props.poi);
      const dest = locId ? dbIndexes.locations.get(locId)?.name : '';
      return dest ? `Dungeon: ${dest}` : 'Dungeon Entrance';
    });

    const dungeonDepth = computed(() => {
      const dm = dungeonManager.value;
      if (dm?.properties.TotalFloors) return { label: 'Floors', count: dm.properties.TotalFloors };
      if (dm?.properties.NTotalRooms) return { label: 'Rooms', count: dm.properties.NTotalRooms };
      return null;
    });

    const dungeonBoss = computed(() => {
      const dm = dungeonManager.value;
      const bossId = dm?.properties.Boss;
      if (!bossId) return null;
      return {
        ...resolveMonster(bossId),
        level: dm.properties.BossLevel || 0
      };
    });

    const dungeonRewardRecipe = computed(() => resolveRecipe(dungeonManager.value?.properties.CustomLootEnd));

    const dungeonSpawns = computed(() =>
      getSpawnerEncounters(dungeonManager.value?.properties.SpawnTag?.TagName || '')
    );

    const dungeonLevelLabel = computed(() => {
      const first = dungeonSpawns.value[0]?.spawn;
      if (!first) return '';
      const minLv = first.minLevel;
      const maxLv = first.maxLevel;
      return minLv != null ? (minLv === maxLv ? `Lv. ${minLv}` : `Lv. ${minLv}–${maxLv}`) : '';
    });

    const dungeonPoolMonsters = computed(() => {
      const pool = dungeonManager.value?.properties.LootMonsterPool || [];
      return pool.map((/** @type {string} */ mId) => resolveMonster(mId));
    });

    return {
      dungeonTitle,
      dungeonDepth,
      dungeonBoss,
      dungeonRewardRecipe,
      dungeonSpawns,
      dungeonLevelLabel,
      dungeonPoolMonsters
    };
  },
  template: DUNGEON_TEMPLATE
});

// ==========================================
// 3. ColiseumPopup
// ==========================================
const COLISEUM_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" :title="coliseumTitle">
    <div v-if="coliseumRoundsCount > 0" class="f7 silver mb2"><span class="b">Rounds:</span> {{ coliseumRoundsCount }}</div>
    <PopupSection v-if="coliseumEmblem || coliseumRewardRecipe" title="Rewards:">
      <RowLink
        v-if="coliseumEmblem"
        :to="'/items/' + coliseumEmblem.id"
        :icon="coliseumEmblem.icon"
        :title="coliseumEmblem.name"
      >
        <span class="f7 light-yellow">Emblem</span>
      </RowLink>
      <RowLink
        v-if="coliseumRewardRecipe"
        :to="coliseumRewardRecipe.to"
        :icon="coliseumRewardRecipe.icon"
        :title="coliseumRewardRecipe.title"
      >
        <span class="f7 light-blue">Recipe</span>
      </RowLink>
    </PopupSection>
    <PopupSection v-for="(round, rIdx) in coliseumPreliminaryRounds" :key="rIdx" :title="round.title">
      <div class="flex flex-wrap items-center">
        <MonsterAvatar
          v-for="(combatant, cIdx) in round.team"
          :key="cIdx"
          :id="combatant.id"
          :icon="combatant.icon"
          :title="combatant.title"
        />
      </div>
    </PopupSection>
    <PopupSection v-if="coliseumFinalRound.length > 0" title="Final Round:">
      <RowLink
        v-for="(m, mIdx) in coliseumFinalRound"
        :key="mIdx"
        :to="'/monsters/' + m.id"
        :icon="m.icon"
        :title="m.name"
      >
        <span v-if="m.isBoss" class="f8 b washed-red bg-dark-red ph1 pv05 br-pill ba b--red-30">
          👑 Lv. {{ m.level }}
        </span>
        <span v-else class="f8 b light-yellow bg-gold-20 ph1 pv05 br-pill ba b--gold-30">
          Lv. {{ m.level }}
        </span>
      </RowLink>
    </PopupSection>
  </PopupShell>
`;

export const ColiseumPopup = defineComponent({
  name: 'ColiseumPopup',
  components: { PopupShell, PopupSection, RowLink, MonsterAvatar },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const coliseumPoi = computed(() => {
      const targetId = getReferencedPoiId(props.poi.properties.RefColiseum);
      return dbIndexes.worldPois.get(targetId);
    });

    const coliseumTitle = computed(() => {
      const locId = getPoiLocationId(props.poi);
      const dest = locId ? dbIndexes.locations.get(locId)?.name : '';
      return dest ? `Coliseum: ${dest}` : 'Coliseum Arena';
    });

    const coliseumRoundsCount = computed(() => coliseumPoi.value?.coliseumRounds.length || 0);

    const coliseumEmblem = computed(() => {
      const id = coliseumPoi.value?.properties.RewardEmblem;
      return id ? dbIndexes.items.get(id) : null;
    });

    const coliseumRewardRecipe = computed(() => resolveRecipe(coliseumPoi.value?.properties.RewardRecipe));

    const coliseumPreliminaryRounds = computed(() => {
      const rounds = coliseumPoi.value?.coliseumRounds || [];
      if (rounds.length <= 1) return [];
      return rounds.slice(0, rounds.length - 1).map((r) => {
        const team = formatBattleTeam(r.team);
        const levels = team.map((m) => m.level).filter((lv) => lv > 0);
        const minLv = levels.length > 0 ? Math.min(...levels) : 0;
        const maxLv = levels.length > 0 ? Math.max(...levels) : 0;
        const levelLabel = minLv > 0 ? (minLv === maxLv ? `Lv. ${minLv}` : `Lv. ${minLv}–${maxLv}`) : '';
        const title = levelLabel ? `Round ${r.round} (${levelLabel}):` : `Round ${r.round}:`;
        return { title, team };
      });
    });

    const coliseumFinalRound = computed(() => {
      const rounds = coliseumPoi.value?.coliseumRounds || [];
      const final = rounds[rounds.length - 1];
      return final ? formatBattleTeam(final.team) : [];
    });

    return {
      coliseumTitle,
      coliseumRoundsCount,
      coliseumEmblem,
      coliseumRewardRecipe,
      coliseumPreliminaryRounds,
      coliseumFinalRound
    };
  },
  template: COLISEUM_TEMPLATE
});

// ==========================================
// 4. BattlePopup
// ==========================================
const BATTLE_TEMPLATE = /* html */ `
  <PopupShell :poi="poi" title="Battle Encounter" :dialogue="battleDialogue">
    <RowLink
      v-for="(member, idx) in battleTeam"
      :key="idx"
      :to="'/monsters/' + member.id"
      :icon="member.icon"
      :title="member.name"
    >
      <span v-if="member.isBoss" class="f8 b washed-red bg-dark-red ph1 pv05 br-pill ba b--red-30">
        👑 Boss Lv. {{ member.level }}
      </span>
      <span v-else class="f8 b light-yellow bg-gold-20 ph1 pv05 br-pill ba b--gold-30">
        Lv. {{ member.level }}
      </span>
    </RowLink>
    <PopupSection v-if="battleRewardRecipe" title="Reward:">
      <RowLink
        :to="battleRewardRecipe.to"
        :icon="battleRewardRecipe.icon"
        :title="battleRewardRecipe.title"
      >
        <span class="f7 light-blue">Recipe</span>
      </RowLink>
    </PopupSection>
  </PopupShell>
`;

export const BattlePopup = defineComponent({
  name: 'BattlePopup',
  components: { PopupShell, PopupSection, RowLink },
  props: {
    poi: {
      type: /** @type {import('vue').PropType<import('../../models/WorldPoi.js').WorldPoi>} */ (Object),
      required: true
    }
  },
  setup(props) {
    const battleDialogue = computed(
      () => props.poi.properties.Text_BeforeBattle || props.poi.properties.Text_AfterBattle || ''
    );
    const battleTeam = computed(() => formatBattleTeam(props.poi.battleTeam));
    const battleRewardRecipe = computed(() => resolveRecipe(props.poi.properties.Recipe));

    return {
      battleDialogue,
      battleTeam,
      battleRewardRecipe
    };
  },
  template: BATTLE_TEMPLATE
});
