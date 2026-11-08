#!/usr/bin/env dotnet-script
#nullable enable
#r "nuget: CUE4Parse, 1.2.2.202607"
#r "nuget: CUE4Parse-Conversion, 1.2.2.202607"
#r "nuget: SkiaSharp, 2.88.9"
#r "nuget: Newtonsoft.Json, 13.0.4"
#r "nuget: CommandLineParser, 2.9.1"

// ============================================================================
// Monster Alchemy Asset Extraction Automation Script
// Extracts game assets: DataTables, Structs, Enums, UI Textures, Monster Profiles,
// Sprite Sheets, and Resource Icons into disk files and generates manifest.json.
// ============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CommandLine;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Exports.Component.StaticMesh;
using CUE4Parse.UE4.Assets.Exports.Engine;
using CUE4Parse.UE4.Assets.Exports.Texture;
using CUE4Parse.UE4.Assets.Objects;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Objects.Core.Math;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;
using CUE4Parse_Conversion.Textures;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SkiaSharp;

class Options
{
    [Option("paks", Default = "./depot/MonsterAlchemy/Content/Paks", HelpText = "Path to game Paks folder")]
    public string PaksDir { get; set; } = null!;

    [Option('m', "mappings", Default = "./MonsterAlchemy.usmap", HelpText = "Path to .usmap mapping file")]
    public string MappingsPath { get; set; } = null!;

    [Option('o', "out", Default = "./docs/extracted", HelpText = "Output root directory")]
    public string OutputDir { get; set; } = null!;

    [Option("meta", Default = "./docs/meta", HelpText = "Metadata output directory")]
    public string MetaDir { get; set; } = null!;

    [Option("aes", HelpText = "Optional AES encryption key hex")]
    public string? AesKey { get; set; }
}

/// <summary>
/// Core DataTables required by the web application.
/// Full paths are resolved dynamically via VFS search.
/// </summary>
static readonly string[] WEBAPP_DATA_TABLE_NAMES = new[]
{
    "DT_MonsterTable",
    "DT_MonsterRewards",
    "DT_Fusion_Explicit",
    "DT_Fusion_Generic",
    "DT_Fusion_Generic_Converted",
    "DT_ResourceData",
    "DT_CraftRecipes",
    "DT_Rooms",
    "DT_MonsterSkillLevels",
    "DT_ActiveSkills",
    "DT_PassiveSkills",
    "RDT_DialogueDecoratorImage",
    "DT_Spawns",
    "DT_WorldResources",
    "DT_Locations"
};

/// <summary>
/// Canonical general UI icons mapped by key to Unreal asset name.
/// </summary>
static readonly (string Key, string Asset)[] GENERAL_ICON_DEFINITIONS = new[]
{
    ("Player", "T_Icon_Player"),
    ("Tower", "T_Icon_Tower"),
    ("Shop", "T_Icon_Shop"),
    ("Map", "T_Icon_MarkerRed"),
    ("Spawner", "T_AlertMonster_Icon"),
    ("Chest", "Chest"),
    ("Scroll", "T_Icon_Scroll"),
    ("Obelisk", "Teleport"),
    ("Quest", "T_Icon_Quest_01"),
    ("Fight", "T_IconFight"),
    ("Dungeon", "T_DungeonDoor"),
    ("Inn", "T_Icon_Inn"),
    ("Ferry", "T_Map_PirateIsland"),
    ("Dialogue", "T_Icon_Quest_02")
};

/// <summary>
/// Canonical overworld map texture Unreal asset name.
/// </summary>
const string WORLD_MAP_ASSET_NAME = "Map";

/// <summary>
/// Set of overworld POI classes (and base classes whose subclasses are matched via SuperStruct)
/// to extract from World Partition cells and persistent level.
/// </summary>
static readonly HashSet<string> WORLD_POI_CLASSES = new(StringComparer.OrdinalIgnoreCase)
{
    "BP_Spawner_C",
    "BP_WorldChest_C",
    "BP_Recipe_C",
    "BP_Interactable_ExpObelisk_C",
    "BP_DungeonDoor_C",
    "BP_DungeonDoor_Exit_C",
    "BP_DungeonManager_C",
    "BP_ColisseumDoor_C",
    "BP_Coliseum_C",
    "BP_ZoneDiscoveryVolume_C",
    "BP_AlchemistTower_Interact_C",
    "BP_NPC_StaticDialogue_C",
    "BP_NPC_Battle_C",
    "BP_Cinematic_C",
    "BP_ArcaneEye_C",
    "BP_ArcaneObject_C",
    "BP_ArcaneTrigger_C",
    "BP_ArcaneCube_C",
    "BP_Spring_C",
    "BP_Spring_Target_C"
};

