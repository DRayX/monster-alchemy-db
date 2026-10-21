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
- **Direct Unreal Engine Data Normalization**: Parses real Unreal Engine DataTables (`DT_*.json`), UserDefinedStruct definitions (`S_*.json`), and UserDefinedEnums (`E*.json`) in-browser on startup without mutating source files.
- **On-Demand Flipbook & Sprite Loading**: Monster PaperFlipbook definitions (`FB_<id>_Idle.json`) and sprite sheet textures are lazy-loaded asynchronously on demand only when viewing individual monster detail pages, keeping initial database boot fast and light.
- **Strict JSDoc Type Checking**: Every JavaScript file uses `// @ts-check` with comprehensive JSDoc type annotations verified with TypeScript (`tsc -p jsconfig.json --noEmit`).
- **SFC-Style Module Layout**: Components follow Vue Single-File Component layout order with top-level `/* html */` template literals preceding component definitions for clean code readability and full IDE syntax highlighting.
- **Styling**: Built with [Tachyons](https://tachyons.io/) functional CSS and custom theme rules.

---

## Project Structure

```text
docs/
├── index.html               # Entry HTML with importmap and stylesheet links
├── css/
│   └── style.css            # Custom CSS utilities, scrollbars, and pixel-art helpers
├── extracted/               # Raw Unreal Engine blueprint & asset dumps
└── js/
    ├── app.js               # Application bootstrap and root layout
    ├── router.js            # Vue Router routes, document titles, and scroll reset
    ├── store.js             # Reactive global database store (`db`)
    ├── types.js             # JSDoc type definitions
    ├── models/              # Domain models (Monster, Item, Room, Recipe, Skill)
    ├── services/
    │   ├── assets.js        # Game asset & sprite URL resolvers
    │   ├── formatters.js    # Skill description & type badge formatters
    │   └── loader.js        # Async data loader and Unreal DataTable normalization
    └── components/          # Vue UI components
        ├── AppNavbar.js     # Sidebar navigation
        ├── HomePage.js      # Dashboard & distributions
        ├── MonsterTable.js  # Monsterpedia data table
        ├── MonsterDetail.js # Monster profile & stats
        ├── ItemTable.js     # Items catalog
        ├── ItemDetail.js    # Resource details & usages
        ├── RoomDetail.js    # Crafting room & fusion recipes
        ├── SortableTable.js # Generic sortable data table
        ├── TypeBadge.js     # Element & attack type badges
        ├── ItemChip.js      # Item pill chips
        ├── StatBar.js       # Visual monster stat bar
        ├── FusionCard.js    # Expandable fusion preview card
        └── NotFoundCard.js  # 404 entity fallback card
```

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
