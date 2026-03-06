import {
  createExploreState,
  getHexDistance,
  isNeighbor,
  tryTravelToCoord,
} from "../../src/exploration/explore-state";
import { createDefaultTileFactoryConfig } from "../../src/exploration/tile-factory";

describe("explore-state", () => {
  it("creates a hex map with center start tile", () => {
    const state = createExploreState(2);
    const center = state.tileByKey["0,0"];

    expect(state.tiles.length).toBe(19);
    expect(state.playerCoord).toEqual({ q: 0, r: 0 });
    expect(center.zone).toBe("town");
    expect(center.name.length).toBeGreaterThan(0);
    expect(center.description.length).toBeGreaterThan(0);
    expect(center.encounterPlaceholders.length).toBeGreaterThan(0);
    expect(center.locations.length).toBeGreaterThan(0);
    expect(center.locations[0].characters.length).toBeGreaterThanOrEqual(0);
    expect(center.status).toBe("active");
  });

  it("moves only to neighboring tiles", () => {
    const state = createExploreState(2);

    const moved = tryTravelToCoord(state, { q: 1, r: 0 });
    expect(moved).toBe(true);
    expect(state.playerCoord).toEqual({ q: 1, r: 0 });
    expect(state.tileByKey["0,0"].status).toBe("visited");
    expect(state.tileByKey["1,0"].status).toBe("active");
  });

  it("rejects travel to non-neighbor tile", () => {
    const state = createExploreState(2);

    const moved = tryTravelToCoord(state, { q: 2, r: 0 });
    expect(moved).toBe(false);
    expect(state.playerCoord).toEqual({ q: 0, r: 0 });
    expect(state.notice).toContain("neighboring");
  });

  it("computes hex distance and neighbor checks correctly", () => {
    expect(getHexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(isNeighbor({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(true);
    expect(isNeighbor({ q: 0, r: 0 }, { q: -2, r: 1 })).toBe(false);
  });

  it("supports tile factory customization and per-tile overrides", () => {
    const defaults = createDefaultTileFactoryConfig();
    const state = createExploreState({
      radius: 1,
      tileFactoryConfig: {
        ...defaults,
        customizeTile: (tile) => ({
          ...tile,
          metadata: {
            ...tile.metadata,
            biomeTier: "prototype",
          },
        }),
      },
      tileOverridesByKey: {
        "0,0": {
          name: "Starter Town",
        },
      },
    });

    expect(state.tileByKey["0,0"].name).toBe("Starter Town");
    expect(state.tileByKey["0,0"].metadata.biomeTier).toBe("prototype");
    expect(state.tileByKey["0,0"].locations.length).toBeGreaterThan(0);
  });

  it("supports overriding generated town locations", () => {
    const state = createExploreState({
      radius: 1,
      tileFactoryConfig: {
        buildLocations: (zone, context) => {
          if (zone !== "town") {
            return [];
          }

          return [
            {
              id: `${context.key}:archive`,
              name: "Archive",
              description: "A quiet archive used as a prototype town location.",
              locationType: "guild",
              characters: [
                {
                  id: `${context.key}:scribe`,
                  name: "Scribe Hel",
                  role: "Lorekeeper",
                  disposition: "friendly",
                  description: "Tracks local quest threads.",
                  questHooks: ["missing-ledger"],
                },
              ],
              tags: ["knowledge"],
            },
          ];
        },
      },
    });

    expect(state.tileByKey["0,0"].locations[0].name).toBe("Archive");
    expect(state.tileByKey["0,0"].locations[0].characters[0].name).toBe("Scribe Hel");
  });
});
