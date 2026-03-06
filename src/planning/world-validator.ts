import type { ExploreState, ZoneType } from "../exploration/explore-state";
import type { WorldSpec } from "./world-spec-builder";

export type WorldValidationIssue = {
  requirementId: string;
  message: string;
};

export type WorldValidationResult = {
  isValid: boolean;
  zoneCounts: Record<ZoneType, number>;
  issues: WorldValidationIssue[];
};

function countZones(state: ExploreState): Record<ZoneType, number> {
  const counts: Record<ZoneType, number> = {
    forest: 0,
    mountain: 0,
    farmland: 0,
    town: 0,
    ocean: 0,
  };

  for (const tile of state.tiles) {
    counts[tile.zone] += 1;
  }

  return counts;
}

export function validateWorldAgainstSpec(state: ExploreState, spec: WorldSpec): WorldValidationResult {
  const zoneCounts = countZones(state);
  const issues: WorldValidationIssue[] = [];

  if (zoneCounts.town > spec.maxTownTiles) {
    issues.push({
      requirementId: "max-town-tiles",
      message: `Town tiles expected <= ${spec.maxTownTiles}, got ${zoneCounts.town}`,
    });
  }

  for (const zoneRequirement of spec.requiredZones) {
    const currentCount = zoneCounts[zoneRequirement.zone];
    if (currentCount < zoneRequirement.minCount) {
      issues.push({
        requirementId: zoneRequirement.sourceRequirementIds.join(","),
        message: `Zone ${zoneRequirement.zone} expected >= ${zoneRequirement.minCount}, got ${currentCount}`,
      });
    }
  }

  for (const specialRequirement of spec.requiredSpecialTiles) {
    const matchingTiles = state.tiles.filter((tile) => tile.metadata.specialTileId === specialRequirement.id);
    if (matchingTiles.length < specialRequirement.minCount) {
      issues.push({
        requirementId: specialRequirement.id,
        message: `Special tile ${specialRequirement.id} expected >= ${specialRequirement.minCount}, got ${matchingTiles.length}`,
      });
    }
  }

  for (const npcRequirement of spec.requiredNpcs) {
    const placements = state.tiles.flatMap((tile) =>
      tile.locations.flatMap((location) => location.characters.filter((character) => character.npcId === npcRequirement.npcId)),
    );

    if (placements.length < npcRequirement.minCount) {
      issues.push({
        requirementId: npcRequirement.sourceRequirementIds.join(","),
        message: `NPC ${npcRequirement.npcId} expected >= ${npcRequirement.minCount}, got ${placements.length}`,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    zoneCounts,
    issues,
  };
}
