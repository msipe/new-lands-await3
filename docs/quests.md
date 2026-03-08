# Quest System (Objective-First)

This project now uses an objective-first quest pipeline.

## Quest Data Schema

Source of truth: `content/registry/quests.json`

Each quest uses:
- `id`, `name`, `summary`
- `category`: `main | side | town`
- `offerNpcId` (optional)
- `turnInNpcId` (optional)
- `objectives`: quest progress definitions
- `worldRequirements`: planner/proc-gen constraints

Legacy `requirements` on quest definitions is removed.

### Objective Types

`kill-enemy`
- `enemyIds: string[]`
- `targetCount: number`

`collect-item`
- `itemIds: string[]`
- `targetCount: number`

`visit-tile`
- `tileIds?: string[]`
- `zone?: ZoneType`
- `targetCount: number`
- `goToTileHint?: string`

For `visit-tile`, provide either `tileIds`, `zone`, or both.

## Runtime Lifecycle

Quest state lives in `src/planning/quest-log.ts`.

Statuses:
- `accepted`
- `in-progress`
- `ready-to-turn-in`
- `completed`

Progress is objective-based and clamped to each objective target count.

## Event Handlers

Event ingestion is centralized in `src/planning/quest-events.ts`.

Handlers:
- `recordEnemyDefeated(enemyId)`
- `recordItemCollected(itemId, amount?)`
- `recordTileVisited({ tileKey, zone, tileId?, specialTileId? })`
- `recordNpcInteracted(npcId)`

Current wiring:
- Explore travel emits `recordTileVisited`.
- Combat victory emits `recordEnemyDefeated`.
- Encounter NPC selection emits `recordNpcInteracted`.

## Quest Menu + Go To Tile Mode

Explore scene (`src/exploration/explore-ui.ts`):
- `Q`: open/close quest menu
- Category tabs: Main / Side / Town
- Objective rows show progress counters
- `Go To` on `visit-tile` objectives enables Go To Tile mode
- `G` or "Clear Go To" exits Go To Tile mode

Go To Tile mode highlights matching map tiles based on objective `zone` and/or `tileIds`.

## Turn-In Flow

Dialog prompts come from `src/planning/dialog-service.ts`:
- `offer` prompt: quest acceptance
- `turn-in` prompt: ready quest completion

Encounter flow (`src/encounter-ui.ts`):
- Quest confirmation accepts or turns in depending on prompt kind.

## Testing Expectations

Quest-related changes should update/add tests in the same commit.

Current coverage includes:
- `tests/game/quest-registry.test.ts`
- `tests/game/quest-log.test.ts`
- `tests/game/quest-events.test.ts`
- `tests/game/dialog-service.test.ts`
- `tests/game/encounter-ui.test.ts`
- `tests/game/explore-ui.test.ts`
