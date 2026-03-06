import type { PlannerRequirement, GamePlanSpec } from "./game-planner";
import type { ZoneType } from "../exploration/explore-state";

export type RequiredZoneConstraint = {
  zone: ZoneType;
  minCount: number;
  sourceRequirementIds: string[];
};

export type RequiredSpecialTileConstraint = {
  id: string;
  preferredZone?: ZoneType;
  minCount: number;
};

export type RequiredNpcConstraint = {
  npcId: string;
  preferredZone?: ZoneType;
  minCount: number;
  sourceRequirementIds: string[];
};

export type WorldSpec = {
  seed: string;
  maxTownTiles: number;
  requiredZones: RequiredZoneConstraint[];
  requiredSpecialTiles: RequiredSpecialTileConstraint[];
  requiredNpcs: RequiredNpcConstraint[];
};

const VALID_ZONES: Record<ZoneType, true> = {
  forest: true,
  mountain: true,
  farmland: true,
  town: true,
  ocean: true,
};

function readZone(value: string | number | boolean | undefined): ZoneType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (VALID_ZONES[value as ZoneType] === true) {
    return value as ZoneType;
  }

  return undefined;
}

function collectZoneRequirements(requirements: PlannerRequirement[]): RequiredZoneConstraint[] {
  const map: Record<string, RequiredZoneConstraint> = {};

  for (const requirement of requirements) {
    if (requirement.kind !== "tile-zone") {
      continue;
    }

    const zone = readZone(requirement.metadata.zone);
    if (zone === undefined) {
      continue;
    }

    const existing = map[zone];
    if (existing !== undefined) {
      existing.minCount += requirement.minCount;
      existing.sourceRequirementIds.push(requirement.id);
      continue;
    }

    map[zone] = {
      zone,
      minCount: requirement.minCount,
      sourceRequirementIds: [requirement.id],
    };
  }

  return Object.values(map);
}

function collectSpecialTileRequirements(requirements: PlannerRequirement[]): RequiredSpecialTileConstraint[] {
  const entries: RequiredSpecialTileConstraint[] = [];

  for (const requirement of requirements) {
    if (requirement.kind !== "special-tile") {
      continue;
    }

    entries.push({
      id: requirement.id,
      preferredZone: readZone(requirement.metadata.zone),
      minCount: Math.max(1, requirement.minCount),
    });
  }

  return entries;
}

function collectNpcRequirements(requirements: PlannerRequirement[]): RequiredNpcConstraint[] {
  const map: Record<string, RequiredNpcConstraint> = {};

  for (const requirement of requirements) {
    if (requirement.kind !== "npc-presence") {
      continue;
    }

    const npcId = requirement.metadata.npcId;
    if (typeof npcId !== "string") {
      continue;
    }

    const preferredZone = readZone(requirement.metadata.preferredZone);
    const existing = map[npcId];
    if (existing !== undefined) {
      existing.minCount = 1;
      existing.sourceRequirementIds.push(requirement.id);
      continue;
    }

    map[npcId] = {
      npcId,
      preferredZone,
      minCount: 1,
      sourceRequirementIds: [requirement.id],
    };
  }

  return Object.values(map);
}

export function createWorldSpecFromPlan(plan: GamePlanSpec): WorldSpec {
  return {
    seed: plan.seed,
    maxTownTiles: Math.max(1, plan.worldConfig.maxTownTiles),
    requiredZones: collectZoneRequirements(plan.requirements),
    requiredSpecialTiles: collectSpecialTileRequirements(plan.requirements),
    requiredNpcs: collectNpcRequirements(plan.requirements),
  };
}