// ============================================================================
// Helpers
// ============================================================================

string StripExportIndex(string path)
{
    var dotIdx = path.LastIndexOf('.');
    return dotIdx >= 0 ? path[..dotIdx] : path;
}

string StripStructPropertyGuid(string name) => Regex.Replace(name, @"_\d+_[0-9A-Fa-f]{32}$", "");

string? ResolveStructPropertyName(UDataTable dataTable, string baseName) =>
    dataTable.GetOrDefault<FPackageIndex>("RowStruct")?.Load<UStruct>()?.ChildProperties?
        .Select(p => p.Name.Text)
        .FirstOrDefault(n => StripStructPropertyGuid(n).Equals(baseName, StringComparison.OrdinalIgnoreCase));

string EnsureDir(string filePath)
{
    var dir = Path.GetDirectoryName(filePath);
    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    return filePath;
}

Task SaveFileAsync(string path, byte[] bytes) => File.WriteAllBytesAsync(EnsureDir(path), bytes);
Task SaveFileAsync(string path, string text) => File.WriteAllTextAsync(EnsureDir(path), text);
Task SaveJsonAsync(string path, object data) => SaveFileAsync(path, JsonConvert.SerializeObject(data, Formatting.Indented).Replace("\r\n", "\n") + "\n");

string VfsToGamePackagePath(string vfsPath)
{
    var norm = vfsPath.Replace('\\', '/').TrimStart('/');
    if (norm.EndsWith(".uasset", StringComparison.OrdinalIgnoreCase)) norm = norm[..^7];
    var contentIdx = norm.IndexOf("Content/", StringComparison.OrdinalIgnoreCase);
    if (contentIdx >= 0) norm = norm[(contentIdx + 8)..];
    else if (norm.StartsWith("Game/", StringComparison.OrdinalIgnoreCase)) norm = norm[5..];
    return "/Game/" + norm.TrimStart('/');
}

string? ResolveAssetPackage(Dictionary<string, List<string>> vfsByName, string assetName, string category)
{
    if (!vfsByName.TryGetValue(assetName, out var matches) || matches.Count == 0)
        return null;
    if (matches.Count > 1)
        Console.WriteLine($"  [Warning] Multiple assets found for {category} '{assetName}': using '{matches[0]}'");
    return VfsToGamePackagePath(matches[0]);
}

bool RegisterIcon(
    Dictionary<string, List<string>> vfsByName,
    string key,
    string assetName,
    string category,
    IDictionary<string, string> targetMap,
    ISet<string> textureBatch)
{
    var path = ResolveAssetPackage(vfsByName, assetName, category);
    if (path == null) return false;
    targetMap[key] = $"{path}.png";
    textureBatch.Add(path);
    return true;
}

string? ResolveReferencedTexture(DefaultFileProvider provider, string? packagePath, Func<IEnumerable<UObject>, string?> selector, string label)
{
    if (string.IsNullOrEmpty(packagePath)) return null;
    try
    {
        var exports = provider.LoadPackage(packagePath.TrimStart('/')).GetExports();
        var objPath = exports != null ? selector(exports) : null;
        return string.IsNullOrEmpty(objPath) ? null : VfsToGamePackagePath(StripExportIndex(objPath));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"  [{label} Error] {packagePath}: {ex.Message}");
        return null;
    }
}

IEnumerable<FPackageIndex?> GetFieldTypeRefs(FField? field) => field switch
{
    FByteProperty b => new[] { b.Enum },
    FEnumProperty e => new[] { e.Enum },
    FStructProperty s => new[] { s.Struct },
    FArrayProperty a => GetFieldTypeRefs(a.Inner),
    FSetProperty set => GetFieldTypeRefs(set.ElementProp),
    FMapProperty m => GetFieldTypeRefs(m.KeyProp).Concat(GetFieldTypeRefs(m.ValueProp)),
    _ => Enumerable.Empty<FPackageIndex?>()
};

