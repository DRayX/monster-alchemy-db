// @ts-check

/**
 * Shared JSDoc type definitions for Monster Alchemy DB.
 */

/**
 * Raw Unreal Engine localized text structure.
 * @typedef {Object} UnrealText
 * @property {string} [Namespace]
 * @property {string} [Key]
 * @property {string} [SourceString]
 * @property {string} [LocalizedString]
 * @property {?string} [CultureInvariantString]
 */

/**
 * Raw Unreal Engine object reference (e.g. Struct, Enum, Texture2D).
 * @typedef {Object} UnrealObjectRef
 * @property {string} ObjectName
 * @property {string} ObjectPath
 */

/**
 * Raw Unreal Engine value stored inside a DataTable row before normalization.
 * @typedef {string | number | boolean | UnrealText | UnrealObjectRef | null | undefined} RawUnrealPropValue
 */

/**
 * Raw Unreal Engine DataTable row dictionary before normalization.
 * @typedef {Record<string, RawUnrealPropValue>} RawUnrealRow
 */

/**
 * Raw Unreal Engine DataTable JSON asset (`DT_*.json`).
 * @typedef {Object} UnrealDataTableAsset
 * @property {string} Type
 * @property {string} Name
 * @property {{ RowStruct?: UnrealObjectRef }} [Properties]
 * @property {Record<string, RawUnrealRow>} [Rows]
 */

/**
 * Raw Unreal Engine struct property entry inside `ChildProperties` (`S_*.json`).
 * @typedef {Object} UnrealStructChildProperty
 * @property {string} Type
 * @property {string} Name
 * @property {UnrealObjectRef} [Enum]
 * @property {UnrealObjectRef} [PropertyClass]
 * @property {UnrealObjectRef} [Struct]
 */

/**
 * Raw Unreal Engine UserDefinedStruct JSON asset (`S_*.json`).
 * @typedef {Object} UnrealStructAsset
 * @property {string} Type
 * @property {string} Name
 * @property {UnrealStructChildProperty[]} [ChildProperties]
 */

/**
 * Raw Unreal Engine enum display name entry (`E*.json`).
 * @typedef {Object} UnrealEnumDisplayEntry
 * @property {string} Key
 * @property {UnrealText} Value
 */

/**
 * Raw Unreal Engine UserDefinedEnum JSON asset (`E*.json`).
 * @typedef {Object} UnrealEnumAsset
 * @property {string} Type
 * @property {string} Name
 * @property {{ DisplayNameMap?: UnrealEnumDisplayEntry[] }} [Properties]
 * @property {Record<string, number>} [Names]
 */

/**
 * Raw Unreal Engine PaperFlipbook keyframe entry (`FB_*.json`).
 * @typedef {Object} UnrealFlipbookKeyFrame
 * @property {UnrealObjectRef} [Sprite]
 * @property {number} [FrameRun]
 */

/**
 * Raw Unreal Engine PaperFlipbook JSON asset (`FB_*.json`).
 * @typedef {Object} UnrealFlipbookAsset
 * @property {string} Type
 * @property {string} Name
 * @property {{ FramesPerSecond?: number, KeyFrames?: UnrealFlipbookKeyFrame[] }} [Properties]
 */

/**
 * Normalized Unreal Engine DataTable row dictionary keyed by clean base property names.
 * @typedef {Record<string, any>} NormalizedUnrealRow
 */

/**
 * Navigation page identifiers.
 * @typedef {'home' | 'monsters' | 'items'} PageId
 */

export {};

