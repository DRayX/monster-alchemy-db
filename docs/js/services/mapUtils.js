// @ts-check
import { LayerGroup, Layer, Marker } from 'leaflet';
import { db, dbIndexes } from '../store.js';
import { WorldPoi } from '../models/WorldPoi.js';
import { CaseInsensitiveMap } from './unreal.js';
import { RARITY_WEIGHT } from './formatters.js';
import {
  MAP_ICON,
  SPAWNER_ICON,
  CHEST_ICON,
  SCROLL_ICON,
  OBELISK_ICON,
  SHOP_ICON,
  QUEST_ICON,
  DUNGEON_ICON,
  FIGHT_ICON,
  TOWER_ICON,
  INN_ICON,
  FERRY_ICON,
  getItemIcon,
  getIcon
} from './assets.js';

/**
 * Generates an inline style string to render a specific frame from a multi-frame sprite sheet.
 *
 * @param {string} position CSS object-position (e.g. 'left center', 'right center')
 * @param {string} aspectRatio Frame aspect ratio (e.g. '38/28', '55/48')
 * @param {string} [translateY] Vertical translation percentage for optical centering (e.g. '-23%', '-8%')
 * @returns {string}
 */
export function spriteStyle(position, aspectRatio, translateY = '') {
  const transform = translateY ? ` transform: translateY(${translateY});` : '';
  return `object-fit: cover; object-position: ${position}; aspect-ratio: ${aspectRatio}; width: auto; max-width: none; flex-shrink: 0;${transform}`;
}

/**
 * Category metadata for filter buttons, marker icon lookups, and category-level styles.
 * @type {Record<string, { label: string, icon: string, extraStyle?: string, dense?: boolean, canBeHidden?: boolean, clustered?: boolean }>}
 */
export const CATEGORIES = {
  zone: { label: 'Zones', icon: MAP_ICON },
  tower: { label: 'Towers', icon: TOWER_ICON },
  chest: {
    label: 'Chests',
    icon: CHEST_ICON,
    clustered: true,
    canBeHidden: true,
    extraStyle: spriteStyle('left center', '38/28', '-23%')
  },
  recipe: { label: 'Recipes', icon: SCROLL_ICON, canBeHidden: true },
  obelisk: {
    label: 'Obelisks',
    icon: OBELISK_ICON,
    extraStyle: spriteStyle('right center', '55/48', '-8%')
  },
  shop: { label: 'Shops', icon: SHOP_ICON },
  inn: { label: 'Inns', icon: INN_ICON },
  ferry: { label: 'Ferries', icon: FERRY_ICON },
  battle: { label: 'Battles', icon: FIGHT_ICON },
  quest: { label: 'Quests', icon: QUEST_ICON },
  dungeon: { label: 'Dungeons', icon: DUNGEON_ICON },
  dungeon_exit: { label: 'Dungeon Exits', icon: DUNGEON_ICON },
  coliseum: { label: 'Coliseums', icon: getItemIcon('Emblem_Blades') },
  spawner: { label: 'Spawners', icon: SPAWNER_ICON, clustered: true },
  resource: { label: 'Resources', icon: getIcon('Work'), clustered: true },
  foliage: { label: 'Common Trees & Rocks', icon: getItemIcon('Wood'), dense: true }
};

/**
 * Returns whether a world POI belongs to a counted user-facing category.
 * Internal level actors (e.g. managers) and dense ambient layers (e.g. foliage) are not counted.
 *
 * @param {WorldPoi} poi
 * @returns {boolean}
 */
export function isCountedPoi(poi) {
  const cat = CATEGORIES[poi.category];
  return Boolean(cat && !cat.dense);
}

/**
 * Returns whether a category uses marker clustering.
 * Dense ambient layers and explicitly clustered categories are clustered.
 *
 * @param {string} category
 * @returns {boolean}
 */
export function isClusteredCategory(category) {
  const cat = CATEGORIES[category];
  return Boolean(cat && (cat.clustered || cat.dense));
}

