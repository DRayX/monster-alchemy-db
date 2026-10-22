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
using CUE4Parse.UE4.Assets.Exports.Texture;
using CUE4Parse.UE4.Objects.Core.Misc;
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
    "DT_PassiveSkills"
};

/// <summary>
/// Canonical UI icons mapped by category and game-defined identifier to Unreal asset name.
/// Categories correspond to sections in asset_manifest.json (types, stats, general).
/// </summary>
static readonly (string Category, string Key, string Asset)[] UI_ICON_DEFINITIONS = new[]
{
    // Elements (EMonsterType)
    ("types", "Neutral", "T_EType_Normal"),
    ("types", "Fire", "T_EType_Fire"),
    ("types", "Water", "T_EType_Water"),
    ("types", "Nature", "T_EType_Nature"),
    ("types", "Energy", "T_EType_Energy"),
    ("types", "Moon", "T_EType_Moon"),

    // Attack Types (EAttackType)
    ("types", "Slash", "T_AType_Slash_Icon"),
    ("types", "Strike", "T_AType_Strike"),
    ("types", "Projectile", "T_AType_Projectile"),
    ("types", "Magic", "T_AType_Magic"),

    // Status Effects (Skill rich-text tags)
    ("types", "Poison", "T_EType_Poison_Icon"),
    ("types", "Burn", "T_EType_Burn_Icon"),
    ("types", "Shock", "T_EType_Shock_Icon"),
    ("types", "Freeze", "T_EType_Freeze_Icon"),
    ("types", "Slow", "T_EType_Slow_Icon"),
    ("types", "Weak", "T_EType_Weak_Icon"),
    ("types", "Rage", "T_EType_Rage_Icon"),
    ("types", "Barrier", "T_EType_Barrier_Icon"),
    ("types", "Regeneration", "T_EType_Regeneration_Icon"),
    ("types", "Thorns", "T_EType_Thorns_Icon"),
    ("types", "Ambush", "T_EType_Blind_Icon"),
    ("types", "Charge", "T_EType_Charged_Icon"),

    // Stats (S_Monster_Table)
    ("stats", "Strength", "T_Stat_Attack"),
    ("stats", "Defense", "T_Stat_Defense"),
    ("stats", "Mind", "T_Stat_Mind"),
    ("stats", "Soul", "T_Stat_Soul"),
    ("stats", "Agility", "T_Stat_Speed"),
    ("stats", "Work", "T_Stat_Work"),

    // General UI
    ("general", "Player", "T_Icon_Player"),
    ("general", "Tower", "T_Icon_Tower"),
    ("general", "Shop", "T_Icon_Shop")
};

// ============================================================================
// Helpers
// ============================================================================

string StripExportIndex(string path) => Regex.Replace(path, @"\.\d+$", "");

string EnsureDir(string filePath)
{
    var dir = Path.GetDirectoryName(filePath);
    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    return filePath;
}

Task SaveFileAsync(string path, byte[] bytes) => File.WriteAllBytesAsync(EnsureDir(path), bytes);
Task SaveFileAsync(string path, string text) => File.WriteAllTextAsync(EnsureDir(path), text);
Task SaveJsonAsync(string path, object data) => SaveFileAsync(path, JsonConvert.SerializeObject(data, Formatting.Indented) + "\n");

string VfsToGamePackagePath(string vfsPath)
{
    var norm = vfsPath.Replace('\\', '/').TrimStart('/');
    if (norm.EndsWith(".uasset", StringComparison.OrdinalIgnoreCase))
    {
        norm = norm[..^7];
    }
    var contentIdx = norm.IndexOf("Content/", StringComparison.OrdinalIgnoreCase);
    if (contentIdx >= 0)
    {
        return "/Game/" + norm.Substring(contentIdx + 8).TrimStart('/');
    }
    if (norm.StartsWith("/Game/", StringComparison.OrdinalIgnoreCase))
    {
        return norm;
    }
    if (norm.StartsWith("Game/", StringComparison.OrdinalIgnoreCase))
    {
        return "/" + norm;
    }
    return "/Game/" + norm.TrimStart('/');
}

