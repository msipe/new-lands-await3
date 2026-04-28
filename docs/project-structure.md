# Project Structure

This document is a repo map for future agents. It focuses on where code lives, what owns what, and which files are generated.

## Source Of Truth

- `src/**/*.ts` is the main authored game source.
- `content/registry/*.json` is the main authored content source.
- `src/planning/content-registry-generated.ts` is generated from `content/registry/*.json`.
- Root `.lua` files and root Lua folders are compiled output copied from `build/` for LÖVE to run.

When changing behavior, edit TypeScript or JSON source first. Do not hand-edit generated Lua output.

## Top-Level Files

- `README.md`: setup, build, run, and test commands.
- `package.json`: npm scripts and TypeScript/Jest/TSTL tooling.
- `tsconfig.json`: TypeScriptToLua build config for `src`.
- `tsconfig.test.json`: test TypeScript config.
- `jest.config.cjs`: Jest + `ts-jest` config.
- `.gitignore`: ignored build/log artifacts.
- `.gitattributes`: Lua line-ending rules.

## Runtime Entrypoints

- `src/main.ts`: LÖVE callback adapter. Owns `love.load`, `love.update`, `love.draw`, input routing, scene lifecycle, and high-level system wiring.
- `src/conf.ts`: authored LÖVE config.
- `main.lua` and `conf.lua`: generated/synced runtime entrypoints for `love .`.

Most new gameplay rules should not go in `src/main.ts` unless they are specifically scene orchestration or LÖVE adapter logic.

## UI And Scene Adapter Files

These files draw screens, handle mouse/keyboard input, and translate user actions into domain calls:

- `src/main-menu-ui.ts`: start/quit menu.
- `src/character-setup-ui.ts`: current class/race selection screen.
- `src/exploration/explore-ui.ts`: hex map UI plus character sheet, inventory, craft shop, quest menu, planner debug, travel, and exploration actions.
- `src/encounter-ui.ts`: town/generic encounter screen, NPC selection, standard dialog, quest offer/turn-in prompts, and exploration-flow display.
- `src/combat-ui.ts`: combat rendering, die interactions, popups, inspector, and combat UI state.
- `src/facet-ui.ts`: facet tree screen and investment UI.

These modules may use `love.*`. Keep reusable state transitions in smaller domain modules when possible so they can be tested without LÖVE.

## Game Domain

`src/game/**` is the engine-agnostic gameplay layer. It should not import or call `love.*`.

- `src/game/scenes.ts`: scene state helpers and transition helpers.
- `src/game/scene-contracts.ts`: scene IDs, scene contexts, inputs, outputs, and reducer contracts.
- `src/game/combat-encounter.ts`: combat state machine, player/enemy turns, enemy intent, roll resolution, and combat result state.
- `src/game/combat-event-bus.ts`: event modifiers/subscribers for triggered combat interactions.
- `src/game/combat-log.ts`: combat log text helpers.
- `src/game/dice.ts`: `Die`, `DieSide`, rolling hooks, random source, and die mutation helpers.
- `src/game/dice-effects.ts`: dice effect helpers.
- `src/game/dice-factory.ts`: construct-to-die creation.
- `src/game/dice-constructs/`: reusable die definitions for enemies, items, player dice, and transient dice.
- `src/game/faces/`: face classes and ability behavior such as damage, armor, healing, warcry, wild strike, focus, spawning dice, and item faces.
- `src/game/face-adjustments.ts`: recorded die face upgrades, downgrades, copies, removes, and replay onto combat dice.
- `src/game/player-progression.ts`: player class/race, XP, gold, max HP, facet points, unlocked facet dice, and recorded die operations.
- `src/game/player-items.ts`: inventory/equipment data structures and equipment slot ordering.
- `src/game/player-roll-conversions.ts`: queued roll manipulation data.
- `src/game/transient-die.ts`: spawned/fleeting die popup data.
- `src/game/wobble.ts`: small animation/math helper covered by tests.

## Exploration

`src/exploration/**` owns map state, tile creation, world application, and enemy choice:

- `src/exploration/explore-state.ts`: hex coordinates, generated tile collection, travel rules, current tile lookup.
- `src/exploration/tile-factory.ts`: default tile templates, zone selection, tile shape, and town location construction.
- `src/exploration/world-generator.ts`: applies planner/world requirements to a generated map, including zone minimums, special tiles, NPC placement, and exploration-flow assignment.
- `src/exploration/enemy-selection.ts`: picks combat enemies from the current tile and run seed.
- `src/exploration/explore-ui.ts`: UI integration for the exploration scene.

