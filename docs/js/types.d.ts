/**
 * Shared TypeScript type definitions for Monster Alchemy DB.
 */

/** Raw Unreal Engine localized text structure. */
export interface UnrealText {
  Namespace?: string;
  Key?: string;
  SourceString?: string;
  LocalizedString?: string;
  CultureInvariantString?: string | null;
}

/** Raw Unreal Engine object reference (e.g. Struct, Enum, Texture2D). */
export interface UnrealObjectRef {
  ObjectName: string;
  ObjectPath: string;
}

/** Raw Unreal Engine MapProperty entry before normalization. */
export interface RawUnrealMapEntry {
  Key: RawUnrealPropValue;
  Value: RawUnrealPropValue;
}

/** Raw Unreal Engine DataTable row or nested struct dictionary before normalization. */
export interface RawUnrealRow {
  [key: string]: RawUnrealPropValue;
}

/** Raw Unreal Engine value stored inside a DataTable row before normalization. */
export type RawUnrealPropValue =
  | string
  | number
  | boolean
  | UnrealText
  | UnrealObjectRef
  | RawUnrealRow
  | RawUnrealPropValue[]
  | RawUnrealMapEntry[]
  | null
  | undefined;

/** Raw Unreal Engine DataTable JSON asset (`DT_*.json`). */
export interface UnrealDataTableAsset {
  Type: string;
  Name: string;
  Properties?: { RowStruct?: UnrealObjectRef };
  Rows?: Record<string, RawUnrealRow>;
}

/** Raw Unreal Engine struct property entry inside `ChildProperties` (`S_*.json`). */
export interface UnrealStructChildProperty {
  Type: string;
  Name: string;
  Enum?: UnrealObjectRef;
  PropertyClass?: UnrealObjectRef;
  Struct?: UnrealObjectRef;
  Inner?: UnrealStructChildProperty;
  KeyProp?: UnrealStructChildProperty;
  ValueProp?: UnrealStructChildProperty;
}

/** Raw Unreal Engine UserDefinedStruct JSON asset (`S_*.json`). */
export interface UnrealStructAsset {
  Type: string;
  Name: string;
  ChildProperties?: UnrealStructChildProperty[];
}

/** Raw Unreal Engine Blueprint export entry (`BP_*.json`). */
export interface UnrealBlueprintExport {
  Type: string;
  Name: string;
  Class?: string;
  Super?: UnrealObjectRef;
  SuperStruct?: UnrealObjectRef;
  ChildProperties?: UnrealStructChildProperty[];
  Properties?: Record<string, any>;
}

/** Raw Unreal Engine Blueprint JSON asset (`BP_*.json`). */
export type UnrealBlueprintAsset = UnrealBlueprintExport[];

/** Raw Unreal Engine enum display name entry (`E*.json`). */
export interface UnrealEnumDisplayEntry {
  Key: string;
  Value: UnrealText;
}

/** Raw Unreal Engine UserDefinedEnum JSON asset (`E*.json`). */
export interface UnrealEnumAsset {
  Type: string;
  Name: string;
  Properties?: { DisplayNameMap?: UnrealEnumDisplayEntry[] };
  Names?: Record<string, number>;
}

/** Normalized Unreal Engine DataTable row dictionary keyed by clean base property names. */
export type NormalizedUnrealRow = Record<string, any>;