void DiscoverDependencies(UObject? export, Queue<string> pendingQueue, HashSet<string> seenPackages)
{
    var refs = export switch
    {
        UDataTable dt => new[] { dt.GetOrDefault<FPackageIndex>("RowStruct") },
        UStruct st when st.ChildProperties != null => st.ChildProperties.SelectMany(GetFieldTypeRefs),
        _ => Enumerable.Empty<FPackageIndex?>()
    };

    foreach (var resolved in refs.Select(r => r?.ResolvedObject).Where(r => r != null))
    {
        if (resolved!.Class?.Name.Text is "UserDefinedStruct" or "UserDefinedEnum")
        {
            var cleanPath = StripExportIndex(resolved.GetPathName());
            if (cleanPath.StartsWith("/Game/", StringComparison.OrdinalIgnoreCase) && seenPackages.Add(cleanPath))
                pendingQueue.Enqueue(cleanPath);
        }
    }

    if (export is UStruct ust && ust.SuperStruct.ResolvedObject is { } superObj && superObj.Class?.Name.Text == "BlueprintGeneratedClass")
    {
        var cleanSuperPath = StripExportIndex(superObj.GetPathName());
        if (cleanSuperPath.StartsWith("/Game/", StringComparison.OrdinalIgnoreCase) && seenPackages.Add(cleanSuperPath))
            pendingQueue.Enqueue(cleanSuperPath);
    }
}

async Task<int> ExtractTexturesAsync(
    DefaultFileProvider provider,
    IEnumerable<string> fileKeys,
    string outputDir,
    string label)
{
    int count = 0;
    foreach (var fileKey in fileKeys)
    {
        var gamePath = VfsToGamePackagePath(fileKey);
        try
        {
            var exports = provider.LoadPackage(gamePath.TrimStart('/')).GetExports();
            if (exports == null) continue;

            foreach (var export in exports.OfType<UTexture2D>())
            {
                var ctexture = TextureDecoder.Decode(export);
                if (ctexture == null) continue;
                using var bitmap = TextureEncoder.ToSkBitmap(ctexture);
                if (bitmap == null) continue;

                using var image = SKImage.FromBitmap(bitmap);
                using var data = image.Encode(SKEncodedImageFormat.Png, 100);
                var destFile = Path.Combine(outputDir, gamePath.TrimStart('/') + ".png");
                await SaveFileAsync(destFile, data.ToArray());
                count++;
                Console.WriteLine($"  [{label}] {gamePath}.png");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [{label} Error] {gamePath}: {ex.Message}");
        }
    }
    return count;
}

async Task<SortedDictionary<string, string>> ResolveAndExtractReferencedTexturesAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    IEnumerable<string> ids,
    Func<string, string> assetNamePattern,
    Func<IEnumerable<UObject>, string?> textureSelector,
    string outputDir,
    string label)
{
    var iconMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var texturesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    int missingCount = 0;

    foreach (var id in ids)
    {
        var pkgPath = ResolveAssetPackage(vfsByName, assetNamePattern(id), label);
        if (pkgPath == null)
        {
            missingCount++;
            continue;
        }

        var texGamePath = ResolveReferencedTexture(provider, pkgPath, textureSelector, label);
        if (texGamePath != null)
        {
            texturesToExtract.Add(texGamePath);
            iconMap[id] = $"{texGamePath}.png";
        }
    }

    Console.WriteLine($"  Discovered {texturesToExtract.Count} unique {label} texture(s) ({missingCount} missing). Extracting textures...");
    await ExtractTexturesAsync(provider, texturesToExtract, outputDir, label);
    return iconMap;
}

// ============================================================================
// Pipeline Phases
// ============================================================================

(DefaultFileProvider Provider, Dictionary<string, List<string>> VfsByName) InitializeProvider(Options opts)
{
    string paksDir = Path.GetFullPath(opts.PaksDir);
    string mappingsPath = Path.GetFullPath(opts.MappingsPath);

    if (!Directory.Exists(paksDir))
        throw new DirectoryNotFoundException($"Paks directory does not exist at '{paksDir}'.");

    if (!File.Exists(mappingsPath))
        throw new FileNotFoundException($"Mappings file (.usmap) not found at '{mappingsPath}'.");

    Console.WriteLine("[Provider] Initializing CUE4Parse FileProvider (UE5.5)...");
    var version = new VersionContainer(EGame.GAME_UE5_5);
    var provider = new DefaultFileProvider(paksDir, SearchOption.TopDirectoryOnly, version, StringComparer.OrdinalIgnoreCase);

    Console.WriteLine($"[Provider] Loading mapping file: {Path.GetFileName(mappingsPath)}...");
    provider.MappingsContainer = new FileUsmapTypeMappingsProvider(mappingsPath);
    provider.Initialize();

    if (!string.IsNullOrWhiteSpace(opts.AesKey))
        provider.SubmitKey(new FGuid(), new FAesKey(opts.AesKey));

    provider.Mount();
    provider.PostMount();
    Console.WriteLine($"[Provider] Mounted {provider.MountedVfs.Count} VFS archive(s). Total files indexed: {provider.Files.Count}");
    Console.WriteLine();

    var vfsByName = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
    foreach (var fileKey in provider.Files.Keys.Where(k => k.EndsWith(".uasset", StringComparison.OrdinalIgnoreCase)))
    {
        var fileName = Path.GetFileNameWithoutExtension(fileKey);
        if (!vfsByName.TryGetValue(fileName, out var list))
            vfsByName[fileName] = list = new List<string>();
        list.Add(fileKey);
    }

    return (provider, vfsByName);
}

