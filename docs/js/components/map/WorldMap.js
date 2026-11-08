// @ts-check
import {
  defineComponent,
  ref,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  h,
  render,
  getCurrentInstance
} from 'vue';
import { useRoute } from 'vue-router';
import {
  LeafletMap,
  Marker,
  Polyline,
  DivIcon,
  ImageOverlay,
  SimpleCRS
} from 'leaflet';
import { MarkerClusterGroup } from 'leaflet.markercluster';
import { db, dbIndexes } from '../../store.js';
import {
  WORLD_MAP_URL,
  MAP_ICON
} from '../../services/assets.js';
import {
  worldToLatLng,
  latLngToWorld,
  MAP_BOUNDS,
  CATEGORIES,
  renderIconHtml,
  BatchLayerGroup,
  getPoiCustomIcon,
  getReferencedPoiId,
  isCountedPoi,
  isClusteredCategory,
  matchesPoiSearch
} from '../../services/mapUtils.js';
import { WorldMapPopup } from './WorldMapPopup.js';

/**
 * @param {string} category
 * @param {string} [customIcon]
 * @param {string} [activeClass]
 * @returns {string}
 */
const TEMPLATE_MARKER_ICON = (category, customIcon = '', activeClass = '') => /* html */ `
  <div class="map-pin ${activeClass} flex items-center justify-center br-100 ba b--white-80 bg-near-black shadow-1" style="width: 24px; height: 24px;">
    ${renderIconHtml(category, customIcon, '', 'height: 14px; width: auto; max-width: 18px;')}
  </div>
`;

