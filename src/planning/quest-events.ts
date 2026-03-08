import { getQuestById } from "./content-registry";
import type { ZoneType } from "../exploration/explore-state";
import {
  areObjectivesComplete,
  incrementObjectiveProgress,
  listQuestEntries,
  setQuestStatus,
  type QuestLogEntry,
} from "./quest-log";

export type TileVisitEvent = {
  tileKey: string;
  zone: ZoneType;
  tileId?: string;
  specialTileId?: string;
};

export type QuestProgressChange = {
  questId: string;
  objectiveId: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
  status: QuestLogEntry["status"];
};

function toProgressChange(
  questId: string,
  objectiveId: string,
  entry: QuestLogEntry | undefined,
): QuestProgressChange | undefined {
  if (entry === undefined) {
    return undefined;
  }

  const objective = entry.objectives.find((candidate) => candidate.id === objectiveId);
  if (objective === undefined) {
    return undefined;
  }

  return {
    questId,
    objectiveId,
    currentCount: objective.currentCount,
    targetCount: objective.targetCount,
    completed: objective.completed,
    status: entry.status,
  };
}

function listActiveQuestEntries(): QuestLogEntry[] {
  return listQuestEntries().filter((entry) => entry.status !== "completed");
}

export function recordEnemyDefeated(enemyId: string): QuestProgressChange[] {
  const changes: QuestProgressChange[] = [];

  for (const entry of listActiveQuestEntries()) {
    const quest = getQuestById(entry.questId);

    for (const objective of quest.objectives) {
      if (objective.kind !== "kill-enemy") {
        continue;
      }

      if (!objective.enemyIds.includes(enemyId)) {
        continue;
      }

      const nextEntry = incrementObjectiveProgress(entry.questId, objective.id, 1);
      const change = toProgressChange(entry.questId, objective.id, nextEntry);
      if (change !== undefined) {
        changes.push(change);
      }
    }
  }

  return changes;
}

export function recordItemCollected(itemId: string, amount = 1): QuestProgressChange[] {
  const changes: QuestProgressChange[] = [];

  for (const entry of listActiveQuestEntries()) {
    const quest = getQuestById(entry.questId);

    for (const objective of quest.objectives) {
      if (objective.kind !== "collect-item") {
        continue;
      }

      if (!objective.itemIds.includes(itemId)) {
        continue;
      }

      const nextEntry = incrementObjectiveProgress(entry.questId, objective.id, amount);
      const change = toProgressChange(entry.questId, objective.id, nextEntry);
      if (change !== undefined) {
        changes.push(change);
      }
    }
  }

  return changes;
}

function visitTileObjectiveMatches(
  objective: Extract<ReturnType<typeof getQuestById>["objectives"][number], { kind: "visit-tile" }>,
  event: TileVisitEvent,
): boolean {
  if (objective.zone !== undefined && objective.zone !== event.zone) {
    return false;
  }

  if (objective.tileIds === undefined || objective.tileIds.length === 0) {
    return true;
  }

  const candidateIds = [event.tileId, event.specialTileId, event.tileKey].filter(
    (value): value is string => value !== undefined,
  );
  return candidateIds.some((value) => objective.tileIds?.includes(value));
}

export function recordTileVisited(event: TileVisitEvent): QuestProgressChange[] {
  const changes: QuestProgressChange[] = [];

  for (const entry of listActiveQuestEntries()) {
    const quest = getQuestById(entry.questId);

    for (const objective of quest.objectives) {
      if (objective.kind !== "visit-tile") {
        continue;
      }

      if (!visitTileObjectiveMatches(objective, event)) {
        continue;
      }

      const nextEntry = incrementObjectiveProgress(entry.questId, objective.id, 1);
      const change = toProgressChange(entry.questId, objective.id, nextEntry);
      if (change !== undefined) {
        changes.push(change);
      }
    }
  }

  return changes;
}

export function recordNpcInteracted(npcId: string): string[] {
  const turnedReadyQuestIds: string[] = [];

  for (const entry of listActiveQuestEntries()) {
    if (entry.turnInNpcId !== npcId) {
      continue;
    }

    if (!areObjectivesComplete(entry.questId)) {
      continue;
    }

    const next = setQuestStatus(entry.questId, "ready-to-turn-in");
    if (next?.status === "ready-to-turn-in") {
      turnedReadyQuestIds.push(entry.questId);
    }
  }

  return turnedReadyQuestIds;
}