async Task<(
    SortedDictionary<string, string> DataTables,
    SortedDictionary<string, string> Structs,
    SortedDictionary<string, string> Enums,
    SortedDictionary<string, string> Blueprints,
    List<string> MonsterIds,
    List<string> ResourceIds,
    SortedDictionary<string, string> RoomIcons,
    HashSet<string> RoomTextures,
    SortedDictionary<string, string> DecoratorIcons,
    HashSet<string> DecoratorTextures)>
ExtractDataTablesAndTypesAsync(DefaultFileProvider provider, Dictionary<string, List<string>> vfsByName, IReadOnlyCollection<string> poiClasses, string outputDir)
{
    var seenPackages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var pendingQueue = new Queue<string>();

    Console.WriteLine($"[Discovery] Resolving {WEBAPP_DATA_TABLE_NAMES.Length} required DataTable(s) by name...");
    foreach (var tableName in WEBAPP_DATA_TABLE_NAMES)
    {
        var gamePath = ResolveAssetPackage(vfsByName, tableName, "DataTable");
        if (gamePath != null && seenPackages.Add(gamePath))
            pendingQueue.Enqueue(gamePath);
        else if (gamePath == null)
            Console.WriteLine($"  [Warning] DataTable '{tableName}' not found in VFS archives.");
    }

    var monsterIds = new List<string>();
    var resourceIds = new List<string>();
    var roomIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var roomTexturesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var decoratorIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var decoratorTexturesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    var dataTablesMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var structsMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var enumsMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var blueprintsMap = new SortedDictionary<string, string>(StringComparer.Ordinal);

    Console.WriteLine($"[Discovery] Enqueuing {poiClasses.Count} world POI Blueprint class(es)...");
    foreach (var poiClass in poiClasses)
    {
        var baseName = poiClass.EndsWith("_C", StringComparison.OrdinalIgnoreCase)
            ? poiClass.Substring(0, poiClass.Length - 2)
            : poiClass;

        var gamePath = ResolveAssetPackage(vfsByName, baseName, "WorldPoiBlueprint");
        if (gamePath != null && seenPackages.Add(gamePath))
        {
            pendingQueue.Enqueue(gamePath);
        }
    }

    Console.WriteLine("==> [Phase 1/5] Extracting DataTables, Structs, Enums, and Blueprints...");

    while (pendingQueue.Count > 0)
    {
        var packagePath = pendingQueue.Dequeue();
        var lookupPath = packagePath.TrimStart('/');

        try
        {
            var exports = provider.LoadPackage(lookupPath).GetExports();
            if (exports == null) continue;

            var primaryExport = exports.FirstOrDefault();

            if (primaryExport is UDataTable dataTable)
            {
                if (packagePath.EndsWith("DT_MonsterTable", StringComparison.OrdinalIgnoreCase))
                {
                    monsterIds.AddRange(dataTable.RowMap.Keys.Select(k => k.Text));
                    Console.WriteLine($"  [Data] Loaded {monsterIds.Count} monster ID(s) from DT_MonsterTable into memory.");
                }
                else if (packagePath.EndsWith("DT_ResourceData", StringComparison.OrdinalIgnoreCase))
                {
                    resourceIds.AddRange(dataTable.RowMap.Keys
                        .Select(k => k.Text)
                        .Where(n => !n.Equals("None", StringComparison.OrdinalIgnoreCase)));
                    Console.WriteLine($"  [Data] Loaded {resourceIds.Count} resource ID(s) from DT_ResourceData into memory.");
                }
                else if (packagePath.EndsWith("DT_Rooms", StringComparison.OrdinalIgnoreCase))
                {
                    var iconPropName = ResolveStructPropertyName(dataTable, "Icon");
                    if (iconPropName != null)
                    {
                        foreach (var (rowKey, rowStruct) in dataTable.RowMap)
                        {
                            var iconObjPath = rowStruct.GetOrDefault<FPackageIndex>(iconPropName)?.ResolvedObject?.GetPathName();
                            if (!string.IsNullOrEmpty(iconObjPath))
                            {
                                var texGamePath = VfsToGamePackagePath(StripExportIndex(iconObjPath));
                                roomTexturesToExtract.Add(texGamePath);
                                roomIconMap[rowKey.Text] = $"{texGamePath}.png";
                            }
                        }
                    }
                    Console.WriteLine($"  [Data] Loaded {roomIconMap.Count} room icon reference(s) from DT_Rooms into memory.");
                }
                else if (packagePath.EndsWith("RDT_DialogueDecoratorImage", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var (rowKey, rowStruct) in dataTable.RowMap)
                    {
                        var brush = rowStruct.GetOrDefault<FStructFallback>("Brush");
                        var resObj = brush?.GetOrDefault<FPackageIndex>("ResourceObject");
                        var objPath = resObj?.ResolvedObject?.GetPathName();
                        if (!string.IsNullOrEmpty(objPath))
                        {
                            var texGamePath = VfsToGamePackagePath(StripExportIndex(objPath));
                            decoratorTexturesToExtract.Add(texGamePath);
                            decoratorIconMap[rowKey.Text] = $"{texGamePath}.png";
                        }
                    }
                    Console.WriteLine($"  [Data] Loaded {decoratorIconMap.Count} decorator icon reference(s) from RDT_DialogueDecoratorImage into memory.");
                }
            }

            foreach (var exp in exports.OfType<UStruct>())
            {
                DiscoverDependencies(exp, pendingQueue, seenPackages);
            }
            if (primaryExport is UDataTable)
            {
                DiscoverDependencies(primaryExport, pendingQueue, seenPackages);
            }

            await SaveJsonAsync(Path.Combine(outputDir, lookupPath + ".json"), exports);

            var assetName = Path.GetFileName(packagePath);
            var canonicalPackagePath = "/" + lookupPath + ".json";

            var bgcExport = exports.FirstOrDefault(e => e.ExportType == "BlueprintGeneratedClass");

            var (map, tag) = primaryExport?.ExportType switch
            {
                "DataTable" => (dataTablesMap, "DataTable"),
                "UserDefinedStruct" => (structsMap, "Struct"),
                "UserDefinedEnum" => (enumsMap, "Enum"),
                _ when bgcExport != null => (blueprintsMap, "Blueprint"),
                _ => (null, primaryExport?.ExportType ?? "Unknown")
            };

            if (map != null)
            {
                map[assetName] = canonicalPackagePath;
                Console.WriteLine($"  [{tag,-9}] {canonicalPackagePath}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [Error] Failed to process '{packagePath}': {ex.Message}");
        }
    }

    return (dataTablesMap, structsMap, enumsMap, blueprintsMap, monsterIds, resourceIds, roomIconMap, roomTexturesToExtract, decoratorIconMap, decoratorTexturesToExtract);
}

async Task<(SortedDictionary<string, string> UiIcons, SortedDictionary<string, string> RoomIcons, SortedDictionary<string, string> GeneralIcons, string? WorldMap)> ExtractUiIconsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    SortedDictionary<string, string> roomIcons,
    HashSet<string> roomTextures,
    SortedDictionary<string, string> decoratorIcons,
    HashSet<string> decoratorTextures,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 2/5] Extracting UI, Icon & Map Textures...");

    var generalIcons = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var uiTexturesToExtract = new HashSet<string>(roomTextures, StringComparer.OrdinalIgnoreCase);
    uiTexturesToExtract.UnionWith(decoratorTextures);

    foreach (var (key, assetName) in GENERAL_ICON_DEFINITIONS)
    {
        if (!RegisterIcon(vfsByName, key, assetName, "general icon", generalIcons, uiTexturesToExtract))
            Console.WriteLine($"  [Warning] General icon asset '{assetName}' not found in VFS archives.");
    }

    string? worldMap = null;
    var mapPackage = ResolveAssetPackage(vfsByName, WORLD_MAP_ASSET_NAME, "world map texture");
    if (mapPackage != null)
    {
        worldMap = mapPackage + ".png";
        uiTexturesToExtract.Add(mapPackage);
    }
    else
    {
        Console.WriteLine($"  [Warning] World map texture asset '{WORLD_MAP_ASSET_NAME}' not found in VFS archives.");
    }

    Console.WriteLine($"  Discovered {uiTexturesToExtract.Count} UI/icon/map texture(s). Extracting textures...");
    await ExtractTexturesAsync(provider, uiTexturesToExtract, outputDir, "UI/Icon");

    return (decoratorIcons, roomIcons, generalIcons, worldMap);
}