## Planning, Content, And Quests

`src/planning/**` connects authored content to run generation and quest state:

- `src/planning/content-types.ts`: TypeScript schema for NPCs, tiles, enemies, items, quests, big bads, and exploration flows.
- `src/planning/content-registry-generated.ts`: generated raw content constants. Do not edit directly.
- `src/planning/content-registry.ts`: typed registry accessors and clone helpers.
- `src/planning/game-planner.ts`: selects big bad, main quest, side quests, town quests, and aggregates planner requirements.
- `src/planning/world-spec-builder.ts`: turns a game plan into world generation constraints.
- `src/planning/world-validator.ts`: validates generated exploration state against a world spec.
- `src/planning/quest-log.ts`: in-memory quest log, objective progress, statuses, acceptance, and turn-in.
- `src/planning/quest-events.ts`: centralized event ingestion for enemy kills, collected items, tile visits, and NPC interactions.
- `src/planning/dialog-service.ts`: standard NPC dialog and quest prompt selection.

Quest-specific behavior is documented in `docs/quests.md`.

## Content Registry

Author content in `content/registry/`:

- `npcs.json`: NPC identities, home zones/buildings, notes, and standard dialog.
- `tiles.json`: zone templates, special tiles, enemy pools, and tile metadata.
- `quests.json`: objective-first quest definitions and planner requirements.
- `big-bads.json`: boss package definitions that choose main/side/town quest pools and special tiles.
- `enemies.json`: enemy stats, tags, types, ability stubs, and die construct IDs.
- `items.json`: item definitions, slots, costs, and optional die construct links.
- `exploration-flows.json`: multi-level narrative flows for non-town exploration tiles.

After editing content, run `npm test` or `npm run generate:content` so `src/planning/content-registry-generated.ts` is refreshed.

## Scripts And Build Artifacts

- `scripts/generate-content-registry.mjs`: reads `content/registry/*.json` and writes `src/planning/content-registry-generated.ts`.
- `scripts/sync-lua.mjs`: copies all compiled `build/**/*.lua` files into the repo root for LÖVE runtime loading.
- `build/`: TypeScriptToLua output directory, ignored by git.
- Root Lua folders such as `planning/`, `exploration/`, and root files such as `combat-ui.lua`: synced generated runtime output.

If a root Lua file has no corresponding TypeScript source path anymore, treat it as a likely stale artifact.

## Tests

Tests live under `tests/` and run with Jest:

- `tests/game/*.test.ts`: domain and integration-style tests for combat, planning, exploration, UI state, registries, and progression.
- `tests/game/faces/**/*.test.ts`: face and ability behavior tests.
- `tests/game/faces/README.md`: conventions for adding face tests.
- `tests/love-globals.ts`: test-side LÖVE global declarations/mocks.

Most behavior changes in `src/game`, `src/planning`, or `src/exploration` should have focused tests nearby in `tests/game`.

## Common Change Paths

- Add or change a die face: edit `src/game/faces/**`, export from `src/game/faces/index.ts`, add/adjust tests under `tests/game/faces/**`.
- Add an enemy: edit `content/registry/enemies.json`, ensure its dice IDs exist in `src/game/dice-constructs/**`, add or update registry/selection tests as needed.
- Add an item with combat behavior: edit `content/registry/items.json`, add a die construct in `src/game/dice-constructs/items.ts`, and update item registry/loadout tests.
- Add a quest: edit `content/registry/quests.json`, verify referenced NPCs/enemies/items/tiles exist, and update quest log/event/dialog tests.
- Change world generation: edit `src/planning/game-planner.ts`, `src/planning/world-spec-builder.ts`, `src/exploration/world-generator.ts`, or `src/exploration/tile-factory.ts`, then update planner/world tests.
- Change combat rules: edit `src/game/combat-encounter.ts`, `src/game/combat-event-bus.ts`, dice/faces modules, or constructs, then update combat and face tests.
- Change screen behavior: edit the relevant `src/*-ui.ts` file and add tests where UI state can be exercised without actual rendering.

## Generated File Cautions

- Do not hand-edit `src/planning/content-registry-generated.ts`.
- Do not hand-edit root Lua output unless explicitly debugging generated code.
- `planning/content-registry-generated.lua` is the current generated Lua registry module required by runtime Lua.
- `planning/content-registry.generated.lua`, if present, is an old/stale generated artifact name and should not be treated as source of truth.
