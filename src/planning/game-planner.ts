import {
  getBigBadById,
  getNpcById,
  getQuestById,
  getTileById,
} from "./content-registry";
import type { ContentQuest } from "./content-types";

export type PlannerRequirementKind =
  | "tile-zone"
  | "special-tile"
  | "npc-presence"
  | "quest-presence"
  | "event-collection";

export type PlannerRequirement = {
  id: string;
  kind: PlannerRequirementKind;
  description: string;
  minCount: number;
  tags: string[];
  metadata: Record<string, string | number | boolean>;
};

export type QuestTemplate = {
  id: string;
  name: string;
  summary: string;
  type: "main" | "side" | "town";
  requirementTemplates: Array<Omit<PlannerRequirement, "minCount"> & { minCount?: number }>;
};

export type BigBadTemplate = {
  id: string;
  name: string;
  summary: string;
  tileRequirement: Omit<PlannerRequirement, "minCount"> & { minCount?: number };
  eventRequirement: Omit<PlannerRequirement, "minCount"> & { minCount?: number };
};

export type GamePlannerConfig = {
  seed: string;
  sideQuestCount: number;
  townCount: number;
  maxTownTiles: number;
  bigBadId: string;
  mainQuestId?: string;
  sideQuestIds?: string[];
  mandatorySideQuestIds?: string[];
  townQuestIds?: string[];
};

export type GamePlannerWorldConfig = {
  maxTownTiles: number;
};

export type GamePlanSpec = {
  seed: string;
  worldConfig: GamePlannerWorldConfig;
  bigBad: BigBadTemplate;
  mainQuest: QuestTemplate;
  sideQuests: QuestTemplate[];
  townQuests: QuestTemplate[];
  requirements: PlannerRequirement[];
  debugNotes: string[];
};

type RequirementTemplate = Omit<PlannerRequirement, "minCount"> & { minCount?: number };

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash *= 16777619;
  }

  return hash >>> 0;
}

class DeterministicRng {
  private state: number;

  constructor(seed: string) {
    this.state = hashString(seed) || 123456789;
  }

  next(): number {
    // LCG constants from Numerical Recipes.
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}

function cloneQuest(quest: QuestTemplate): QuestTemplate {
  return {
    ...quest,
    requirementTemplates: quest.requirementTemplates.map((entry) => ({
      ...entry,
      tags: [...entry.tags],
      metadata: { ...entry.metadata },
    })),
  };
}

function toRequirementTemplate(
  requirement: ContentQuest["requirements"][number],
): RequirementTemplate {
  const metadata: Record<string, string | number | boolean> = {
    ...requirement.metadata,
  };

  const npcId = requirement.metadata.npcId;
  if (requirement.kind === "npc-presence" && typeof npcId === "string") {
    const npc = getNpcById(npcId);
    metadata.npcName = npc.name;
  }

  return {
    id: requirement.id,
    kind: requirement.kind,
    description: requirement.description,
    minCount: requirement.minCount,
    tags: [...requirement.tags],
    metadata,
  };
}

function toQuestTemplate(questId: string): QuestTemplate {
  const quest = getQuestById(questId);

  return {
    id: quest.id,
    name: quest.name,
    summary: quest.summary,
    type: quest.type,
    requirementTemplates: quest.requirements.map((entry) => toRequirementTemplate(entry)),
  };
}

function toBigBadTemplate(bigBadId: string): BigBadTemplate {
  const bigBad = getBigBadById(bigBadId);
  const specialTile = getTileById(bigBad.specialTileId);

  return {
    id: bigBad.id,
    name: bigBad.name,
    summary: bigBad.summary,
    tileRequirement: {
      id: specialTile.id,
      kind: "special-tile",
      description: `Spawn ${specialTile.name} tile in the world.`,
      tags: [...specialTile.tags, "big-bad"],
      metadata: { zone: specialTile.zone, unique: specialTile.unique, bigBadId: bigBad.id },
    },
    eventRequirement: {
      id: bigBad.eventCollectionId,
      kind: "event-collection",
      description: `Include random event collection themed around ${bigBad.name}.`,
      tags: ["events", "big-bad"],
      metadata: { owner: bigBad.id },
    },
  };
}

function addRequirement(
  bag: Record<string, PlannerRequirement>,
  template: RequirementTemplate,
): void {
  const minCount = template.minCount ?? 1;
  const existing = bag[template.id];

  if (existing !== undefined) {
    existing.minCount += minCount;
    return;
  }

  bag[template.id] = {
    id: template.id,
    kind: template.kind,
    description: template.description,
    minCount,
    tags: [...template.tags],
    metadata: { ...template.metadata },
  };
}

function takeUniqueRandom<T extends { id: string }>(
  pool: T[],
  count: number,
  rng: DeterministicRng,
  alreadyChosenIds: Record<string, true>,
): T[] {
  const available = pool.filter((entry) => alreadyChosenIds[entry.id] !== true);
  const picked: T[] = [];

  while (picked.length < count && available.length > 0) {
    const rawIndex = Math.floor(rng.next() * available.length);
    const index = Math.max(0, Math.min(available.length - 1, rawIndex));
    const selected = available[index];

    if (selected === undefined) {
      available.splice(index, 1);
      continue;
    }

    picked.push(selected);
    alreadyChosenIds[selected.id] = true;
    available.splice(index, 1);
  }

  return picked;
}

export function createDefaultGamePlannerConfig(seed = "run-001"): GamePlannerConfig {
  const bigBad = getBigBadById("lord-dracula");

  return {
    seed,
    sideQuestCount: 2,
    townCount: 2,
    maxTownTiles: 2,
    bigBadId: bigBad.id,
    mainQuestId: bigBad.mainQuestId,
    sideQuestIds: [...bigBad.sideQuestIds],
    mandatorySideQuestIds: [...bigBad.mandatorySideQuestIds],
    townQuestIds: [...bigBad.townQuestIds],
  };
}

export class GamePlanner {
  private readonly config: GamePlannerConfig;