async Task<(SortedDictionary<string, string> Icons, SortedDictionary<string, string> Sprites)> ExtractMonsterVisualsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    List<string> monsterIds,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 3/5] Extracting Monster Profile Icons (P_<MonsterID>)...");

    var monsterIconMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var profileCandidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    int missingProfileCount = monsterIds.Count(id => !RegisterIcon(vfsByName, id, $"P_{id}", "Profile", monsterIconMap, profileCandidates));

    Console.WriteLine($"  Matched {profileCandidates.Count} profile icon(s) for {monsterIds.Count} monsters ({missingProfileCount} not found)...");
    await ExtractTexturesAsync(provider, profileCandidates, outputDir, "Profile");

    Console.WriteLine();
    Console.WriteLine("==> [Phase 4/5] Extracting Monster Sprite Sheets (FB_<MonsterID>_Idle)...");

    var monsterSpriteMap = await ResolveAndExtractReferencedTexturesAsync(
        provider,
        vfsByName,
        monsterIds,
        id => $"FB_{id}_Idle",
        exports =>
        {
            var keyFrames = exports.FirstOrDefault()?.GetOrDefault<FStructFallback[]>("KeyFrames");
            var spritePath = keyFrames?.FirstOrDefault()?.GetOrDefault<FPackageIndex>("Sprite")?.ResolvedObject?.GetPathName();
            return spritePath != null ? Regex.Replace(StripExportIndex(spritePath), @"_Sprite_\d+$", "", RegexOptions.IgnoreCase) : null;
        },
        outputDir,
        "SpriteSheet");

    return (monsterIconMap, monsterSpriteMap);
}

