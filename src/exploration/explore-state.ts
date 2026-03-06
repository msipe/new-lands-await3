import {
  createDefaultTileFactoryConfig,
  createTileFromFactory,
  type ExploreTile,
  type TileFactoryConfig,
} from "./tile-factory";

export type { EncounterPlaceholder, ExploreTile, TileColor, TileStatus, ZoneType } from "./tile-factory";
export type { TownCharacter, TownLocation } from "./tile-factory";

export type ExploreBranch = "combat" | "encounter";

export type HexCoord = {
  q: number;
  r: number;
};

export type ExploreState = {
  radius: number;
  tiles: ExploreTile[];
  tileByKey: Record<string, ExploreTile>;
  playerCoord: HexCoord;
  notice: string;
};

export type CreateExploreStateOptions = {
  radius?: number;
  seed?: string;
  tileFactoryConfig?: Partial<TileFactoryConfig>;
  tileCustomizer?: (tile: ExploreTile) => ExploreTile;
  tileOverridesByKey?: Record<string, Partial<ExploreTile>>;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash *= 16777619;
  }

  return hash >>> 0;
}

export function toCoordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function getHexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -a.q - a.r - (-b.q - b.r);
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function isNeighbor(a: HexCoord, b: HexCoord): boolean {
  return getHexDistance(a, b) === 1;
}

export function getNeighborCoords(coord: HexCoord): HexCoord[] {
  return [
    { q: coord.q + 1, r: coord.r },
    { q: coord.q + 1, r: coord.r - 1 },
    { q: coord.q, r: coord.r - 1 },
    { q: coord.q - 1, r: coord.r },
    { q: coord.q - 1, r: coord.r + 1 },
    { q: coord.q, r: coord.r + 1 },
  ];
}

function hashToUnitInterval(q: number, r: number, radius: number, seedHash: number): number {
  // Small deterministic hash to keep generation pure and test-friendly.
  const raw = Math.sin(q * 12.9898 + r * 78.233 + radius * 31.4159 + seedHash * 0.0001) * 43758.5453;
  return raw - Math.floor(raw);
}

function buildTileFactoryConfig(options?: CreateExploreStateOptions): TileFactoryConfig {
  const defaults = createDefaultTileFactoryConfig();
  const partial = options?.tileFactoryConfig;

  return {
    templatesByZone: partial?.templatesByZone ?? defaults.templatesByZone,
    chooseZone: partial?.chooseZone ?? defaults.chooseZone,
    buildLocations: partial?.buildLocations ?? defaults.buildLocations,
    customizeTile: partial?.customizeTile,
  };
}

function applyTileOverrides(
  tile: ExploreTile,
  tileOverridesByKey?: Record<string, Partial<ExploreTile>>,
  tileCustomizer?: (tile: ExploreTile) => ExploreTile,
): ExploreTile {
  const withOverrides = tileOverridesByKey?.[tile.key]
    ? {
        ...tile,
        ...tileOverridesByKey[tile.key],
      }
    : tile;

  if (!tileCustomizer) {
    return withOverrides;
  }

  return tileCustomizer(withOverrides);
}

export function createExploreState(input?: number | CreateExploreStateOptions): ExploreState {
  const options: CreateExploreStateOptions =
    typeof input === "number" ? { radius: input } : input ?? {};
  const radius = options.radius ?? 3;
  const seedHash = hashString(options.seed ?? "run-default");

  const tiles: ExploreTile[] = [];
  const tileByKey: Record<string, ExploreTile> = {};
  const tileFactory = buildTileFactoryConfig(options);

  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);

    for (let r = rMin; r <= rMax; r += 1) {
      const distance = getHexDistance({ q: 0, r: 0 }, { q, r });
      const roll = hashToUnitInterval(q, r, radius, seedHash);
      const key = `${q},${r}`;

      let tile = createTileFromFactory(tileFactory, {
        coord: { q, r },
        key,
        radius,
        distanceFromCenter: distance,
        roll,
      });

      tile = applyTileOverrides(tile, options.tileOverridesByKey, options.tileCustomizer);

      tiles.push(tile);
      tileByKey[tile.key] = tile;
    }
  }

  const startTile = tileByKey["0,0"];
  if (startTile !== undefined) {
    startTile.status = "active";
  }

  return {
    radius,
    tiles,
    tileByKey,
    playerCoord: { q: 0, r: 0 },
    notice: "Click a neighboring hex to travel. Then choose Combat or Encounter.",
  };
}

export function getCurrentTile(state: ExploreState): ExploreTile {
  return state.tileByKey[toCoordKey(state.playerCoord)];
}

export function tryTravelToCoord(state: ExploreState, target: HexCoord): boolean {
  const currentTile = state.tileByKey[toCoordKey(state.playerCoord)];
  const targetTile = state.tileByKey[toCoordKey(target)];
  if (!targetTile) {
    state.notice = "That tile is outside the known map.";
    return false;
  }

  if (!isNeighbor(state.playerCoord, target)) {
    state.notice = "You can only move to neighboring tiles.";
    return false;
  }

  if (currentTile !== undefined) {
    currentTile.status = "visited";
  }
  state.playerCoord = { q: target.q, r: target.r };
  targetTile.status = "active";
  state.notice = `Traveled to ${targetTile.name}. Choose your next action.`;
  return true;
}