  constructor(config: GamePlannerConfig) {
    this.config = config;
  }

  createPlan(): GamePlanSpec {
    const rng = new DeterministicRng(this.config.seed);
    const requirementBag: Record<string, PlannerRequirement> = {};

    const bigBadContent = getBigBadById(this.config.bigBadId);
    const bigBad = toBigBadTemplate(bigBadContent.id);

    const mainQuestId = this.config.mainQuestId ?? bigBadContent.mainQuestId;
    const mainQuest = toQuestTemplate(mainQuestId);

    const sideQuestIds = this.config.sideQuestIds ?? bigBadContent.sideQuestIds;
    const townQuestIds = this.config.townQuestIds ?? bigBadContent.townQuestIds;
    const mandatorySideQuestIds = this.config.mandatorySideQuestIds ?? bigBadContent.mandatorySideQuestIds;
    const sideQuestPool = sideQuestIds.map((id) => toQuestTemplate(id));
    const townQuestPool = townQuestIds.map((id) => toQuestTemplate(id));

    addRequirement(requirementBag, bigBad.tileRequirement);
    addRequirement(requirementBag, bigBad.eventRequirement);

    const mainQuestClone = cloneQuest(mainQuest);
    for (const requirement of mainQuestClone.requirementTemplates) {
      addRequirement(requirementBag, requirement);
    }

    const chosenIds: Record<string, true> = {};
    const mandatorySide = sideQuestPool
      .filter((quest) => mandatorySideQuestIds.includes(quest.id))
      .slice(0, this.config.sideQuestCount)
      .map(cloneQuest);

    for (const quest of mandatorySide) {
      chosenIds[quest.id] = true;
    }

    const remainingSideSlots = Math.max(0, this.config.sideQuestCount - mandatorySide.length);
    const randomSide = takeUniqueRandom(sideQuestPool, remainingSideSlots, rng, chosenIds).map(cloneQuest);
    const sideQuests = [...mandatorySide, ...randomSide];

    for (const quest of sideQuests) {
      for (const requirement of quest.requirementTemplates) {
        addRequirement(requirementBag, requirement);
      }
    }

    const chosenTownIds: Record<string, true> = {};
    const townQuests = takeUniqueRandom(townQuestPool, this.config.townCount, rng, chosenTownIds).map(cloneQuest);

    for (const quest of townQuests) {
      for (const requirement of quest.requirementTemplates) {
        addRequirement(requirementBag, requirement);
      }
    }

    return {
      seed: this.config.seed,
      worldConfig: {
        maxTownTiles: Math.max(1, this.config.maxTownTiles),
      },
      bigBad,
      mainQuest: mainQuestClone,
      sideQuests,
      townQuests,
      requirements: Object.values(requirementBag),
      debugNotes: [
        `Big Bad selected: ${bigBad.name}`,
        `Main quest: ${mainQuestClone.name}`,
        `Side quests chosen: ${sideQuests.length}`,
        `Town quests chosen: ${townQuests.length}`,
        `Total requirements: ${Object.values(requirementBag).length}`,
      ],
    };
  }
}

export function formatGamePlanSpec(spec: GamePlanSpec): string[] {
  const lines: string[] = [];

  lines.push(`Seed: ${spec.seed}`);
  lines.push(`World Max Town Tiles: ${spec.worldConfig.maxTownTiles}`);
  lines.push(`Big Bad: ${spec.bigBad.name}`);
  lines.push(`Main Quest: ${spec.mainQuest.name}`);
  lines.push(`Side Quests: ${spec.sideQuests.map((entry) => entry.name).join(", ")}`);
  lines.push(`Town Quests: ${spec.townQuests.map((entry) => entry.name).join(", ")}`);
  lines.push("Requirements:");

  for (const requirement of spec.requirements) {
    lines.push(`- [${requirement.kind}] ${requirement.description} (min=${requirement.minCount})`);
  }

  lines.push("Planner Notes:");
  for (const note of spec.debugNotes) {
    lines.push(`- ${note}`);
  }

  return lines;
}