async Task<SortedDictionary<string, string>> ExtractResourceVisualsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    List<string> resourceIds,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 5/5] Extracting Resource Icons & Building Resource Icon Map (T_<ItemID>_Sprite)...");

    return await ResolveAndExtractReferencedTexturesAsync(
        provider,
        vfsByName,
        resourceIds,
        id => $"T_{id}_Sprite",
        exports =>
        {
            var paperSprite = exports.FirstOrDefault(e => string.Equals(e.ExportType, "PaperSprite", StringComparison.OrdinalIgnoreCase));
            var texIndex = paperSprite?.GetOrDefault<FPackageIndex>("BakedSourceTexture")
                ?? paperSprite?.GetOrDefault<FPackageIndex>("SourceTexture");
            return texIndex?.ResolvedObject?.GetPathName();
        },
        outputDir,
        "Resource");
}

bool TryGetActorTransform(UObject exp, out FVector loc, out FVector? scale, out FRotator? rot)
{
    loc = default;
    scale = null;
    rot = null;

    if (!exp.TryGetValue(out FPackageIndex rootIdx, "RootComponent") || !rootIdx.TryLoad(out var rootComp))
        return false;

    if (!rootComp.TryGetValue(out loc, "RelativeLocation"))
        return false;

    if (rootComp.TryGetValue(out FVector s, "RelativeScale3D"))
        scale = s;

    if (rootComp.TryGetValue(out FRotator r, "RelativeRotation"))
        rot = r;

    return true;
}

bool IsWorldPoiClass(UObject exp, Dictionary<string, bool> classCache)
{
    if (classCache.TryGetValue(exp.ExportType, out bool cached))
        return cached;

    if (WORLD_POI_CLASSES.Contains(exp.ExportType))
    {
        classCache[exp.ExportType] = true;
        return true;
    }

    bool matched = false;
    var cls = exp.Template?.Load()?.Class?.Load() as UStruct;
    while (cls != null)
    {
        if (WORLD_POI_CLASSES.Contains(cls.Name))
        {
            matched = true;
            break;
        }
        cls = cls.SuperStruct != null && cls.SuperStruct.TryLoad(out var sup) ? sup as UStruct : null;
    }

    classCache[exp.ExportType] = matched;
    return matched;
}