const TEMPLATE = /* html */ `
  <div class="relative w-100 flex flex-row br3 overflow-hidden ba b--white-10" style="height: calc(100vh - 40px); max-height: calc(100vh - 40px);">
    <!-- Left Sidebar: Map Controls -->
    <aside
      v-show="isSidebarOpen"
      class="flex-shrink-0 bg-dark-gray br b--white-10 pa3 flex flex-column overflow-y-auto"
      style="width: 280px; z-index: 1000;"
    >
      <!-- Header with Title & Hide Button -->
      <div class="flex items-center justify-between mb3 pb2 bb b--white-10 flex-shrink-0">
        <div class="flex items-center">
          <img :src="MAP_ICON" class="icon-16 pixelated mr2" alt="Map" />
          <span class="f6 b near-white">Map Controls</span>
        </div>
        <button
          type="button"
          @click="toggleSidebar"
          title="Hide map controls"
          class="bn bg-transparent silver hover-near-white pointer f7 pv1 ph2 br2 hover-bg-white-10 flex items-center"
        >
          <span class="mr1">Hide</span>
          <span>◀</span>
        </button>
      </div>

      <!-- Search Input & Reset Button -->
      <div class="mb3">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Filter monsters, items..."
          class="input-reset w-100 bg-near-black near-white ba b--white-20 br2 ph3 pv2 f7 outline-0 focus-b--purple box-border mb2"
          aria-label="Filter map POIs"
        />
        <button
          type="button"
          @click="resetView"
          title="Reset Map View"
          class="w-100 pv2 ph3 bg-mid-gray hover-bg-light-silver hover-near-black near-white bn br2 pointer f7 b tc"
        >
          Reset Map View
        </button>
      </div>

      <!-- Categories Checkbox Filter Section -->
      <div class="flex items-center justify-between mb2 pb1 bb b--white-10">
        <span class="f7 b silver ttu tracked">Categories</span>
        <div class="f8 flex items-center">
          <button
            type="button"
            @click="selectAll"
            class="bn bg-white-10 light-purple hover-bg-white-20 hover-white pointer ph2 pv1 br2 mr1 b"
          >
            All
          </button>
          <button
            type="button"
            @click="clearAll"
            class="bn bg-white-10 silver hover-bg-white-20 hover-white pointer ph2 pv1 br2 b"
          >
            None
          </button>
        </div>
      </div>

      <!-- Category Checkboxes -->
      <div class="flex flex-column mb2">
        <template v-for="(cat, id) in CATEGORIES" :key="id">
          <label
            v-if="!cat.dense"
            class="flex items-center pv2 ph2 br2 hover-bg-white-10 pointer select-none mb1"
            :class="selectedCategories.includes(id) ? 'bg-white-05' : 'o-60'"
          >
            <input
              type="checkbox"
              :value="id"
              v-model="selectedCategories"
              class="mr2 pointer"
            />
            <span class="mr2 dib v-mid flex-shrink-0 flex items-center justify-center icon-16" v-html="renderIconHtml(id)"></span>
            <span class="flex-auto f7 b near-white">{{ cat.label }}</span>
            <span class="f8 ph2 pv0 br-pill bg-black-40 silver ml2">
              {{ getCategoryCount(id) }}
            </span>
          </label>
        </template>
      </div>

      <!-- Dense Layer Checkboxes -->
      <div class="pv2 bt b--white-10">
        <button
          type="button"
          @click="toggleDenseLayers"
          class="w-100 bn bg-transparent flex items-center justify-between pv1 ph0 f7 b silver ttu tracked pointer hover-white"
        >
          <span>Dense Layers</span>
          <span class="silver flex items-center" style="font-size: 18px; line-height: 1;">{{ isDenseExpanded ? '▾' : '▸' }}</span>
        </button>
        <div v-if="isDenseExpanded" class="mt1">
          <template v-for="(cat, id) in CATEGORIES" :key="id">
            <label
              v-if="cat.dense"
              class="flex items-center pv2 ph2 br2 hover-bg-white-10 pointer select-none ba mb1"
              :class="selectedCategories.includes(id) ? 'bg-white-05 b--dark-green' : 'b--white-10 o-60'"
            >
              <input
                type="checkbox"
                :value="id"
                v-model="selectedCategories"
                class="mr2 pointer"
              />
              <span class="mr2 dib v-mid flex-shrink-0 flex items-center justify-center icon-16" v-html="renderIconHtml(id)"></span>
              <span class="flex-auto f7 b near-white">{{ cat.label }}</span>
              <span class="f8 ph2 pv0 br-pill bg-black-40 silver ml2">
                {{ getCategoryCount(id) }}
              </span>
            </label>
          </template>
        </div>
      </div>

      <!-- Sidebar Footer / Counter Stats -->
      <div class="mt-auto pt3 bt b--white-10 f7 silver">
        <div class="flex justify-between mb1">
          <span>Visible Markers:</span>
          <span class="near-white b">{{ visibleMarkerCount }} / {{ totalMarkerCount }}</span>
        </div>
        <div class="flex justify-between">
          <span>Active Categories:</span>
          <span class="near-white b">{{ activeCategoryCount }} / {{ totalCategoryCount }}</span>
        </div>
      </div>
    </aside>

    <!-- Right Area: Leaflet Map Canvas & HUD -->
    <div class="relative flex-auto h-100">
      <div ref="mapContainer" class="w-100 h-100" style="background: #0e0f14;"></div>

      <!-- Toggle Map Bar Button (when hidden) -->
      <button
        v-if="!isSidebarOpen"
        type="button"
        @click="toggleSidebar"
        title="Show map controls"
        class="absolute flex items-center bg-dark-gray hover-bg-mid-gray near-white ba b--white-20 br2 ph3 pv2 shadow-2 pointer f7 b"
        style="top: 10px; left: 56px; z-index: 1000;"
      >
        <span class="mr2">☰</span>
        <span>Show Controls</span>
        <span
          v-if="selectedCategories.length < Object.keys(CATEGORIES).length"
          class="ml2 f8 ph2 br-pill bg-purple white"
        >
          {{ selectedCategories.length }}
        </span>
      </button>

      <!-- Bottom Right HUD (Coordinates) -->
      <div
        v-if="hoverCoords"
        class="absolute bottom-1 right-1 bg-black-40 ph3 pv2 br2 ba b--white-10 f7 silver pointer-events-none"
        style="backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1000;"
      >
        <span class="near-white b">World:</span> X: {{ Math.round(hoverCoords.x) }}, Y: {{ Math.round(hoverCoords.y) }}
      </div>
    </div>
  </div>
`;

