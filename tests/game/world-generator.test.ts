import { createExploreState } from "../../src/exploration/explore-state";
import { applyWorldSpecToExploreState } from "../../src/exploration/world-generator";
import { validateWorldAgainstSpec } from "../../src/planning/world-validator";
import type { WorldSpec } from "../../src/planning/world-spec-builder";
import { listNpcs } from "../../src/planning/content-registry";

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
});