bool IsDebugChildActor(UObject exp)
{
    return exp.TryGetValue(out FPackageIndex parentComp, "ParentComponent") &&
           parentComp.ResolvedObject?.Outer?.Name.Text.StartsWith("BP_Debug_C", StringComparison.OrdinalIgnoreCase) == true;
}

async Task<(string Path, HashSet<string> Classes)> ExtractWorldPoisAsync(DefaultFileProvider provider, string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 1/5] Extracting World POIs...");

    var cells = provider.Files.Values
        .Where(f => f.Path.StartsWith("MonsterAlchemy/Content/Levels/MainLevel", StringComparison.OrdinalIgnoreCase) && f.Path.EndsWith(".umap", StringComparison.OrdinalIgnoreCase))
        .ToList();

    Console.WriteLine($"  Scanning {cells.Count} level file(s) (persistent level + World Partition cells)...");

    var pois = new List<JObject>();
    var classCache = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
    var discoveredClasses = new HashSet<string>(WORLD_POI_CLASSES, StringComparer.OrdinalIgnoreCase);

    foreach (var cell in cells)
    {
        if (!provider.TryLoadPackage(cell.Path, out var pkg))
            continue;

        string cellName = Path.GetFileNameWithoutExtension(cell.Path);

        foreach (var exp in pkg.GetExports())
        {
            if (IsWorldPoiClass(exp, classCache))
            {
                if (IsDebugChildActor(exp) || !TryGetActorTransform(exp, out var loc, out var scale, out var rot))
                    continue;

                discoveredClasses.Add(exp.ExportType);

                var obj = JObject.FromObject(exp);
                obj["Cell"] = cellName;
                obj["Location"] = new JObject
                {
                    ["X"] = loc.X,
                    ["Y"] = loc.Y,
                    ["Z"] = loc.Z
                };

                if (scale != null)
                {
                    obj["Scale"] = new JObject
                    {
                        ["X"] = scale.Value.X,
                        ["Y"] = scale.Value.Y,
                        ["Z"] = scale.Value.Z
                    };
                }

                if (rot != null)
                {
                    obj["Rotation"] = new JObject
                    {
                        ["Pitch"] = rot.Value.Pitch,
                        ["Yaw"] = rot.Value.Yaw,
                        ["Roll"] = rot.Value.Roll
                    };
                }

                pois.Add(obj);
            }
            else if (exp.ExportType.StartsWith("BP_InstancedInteractiveFoliageComponent_", StringComparison.OrdinalIgnoreCase) && exp is UFoliageInstancedStaticMeshComponent foliageComp)
            {
                if (foliageComp.PerInstanceSMData == null || foliageComp.PerInstanceSMData.Length == 0)
                    continue;

                FVector origin = FVector.ZeroVector;
                if (exp.Outer?.Object?.Value is UObject outerObj && outerObj.TryGetValue(out FPackageIndex rootIdx, "RootComponent") && rootIdx.TryLoad(out var rootComp) && rootComp.TryGetValue(out FVector rootLoc, "RelativeLocation"))
                {
                    origin = rootLoc;
                }

                // Dynamically read the native Resource_ID from the component's blueprint CDO template hierarchy
                string resourceId = "";
                var cdo = exp.Template?.Object?.Value as UObject;
                while (cdo != null)
                {
                    if (cdo.TryGetValue(out FName resId, "Resource_ID"))
                    {
                        resourceId = resId.Text;
                        break;
                    }
                    cdo = cdo.Template?.Object?.Value as UObject;
                }

                var obj = new JObject
                {
                    ["Type"] = exp.ExportType,
                    ["Name"] = exp.Name,
                    ["Cell"] = cellName,
                    ["ResourceID"] = resourceId,
                    ["Location"] = new JObject
                    {
                        ["X"] = origin.X,
                        ["Y"] = origin.Y,
                        ["Z"] = origin.Z
                    },
                    ["Instances"] = JArray.FromObject(foliageComp.PerInstanceSMData.Select(i => new
                    {
                        X = i.TransformData.Translation.X,
                        Y = i.TransformData.Translation.Y,
                        Z = i.TransformData.Translation.Z
                    }))
                };

                pois.Add(obj);
            }
        }
    }

    var sorted = pois
        .OrderBy(a => (string?)a["Type"], StringComparer.Ordinal)
        .ThenBy(a => (string?)a["Name"], StringComparer.Ordinal)
        .ToList();

    Console.WriteLine($"  Discovered {sorted.Count} world POI(s) across {sorted.Select(a => (string?)a["Type"]).Distinct().Count()} classes:");
    foreach (var group in sorted.GroupBy(a => (string?)a["Type"]).OrderBy(g => g.Key))
    {
        Console.WriteLine($"    - {group.Key,-38}: {group.Count()} POI(s)");
    }

    var outFile = Path.Combine(outputDir, "Game", "World", "MainLevel_Pois.json");
    await SaveJsonAsync(outFile, sorted);
    Console.WriteLine($"  [World] Generated {outFile}");
    Console.WriteLine();

    return ("/Game/World/MainLevel_Pois.json", discoveredClasses);
}

