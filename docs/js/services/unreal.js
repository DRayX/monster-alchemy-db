// @ts-check

/**
 * Utilities for normalizing raw Unreal Engine DataTable (`DT_*.json`),
 * UserDefinedStruct (`S_*.json`), and UserDefinedEnum (`E*.json`) exports.
 *
 * @typedef {import('../types.js').UnrealText} UnrealText
 * @typedef {import('../types.js').UnrealObjectRef} UnrealObjectRef
 * @typedef {import('../types.js').RawUnrealRow} RawUnrealRow
 * @typedef {import('../types.js').UnrealDataTableAsset} UnrealDataTableAsset
 * @typedef {import('../types.js').UnrealStructChildProperty} UnrealStructChildProperty
 * @typedef {import('../types.js').UnrealStructAsset} UnrealStructAsset
 * @typedef {import('../types.js').UnrealEnumAsset} UnrealEnumAsset
 * @typedef {import('../types.js').NormalizedUnrealRow} NormalizedUnrealRow
 */

/**
 * Extracts a clean string from an Unreal Engine FText object using SourceString.
 * @param {UnrealText | string | null | undefined} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function extractUnrealText(value, fallback = 'Unknown') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'SourceString' in value) {
    return value.SourceString || fallback;
  }
  return fallback;
}

/**
 * Parses an Unreal `UserDefinedEnum` JSON export into a lookup map from
 * `"EnumName::NewEnumeratorX"` to its display string.
 *
 * @param {UnrealEnumAsset[]} rawEnumJson
 * @returns {Record<string, string>}
 */
export function parseUnrealEnum(rawEnumJson) {
  /** @type {Record<string, string>} */
  const map = {};
  const entry = rawEnumJson[0];
  if (!entry || !entry.Name) return map;

  const enumName = entry.Name;
  const displayList = entry.Properties?.DisplayNameMap;
  if (Array.isArray(displayList)) {
    for (const item of displayList) {
      if (item && typeof item.Key === 'string') {
        const label = extractUnrealText(item.Value, item.Key);
        map[`${enumName}::${item.Key}`] = label;
      }
    }
  }
  return map;
}

/**
 * Extracts the UserDefinedStruct name from an Unreal ObjectName reference if applicable.
 * e.g. "UserDefinedStruct'S_Monster_Table'" -> "S_Monster_Table"
 * Returns null for native C++ classes (e.g. "Class'RichImageRow'").
 * @param {UnrealObjectRef | undefined} ref
 * @returns {string | null}
 */
export function extractUserDefinedStructName(ref) {
  if (!ref?.ObjectName?.startsWith("UserDefinedStruct'")) return null;
  return /'(\w+)'/.exec(ref.ObjectName)?.[1] || null;
}

/**
 * Normalizes a single Unreal property value according to its schema descriptor,
 * recursively normalizing nested `StructProperty`, `ArrayProperty`, and `MapProperty` values.
 *
 * @param {any} val
 * @param {UnrealStructChildProperty} prop
 * @param {Record<string, UnrealStructAsset[]>} structs
 * @param {Record<string, string>} enumLookup
 * @returns {any}
 */
function normalizePropertyValue(val, prop, structs, enumLookup) {
  if (val === null || val === undefined) return val;

  switch (prop.Type) {
    case 'TextProperty':
      return extractUnrealText(val, '');

    // Blueprint UserDefinedEnums are serialized as ByteProperty with an Enum reference
    case 'ByteProperty':
    case 'EnumProperty':
      return prop.Enum ? enumLookup[val] || val : val;

    case 'StructProperty': {
      if (typeof val !== 'object' || Array.isArray(val)) return val;
      const nestedStructName = extractUserDefinedStructName(prop.Struct);
      if (!nestedStructName) return val;
      return normalizeStructRow(val, nestedStructName, structs, enumLookup);
    }

    case 'ArrayProperty': {
      if (!Array.isArray(val) || !prop.Inner) return val;
      const innerProp = prop.Inner;
      return val.map((item) => normalizePropertyValue(item, innerProp, structs, enumLookup));
    }

    case 'MapProperty': {
      if (!Array.isArray(val) || !prop.KeyProp || !prop.ValueProp) return val;
      const keyProp = prop.KeyProp;
      const valueProp = prop.ValueProp;
      return val.map((entry) => ({
        Key: normalizePropertyValue(entry.Key, keyProp, structs, enumLookup),
        Value: normalizePropertyValue(entry.Value, valueProp, structs, enumLookup)
      }));
    }

    default:
      return val;
  }
}