/** @type {Record<string, string>} */
export const CATEGORY_COLORS = {
  spawner: 'near-white',
  chest: 'gold',
  recipe: 'light-blue',
  obelisk: 'light-purple',
  tower: 'light-purple',
  shop: 'light-green',
  inn: 'washed-green',
  ferry: 'light-blue',
  battle: 'light-red',
  resource: 'gold',
  foliage: 'dark-green',
  quest: 'gold',
  dungeon: 'light-red',
  dungeon_exit: 'orange',
  coliseum: 'light-red'
};

/**
 * LayerGroup subclass providing addLayers() for batch addition,
 * establishing interface parity with MarkerClusterGroup.
 */
export class BatchLayerGroup extends LayerGroup {
  /**
   * Adds an array of layers to the group.
   * @param {Layer[]} layers
   * @returns {this}
   */
  addLayers(layers) {
    for (const layer of layers) {
      this.addLayer(layer);
    }
    return this;
  }

  /**
   * Centers the map on the layer and invokes the callback once movement finishes,
   * establishing interface and behavioral parity with MarkerClusterGroup.zoomToShowLayer().
   * @param {Marker} layer
   * @param {() => void} [callback]
   */
  zoomToShowLayer(layer, callback) {
    if (!this._map) {
      throw new Error('[BatchLayerGroup] Cannot zoom to layer: group has not been added to a map.');
    }
    if (callback) {
      this._map.once('moveend', callback);
    }
    this._map.setView(layer.getLatLng(), Math.max(this._map.getZoom(), 0));
  }
}

/**
 * Renders an icon HTML element, resolving its source and custom styling from category metadata.
 *
 * @param {string} category
 * @param {string} [customIcon]
 * @param {string} [extraClass]
 * @param {string} [extraStyle]
 * @returns {string}
 */
export function renderIconHtml(category, customIcon = '', extraClass = 'icon-16', extraStyle = '') {
  const cat = CATEGORIES[category];
  const iconUrl = customIcon || cat?.icon || category || MAP_ICON;
  const catStyle = !customIcon && cat?.extraStyle ? `${cat.extraStyle} ` : '';
  return `<img src="${iconUrl}" class="pixelated ${extraClass}" style="${catStyle}${extraStyle}" />`;
}

/**
 * Extracts the target POI name from an Unreal object reference.
 * e.g. "BP_DungeonManager_C'MainLevel:PersistentLevel.BP_DungeonManager_C_UAID_...'" -> "BP_DungeonManager_C_UAID_..."
 * @param {any} ref
 * @returns {string}
 */
