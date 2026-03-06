import { RAW_BIG_BADS, RAW_ENEMIES, RAW_ITEMS, RAW_NPCS, RAW_QUESTS, RAW_TILES } from "./content-registry-generated";
import type { ContentBigBad, ContentEnemy, ContentItem, ContentNpc, ContentQuest, ContentTile } from "./content-types";

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

const NPCS: ContentNpc[] = RAW_NPCS.map((entry) => ({
  ...entry,
  standardDialog: [...entry.standardDialog],
}));
const QUESTS: ContentQuest[] = RAW_QUESTS.map((entry) => ({
  ...entry,
  requirements: entry.requirements.map((req) => ({
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
  encounterPlaceholders: entry.encounterPlaceholders
    ? entry.encounterPlaceholders.map((placeholder) => ({
        id: placeholder.id,
        weight: placeholder.weight,
        tags: [...placeholder.tags],
      }))
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
  }));
}

export function listQuests(): ContentQuest[] {
  return QUESTS.map((entry) => ({
    ...entry,
    requirements: entry.requirements.map((req) => ({
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
    encounterPlaceholders: entry.encounterPlaceholders
      ? entry.encounterPlaceholders.map((placeholder) => ({
          id: placeholder.id,
          weight: placeholder.weight,
          tags: [...placeholder.tags],
        }))
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