/**
 * Normalizes a raw Unreal struct object (either a DataTable row or a nested StructProperty)
 * by mapping `<Name>_<Index>_<32HexGUID>` keys to clean base names and recursively normalizing values.
 *
 * @param {RawUnrealRow} rawRow
 * @param {string} structName
 * @param {Record<string, UnrealStructAsset[]>} structs
 * @param {Record<string, string>} [enumLookup]
 * @returns {NormalizedUnrealRow}
 */
export function normalizeStructRow(rawRow, structName, structs, enumLookup = {}) {
  const rawStructJson = structs[structName];
  if (!rawStructJson) {
    throw new Error(`[Loader] No struct definition found for '${structName}'`);
  }

  const childProps = rawStructJson[0]?.ChildProperties ?? [];
  /** @type {NormalizedUnrealRow} */
  const cleanRow = {};

  for (const prop of childProps) {
    const baseName = prop.Name.replace(/_\d+_[0-9A-Fa-f]{32}$/, '');
    cleanRow[baseName] = normalizePropertyValue(rawRow[prop.Name], prop, structs, enumLookup);
  }

  return cleanRow;
}

/**
 * Normalizes all rows from an Unreal DataTable JSON export by automatically resolving its
 * struct schema from `RowStruct` and applying enum lookups:
 * - Maps each exact serialized property key (`Name_44_...`) to its clean base name (`Name`)
 * - Automatically extracts `SourceString` for `TextProperty` fields
 * - Automatically resolves enum display strings for `ByteProperty` and `EnumProperty` fields
 * - Recursively normalizes nested `StructProperty`, `ArrayProperty`, and `MapProperty` fields
 *
 * @param {UnrealDataTableAsset[]} rawTableJson
 * @param {Record<string, UnrealStructAsset[]>} structs
 * @param {Record<string, string>} [enumLookup]
 * @returns {Record<string, NormalizedUnrealRow>}
 */
export function extractNormalizedRows(rawTableJson, structs, enumLookup = {}) {
  const structName = extractUserDefinedStructName(rawTableJson?.[0]?.Properties?.RowStruct);
  if (structName && !structs[structName]) {
    throw new Error(`[Loader] No struct definition found for table struct '${structName}'`);
  }

  /** @type {Record<string, NormalizedUnrealRow>} */
  const normalized = {};
  for (const entry of rawTableJson) {
    if (!entry.Rows) continue;
    for (const [rowId, rawRow] of Object.entries(entry.Rows)) {
      normalized[rowId] = structName
        ? normalizeStructRow(rawRow, structName, structs, enumLookup)
        : rawRow;
    }
  }

  return normalized;
}

/**
 * A Map implementation that performs case-insensitive string key lookups,
 * matching Unreal Engine's native `FName` comparison semantics while preserving
 * canonical key casing in `keys()`, `entries()`, and iteration.
 *
 * @template T
 * @extends {Map<string, T>}
 */
export class CaseInsensitiveMap extends Map {
  /** @type {Map<string, string>} */
  #keyMap = new Map();

