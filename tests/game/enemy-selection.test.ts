import { pickEnemyIdForTile } from "../../src/exploration/enemy-selection";
import { createExploreState } from "../../src/exploration/explore-state";

describe("enemy selection", () => {
  it("returns undefined when tile is missing or pool is empty", () => {
    expect(pickEnemyIdForTile(undefined, "seed-a")).toBeUndefined();

    const state = createExploreState({
      radius: 1,
      tileOverridesByKey: {
        "0,0": {
          enemyPool: [],
        },
      },
    });

    expect(pickEnemyIdForTile(state.tileByKey["0,0"], "seed-a")).toBeUndefined();
  });

  it("falls back to first entry when total weight is non-positive", () => {
    const state = createExploreState({
      radius: 1,
      tileOverridesByKey: {
        "0,0": {
          enemyPool: [
            { enemyId: "enemy:slime-raider", weight: 0 },
            { enemyId: "enemy:goblin-hexer", weight: -3 },
          ],
        },
      },
    });

    const selected = pickEnemyIdForTile(state.tileByKey["0,0"], "seed-a");
    expect(selected).toBe("enemy:slime-raider");
  });

  it("is deterministic for same seed and tile", () => {
    const state = createExploreState({ radius: 2, seed: "same-world" });
    const tile = state.tileByKey["1,0"];

    const first = pickEnemyIdForTile(tile, "run-seed-42");
    const second = pickEnemyIdForTile(tile, "run-seed-42");

    expect(first).toBeDefined();
    expect(first).toBe(second);
  });

  it("always returns an ID that exists in the tile pool", () => {
    const state = createExploreState({ radius: 2, seed: "pool-world" });
    const tile = state.tileByKey["1,-1"];

    const poolIds = tile.enemyPool.map((entry) => entry.enemyId);
    expect(poolIds.length).toBeGreaterThan(0);

    const selected = pickEnemyIdForTile(tile, "any-run-seed");
    expect(poolIds.includes(selected as string)).toBe(true);
  });
});
