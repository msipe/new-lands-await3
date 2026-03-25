import { createDefaultTileFactoryConfig, type TileTemplate } from "./tile-factory";
import { getHexDistance, type ExploreState, type ExploreTile, type ZoneType } from "./explore-state";
import type { WorldSpec } from "../planning/world-spec-builder";
import { getNpcById, getTileById, listExplorationFlows, listNpcs } from "../planning/content-registry";
import type { ContentExplorationFlow, ContentNpc } from "../planning/content-types";

const START_TILE_KEY = "0,0";
const NPCS_PER_TOWN = 3;

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash *= 16777619;
  }

  const normalized = (hash >>> 0) / 4294967296;
  return normalized;
}

function applyTemplateToTile(tile: ExploreTile, template: TileTemplate): void {
  tile.zone = template.zone;
  tile.name = template.name;
  tile.description = template.description;
  tile.color = [template.color[0], template.color[1], template.color[2], template.color[3]];
  tile.explorationFlowId = null;
  tile.flowLevel = 0;
  tile.enemyPool = template.enemyPool.map((entry) => ({
    enemyId: entry.enemyId,
    weight: entry.weight,
  }));
  tile.tags = [...template.tags];
  tile.locations = [];
}

function pickCandidateTiles(state: ExploreState, targetZone: ZoneType): ExploreTile[] {
  const pool = state.tiles.filter((tile) => tile.key !== START_TILE_KEY && tile.zone !== targetZone);

  pool.sort((a, b) => {
    const aScore = hashToUnitInterval(`${a.key}:${targetZone}`);
    const bScore = hashToUnitInterval(`${b.key}:${targetZone}`);
    return aScore - bScore;
  });

  return pool;
}

function addTownLocations(tile: ExploreTile, radius: number): void {
  const defaults = createDefaultTileFactoryConfig();
  const buildLocations = defaults.buildLocations;

  if (buildLocations === undefined) {
    return;
  }

  const distanceFromCenter = getHexDistance({ q: 0, r: 0 }, tile.coord);
  const locations = buildLocations("town", {
    key: tile.key,
    coord: { q: tile.coord.q, r: tile.coord.r },
    radius,
    distanceFromCenter,
    roll: hashToUnitInterval(`roll:${tile.key}:${radius}`),
  });

  tile.locations = locations;
}

function ensureZoneMinimums(state: ExploreState, spec: WorldSpec): void {
  const defaults = createDefaultTileFactoryConfig();

  for (const requirement of spec.requiredZones) {
    const currentCount = state.tiles.filter((tile) => tile.zone === requirement.zone).length;
    if (currentCount >= requirement.minCount) {
      continue;
    }

    const needed = requirement.minCount - currentCount;
    const candidates = pickCandidateTiles(state, requirement.zone);

    for (let i = 0; i < needed && i < candidates.length; i += 1) {
      const tile = candidates[i];
      applyTemplateToTile(tile, defaults.templatesByZone[requirement.zone]);
      if (requirement.zone === "town") {
        addTownLocations(tile, state.radius);
      }
    }
  }
}

function pickReplacementZone(tileKey: string, seed: string): ZoneType {
  const pool: ZoneType[] = ["forest", "farmland", "mountain", "ocean"];
  const index = Math.floor(hashToUnitInterval(`${seed}:replace:${tileKey}`) * pool.length);
  return pool[Math.max(0, Math.min(pool.length - 1, index))];
}

function enforceMaxTownTiles(state: ExploreState, spec: WorldSpec): void {
  const townMinRequirement =
    spec.requiredZones.find((entry) => entry.zone === "town")?.minCount ?? 0;
  const maxTownTiles = Math.max(spec.maxTownTiles, townMinRequirement);
  const townTiles = state.tiles.filter((tile) => tile.zone === "town");

  if (townTiles.length <= maxTownTiles) {
    return;
  }

  const protectedKeys: Record<string, true> = {
    [START_TILE_KEY]: true,
  };

  const candidates = townTiles.filter((tile) => protectedKeys[tile.key] !== true);
  candidates.sort((a, b) => hashToUnitInterval(`${spec.seed}:${a.key}`) - hashToUnitInterval(`${spec.seed}:${b.key}`));

  let toConvert = townTiles.length - maxTownTiles;
  for (const tile of candidates) {
    if (toConvert <= 0) {
      break;
    }

    const replacementZone = pickReplacementZone(tile.key, spec.seed);
    const defaults = createDefaultTileFactoryConfig();
    applyTemplateToTile(tile, defaults.templatesByZone[replacementZone]);
    toConvert -= 1;
  }
}