  /**
   * @param {Iterable<[string, T]>} [entries]
   */
  constructor(entries) {
    super();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  /**
   * @param {string} key
   * @returns {T | undefined}
   */
  get(key) {
    const canonical = this.#keyMap.get(key.toLowerCase());
    return canonical !== undefined ? super.get(canonical) : undefined;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.#keyMap.has(key.toLowerCase());
  }

  /**
   * @param {string} key
   * @param {T} value
   * @returns {this}
   */
  set(key, value) {
    const lower = key.toLowerCase();
    const existing = this.#keyMap.get(lower);
    if (existing !== undefined) {
      super.delete(existing);
    }
    this.#keyMap.set(lower, key);
    super.set(key, value);
    return this;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    const lower = key.toLowerCase();
    const canonical = this.#keyMap.get(lower);
    if (canonical === undefined) return false;
    this.#keyMap.delete(lower);
    return super.delete(canonical);
  }

  clear() {
    this.#keyMap.clear();
    super.clear();
  }

  /**
   * Returns the canonical [key, value] entry for a key, or undefined if not found.
   * @param {string} key
   * @returns {[string, T] | undefined}
   */
  entry(key) {
    const canonical = this.#keyMap.get(key.toLowerCase());
    if (canonical === undefined) return undefined;
    return [canonical, /** @type {T} */ (super.get(canonical))];
  }
}

/**
 * Resolves the canonical Blueprint asset name from an Unreal class name or object reference.
 * e.g. "BP_Coliseum_Child_C" -> "BP_Coliseum_Child"
 * e.g. { ObjectName: "BlueprintGeneratedClass'BP_Coliseum_C'" } -> "BP_Coliseum"
 *
 * @param {string | UnrealObjectRef | undefined} ref
 * @returns {string | null}
 */
export function extractBlueprintName(ref) {
  if (!ref) return null;
  const str = typeof ref === 'string' ? ref : ref.ObjectName;
  if (!str) return null;
  const match = /'(\w+)'/.exec(str);
  const rawName = match ? match[1] : str;
  return rawName.endsWith('_C') ? rawName.slice(0, -2) : rawName;
}

/**
 * Normalizes a Blueprint instance's properties dictionary using its Blueprint class definition
 * and Class Default Object (CDO) template:
 * - Walks the Blueprint class hierarchy (`SuperStruct` / `Super`) to resolve inherited properties and CDO defaults.
 * - Merges CDO defaults for any properties not explicitly overridden on the instance.
 * - Normalizes properties according to their `ChildProperties` schema descriptors (nested structs, arrays, enums, text).
 * - Preserves any non-schema properties without heuristic sniffing.
 *
 * @param {Record<string, any>} instanceProps Raw Properties dictionary from level export
 * @param {string} bpType Blueprint class type (e.g. 'BP_DungeonManager_C', 'BP_Coliseum_Child_C')
 * @param {Record<string, any>} schemas Combined Struct and Blueprint definitions
 * @param {Record<string, string>} [enumLookup]
 * @returns {Record<string, any>}
 */
export function normalizeBlueprintProperties(instanceProps, bpType, schemas, enumLookup = {}) {
  // 1. Build the Blueprint class inheritance hierarchy (from base class to derived class)
  /** @type {import('../types.js').UnrealBlueprintAsset[]} */
  const hierarchy = [];
  let bpName = extractBlueprintName(bpType);

  while (bpName) {
    const bpAsset = /** @type {import('../types.js').UnrealBlueprintAsset | undefined} */ (schemas[bpName]);
    if (!bpAsset) break;
    hierarchy.unshift(bpAsset);

    const bgc = bpAsset.find((e) => e.Type === 'BlueprintGeneratedClass');
    bpName = extractBlueprintName(bgc?.SuperStruct || bgc?.Super);
  }

  // 2. CDO default property fallback (base class defaults overridden by derived, overridden by instance)
  /** @type {Record<string, any>} */
  const combinedProps = {};
  for (const bpAsset of hierarchy) {
    const cdo = bpAsset.find((e) => e.Name?.startsWith('Default__') || e.Type?.startsWith('Default__'));
    if (cdo?.Properties) {
      Object.assign(combinedProps, cdo.Properties);
    }
  }
  Object.assign(combinedProps, instanceProps);

  // 3. Collect ChildProperties declarations across all classes in the hierarchy
  /** @type {Map<string, import('../types.js').UnrealStructChildProperty>} */
  const childPropMap = new Map();
  for (const bpAsset of hierarchy) {
    const bgc = bpAsset.find((e) => e.Type === 'BlueprintGeneratedClass');
    if (bgc?.ChildProperties) {
      for (const prop of bgc.ChildProperties) {
        childPropMap.set(prop.Name, prop);
      }
    }
  }

  // 4. Normalize properties
  /** @type {Record<string, any>} */
  const clean = {};
  const processedKeys = new Set();

  for (const [propName, prop] of childPropMap.entries()) {
    const baseName = propName.replace(/_\d+_[0-9A-Fa-f]{32}$/, '');
    const val = combinedProps[prop.Name];
    processedKeys.add(prop.Name);

    if (val !== undefined) {
      clean[baseName] = normalizePropertyValue(val, prop, /** @type {Record<string, import('../types.js').UnrealStructAsset[]>} */ (schemas), enumLookup);
    }
  }

  // 5. Retain any remaining properties not explicitly in ChildProperties
  for (const [key, val] of Object.entries(combinedProps)) {
    if (!processedKeys.has(key)) {
      clean[key] = val;
    }
  }

  return clean;
}