export const WorldMap = defineComponent({
  name: 'WorldMap',
  template: TEMPLATE,
  setup() {
    const route = useRoute();

    /** @type {import('vue').Ref<HTMLElement | null>} */
    const mapContainer = ref(null);

    /** @type {import('vue').Ref<string[]>} */
    const selectedCategories = ref(['zone', 'tower']);

    function selectAll() {
      selectedCategories.value = Object.keys(CATEGORIES).filter((id) => !CATEGORIES[id]?.dense);
    }

    function clearAll() {
      selectedCategories.value = [];
    }

    const isSidebarOpen = ref(true);

    function toggleSidebar() {
      isSidebarOpen.value = !isSidebarOpen.value;
      nextTick(() => {
        if (map) {
          map.invalidateSize();
        }
      });
    }

    const isDenseExpanded = ref(false);

    function toggleDenseLayers() {
      isDenseExpanded.value = !isDenseExpanded.value;
    }

    const searchQuery = ref('');
    /** @type {import('vue').Ref<{ x: number, y: number } | null>} */
    const hoverCoords = ref(null);

    /** @type {LeafletMap | null} */
    let map = null;
    /** @type {Map<string, BatchLayerGroup | MarkerClusterGroup>} */
    const categoryLayers = new Map();
    /** @type {Map<string, BatchLayerGroup>} Dedicated layer for dashed link lines per category */
    const categoryLinkLayers = new Map();
    /** @type {Map<string, Marker[]>} */
    const categoryMarkers = new Map();
    /** @type {Map<string, Marker>} */
    const markerByPoiId = new Map();
    /** @type {Marker | null} */
    let activeMarker = null;

    const currentInstance = getCurrentInstance();
    const appContext = currentInstance ? currentInstance.appContext : null;
    const popupContainer = document.createElement('div');

    /**
     * @param {import('../../models/WorldPoi.js').WorldPoi} poi
     * @returns {HTMLElement}
     */
    function mountPopup(poi) {
      const vnode = h(WorldMapPopup, { poi });
      if (appContext) vnode.appContext = appContext;
      render(vnode, popupContainer);
      return popupContainer;
    }

    function unmountPopup() {
      render(null, popupContainer);
    }

    /**
     * Creates an isolated MarkerClusterGroup for a specific dense category.
     *
     * @param {string} category
     * @returns {MarkerClusterGroup}
     */
    function createClusterGroup(category) {
      const isDense = Boolean(CATEGORIES[category]?.dense);
      return new MarkerClusterGroup({
        maxClusterRadius: 40,
        disableClusteringAtZoom: 1,
        removeOutsideVisibleBounds: isDense,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        iconCreateFunction(/** @type {import('leaflet.markercluster').MarkerCluster} */ cluster) {
          const count = cluster.getChildCount();
          return new DivIcon({
            className: 'custom-cluster-marker',
            html: `
              <div class="relative flex items-center justify-center pointer" style="width: 28px; height: 28px;">
                <div class="map-pin flex items-center justify-center br-100 ba b--white-80 bg-near-black shadow-1" style="width: 28px; height: 28px;">
                  ${renderIconHtml(category, '', '', 'height: 16px; width: auto; max-width: 22px;')}
                </div>
                <div class="absolute top-0 right-0 bg-purple white f8 b br-pill ph1 ba b--near-black shadow-1" style="transform: translate(30%, -30%); font-size: 10px; line-height: 14px; min-width: 16px; text-align: center;">
                  ${count}
                </div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
        }
      });
    }

    /**
     * Activates pin styling on the specified marker and deactivates the previous one.
     * @param {Marker} marker
     */
    function activateMarker(marker) {
      if (activeMarker && activeMarker !== marker) {
        activeMarker.getElement()?.querySelector('.map-pin')?.classList.remove('pin-active');
      }
      activeMarker = marker;
      marker.getElement()?.querySelector('.map-pin')?.classList.add('pin-active');
    }

    /**
     * Groups all loaded world POIs by category in O(N).
     */
    const poisByCategory = computed(() => {
      /** @type {Map<string, import('../../models/WorldPoi.js').WorldPoi[]>} */
      const groups = new Map();
      for (const cat of Object.keys(CATEGORIES)) {
        groups.set(cat, []);
      }
      for (const poi of mapPois.value) {
        groups.get(poi.category)?.push(poi);
      }
      return groups;
    });

    /**
     * Instantiates a Marker and wires up its popups and DOM interactions.
     * @param {import('../../models/WorldPoi.js').WorldPoi} poi
     * @returns {Marker}
     */
    function createMarker(poi) {
      const latLng = worldToLatLng(poi.location);
      const icon = createMarkerIcon(poi);
      const marker = new Marker(latLng, { icon });

      if (poi.category !== 'zone') {
        marker.bindPopup(() => mountPopup(poi), {
          maxWidth: 320,
          className: 'dark-map-popup'
        });
        marker.on('popupopen', () => {
          activateMarker(marker);
        });
        marker.on('popupclose', () => {
          unmountPopup();
        });
      }

      markerByPoiId.set(poi.id, marker);
      return marker;
    }

    /** @type {Map<string, string>} Tracks the search query populated in each category layer. */
    const layerQuery = new Map();
    /** @type {Map<string, number>} Tracks the visible marker count per category layer. */
    const categoryVisibleCounts = reactive(new Map());

    /**
     * Retrieves or instantiates cached markers for a category on-demand.
     * @param {string} category
     * @returns {Marker[]}
     */
    function getCategoryMarkers(category) {
      let markers = categoryMarkers.get(category);
      if (!markers) {
        const pois = poisByCategory.value.get(category) || [];
        markers = pois.map(createMarker);
        categoryMarkers.set(category, markers);
      }
      return markers;
    }

    /**
     * Retrieves or creates the dedicated link lines layer group for a category.
     * @param {string} category
     * @returns {BatchLayerGroup}
     */
    function getCategoryLinkLayer(category) {
      let layer = categoryLinkLayers.get(category);
      if (!layer) {
        layer = new BatchLayerGroup();
        categoryLinkLayers.set(category, layer);
      }
      return layer;
    }

    /**
     * Retrieves or creates the dedicated Leaflet layer group for a category.
     * @param {string} category
     * @returns {BatchLayerGroup | MarkerClusterGroup}
     */
    function getCategoryLayer(category) {
      let layer = categoryLayers.get(category);
      if (!layer) {
        layer = isClusteredCategory(category)
          ? createClusterGroup(category)
          : new BatchLayerGroup();
        categoryLayers.set(category, layer);
      }
      return layer;
    }

    /**
     * Updates a category layer's markers based on the current search query.
     * @param {string} category
     * @param {string} q Lowercase search query
     */
    function updateCategoryMarkers(category, q) {
      const layer = getCategoryLayer(category);
      layer.clearLayers();

      const markers = getCategoryMarkers(category);
      /** @type {Marker[]} */
      let visible = markers;

      if (q) {
        const pois = poisByCategory.value.get(category) || [];
        visible = [];
        for (let i = 0; i < pois.length; i++) {
          if (matchesPoiSearch(pois[i], q)) {
            visible.push(markers[i]);
          }
        }
      }

      layer.addLayers(visible);
      layerQuery.set(category, q);
      const pois = poisByCategory.value.get(category) || [];
      const primaryCount = q
        ? pois.filter((p, i) => isCountedPoi(p) && matchesPoiSearch(p, q)).length
        : pois.filter(isCountedPoi).length;
      categoryVisibleCounts.set(category, primaryCount);
    }

    /**
     * Generates a DivIcon for a specific POI.
     *
     * @param {import('../../models/WorldPoi.js').WorldPoi} poi
     * @param {boolean} [isActive]
     * @returns {DivIcon}
     */
    function createMarkerIcon(poi, isActive = false) {
      if (poi.category === 'zone') {
        const zoneName = poi.label;
        return new DivIcon({
          className: 'map-zone-label-container',
          html: `<div class="map-zone-label">${zoneName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
      }

      const customIcon = getPoiCustomIcon(poi);
      const activeClass = isActive ? 'pin-active' : '';

      return new DivIcon({
        className: 'custom-map-pin',
        html: TEMPLATE_MARKER_ICON(poi.category, customIcon, activeClass),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });
    }

    /**
     * Map POIs with zone discovery volumes merged into central island/region labels.
     * Manager POIs (dungeon/coliseum logic objects) are excluded from the map display.
     */
    const mapPois = computed(() => db.worldPois.filter((p) => p.category !== 'manager'));

    const totalMarkerCount = computed(() => mapPois.value.filter(isCountedPoi).length);

    const totalCategoryCount = computed(
      () => Object.values(CATEGORIES).filter((cat) => !cat.dense).length
    );

    const activeCategoryCount = computed(
      () => selectedCategories.value.filter((id) => !CATEGORIES[id]?.dense).length
    );

    /**
     * Computes the count of POIs belonging to each category, counting only primary elements.
     * @param {string} catId
     * @returns {number}
     */
    function getCategoryCount(catId) {
      const pois = poisByCategory.value.get(catId) || [];
      return pois.filter(isCountedPoi).length;
    }

    const visibleMarkerCount = computed(() => {
      let count = 0;
      for (const catId of selectedCategories.value) {
        if (!CATEGORIES[catId]?.dense) {
          count += categoryVisibleCounts.get(catId) ?? 0;
        }
      }
      return count;
    });

    /**
     * Synchronizes active Leaflet category layer groups to match selected categories and search queries.
     */
    function syncCategoryLayers() {
      if (!map) return;
      const q = searchQuery.value.trim().toLowerCase();

      for (const category of Object.keys(CATEGORIES)) {
        const isSelected = selectedCategories.value.includes(category);
        const layer = getCategoryLayer(category);
        const linkLayer = categoryLinkLayers.get(category);

        if (isSelected) {
          if (layerQuery.get(category) !== q) {
            updateCategoryMarkers(category, q);
          }
          if (!map.hasLayer(layer)) {
            map.addLayer(layer);
          }
        } else {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          if (linkLayer && map.hasLayer(linkLayer)) {
            map.removeLayer(linkLayer);
          }
        }
      }

      syncLinkLines(q);
    }

    /**
     * Rebuilds and synchronizes dashed link polylines between connected POIs
     * on each category's dedicated link layer.
     * (dungeons to exits, arcane eyes to targets, arcane triggers to cubes, springs to targets).
     * @param {string} [q] Current search query
     */
    function syncLinkLines(q = '') {
      if (!map) return;

      const poisById = dbIndexes.worldPois;

      /**
       * @param {Polyline[]} list
       * @param {import('../../models/WorldPoi.js').WorldPoi} sourcePoi
       * @param {string} targetPoiId
       * @param {string} color
       */
      function addLine(list, sourcePoi, targetPoiId, color) {
        if (!targetPoiId) return;
        const targetPoi = poisById.get(targetPoiId);
        if (!targetPoi) return;

        // If a search query is active, only draw line if either endpoint matches the query
        if (q && !matchesPoiSearch(sourcePoi, q) && !matchesPoiSearch(targetPoi, q)) {
          return;
        }

        const latLng1 = worldToLatLng(sourcePoi.location);
        const latLng2 = worldToLatLng(targetPoi.location);

        const line = new Polyline([latLng1, latLng2], {
          color,
          weight: 2,
          opacity: 0.8,
          dashArray: '6, 8',
          interactive: false
        });
        list.push(line);
      }

      /**
       * @param {string} category
       * @param {Polyline[]} lines
       */
      function applyLinkLayer(category, lines) {
        if (!map) return;
        const linkLayer = getCategoryLinkLayer(category);
        linkLayer.clearLayers();
        linkLayer.addLayers(lines);
        if (!map.hasLayer(linkLayer)) {
          map.addLayer(linkLayer);
        }
      }

      // 1. Dungeons -> Exits
      if (selectedCategories.value.includes('dungeon')) {
        /** @type {Polyline[]} */
        const dungeonLines = [];
        const dungeons = poisByCategory.value.get('dungeon') || [];
        const exits = dungeons.filter((p) => p.type === 'BP_DungeonDoor_Exit_C');
        const entrances = dungeons.filter((p) => p.type === 'BP_DungeonDoor_C');
        const color = CATEGORIES.dungeon.lineColor || '#ff4136';

        for (const entrance of entrances) {
          const matchingExit = exits.find((e) => {
            const doorRef = e.properties.DungeonDoor?.ObjectName || '';
            return doorRef.includes(entrance.id);
          });
          if (matchingExit) {
            addLine(dungeonLines, entrance, matchingExit.id, color);
          }
        }
        applyLinkLayer('dungeon', dungeonLines);
      }

      // 2. Springs -> Targets
      if (selectedCategories.value.includes('spring')) {
        /** @type {Polyline[]} */
        const springLines = [];
        const springs = poisByCategory.value.get('spring') || [];
        const color = CATEGORIES.spring.lineColor || '#357edd';
        for (const spring of springs) {
          if (spring.type === 'BP_Spring_C') {
            const targetId = getReferencedPoiId(spring.properties.Target);
            addLine(springLines, spring, targetId, color);
          }
        }
        applyLinkLayer('spring', springLines);
      }

      // 3. Arcane Puzzles (Eyes -> Targets & Triggers -> Cubes)
      if (selectedCategories.value.includes('arcane')) {
        /** @type {Polyline[]} */
        const arcaneLines = [];
        const arcanePois = poisByCategory.value.get('arcane') || [];
        const color = CATEGORIES.arcane.lineColor || '#a463f2';

        // Eyes -> Targets
        const eyes = arcanePois.filter((p) => p.type === 'BP_ArcaneEye_C');
        const eyeTargets = new Set();
        for (const eye of eyes) {
          const targetId = getReferencedPoiId(eye.properties.ObjectRef);
          if (targetId) {
            eyeTargets.add(targetId);
            addLine(arcaneLines, eye, targetId, color);
          }
        }

        // Check reverse ArcaneEyeArray on ArcaneObjects (covers any unreferenced eyes)
        const arcaneObjects = arcanePois.filter((p) => Array.isArray(p.properties.ArcaneEyeArray));
        for (const obj of arcaneObjects) {
          for (const eyeRef of obj.properties.ArcaneEyeArray) {
            const eyeId = getReferencedPoiId(eyeRef);
            if (eyeId && !eyeTargets.has(obj.id)) {
              const eyePoi = poisById.get(eyeId);
              if (eyePoi) {
                addLine(arcaneLines, eyePoi, obj.id, color);
              }
            }
          }
        }

        // Triggers -> Cubes
        const triggers = arcanePois.filter((p) => p.type === 'BP_ArcaneTrigger_C');
        for (const trigger of triggers) {
          const cubeId = getReferencedPoiId(trigger.properties.LinkedElement);
          addLine(arcaneLines, trigger, cubeId, color);
        }

        applyLinkLayer('arcane', arcaneLines);
      }
    }

    /**
     * Clears and resets all category layers and marker caches.
     */
    function rebuildMarkers() {
      if (!map) return;
      for (const layer of categoryLayers.values()) {
        layer.clearLayers();
      }
      for (const linkLayer of categoryLinkLayers.values()) {
        linkLayer.clearLayers();
      }
      categoryLayers.clear();
      categoryLinkLayers.clear();
      categoryMarkers.clear();
      layerQuery.clear();
      categoryVisibleCounts.clear();
      markerByPoiId.clear();
      activeMarker = null;

      syncCategoryLayers();
    }

    /**
     * Focuses on a specific POI or coordinate based on route query parameters.
     */
    function applyRouteQuery() {
      if (!map) return;

      const qSpawn = /** @type {string} */ (route.query.spawn);
      const qPoi = /** @type {string} */ (route.query.poi);
      const qX = route.query.x ? Number(route.query.x) : null;
      const qY = route.query.y ? Number(route.query.y) : null;

      if (activeMarker) {
        activeMarker.getElement()?.querySelector('.map-pin')?.classList.remove('pin-active');
        activeMarker = null;
      }

      /** @type {import('../../models/WorldPoi.js').WorldPoi | undefined} */
      let target;

      if (qSpawn) {
        isSidebarOpen.value = true;
        if (!selectedCategories.value.includes('spawner')) {
          selectedCategories.value.push('spawner');
        }
        const targetTag = qSpawn.toLowerCase();
        target = mapPois.value.find((p) => p.tag.toLowerCase() === targetTag);
      } else if (qPoi) {
        isSidebarOpen.value = true;
        const targetPoi = qPoi.toLowerCase();
        target = mapPois.value.find((p) => p.id.toLowerCase() === targetPoi);
        if (target && !selectedCategories.value.includes(target.category)) {
          selectedCategories.value.push(target.category);
        }
      } else if (qX !== null && qY !== null) {
        const latLng = worldToLatLng({ x: qX, y: qY });
        map.setView(latLng, 0);
      }

      if (target) {
        const latLng = worldToLatLng(target.location);
        getCategoryMarkers(target.category);
        const marker = markerByPoiId.get(target.id);
        const layer = getCategoryLayer(target.category);

        if (marker && target.category !== 'zone') {
          layer.zoomToShowLayer(marker, () => {
            activateMarker(marker);
            marker.openPopup();
          });
        } else {
          map.setView(latLng, 0);
        }
      }
    }

    /**
     * Resets camera to default centered view showing the entire world map.
     */
    function resetView() {
      if (!map) return;
      map.fitBounds([
        [MAP_BOUNDS.minY, MAP_BOUNDS.minX],
        [MAP_BOUNDS.maxY, MAP_BOUNDS.maxX]
      ]);
    }

    onMounted(() => {
      if (!mapContainer.value) return;

      map = new LeafletMap(mapContainer.value, {
        crs: SimpleCRS,
        minZoom: -3,
        maxZoom: 3.5,
        zoomSnap: 0.5,
        attributionControl: false
      });

      // Overlay the 4096x4096 map texture
      /** @type {import('leaflet').LatLngBoundsExpression} */
      const mapBounds = [
        [MAP_BOUNDS.minY, MAP_BOUNDS.minX],
        [MAP_BOUNDS.maxY, MAP_BOUNDS.maxX]
      ];
      new ImageOverlay(WORLD_MAP_URL, mapBounds).addTo(map);

      // Restrict camera bounds so user cannot pan indefinitely into the void
      map.setMaxBounds([
        [MAP_BOUNDS.minY - 600, MAP_BOUNDS.minX - 600],
        [MAP_BOUNDS.maxY + 600, MAP_BOUNDS.maxX + 600]
      ]);

      // Track cursor position in Unreal world coordinates
      map.on('mousemove', (e) => {
        hoverCoords.value = latLngToWorld(e.latlng);
      });

      // Clear active pin styling when popups close
      map.on('popupclose', () => {
        if (activeMarker) {
          activeMarker.getElement()?.querySelector('.map-pin')?.classList.remove('pin-active');
          activeMarker = null;
        }
      });

      // Fit map to viewport initially
      map.fitBounds(mapBounds);
      map.invalidateSize();

      // Initialize visible markers if already loaded, then apply query params
      if (mapPois.value.length > 0) {
        syncCategoryLayers();
        applyRouteQuery();
      }
    });

    onUnmounted(() => {
      unmountPopup();
      if (map) {
        map.remove();
        map = null;
      }
      for (const layer of categoryLayers.values()) {
        layer.clearLayers();
      }
      for (const linkLayer of categoryLinkLayers.values()) {
        linkLayer.clearLayers();
      }
      categoryLayers.clear();
      categoryLinkLayers.clear();
      categoryMarkers.clear();
      layerQuery.clear();
      categoryVisibleCounts.clear();
      markerByPoiId.clear();
      activeMarker = null;
    });

    // Sync active category layers when filter or search changes
    watch(
      () => [selectedCategories.value, searchQuery.value],
      () => {
        syncCategoryLayers();
      },
      { deep: true }
    );

    // Rebuild marker cache when data loads or changes
    watch(mapPois, () => {
      rebuildMarkers();
      applyRouteQuery();
    });

    // React to route query changes
    watch(
      () => route.query,
      () => {
        applyRouteQuery();
      }
    );

    return {
      CATEGORIES,
      MAP_ICON,
      renderIconHtml,
      isSidebarOpen,
      toggleSidebar,
      isDenseExpanded,
      toggleDenseLayers,
      selectedCategories,
      selectAll,
      clearAll,
      searchQuery,
      hoverCoords,
      visibleMarkerCount,
      totalMarkerCount,
      activeCategoryCount,
      totalCategoryCount,
      db,
      mapContainer,
      getCategoryCount,
      resetView
    };
  }
});
