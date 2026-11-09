# Monster Alchemy Database

An interactive web database for **Monster Alchemy**, parsed directly from raw Unreal Engine blueprint exports at runtime.

**Live Site:** <https://drayx.github.io/monster-alchemy-db/>

---

## Features

- **Interactive World Map**: Interactive overworld map powered by Leaflet 2.0 and custom `SimpleCRS` coordinate projection. Maps 16,500+ overworld POIs (chests, obelisks, towers, monster spawners, recipe scrolls, coliseums, dungeon doors, shops, inns, dialogue NPCs, and common trees/rocks) with marker clustering, viewport culling, real-time coordinate inspection, search filtering, and interactive drop table / encounter popups.
- **Monster Bestiary**: Full reference of all monsters with elemental affinities, attack types, star-rated tiers, complete base stats (HP, Soul, Strength, Defense, Mind, Agility), stat totals, passive traits, active skill progression, loot drops, and summoning recipes.
- **Wild Monster Encounters**: Encounter probabilities, day/night conditions, and level ranges mapped to overworld spawners across the archipelago with direct map pin cross-references.
- **Chimeric Chamber / Fusions**: Complete chimeric fusion database supporting both explicit monster fusions and generic (elemental / attack type) fusions with interactive drill-down cards and matching trait badges.
- **Resources & Alchemical Items**: Searchable catalog of reagents, materials, and items detailing monster drop sources, crafting outputs, world gathering nodes, and recipe ingredient usages.
- **World Gathering Nodes**: Overworld gathering resource nodes with companion monster trait requirements, harvest tools, and drop rate pools.
- **Crafting Rooms**: Multi-room crafting catalog detailing construction costs, recipes, inputs, and yield counts.
- **Recipe Unlock Locations & Cross-References**: Inbound crafting and fusion recipes link directly to their in-game unlock sources—overworld ground scrolls, merchant shops, quest rewards, battle encounters, coliseum challenges, dungeon completions, and alchemical tower rooms—with interactive unlock popups and direct map pin navigation links.
- **Home Page Dashboard**: Quick navigation, Featured Monsters showcase, and statistical distribution breakdowns across Elements, Attack Types, and Tiers.
- **Sortable & Filterable Tables**: Sortable data tables with original order toggle, real-time multi-facet filtering (search, elements, attack types, tiers, item sources), and sticky headers.

---

## Technical Architecture

