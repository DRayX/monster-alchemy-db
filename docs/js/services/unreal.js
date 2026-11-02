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
 * Extracts the UserDefinedStruct name referenced by a DataTable's RowStruct property.
 * Returns null if the DataTable uses a native C++ engine struct (e.g. RichImageRow).
 * @param {UnrealDataTableAsset[]} rawTableJson
 * @returns {string | null}
 */
export function getTableRowStructName(rawTableJson) {
  return extractUserDefinedStructName(rawTableJson?.[0]?.Properties?.RowStruct);
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
 * @param {Record<string, string>} enumLookup
 * @returns {NormalizedUnrealRow}
 */
function normalizeStructRow(rawRow, structName, structs, enumLookup) {
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
  const structName = getTableRowStructName(rawTableJson);
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
