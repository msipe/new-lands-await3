import { createExploreState } from "../../src/exploration/explore-state";
import { applyWorldSpecToExploreState } from "../../src/exploration/world-generator";
import { validateWorldAgainstSpec } from "../../src/planning/world-validator";
import type { WorldSpec } from "../../src/planning/world-spec-builder";
import { listNpcs } from "../../src/planning/content-registry";

const minimalSpec = (seed: string): WorldSpec => ({
  seed,
  maxTownTiles: 2,
  requiredZones: [],
  requiredSpecialTiles: [],
  requiredNpcs: [],
});

describe("world-generator", () => {
  it("applies zone and special tile constraints onto explore state", () => {
    const state = createExploreState(3);
    const spec: WorldSpec = {
      seed: "generator-seed",
      maxTownTiles: 2,
      requiredZones: [
        {
          zone: "forest",
          minCount: 8,
          sourceRequirementIds: ["tile-zone:forest"],
        },
      ],
      requiredSpecialTiles: [
        {
          id: "tile:draculas-castle",
          preferredZone: "mountain",
          minCount: 1,
        },
      ],
      requiredNpcs: [
        {
          npcId: "npc:captain-marla",
          preferredZone: "town",
          minCount: 1,
          sourceRequirementIds: ["npc:captain-marla"],
        },
      ],
    };

    applyWorldSpecToExploreState(state, spec);

    const forestCount = state.tiles.filter((tile) => tile.zone === "forest").length;
    expect(forestCount).toBeGreaterThanOrEqual(8);

    const townCount = state.tiles.filter((tile) => tile.zone === "town").length;
    expect(townCount).toBeLessThanOrEqual(2);

    const specialCount = state.tiles.filter((tile) => tile.metadata.specialTileId === "tile:draculas-castle").length;
    expect(specialCount).toBeGreaterThanOrEqual(1);

    const npcCount = state.tiles
      .flatMap((tile) => tile.locations)
      .flatMap((location) => location.characters)
      .filter((character) => character.npcId === "npc:captain-marla").length;
    expect(npcCount).toBeGreaterThanOrEqual(1);

    const npcIds = state.tiles
      .flatMap((tile) => tile.locations)
      .flatMap((location) => location.characters)
      .map((character) => character.npcId)
      .filter((npcId): npcId is string => typeof npcId === "string");
    expect(new Set(npcIds).size).toBe(npcIds.length);

    const townNpcCounts = state.tiles
      .filter((tile) => tile.zone === "town")
      .map((tile) =>
        tile.locations
          .flatMap((location) => location.characters)
          .filter((character) => typeof character.npcId === "string").length,
      );
    if (townNpcCounts.length >= 2) {
      expect(Math.min(...townNpcCounts)).toBeGreaterThan(0);
    }

    const emptyTownLocations = state.tiles
      .filter((tile) => tile.zone === "town")
      .flatMap((tile) => tile.locations)
      .filter((location) => location.characters.length === 0);
    expect(emptyTownLocations.length).toBe(0);

    const npcById = Object.fromEntries(listNpcs().map((npc) => [npc.id, npc]));
    const npcPlacements = state.tiles
      .flatMap((tile) => tile.locations)
      .flatMap((location) =>
        location.characters
          .filter((character): character is typeof character & { npcId: string } => typeof character.npcId === "string")
          .map((character) => ({
            npcId: character.npcId,
            locationType: location.locationType,
          })),
      );

    for (const placement of npcPlacements) {
      const npc = npcById[placement.npcId];
      expect(npc).toBeDefined();
      if (npc !== undefined) {
        expect(placement.locationType).toBe(npc.residenceBuilding);
      }
    }

    const validation = validateWorldAgainstSpec(state, spec);
    expect(validation.isValid).toBe(true);
  });

  it("assigns exploration flows to non-town tiles after world gen", () => {
    const state = createExploreState(3);
    applyWorldSpecToExploreState(state, minimalSpec("flow-assign-test"));

    const nonTownTiles = state.tiles.filter((tile) => tile.zone !== "town");
    const tilesWithFlow = nonTownTiles.filter((tile) => tile.explorationFlowId !== null);

    expect(tilesWithFlow.length).toBeGreaterThan(0);

    for (const tile of tilesWithFlow) {
      expect(typeof tile.explorationFlowId).toBe("string");
    }
  });

  it("does not assign flows to town tiles", () => {
    const state = createExploreState(3);
    applyWorldSpecToExploreState(state, minimalSpec("town-no-flow"));

    const townTiles = state.tiles.filter((tile) => tile.zone === "town");
    expect(townTiles.length).toBeGreaterThan(0);

    for (const tile of townTiles) {
      expect(tile.explorationFlowId).toBeNull();
    }
  });

  it("initializes flowLevel to 0 on all tiles after world gen", () => {
    const state = createExploreState(3);
    applyWorldSpecToExploreState(state, minimalSpec("flowlevel-zero"));

    for (const tile of state.tiles) {
      expect(tile.flowLevel).toBe(0);
    }
  });

  it("assigns each flow to at most one tile", () => {
    const state = createExploreState(3);
    applyWorldSpecToExploreState(state, minimalSpec("no-flow-reuse"));

    const assigned = state.tiles
      .map((tile) => tile.explorationFlowId)
      .filter((id): id is string => id !== null);

    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("produces the same flow assignments for the same seed", () => {
    const state1 = createExploreState(3);
    const state2 = createExploreState(3);
    applyWorldSpecToExploreState(state1, minimalSpec("determinism-seed"));
    applyWorldSpecToExploreState(state2, minimalSpec("determinism-seed"));

    for (const tile of state1.tiles) {
      expect(state2.tileByKey[tile.key].explorationFlowId).toBe(tile.explorationFlowId);
    }
  });

  it("produces different flow assignments for different seeds", () => {
    const state1 = createExploreState(3);
    const state2 = createExploreState(3);
    applyWorldSpecToExploreState(state1, minimalSpec("seed-alpha"));
    applyWorldSpecToExploreState(state2, minimalSpec("seed-beta"));

    const ids1 = state1.tiles.map((t) => t.explorationFlowId).join(",");
    const ids2 = state2.tiles.map((t) => t.explorationFlowId).join(",");
    expect(ids1).not.toBe(ids2);
  });
});