- **Zero-Build Compilation**: Uses native browser ES modules (`<script type="module">`) and `<script type="importmap">` to load Vue 3, Vue Router, Leaflet 2.0, and Leaflet.markercluster directly from CDNs. No bundler (Vite, Webpack, Rollup) required. Ready to serve as static files on GitHub Pages or any static HTTP host.
- **Modern Leaflet 2.0 & MarkerCluster 2.0**: Built with Leaflet 2.0.0-beta.1 native ES modules using pure ES6 class constructors (`LeafletMap`, `Marker`, `DivIcon`, `ImageOverlay`, `SimpleCRS`, `MarkerClusterGroup`), completely eliminating legacy factory functions (`L.*`) and third-party bundler shims.
- **Direct Unreal Engine Data Normalization**: Parses real Unreal Engine DataTables (`DT_*.json`), UserDefinedStruct definitions (`S_*.json`), and UserDefinedEnums (`E*.json`) in-browser on startup without mutating source files. Dynamically inspects each DataTable's native `RowStruct` header to automatically bind the correct schema.
- **Blueprint Hierarchy & CDO Property Normalization**: Walks Unreal Engine `UBlueprintGeneratedClass` inheritance hierarchies (`SuperStruct` / `Super`) at runtime, dynamically merging Class Default Object (CDO) default properties and unwrapping nested struct, array, enum, and text descriptors via `normalizeBlueprintProperties()`.
- **Case-Insensitive `FName` Lookups**: Implements `CaseInsensitiveMap` to mirror Unreal Engine's native `FName` comparison semantics across all database entity indexes while preserving canonical key casing.
- **Dynamic Asset Manifest & Metadata Snapshot**: Utilizes `docs/meta/asset_manifest.json` as the single source of truth for all canonical asset URLs (tables, structs, enums, monster avatars, sprite sheets, resource icons, room icons, type icons, and stat icons). A build snapshot (`docs/meta/build_info.json`) dynamically supplies the current Steam build ID and release metadata to the UI.
- **Synchronous Visual Resolvers**: Monster profile images, idle sprite sheets, item icons, and crafting room icons are resolved synchronously directly inside domain model constructors with transparent fallback support, eliminating broken images and async loader cascades.
- **Strict JSDoc Type Checking**: Every JavaScript file uses `// @ts-check` with comprehensive JSDoc type annotations verified with TypeScript (`tsc -p jsconfig.json --noEmit`) using ES2025 JSON import attributes (`with { type: 'json' }`).
- **SFC-Style Module Layout**: Components follow Vue Single-File Component layout order with top-level `/* html */` template literals preceding component definitions for clean code readability and full IDE syntax highlighting.
- **Styling**: Built with [Tachyons](https://tachyons.io/) functional CSS and custom theme rules.

---

## Project Structure

```text
docs/
├── index.html                    # Entry HTML with importmap and stylesheet links
├── css/
│   └── style.css                 # Custom CSS utilities, scrollbars, and pixel-art helpers
├── extracted/                    # Raw Unreal Engine blueprint & asset dumps (JSON & PNG)
├── meta/                         # Build metadata and canonical asset mappings
│   ├── asset_manifest.json       # Unified asset path manifest
│   └── build_info.json           # Dynamic Steam build snapshot metadata
└── js/
    ├── app.js                    # Application bootstrap and root layout
    ├── router.js                 # Vue Router routes, document titles, and scroll reset
    ├── store.js                  # Reactive global database store (`db`) and fast indexes (`dbIndexes`)
    ├── types.d.ts                # Shared TypeScript type declarations
    ├── models/                   # Domain models
    │   ├── Item.js               # Items & reagents
    │   ├── Location.js           # Zones, landmarks & map markers
    │   ├── Monster.js            # Monsters, stats, loots & wild spawns
    │   ├── Recipe.js             # Crafting & fusion recipes
    │   ├── Room.js               # Alchemy crafting rooms
    │   ├── Skill.js              # Active & passive skills
    │   ├── WorldPoi.js           # Overworld POIs & actors
    │   └── WorldResource.js      # Gatherable harvest nodes
    ├── services/
    │   ├── assets.js             # Game asset & sprite URL resolvers (backed by manifest)
    │   ├── formatters.js         # Skill description, rarity, and badge formatters
    │   ├── loader.js             # Domain entity builder & database loader
    │   ├── mapUtils.js           # Coordinate conversion, category metadata, and cluster helpers
    │   └── unreal.js             # Dynamic DataTable, Struct, Blueprint & Enum normalization
    └── components/               # Vue UI components
        ├── AppNavbar.js          # Navigation bar with dynamic build ID & live POI counter
        ├── CraftingRecipeCard.js # Shared room crafting recipe card
        ├── FusionCard.js         # Expandable fusion preview card
        ├── FusionOperandBadge.js # Monster or generic trait fusion operand badge
        ├── HomePage.js           # Dashboard & distributions
        ├── ItemChip.js           # Item pill chips
        ├── ItemDetail.js         # Resource details, drop sources & crafting usages
        ├── ItemTable.js          # Items catalog
        ├── MonsterDetail.js      # Monster profile, stats, skills, spawns, and sprites
        ├── MonsterTable.js       # Monsterpedia data table
        ├── NotFoundCard.js       # 404 entity fallback card
        ├── RecipeScrollBadge.js  # Recipe scroll unlock badges & hover popups
        ├── RoomDetail.js         # Crafting room & fusion recipes
        ├── SortableTable.js      # Generic sortable data table
        ├── StatBar.js            # Visual monster stat bar
        ├── TypeBadge.js          # Element & attack type badges
        ├── WildSpawnCard.js      # Wild spawner encounter rate card
        ├── WorldResourceCard.js  # Overworld harvest node & companion requirement card
        └── map/                  # Interactive world map components
            ├── EncounterPopups.js   # Spawner and monster encounter popups
            ├── InteractionPopups.js # Chest, obelisk, tower, shop, and NPC popups
            ├── PopupShell.js        # Shared modal shell with thin scrollbar
            ├── WorldMap.js          # Leaflet map container, layers, and search drawer
            └── WorldMapPopup.js     # Polymorphic popup router
```

scripts/
├── download.csx                  # Steam depot downloader (SteamKit2)
├── mappings.csx                  # Unreal .usmap mapping generator (jmap_dumper)
└── extract.csx                   # Unreal PAK/UCAS extractor & manifest generator (CUE4Parse)
```

---

## Data Extraction Pipeline

The database assets are extracted directly from the game files using three C# script (`.csx`) utilities powered by [`dotnet-script`](https://github.com/dotnet-script/dotnet-script).

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (8.0 or later)
- `dotnet-script` global tool:
  ```bash
  dotnet tool install -g dotnet-script
  ```

---

### 1. Download Game Depot (`download.csx`)

Downloads the latest game depot from Steam via [SteamKit2](https://github.com/SteamRE/SteamKit2). Supports Steam Guard Mobile QR code login, credential caching in the system keystore (KeySharp), and selective Paks-only downloads. Automatically outputs `docs/meta/build_info.json`.

```bash
# Interactive QR login (scannable via Steam Mobile app) downloading Paks only
pnpm download -- --paks

# Username / password authentication
pnpm download -- -u <username> -p <password>

# Download whole depot into custom directory
pnpm download -- -o ./depot
```

**Common Options:**
| Option | Description | Default |
| :--- | :--- | :--- |
| `-u, --username <name>` | Steam account username (defaults to QR code login if omitted) | |
| `-p, --password <pass>` | Steam password (or set via `STEAM_PASSWORD` env) | |
| `--paks` | Download only files in `Paks/` (skips binaries) | `false` |
| `--no-cache` | Skip reading or saving credentials in system keystore | `false` |
| `-o, --dir <path>` | Output depot directory | `./depot` |
| `--meta <path>` | Metadata output directory for `build_info.json` | `./docs/meta` |

---

### 2. Generate Unreal Mappings (`mappings.csx`)

Generates an unversioned property mapping file (`MonsterAlchemy.usmap`) from the game executable using `jmap_dumper`.

```bash
pnpm mappings
# or with custom executable path:
pnpm mappings -- --exe ./depot/MonsterAlchemy/Binaries/Win64/MonsterAlchemy-Win64-Shipping.exe
```

**Common Options:**
| Option | Description | Default |
| :--- | :--- | :--- |
| `--exe <path>` | Path to game executable | `./depot/.../MonsterAlchemy-Win64-Shipping.exe` |
| `-o, --out <path>` | Output `.usmap` file path | `./MonsterAlchemy.usmap` |
| `--timeout <sec>` | Dumper startup timeout in seconds | `60` |

---

### 3. Extract Game Assets & Build Manifest (`extract.csx`)

Mounts the Unreal Engine `.pak` / `.ucas` / `.utoc` containers using [CUE4Parse](https://github.com/FabianFG/CUE4Parse) and the `.usmap` mapping file. Extracts DataTables, Structs, Enums, Blueprint generated classes, overworld actors/POIs across World Partition cells (`MainLevel_Pois.json`), map textures, UI icons, monster profile icons, and sprite sheets to `./docs/extracted/`, then builds the unified canonical manifest at `docs/meta/asset_manifest.json`.

```bash
pnpm extract
# or specifying custom paths:
pnpm extract -- --paks ./depot/MonsterAlchemy/Content/Paks -m ./MonsterAlchemy.usmap
```

**Common Options:**
| Option | Description | Default |
| :--- | :--- | :--- |
| `--paks <path>` | Path to game `Paks/` folder | `./depot/MonsterAlchemy/Content/Paks` |
| `-m, --mappings <path>`| Path to `.usmap` mapping file | `./MonsterAlchemy.usmap` |
| `-o, --out <path>` | Output directory for extracted assets | `./docs/extracted` |
| `--meta <path>` | Metadata output directory for `asset_manifest.json` | `./docs/meta` |
| `--aes <hex>` | Optional AES encryption key hex | |

---

## Running Locally

Because the application uses native browser ES modules, it must be served over an HTTP server (not `file://`):

```bash
# Using pnpm
pnpm serve

# Using Python
python -m http.server -d ./docs 8080
```

Then open `http://localhost:8080` in your browser.

---

## Type Checking

Verify JSDoc types across all modules using the TypeScript compiler in check-only mode:

```bash
pnpm typecheck
# or: npm run typecheck
```