function ensureSpecialTiles(state: ExploreState, spec: WorldSpec): void {
  const defaults = createDefaultTileFactoryConfig();

  for (const special of spec.requiredSpecialTiles) {
    const existing = state.tiles.filter((tile) => tile.metadata.specialTileId === special.id);
    if (existing.length >= special.minCount) {
      continue;
    }

    const preferredZone = special.preferredZone;
    const candidatePool = state.tiles.filter((tile) => {
      if (tile.key === START_TILE_KEY) {
        return false;
      }

      if (tile.metadata.specialTileId !== undefined) {
        return false;
      }

      if (preferredZone !== undefined) {
        return tile.zone === preferredZone;
      }

      return true;
    });

    if (candidatePool.length === 0) {
      continue;
    }

    candidatePool.sort((a, b) => hashToUnitInterval(a.key) - hashToUnitInterval(b.key));
    const selected = candidatePool[0];

    if (preferredZone !== undefined && selected.zone !== preferredZone) {
      applyTemplateToTile(selected, defaults.templatesByZone[preferredZone]);
      if (preferredZone === "town") {
        addTownLocations(selected, state.radius);
      }
    }

    selected.metadata = {
      ...selected.metadata,
      specialTileId: special.id,
      specialTile: true,
    };
    selected.tags = [...selected.tags, "special-tile"];
    const tileDefinition = getTileById(special.id);
    selected.name = tileDefinition.name;
    if (tileDefinition.enemyIds && tileDefinition.enemyIds.length > 0) {
      selected.enemyPool = tileDefinition.enemyIds.map((enemyId) => ({
        enemyId,
        weight: 1,
      }));
    }
  }
}

type TownPlacementSlot = {
  tile: ExploreTile;
  assignedCount: number;
};

function getTownPlacementSlots(state: ExploreState, spec: WorldSpec): TownPlacementSlot[] {
  const townTiles = state.tiles.filter((tile) => tile.zone === "town");

  for (const tile of townTiles) {
    if (tile.locations.length === 0) {
      addTownLocations(tile, state.radius);
    }
  }

  const slots = townTiles
    .filter((tile) => tile.locations.length > 0)
    .map((tile) => {
      const assignedCount = tile.locations
        .flatMap((location) => location.characters)
        .filter((character) => character.npcId !== undefined).length;

      return {
        tile,
        assignedCount,
      };
    });

  slots.sort((a, b) => hashToUnitInterval(`${spec.seed}:town-slot:${a.tile.key}`) - hashToUnitInterval(`${spec.seed}:town-slot:${b.tile.key}`));
  return slots;
}

function createFallbackTownLocation(tile: ExploreTile, building: ContentNpc["residenceBuilding"]): ExploreTile["locations"][number] {
  const titleByBuilding: Record<ContentNpc["residenceBuilding"], string> = {
    shop: "Provision Shop",
    inn: "Roadside Inn",
    guild: "Guild Hall",
    square: "Town Square",
    shrine: "Wayside Shrine",
  };

  return {
    id: `${tile.key}:generated-${building}`,
    name: titleByBuilding[building],
    description: `A ${building} where local residents gather and exchange news.`,
    locationType: building,
    characters: [],
    tags: ["generated", building],
  };
}

function getOrCreateBuildingLocation(
  tile: ExploreTile,
  npc: ContentNpc,
  spec: WorldSpec,
): ExploreTile["locations"][number] {
  const existing = tile.locations.find((location) => location.locationType === npc.residenceBuilding);
  if (existing !== undefined) {
    return existing;
  }

  const generated = createFallbackTownLocation(tile, npc.residenceBuilding);
  const insertIndex = Math.floor(hashToUnitInterval(`${spec.seed}:insert-location:${tile.key}:${npc.id}`) * (tile.locations.length + 1));
  tile.locations.splice(Math.max(0, Math.min(tile.locations.length, insertIndex)), 0, generated);
  return generated;
}

function assignNpcToTown(slot: TownPlacementSlot, npc: ContentNpc, spec: WorldSpec): boolean {
  const hasNpcAlready = slot.tile.locations.some((location) =>
    location.characters.some((character) => character.npcId === npc.id),
  );

  if (hasNpcAlready || slot.assignedCount >= NPCS_PER_TOWN) {
    return false;
  }

  const targetLocation = getOrCreateBuildingLocation(slot.tile, npc, spec);

  targetLocation.characters.push({
    id: `${slot.tile.key}:npc:${npc.id}`,
    npcId: npc.id,
    name: npc.name,
    role: npc.role,
    disposition: "neutral",
    description: npc.notes,
    questHooks: [],
  });

  slot.assignedCount += 1;
  return true;
}