string? ResolveAssetPackage(Dictionary<string, List<string>> vfsByName, string assetName, string category)
{
    if (!vfsByName.TryGetValue(assetName, out var matches) || matches.Count == 0)
    {
        return null;
    }
    if (matches.Count > 1)
    {
        Console.WriteLine($"  [Warning] Multiple assets found for {category} '{assetName}': using '{matches[0]}'");
    }
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
    if (path != null)
    {
        targetMap[key] = $"{path}.png";
        textureBatch.Add(path);
        return true;
    }
    return false;
}

string? ResolveReferencedTexture(DefaultFileProvider provider, string? packagePath, Func<JToken, string?> selector, string label)
{
    if (string.IsNullOrEmpty(packagePath)) return null;
    try
    {
        var exports = provider.LoadPackage(packagePath.TrimStart('/')).GetExports();
        if (exports == null) return null;
        var token = JToken.Parse(JsonConvert.SerializeObject(exports));
        var objPath = selector(token);
        return string.IsNullOrEmpty(objPath) ? null : VfsToGamePackagePath(StripExportIndex(objPath));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"  [{label} Error] {packagePath}: {ex.Message}");
        return null;
    }
}

void DiscoverDependencies(JToken? token, Queue<string> pendingQueue, HashSet<string> seenPackages)
{
    if (token == null) return;

    if (token is JArray arr)
    {
        foreach (var item in arr) DiscoverDependencies(item, pendingQueue, seenPackages);
        return;
    }

    if (token is JObject obj)
    {
        var objName = obj["ObjectName"]?.ToString();
        var objPath = obj["ObjectPath"]?.ToString();

        if (!string.IsNullOrEmpty(objName) && !string.IsNullOrEmpty(objPath))
        {
            if (objName.Contains("UserDefinedStruct") || objName.Contains("UserDefinedEnum"))
            {
                var cleanPath = StripExportIndex(objPath);
                if (cleanPath.StartsWith("/Game/") && seenPackages.Add(cleanPath))
                {
                    pendingQueue.Enqueue(cleanPath);
                }
            }
        }

        foreach (var prop in obj.Properties())
        {
            DiscoverDependencies(prop.Value, pendingQueue, seenPackages);
        }
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

            foreach (var export in exports)
            {
                if (export is UTexture2D texture)
                {
                    var ctexture = TextureDecoder.Decode(texture);
                    if (ctexture == null) continue;
                    using var bitmap = TextureEncoder.ToSkBitmap(ctexture);
                    if (bitmap != null)
                    {
                        using var image = SKImage.FromBitmap(bitmap);
                        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
                        var destFile = Path.Combine(outputDir, gamePath.TrimStart('/') + ".png");
                        await SaveFileAsync(destFile, data.ToArray());
                        count++;
                        Console.WriteLine($"  [{label}] {gamePath}.png");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [{label} Error] {gamePath}: {ex.Message}");
        }
    }
    return count;
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
    {
        provider.SubmitKey(new FGuid(), new FAesKey(opts.AesKey));
    }

    provider.Mount();
    provider.PostMount();
    Console.WriteLine($"[Provider] Mounted {provider.MountedVfs.Count} VFS archive(s). Total files indexed: {provider.Files.Count}");
    Console.WriteLine();

    var vfsByName = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
    foreach (var fileKey in provider.Files.Keys)
    {
        if (fileKey.EndsWith(".uasset", StringComparison.OrdinalIgnoreCase))
        {
            var fileName = Path.GetFileNameWithoutExtension(fileKey);
            if (!vfsByName.TryGetValue(fileName, out var list))
            {
                list = new List<string>();
                vfsByName[fileName] = list;
            }
            list.Add(fileKey);
        }
    }

    return (provider, vfsByName);
}

async Task<(
    SortedDictionary<string, string> DataTables,
    SortedDictionary<string, string> Structs,
    SortedDictionary<string, string> Enums,
    List<string> MonsterIds,
    List<string> ResourceIds,
    SortedDictionary<string, string> RoomIcons,
    HashSet<string> RoomTextures)>
ExtractDataTablesAndTypesAsync(DefaultFileProvider provider, Dictionary<string, List<string>> vfsByName, string outputDir)
{
    var seenPackages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var pendingQueue = new Queue<string>();

    Console.WriteLine($"[Discovery] Resolving {WEBAPP_DATA_TABLE_NAMES.Length} required DataTable(s) by name...");
    foreach (var tableName in WEBAPP_DATA_TABLE_NAMES)
    {
        var gamePath = ResolveAssetPackage(vfsByName, tableName, "DataTable");
        if (gamePath != null && seenPackages.Add(gamePath))
        {
            pendingQueue.Enqueue(gamePath);
        }
        else if (gamePath == null)
        {
            Console.WriteLine($"  [Warning] DataTable '{tableName}' not found in VFS archives.");
        }
    }

    var monsterIds = new List<string>();
    var resourceIds = new List<string>();
    var roomIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var roomTexturesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    var dataTablesMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var structsMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var enumsMap = new SortedDictionary<string, string>(StringComparer.Ordinal);

    Console.WriteLine("==> [Phase 1/5] Extracting DataTables, Structs, and Enums...");

    while (pendingQueue.Count > 0)
    {
        var packagePath = pendingQueue.Dequeue();
        var lookupPath = packagePath.TrimStart('/');

        try
        {
            var exports = provider.LoadPackage(lookupPath).GetExports();
            if (exports == null) continue;

            var jsonStr = JsonConvert.SerializeObject(exports, Formatting.Indented);
            var jToken = JToken.Parse(jsonStr);

            if (packagePath.EndsWith("DT_MonsterTable", StringComparison.OrdinalIgnoreCase))
            {
                var rows = (jToken as JArray)?.FirstOrDefault()?["Rows"] as JObject;
                if (rows != null)
                {
                    monsterIds.AddRange(rows.Properties().Select(p => p.Name));
                    Console.WriteLine($"  [Data] Loaded {monsterIds.Count} monster ID(s) from DT_MonsterTable into memory.");
                }
            }
            else if (packagePath.EndsWith("DT_ResourceData", StringComparison.OrdinalIgnoreCase))
            {
                var rows = (jToken as JArray)?.FirstOrDefault()?["Rows"] as JObject;
                if (rows != null)
                {
                    resourceIds.AddRange(rows.Properties().Select(p => p.Name).Where(n => !n.Equals("None", StringComparison.OrdinalIgnoreCase)));
                    Console.WriteLine($"  [Data] Loaded {resourceIds.Count} resource ID(s) from DT_ResourceData into memory.");
                }
            }
            else if (packagePath.EndsWith("DT_Rooms", StringComparison.OrdinalIgnoreCase))
            {
                var rows = (jToken as JArray)?.FirstOrDefault()?["Rows"] as JObject;
                if (rows != null)
                {
                    foreach (var prop in rows.Properties())
                    {
                        var rowObj = prop.Value as JObject;
                        var iconProp = rowObj?.Properties().FirstOrDefault(p => p.Name.StartsWith("Icon", StringComparison.OrdinalIgnoreCase));
                        var iconObjPath = (iconProp?.Value as JObject)?["ObjectPath"]?.ToString();
                        if (!string.IsNullOrEmpty(iconObjPath))
                        {
                            var texGamePath = VfsToGamePackagePath(StripExportIndex(iconObjPath));
                            roomTexturesToExtract.Add(texGamePath);
                            roomIconMap[prop.Name] = $"{texGamePath}.png";
                        }
                    }
                    Console.WriteLine($"  [Data] Loaded {roomIconMap.Count} room icon reference(s) from DT_Rooms into memory.");
                }
            }

            DiscoverDependencies(jToken, pendingQueue, seenPackages);

            var destFile = Path.Combine(outputDir, lookupPath + ".json");
            await SaveFileAsync(destFile, jsonStr);

            var assetName = Path.GetFileName(packagePath);
            var canonicalPackagePath = "/" + lookupPath + ".json";

            var primaryExport = exports.FirstOrDefault();
            var (map, tag) = primaryExport?.ExportType switch
            {
                "DataTable" => (dataTablesMap, "DataTable"),
                "UserDefinedStruct" => (structsMap, "Struct"),
                "UserDefinedEnum" => (enumsMap, "Enum"),
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

    return (dataTablesMap, structsMap, enumsMap, monsterIds, resourceIds, roomIconMap, roomTexturesToExtract);
}

async Task<(
    SortedDictionary<string, string> Rooms,
    SortedDictionary<string, string> Types,
    SortedDictionary<string, string> Stats,
    SortedDictionary<string, string> General,
    int ExtractedCount)>
ExtractUiIconsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    SortedDictionary<string, string> roomIcons,
    HashSet<string> roomTextures,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 2/5] Extracting UI & Icon Textures...");

    var typeIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var statIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var genericUiIconMap = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var uiTexturesToExtract = new HashSet<string>(roomTextures, StringComparer.OrdinalIgnoreCase);

    var categoryMaps = new Dictionary<string, SortedDictionary<string, string>>
    {
        ["types"] = typeIconMap,
        ["stats"] = statIconMap,
        ["general"] = genericUiIconMap
    };

    foreach (var (category, key, assetName) in UI_ICON_DEFINITIONS)
    {
        if (!RegisterIcon(vfsByName, key, assetName, $"{category} icon", categoryMaps[category], uiTexturesToExtract))
            Console.WriteLine($"  [Warning] {category} icon asset '{assetName}' not found in VFS archives.");
    }

    Console.WriteLine($"  Discovered {uiTexturesToExtract.Count} UI/icon texture(s) (Rooms: {roomIcons.Count}, Types: {typeIconMap.Count}, Stats: {statIconMap.Count}, General: {genericUiIconMap.Count}). Extracting textures...");
    int uiTexturesExtracted = await ExtractTexturesAsync(provider, uiTexturesToExtract, outputDir, "UI/Icon");

    return (roomIcons, typeIconMap, statIconMap, genericUiIconMap, uiTexturesExtracted);
}

async Task<(
    SortedDictionary<string, string> Icons,
    SortedDictionary<string, string> Sprites,
    int ProfilesExtracted,
    int SpritesExtracted)>
ExtractMonsterVisualsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    List<string> monsterIds,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 3/5] Extracting Monster Profile Icons (P_<MonsterID>)...");

    var monsterIconMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var profileCandidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    int missingProfileCount = 0;

    foreach (var monsterId in monsterIds)
    {
        if (!RegisterIcon(vfsByName, monsterId, $"P_{monsterId}", "Profile", monsterIconMap, profileCandidates))
        {
            missingProfileCount++;
        }
    }

    Console.WriteLine($"  Matched {profileCandidates.Count} profile icon(s) for {monsterIds.Count} monsters ({missingProfileCount} not found)...");
    int profilesExtracted = await ExtractTexturesAsync(provider, profileCandidates, outputDir, "Profile");

    Console.WriteLine();
    Console.WriteLine("==> [Phase 4/5] Extracting Monster Sprite Sheets (FB_<MonsterID>_Idle)...");

    var monsterSpriteMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var spritePackagesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    int missingFlipbookCount = 0;

    foreach (var monsterId in monsterIds)
    {
        var fbGamePath = ResolveAssetPackage(vfsByName, $"FB_{monsterId}_Idle", "Flipbook");
        if (fbGamePath == null)
        {
            missingFlipbookCount++;
            continue;
        }

        var texGamePath = ResolveReferencedTexture(provider, fbGamePath, t =>
        {
            var sprite = t[0]?["Properties"]?["KeyFrames"]?[0]?["Sprite"]?["ObjectPath"]?.ToString();
            return sprite != null ? Regex.Replace(StripExportIndex(sprite), @"_Sprite_\d+$", "", RegexOptions.IgnoreCase) : null;
        }, "Flipbook");

        if (texGamePath != null)
        {
            spritePackagesToExtract.Add(texGamePath);
            monsterSpriteMap[monsterId] = $"{texGamePath}.png";
        }
    }

    Console.WriteLine($"  Discovered {spritePackagesToExtract.Count} sprite sheet(s) ({missingFlipbookCount} flipbooks not found). Extracting textures...");
    int spritesExtracted = await ExtractTexturesAsync(provider, spritePackagesToExtract, outputDir, "SpriteSheet");

    return (monsterIconMap, monsterSpriteMap, profilesExtracted, spritesExtracted);
}

async Task<(
    SortedDictionary<string, string> Icons,
    int TexturesExtracted)>
ExtractResourceVisualsAsync(
    DefaultFileProvider provider,
    Dictionary<string, List<string>> vfsByName,
    List<string> resourceIds,
    string outputDir)
{
    Console.WriteLine();
    Console.WriteLine("==> [Phase 5/5] Extracting Resource Icons & Building Resource Icon Map (T_<ItemID>_Sprite)...");

    var resourceIconMap = new SortedDictionary<string, string>(StringComparer.Ordinal);
    var resourceTexturesToExtract = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    int resourceSpritesExtracted = 0;
    int missingResourceCount = 0;

    foreach (var itemId in resourceIds)
    {
        var spriteGamePath = ResolveAssetPackage(vfsByName, $"T_{itemId}_Sprite", "Resource sprite");
        if (spriteGamePath == null)
        {
            missingResourceCount++;
            continue;
        }

        resourceSpritesExtracted++;
        var texGamePath = ResolveReferencedTexture(provider, spriteGamePath, t =>
        {
            var paperSprite = (t as JArray)?.FirstOrDefault(e =>
                string.Equals(e["Type"]?.ToString(), "PaperSprite", StringComparison.OrdinalIgnoreCase));
            return paperSprite?["Properties"]?["BakedSourceTexture"]?["ObjectPath"]?.ToString()
                ?? paperSprite?["Properties"]?["SourceTexture"]?["ObjectPath"]?.ToString();
        }, "Resource sprite");

        if (texGamePath != null)
        {
            resourceTexturesToExtract.Add(texGamePath);
            resourceIconMap[itemId] = $"{texGamePath}.png";
        }
    }

    Console.WriteLine($"  Resolved {resourceSpritesExtracted} PaperSprite asset(s) ({missingResourceCount} missing). Extracting {resourceTexturesToExtract.Count} unique resource texture(s)...");
    int resourceTexturesExtractedCount = await ExtractTexturesAsync(provider, resourceTexturesToExtract, outputDir, "Resource");

    return (resourceIconMap, resourceTexturesExtractedCount);
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

        var data = await ExtractDataTablesAndTypesAsync(provider, vfsByName, outputDir);
        var ui = await ExtractUiIconsAsync(provider, vfsByName, data.RoomIcons, data.RoomTextures, outputDir);
        var monsters = await ExtractMonsterVisualsAsync(provider, vfsByName, data.MonsterIds, outputDir);
        var resources = await ExtractResourceVisualsAsync(provider, vfsByName, data.ResourceIds, outputDir);

        var manifest = new
        {
            dataTables = data.DataTables,
            structs = data.Structs,
            enums = data.Enums,
            monsterIcons = monsters.Icons,
            monsterSprites = monsters.Sprites,
            resourceIcons = resources.Icons,
            uiIcons = new
            {
                rooms = ui.Rooms,
                types = ui.Types,
                stats = ui.Stats,
                general = ui.General
            }
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
        Console.WriteLine($"   UI Textures:   {ui.ExtractedCount} (PNG)");
        Console.WriteLine($"   Profiles:      {monsters.ProfilesExtracted} (PNG)");
        Console.WriteLine($"   Icon Map:      {monsters.Icons.Count} mappings");
        Console.WriteLine($"   Sprite Sheets: {monsters.SpritesExtracted} (PNG)");
        Console.WriteLine($"   Sprite Map:    {monsters.Sprites.Count} mappings");
        Console.WriteLine($"   Res Textures:  {resources.TexturesExtracted} (PNG)");
        Console.WriteLine($"   Res Icon Map:  {resources.Icons.Count} mappings");
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