// ============================================================================
// Main Execution
// ============================================================================

async Task<int> RunExtractAsync(Options opts)
{
    string outputDir = Path.GetFullPath(opts.OutputDir);
    string metaDir = Path.GetFullPath(opts.MetaDir);

    Console.WriteLine("========================================");
    Console.WriteLine(" Asset Extractor (DataTables & Textures)");
    Console.WriteLine("========================================");
    Console.WriteLine($" Paks Directory: {Path.GetFullPath(opts.PaksDir)}");
    Console.WriteLine($" Mappings File:  {Path.GetFullPath(opts.MappingsPath)}");
    Console.WriteLine($" Output Dir:     {outputDir}");
    Console.WriteLine($" Meta Dir:       {metaDir}");
    Console.WriteLine($" Core Tables:    {WEBAPP_DATA_TABLE_NAMES.Length} DataTables (Name-resolved)");
    Console.WriteLine("========================================");
    Console.WriteLine();

    try
    {
        var (provider, vfsByName) = InitializeProvider(opts);

        var (worldPoisPath, discoveredPoiClasses) = await ExtractWorldPoisAsync(provider, outputDir);
        var data = await ExtractDataTablesAndTypesAsync(provider, vfsByName, discoveredPoiClasses, outputDir);
        var icons = await ExtractUiIconsAsync(provider, vfsByName, data.RoomIcons, data.RoomTextures, data.DecoratorIcons, data.DecoratorTextures, outputDir);
        var monsters = await ExtractMonsterVisualsAsync(provider, vfsByName, data.MonsterIds, outputDir);
        var resourceIcons = await ExtractResourceVisualsAsync(provider, vfsByName, data.ResourceIds, outputDir);

        var manifest = new
        {
            dataTables = data.DataTables,
            structs = data.Structs,
            enums = data.Enums,
            blueprints = data.Blueprints,
            worldMap = icons.WorldMap,
            worldPois = worldPoisPath,
            monsterIcons = monsters.Icons,
            monsterSprites = monsters.Sprites,
            resourceIcons,
            roomIcons = icons.RoomIcons,
            uiIcons = icons.UiIcons,
            generalIcons = icons.GeneralIcons
        };

        var manifestFile = Path.Combine(metaDir, "asset_manifest.json");
        await SaveJsonAsync(manifestFile, manifest);
        Console.WriteLine($"  [Metadata] Generated {manifestFile} (Unified Asset Manifest).");

        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("========================================");
        Console.WriteLine(" Extraction Complete!");
        Console.WriteLine($"   DataTables:    {data.DataTables.Count}");
        Console.WriteLine($"   Structs:       {data.Structs.Count}");
        Console.WriteLine($"   Enums:         {data.Enums.Count}");
        Console.WriteLine($"   Blueprints:    {data.Blueprints.Count}");
        Console.WriteLine($"   Icon Map:      {monsters.Icons.Count} mappings");
        Console.WriteLine($"   Sprite Map:    {monsters.Sprites.Count} mappings");
        Console.WriteLine($"   Res Icon Map:  {resourceIcons.Count} mappings");
        Console.WriteLine($"   Manifest:      {manifestFile}");
        Console.WriteLine("========================================");
        Console.ResetColor();

        return 0;
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Error] Extraction failed: {ex.Message}");
        Console.ResetColor();
        return 1;
    }
}

return await Parser.Default.ParseArguments<Options>(Args)
    .MapResult(RunExtractAsync, errs => Task.FromResult(errs.Any(e => e is not HelpRequestedError and not VersionRequestedError) ? 1 : 0));