function placeTownNpcs(state: ExploreState, spec: WorldSpec): void {
  const slots = getTownPlacementSlots(state, spec);
  if (slots.length === 0) {
    return;
  }

  const usedNpcIds: Record<string, true> = {};
  const requiredNpcIds: Record<string, true> = {};

  const requiredNpcs = spec.requiredNpcs.map((requirement) => {
    requiredNpcIds[requirement.npcId] = true;
    return getNpcById(requirement.npcId);
  });

  requiredNpcs.sort((a, b) => hashToUnitInterval(`${spec.seed}:required:${a.id}`) - hashToUnitInterval(`${spec.seed}:required:${b.id}`));

  for (const npc of requiredNpcs) {
    if (usedNpcIds[npc.id] === true) {
      continue;
    }

    const candidates = [...slots].filter((entry) => entry.assignedCount < NPCS_PER_TOWN);
    candidates.sort((a, b) => {
      if (a.assignedCount !== b.assignedCount) {
        return a.assignedCount - b.assignedCount;
      }

      const aBias = hashToUnitInterval(`${spec.seed}:required-town:${npc.id}:${a.tile.key}`);
      const bBias = hashToUnitInterval(`${spec.seed}:required-town:${npc.id}:${b.tile.key}`);
      return aBias - bBias;
    });

    const target = candidates[0];
    if (target === undefined) {
      break;
    }

    if (assignNpcToTown(target, npc, spec)) {
      usedNpcIds[npc.id] = true;
    }
  }

  const ambientPool = listNpcs().filter(
    (npc) => npc.defaultZone === "town" && requiredNpcIds[npc.id] !== true,
  );
  ambientPool.sort((a, b) => hashToUnitInterval(`${spec.seed}:ambient:${a.id}`) - hashToUnitInterval(`${spec.seed}:ambient:${b.id}`));

  for (const npc of ambientPool) {
    if (usedNpcIds[npc.id] === true) {
      continue;
    }

    const candidates = [...slots].filter((entry) => entry.assignedCount < NPCS_PER_TOWN);
    if (candidates.length === 0) {
      break;
    }

    candidates.sort((a, b) => {
      if (a.assignedCount !== b.assignedCount) {
        return a.assignedCount - b.assignedCount;
      }

      const aBias = hashToUnitInterval(`${spec.seed}:ambient-town:${npc.id}:${a.tile.key}`);
      const bBias = hashToUnitInterval(`${spec.seed}:ambient-town:${npc.id}:${b.tile.key}`);
      return aBias - bBias;
    });

    const target = candidates[0];
    if (target === undefined) {
      break;
    }

    if (assignNpcToTown(target, npc, spec)) {
      usedNpcIds[npc.id] = true;
    }
  }

  for (const slot of slots) {
    slot.tile.locations = slot.tile.locations.filter((location) => location.characters.length > 0);
  }
}

function assignExplorationFlows(state: ExploreState, seed: string): void {
  const allFlows = listExplorationFlows();

  const poolByZone: Partial<Record<ZoneType, ContentExplorationFlow[]>> = {};
  for (const flow of allFlows) {
    if (poolByZone[flow.zone] === undefined) {
      poolByZone[flow.zone] = [];
    }
    poolByZone[flow.zone]!.push(flow);
  }

  const candidates = state.tiles
    .filter((tile) => tile.zone !== "town")
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  for (const tile of candidates) {
    const pool = poolByZone[tile.zone];
    if (pool === undefined || pool.length === 0) {
      continue;
    }

    const score = hashToUnitInterval(`${seed}:flow:${tile.key}`);
    const index = Math.max(0, Math.min(pool.length - 1, Math.floor(score * pool.length)));
    tile.explorationFlowId = pool[index].id;
    pool.splice(index, 1);
  }
}

export function applyWorldSpecToExploreState(state: ExploreState, spec: WorldSpec): void {
  ensureZoneMinimums(state, spec);
  ensureSpecialTiles(state, spec);
  enforceMaxTownTiles(state, spec);
  placeTownNpcs(state, spec);
  assignExplorationFlows(state, spec.seed);
}
