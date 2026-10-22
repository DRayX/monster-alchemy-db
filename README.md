# Monster Alchemy Database

An interactive web database for **Monster Alchemy**, parsed directly from raw Unreal Engine blueprint exports at runtime.

**Live Site:** <https://drayx.github.io/monster-alchemy-db/>

---

## Features

- **Monster Bestiary**: Full reference of all monsters with elemental affinities, attack types, star-rated tiers, complete base stats (HP, Soul, Strength, Defense, Mind, Agility), stat totals, passive traits, active skill progression, loot drops, and summoning recipes.
- **Chimeric Chamber / Fusions**: Complete chimeric fusion database supporting both explicit monster fusions and generic (elemental / attack type) fusions with interactive drill-down cards and matching trait badges.
- **Resources & Alchemical Items**: Searchable catalog of reagents, materials, and items detailing monster drop sources, crafting outputs, and recipe ingredient usages.
- **Crafting Rooms**: Multi-room crafting catalog detailing construction costs, recipes, inputs, and yield counts.
- **Home Page Dashboard**: Quick navigation, Featured Monsters showcase, and statistical distribution breakdowns across Elements, Attack Types, and Tiers.
- **Sortable & Filterable Tables**: Sortable data tables with original order toggle, real-time multi-facet filtering (search, elements, attack types, tiers, item sources), and sticky headers.

---

## Technical Architecture

- **Zero-Build Compilation**: Uses native browser ES modules (`<script type="module">`) and `<script type="importmap">` to load Vue 3 and Vue Router directly from CDNs. No bundler (Vite, Webpack, Rollup) required. Ready to serve as static files on GitHub Pages or any static HTTP host.
- **Direct Unreal Engine Data Normalization**: Parses real Unreal Engine DataTables (`DT_*.json`), UserDefinedStruct definitions (`S_*.json`), and UserDefinedEnums (`E*.json`) in-browser on startup without mutating source files. Dynamically inspects each DataTable's native `RowStruct` header to automatically bind the correct schema.
- **Dynamic Asset Manifest & Metadata Snapshot**: Utilizes `docs/meta/asset_manifest.json` as the single source of truth for all canonical asset URLs (tables, structs, enums, monster avatars, sprite sheets, resource icons, room icons, type icons, and stat icons). A build snapshot (`docs/meta/build_info.json`) dynamically supplies the current Steam build ID and release metadata to the UI.
- **Synchronous Visual Resolvers**: Monster profile images, idle sprite sheets, item icons, and crafting room icons are resolved synchronously directly inside domain model constructors with transparent fallback support, eliminating broken images and async loader cascades.
- **Strict JSDoc Type Checking**: Every JavaScript file uses `// @ts-check` with comprehensive JSDoc type annotations verified with TypeScript (`tsc -p jsconfig.json --noEmit`) using ES2025 JSON import attributes (`with { type: 'json' }`).
- **SFC-Style Module Layout**: Components follow Vue Single-File Component layout order with top-level `/* html */` template literals preceding component definitions for clean code readability and full IDE syntax highlighting.
- **Styling**: Built with [Tachyons](https://tachyons.io/) functional CSS and custom theme rules.

---

## Project Structure

```text
docs/
├── index.html               # Entry HTML with importmap and stylesheet links
├── css/
│   └── style.css            # Custom CSS utilities, scrollbars, and pixel-art helpers
├── extracted/               # Raw Unreal Engine blueprint & asset dumps (JSON & PNG)
├── meta/                    # Build metadata and canonical asset mappings
│   ├── asset_manifest.json  # Unified asset path manifest
│   └── build_info.json      # Dynamic Steam build snapshot metadata
└── js/
    ├── app.js               # Application bootstrap and root layout
    ├── router.js            # Vue Router routes, document titles, and scroll reset
    ├── store.js             # Reactive global database store (`db`)
    ├── types.js             # JSDoc type definitions
    ├── models/              # Domain models (Monster, Item, Room, Recipe, Skill)
    ├── services/
    │   ├── assets.js        # Game asset & sprite URL resolvers (backed by manifest)
    │   ├── formatters.js    # Skill description & type badge formatters
    │   └── loader.js        # Dynamic DataTable normalization & database loader
    └── components/          # Vue UI components
        ├── AppNavbar.js     # Sidebar navigation (with dynamic build ID)
        ├── HomePage.js      # Dashboard & distributions
        ├── MonsterTable.js  # Monsterpedia data table
        ├── MonsterDetail.js # Monster profile, stats, and sprite sheet
        ├── ItemTable.js     # Items catalog
        ├── ItemDetail.js    # Resource details & usages
        ├── RoomDetail.js    # Crafting room & fusion recipes
        ├── SortableTable.js # Generic sortable data table
        ├── TypeBadge.js     # Element & attack type badges
        ├── ItemChip.js      # Item pill chips
        ├── StatBar.js       # Visual monster stat bar
        ├── FusionCard.js    # Expandable fusion preview card
        └── NotFoundCard.js  # 404 entity fallback card

scripts/
├── download.csx             # Steam depot downloader (SteamKit2)
├── mappings.csx             # Unreal .usmap mapping generator (jmap_dumper)
└── extract.csx              # Unreal PAK/UCAS extractor & manifest generator (CUE4Parse)
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

Mounts the Unreal Engine `.pak` / `.ucas` / `.utoc` containers using [CUE4Parse](https://github.com/FabianFG/CUE4Parse) and the `.usmap` mapping file. Extracts DataTables, Structs, Enums, UI icons, monster profile icons, and sprite sheets to `./docs/extracted/`, then builds the unified canonical manifest at `docs/meta/asset_manifest.json`.

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