export function getReferencedPoiId(ref) {
  const objName = typeof ref === 'object' && ref ? ref.ObjectName || '' : String(ref || '');
  const match = objName.match(/PersistentLevel\.([^']+)/);
  return match ? match[1] : '';
}

/**
 * Resolves the destination LocationID for portal doors (dungeons, coliseums) or POIs with LocationID / ZoneID.
 * @param {WorldPoi} poi
 * @returns {string}
 */
export function getPoiLocationId(poi) {
  if (poi.properties.LocationID) return poi.properties.LocationID;
  if (poi.properties.ZoneID) return poi.properties.ZoneID;
  if (poi.category === 'coliseum') {
    const col = dbIndexes.worldPois.get(getReferencedPoiId(poi.properties.RefColiseum));
    return col?.properties.LocationID || '';
  }
  if (poi.category === 'dungeon' || poi.category === 'dungeon_exit') {
    const dm = dbIndexes.worldPois.get(getReferencedPoiId(poi.properties.DungeonRef));
    return dm?.properties.LocationID || '';
  }
  return '';
}

/**
 * Resolves any contextual custom icon for a POI (e.g. drop item icon for resources, reward emblem for coliseums).
 * @param {WorldPoi} poi
 * @returns {string}
 */
export function getPoiCustomIcon(poi) {
  if (poi.category === 'resource' || poi.category === 'foliage') {
    const res = dbIndexes.worldResources.get(poi.resourceTableKey);
    return res?.drops[0]?.item.icon || '';
  }
  if (poi.category === 'coliseum') {
    const col = dbIndexes.worldPois.get(getReferencedPoiId(poi.properties.RefColiseum));
    const emblemId = col?.properties.RewardEmblem;
    return emblemId ? getItemIcon(emblemId) : '';
  }
  return '';
}

/**
 * @typedef {object} SpawnerEncounter
 * @property {import('../models/Monster.js').Monster} monster
 * @property {import('../models/Monster.js').MonsterWildSpawn} spawn
 */

/** @type {CaseInsensitiveMap<SpawnerEncounter[]> | null} */
let _spawnerEncountersIndex = null;

/**
 * Returns encounters matching a spawner tag sorted by rarity in O(1).
 * The index is constructed lazily once from db.monsters.
 *
 * @param {string} tag
 * @returns {SpawnerEncounter[]}
 */
export function getSpawnerEncounters(tag) {
  if (!tag) return [];
  if (!_spawnerEncountersIndex || _spawnerEncountersIndex.size === 0) {
    _spawnerEncountersIndex = new CaseInsensitiveMap();
    for (const monster of db.monsters) {
      for (const ws of monster.wildSpawns) {
        let list = _spawnerEncountersIndex.get(ws.id);
        if (!list) {
          list = [];
          _spawnerEncountersIndex.set(ws.id, list);
        }
        list.push({ monster, spawn: ws });
      }
    }
    for (const list of _spawnerEncountersIndex.values()) {
      list.sort((a, b) => RARITY_WEIGHT[a.spawn.rarity] - RARITY_WEIGHT[b.spawn.rarity]);
    }
  }
  return _spawnerEncountersIndex.get(tag) || [];
}

/**
 * Bounds of the world coordinate system in Unreal Engine units.
 * Calibrated against W_Map / W_MapMinimap bytecode ranges.
 */
export const WORLD_BOUNDS = Object.freeze({
  minX: -500000,
  maxX: 500000,
  minY: -500000,
  maxY: 500000
});

/**
 * Pixel dimensions and coordinate bounds of the world map texture (Map.png).
 */
export const MAP_BOUNDS = Object.freeze({
  minX: 0,
  maxX: 4096,
  minY: 0,
  maxY: 4096
});

/**
 * Converts Unreal world coordinates { x, y } to Leaflet LatLng [lat, lng]
 * for a Leaflet map using SimpleCRS and bounds [[0, 0], [4096, 4096]].
 *
 * In Leaflet CRS.Simple:
 * - lat: vertical axis (0 is bottom/South, 4096 is top/North).
 * - lng: horizontal axis (0 is left/West, 4096 is right/East).
 *
 * @param {import('../types.js').WorldCoordinates | { x: number, y: number }} worldCoords
 * @returns {[number, number]} [lat, lng]
 */
export function worldToLatLng({ x, y }) {
  const pixelX =
    MAP_BOUNDS.minX +
    ((x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) *
      (MAP_BOUNDS.maxX - MAP_BOUNDS.minX);
  const pixelY =
    MAP_BOUNDS.minY +
    ((y - WORLD_BOUNDS.minY) / (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY)) *
      (MAP_BOUNDS.maxY - MAP_BOUNDS.minY);
  return [MAP_BOUNDS.maxY - pixelY, pixelX];
}

/**
 * Converts Leaflet LatLng coordinates [lat, lng] back to Unreal world coordinates { x, y }.
 *
 * @param {[number, number] | { lat: number, lng: number }} latlng
 * @returns {{ x: number, y: number }}
 */
export function latLngToWorld(latlng) {
  const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;
  const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng;
  const pixelX = lng;
  const pixelY = MAP_BOUNDS.maxY - lat;
  const x =
    WORLD_BOUNDS.minX +
    ((pixelX - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) *
      (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
  const y =
    WORLD_BOUNDS.minY +
    ((pixelY - MAP_BOUNDS.minY) / (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY)) *
      (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
  return { x, y };
}

/**
 * Spatially associates Coliseum arena managers with their co-located ZoneDiscoveryVolumes.
 *
 * @param {WorldPoi[]} pois
 */
export function resolveColiseumLocations(pois) {
  const zonePois = pois.filter((p) => p.category === 'zone');
  for (const poi of pois) {
    if (poi.type === 'BP_Coliseum_Child_C') {
      let nearestZone = null;
      let minDistance = Infinity;
      for (const zone of zonePois) {
        const dist = Math.hypot(poi.location.x - zone.location.x, poi.location.y - zone.location.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearestZone = zone;
        }
      }
      if (nearestZone) {
        poi.properties.LocationID = nearestZone.properties.ZoneID;
      }
    }
  }
}

/**
 * Consolidates multiple zone discovery volume POIs that share the same ZoneID
 * into singular representative POIs positioned at their geometric centroids.
 *
 * @param {WorldPoi[]} pois
 * @param {Map<string, string>} [locationsById]
 * @returns {WorldPoi[]}
 */
export function consolidateZoneCentroids(pois, locationsById = new Map()) {
  /** @type {WorldPoi[]} */
  const result = [];
  /** @type {Map<string, { x: number, y: number, z: number, count: number, poi: WorldPoi }>} */
  const zoneGroups = new Map();

  for (const poi of pois) {
    if (poi.category !== 'zone') {
      result.push(poi);
      continue;
    }

    const zoneId = poi.properties?.ZoneID || poi.id;
    const existing = zoneGroups.get(zoneId);
    if (existing) {
      existing.x += poi.location.x;
      existing.y += poi.location.y;
      existing.z += poi.location.z;
      existing.count++;
    } else {
      zoneGroups.set(zoneId, {
        x: poi.location.x,
        y: poi.location.y,
        z: poi.location.z,
        count: 1,
        poi
      });
    }
  }

  for (const [zoneId, data] of zoneGroups.entries()) {
    const locName = locationsById.get(zoneId) || zoneId;
    const rep = data.poi;
    result.push(
      new WorldPoi({
        id: `Zone_${zoneId}`,
        type: rep.type,
        label: locName,
        cell: rep.cell,
        location: {
          x: Math.round(data.x / data.count),
          y: Math.round(data.y / data.count),
          z: Math.round(data.z / data.count)
        },
        tag: rep.tag,
        properties: { ...rep.properties, ZoneID: zoneId }
      })
    );
  }

  return result;
}

const AMBIENT_FOLIAGE_KEYS = new Set([
  'WR_Stone',
  'WR_Stone_Big',
  'WR_Tree',
  'WR_Tree_Big',
  'WR_Tree_Corrupted',
  'WR_Tree_Log',
  'WR_Tree_Naked',
  'WR_Tree_Palm',
  'WR_Tree_Snow',
  'WR_Tree_Snow_Naked',
  'WR_Tree_Swamp',
  'WR_Tree_Yellow',
  'WR_Tree_Yellow_Young'
]);

/**
 * Normalizes and unrolls a raw instanced foliage component into individual WorldPoi gathering nodes.
 * Categorizes ambient trees and stones into 'foliage' and specialized harvestable nodes into 'resource'.
 *
 * Returns null if the raw POI is not an instanced foliage component, or an array of WorldPoi nodes.
 *
 * @param {any} rawPoi Raw component export JSON object from MainLevel_Pois.json.
 * @param {Map<string, import('../models/WorldResource.js').WorldResource>} worldResourcesById
 * @returns {WorldPoi[] | null}
 */
export function unrollFoliageComponent(rawPoi, worldResourcesById) {
  if (!Array.isArray(rawPoi.Instances)) {
    return null;
  }
  if (rawPoi.Instances.length === 0 || !rawPoi.Location) {
    return [];
  }

  const resourceId = rawPoi.ResourceID;
  const worldResource = worldResourcesById.get(resourceId);
  const category = /** @type {import('../types.js').PoiCategory} */ (
    AMBIENT_FOLIAGE_KEYS.has(resourceId) ? 'foliage' : 'resource'
  );
  const label = worldResource?.displayName || '';
  const originX = rawPoi.Location.X;
  const originY = rawPoi.Location.Y;
  const originZ = rawPoi.Location.Z;

  /** @type {WorldPoi[]} */
  const nodes = [];
  for (let i = 0; i < rawPoi.Instances.length; i++) {
    const inst = rawPoi.Instances[i];
    nodes.push(
      new WorldPoi({
        id: `${rawPoi.Name}_${i}`,
        type: rawPoi.Type,
        category,
        label,
        cell: rawPoi.Cell,
        location: {
          x: originX + inst.X,
          y: originY + inst.Y,
          z: originZ + inst.Z
        },
        properties: {
          resourceTableKey: resourceId
        }
      })
    );
  }
  return nodes;
}
