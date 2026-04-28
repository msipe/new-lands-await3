import { RAW_BIG_BADS, RAW_ENEMIES, RAW_EXPLORATION_FLOWS, RAW_ITEMS, RAW_NPCS, RAW_QUESTS, RAW_TILES } from "./content-registry-generated";
import type { ContentBigBad, ContentEnemy, ContentExplorationFlow, ContentItem, ContentNpc, ContentQuest, ContentTile } from "./content-types";

function cloneEnemyAbilities(abilities: readonly unknown[]): ContentEnemy["abilities"] {
  return abilities.map((ability) => {
    const candidate = ability as {
      id: string;
      kind: string;
      metadata: Record<string, string | number | boolean>;
    };

    return {
      id: candidate.id,
      kind: candidate.kind,
      metadata: { ...candidate.metadata },
    };
  });
}

function cloneQuestObjective(objective: ContentQuest["objectives"][number]): ContentQuest["objectives"][number] {
  if (objective.kind === "kill-enemy") {
    return {
      ...objective,
      enemyIds: [...objective.enemyIds],
    };
  }

  if (objective.kind === "collect-item") {
    return {
      ...objective,
      itemIds: [...objective.itemIds],
    };
  }

  return {
    ...objective,
    tileIds: objective.tileIds !== undefined ? [...objective.tileIds] : undefined,
  };
}

const NPCS: ContentNpc[] = RAW_NPCS.map((entry) => ({
  ...entry,
  standardDialog: [...entry.standardDialog],
  dialogOptions:
    entry.dialogOptions !== undefined
      ? entry.dialogOptions.map((option) => ({
          ...option,
        }))
      : undefined,
}));
const QUESTS: ContentQuest[] = RAW_QUESTS.map((entry) => ({
  ...entry,
  objectives: entry.objectives.map((objective) => cloneQuestObjective(objective)),
  worldRequirements: entry.worldRequirements.map((req) => ({
    ...req,
    tags: [...req.tags],
    metadata: { ...req.metadata },
  })),
}));
const TILES: ContentTile[] = (RAW_TILES as unknown as ContentTile[]).map((entry) => ({
  ...entry,
  color: entry.color
    ? [entry.color[0], entry.color[1], entry.color[2], entry.color[3]]
    : undefined,
  enemyPool: entry.enemyPool
    ? entry.enemyPool.map((enemyEntry) => ({
        enemyId: enemyEntry.enemyId,
        weight: enemyEntry.weight,
      }))
    : undefined,
  tags: [...entry.tags],
  enemyIds: entry.enemyIds !== undefined ? [...entry.enemyIds] : undefined,
}));
const EXPLORATION_FLOWS: ContentExplorationFlow[] = (RAW_EXPLORATION_FLOWS as unknown as ContentExplorationFlow[]).map((entry) => ({
  ...entry,
  tags: [...entry.tags],
  levels: entry.levels.map((level) => ({
    ...level,
    combatHook: level.combatHook !== undefined ? { ...level.combatHook } : undefined,
  })),
}));
const BIG_BADS: ContentBigBad[] = RAW_BIG_BADS.map((entry) => ({
  ...entry,
  sideQuestIds: [...entry.sideQuestIds],
  townQuestIds: [...entry.townQuestIds],
  mandatorySideQuestIds: [...entry.mandatorySideQuestIds],
}));
const ENEMIES: ContentEnemy[] = RAW_ENEMIES.map((entry) => ({
  ...entry,
  tags: [...entry.tags],
  types: [...entry.types],
  abilities: cloneEnemyAbilities(entry.abilities),
  dice: [...entry.dice],
}));
const ITEMS: ContentItem[] = RAW_ITEMS.map((entry) => ({
  ...entry,
}));

function assertFound<T>(value: T | undefined, kind: string, id: string): T {
  if (value !== undefined) {
    return value;
  }

  throw new Error(`Missing ${kind} in registry: ${id}`);
}

export function getNpcById(id: string): ContentNpc {
  return assertFound(NPCS.find((entry) => entry.id === id), "npc", id);
}

export function getQuestById(id: string): ContentQuest {
  return assertFound(QUESTS.find((entry) => entry.id === id), "quest", id);
}

export function getTileById(id: string): ContentTile {
  return assertFound(TILES.find((entry) => entry.id === id), "tile", id);
}

export function getBigBadById(id: string): ContentBigBad {
  return assertFound(BIG_BADS.find((entry) => entry.id === id), "big bad", id);
}

export function getEnemyById(id: string): ContentEnemy {
  return assertFound(ENEMIES.find((entry) => entry.id === id), "enemy", id);
}

export function getItemById(id: string): ContentItem {
  return assertFound(ITEMS.find((entry) => entry.id === id), "item", id);
}

export function listNpcs(): ContentNpc[] {
  return NPCS.map((entry) => ({
    ...entry,
    standardDialog: [...entry.standardDialog],
    dialogOptions:
      entry.dialogOptions !== undefined
        ? entry.dialogOptions.map((option) => ({
            ...option,
          }))
        : undefined,
  }));
}

export function listQuests(): ContentQuest[] {
  return QUESTS.map((entry) => ({
    ...entry,
    objectives: entry.objectives.map((objective) => cloneQuestObjective(objective)),
    worldRequirements: entry.worldRequirements.map((req) => ({
      ...req,
      tags: [...req.tags],
      metadata: { ...req.metadata },
    })),
  }));
}

export function listTiles(): ContentTile[] {
  return TILES.map((entry) => ({
    ...entry,
    color: entry.color
      ? [entry.color[0], entry.color[1], entry.color[2], entry.color[3]]
      : undefined,
    enemyPool: entry.enemyPool
      ? entry.enemyPool.map((enemyEntry) => ({
          enemyId: enemyEntry.enemyId,
          weight: enemyEntry.weight,
        }))
      : undefined,
    tags: [...entry.tags],
    enemyIds: entry.enemyIds !== undefined ? [...entry.enemyIds] : undefined,
  }));
}

export function getExplorationFlowById(id: string): ContentExplorationFlow {
  return assertFound(EXPLORATION_FLOWS.find((entry) => entry.id === id), "exploration flow", id);
}

export function listExplorationFlows(): ContentExplorationFlow[] {
  return EXPLORATION_FLOWS.map((entry) => ({
    ...entry,
    tags: [...entry.tags],
    levels: entry.levels.map((level) => ({
      ...level,
      combatHook: level.combatHook !== undefined ? { ...level.combatHook } : undefined,
    })),
  }));
}

export function listEnemies(): ContentEnemy[] {
  return ENEMIES.map((entry) => ({
    ...entry,
    tags: [...entry.tags],
    types: [...entry.types],
    abilities: cloneEnemyAbilities(entry.abilities),
    dice: [...entry.dice],
  }));
}

export function listItems(): ContentItem[] {
  return ITEMS.map((entry) => ({
    ...entry,
  }));
}
