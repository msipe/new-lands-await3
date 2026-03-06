import type { ExploreTile } from "./explore-state";

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash *= 16777619;
  }

  return (hash >>> 0) / 4294967296;
}

export function pickEnemyIdForTile(tile: ExploreTile | undefined, runSeed: string): string | undefined {
  if (!tile || tile.enemyPool.length === 0) {
    return undefined;
  }

  let totalWeight = 0;
  for (const entry of tile.enemyPool) {
    totalWeight += Math.max(0, entry.weight);
  }

  if (totalWeight <= 0) {
    return tile.enemyPool[0].enemyId;
  }

  const roll = hashToUnitInterval(`${runSeed}:${tile.key}:${tile.zone}:enemy-pool`) * totalWeight;
  let cursor = 0;

  for (const entry of tile.enemyPool) {
    const weight = Math.max(0, entry.weight);
    cursor += weight;
    if (roll <= cursor) {
      return entry.enemyId;
    }
  }

  return tile.enemyPool[tile.enemyPool.length - 1].enemyId;
}
