# Game Design Document (Living)

This document orients future development decisions for **new-lands-await3**.

## 1) Vision

Build a **dicebuilder roguelite** in a **fantasy setting**.

Inspiration and design targets:
- **Slay the Spire** style run structure and combat progression.
- **Balatro** style combinatoric buildcrafting and high-synergy scaling.

Player fantasy:
- Assemble and evolve a set of magical dice and relic-like modifiers.
- Discover overpowered interactions through smart drafting and adaptation.
- Push deeper runs with increasing risk and reward.

## 2) Design Pillars

1. **Readable depth**
   - Easy to understand turn outcomes.
   - Hard to master long-term build planning.

2. **Expressive builds**
   - Multiple viable archetypes each run.
   - Strong synergies between dice faces, tags, and meta modifiers.

3. **Meaningful risk**
   - Choices trade immediate safety vs long-term scaling.
   - Distinct encounter and reward profiles.

4. **Fast iteration**
   - Data-driven content and deterministic simulation where possible.
   - Logic remains testable without rendering/input dependencies.

## 3) Scope (Early Vertical Slice)

Initial slice should prove the core loop, not full content breadth.

Include:
- Start run with a small default dice pool.
- Basic encounter flow (player turn, enemy response, victory/defeat).
- Rewards after encounters (at least: add/upgrade/modify die faces).
- Map/progression stub with 2–3 node types.
- One boss-like encounter to validate scaling checks.

Defer:
- Full meta progression.
- Content-heavy pools (large enemy catalog, events, relic count).
- Advanced VFX/audio polish.

## 4) Core Loop (Target)

1. Enter encounter node.
2. Roll available dice.
3. Resolve dice effects (damage, defense, utility, status, economy).
4. Enemy turn resolves.
5. Repeat until win/lose.
6. Choose reward (new die face, upgrade, modifier, resource).
7. Navigate to next node.

## 5) System Model (High-Level)

- **Run State**: HP, resources, map position, seed, active modifiers.
- **Dice Pool**: Dice definitions + mutable run-time upgrades.
- **Combat State**: Turn order, intents, statuses, queued effects.
- **Content Data**: Enemy kits, rewards, encounters, events.

All core systems should be representable as plain TypeScript data structures.

## 6) Architecture Rules (Extensible + Testable)

### 6.1 Layering

- **Domain layer (`src/game/**`)**
  - Pure logic and state transitions.
  - No direct `love.*` usage.
  - Deterministic given input + RNG source.

- **Adapter layer (`src/main.ts` and future scene/input/render files)**
  - LÖVE callbacks, rendering, input polling, audio playback.
  - Converts user input and frame timing into domain actions.
  - Reads domain state and renders it.

Rule: `src/game/**` must not import LÖVE modules or globals.

### 6.2 Data-Driven Content

- Prefer declarative content objects over hard-coded branches.
- Use IDs/tags to compose behavior.
- Keep content schemas stable and versionable.

### 6.3 Determinism

- Domain systems must accept an injectable RNG interface.
- Avoid hidden randomness in adapter layer.
- Seeded runs should be replayable at the simulation level.

## 7) Testing Strategy

Primary test target: **engine-agnostic domain modules**.

Testing categories:
- **Unit tests**: deterministic transitions (damage calc, roll resolution, status updates).
- **Property-style checks** (where useful): invariants (HP bounds, resource non-negativity, no invalid state transitions).
- **Golden scenario tests**: fixed-seed combat/reward sequences to detect regressions.

Out of scope for now:
- Heavy UI snapshot testing.
- LÖVE runtime automation (can be added later as smoke checks).

## 8) Code Organization Conventions

- `src/game/core/` for foundational simulation primitives.
- `src/game/combat/` for turn resolution.
- `src/game/dice/` for dice entities and roll/effect logic.
- `src/game/content/` for typed content definitions and starter data.
- `src/game/run/` for map progression and rewards.
- `tests/` mirrors `src/game/` structure.

Keep modules small, explicit, and side-effect-light.

## 9) Decision Heuristics for Future Agents

When multiple implementation choices exist, prefer the one that:
1. Keeps logic in `src/game/**` instead of LÖVE callbacks.
2. Improves deterministic testing.
3. Uses typed data-driven definitions over one-off conditionals.
4. Minimizes coupling across systems.
5. Preserves ability to add content without rewriting core rules.

## 10) Delivery Workflow

- Commit after every **meaningful milestone** (feature slice, refactor phase, test suite expansion, schema change).
- Each milestone should include:
  - Working code.
  - Relevant tests.
  - Brief docs update when behavior/contracts change.

Suggested commit style:
- `feat: add deterministic dice roll resolver`
- `test: cover status stacking rules`
- `refactor: isolate combat state transitions`
- `docs: update GDD reward taxonomy`

## 11) Current North-Star Milestone

Implement a minimal playable loop with:
- One player archetype.
- 3–5 enemy templates.
- 10–20 dice faces/modifiers.
- Deterministic simulation tests for combat and rewards.

If a change does not improve this milestone directly, keep it minimal or defer it.