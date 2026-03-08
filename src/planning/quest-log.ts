import { getQuestById } from "./content-registry";
import type { ContentQuest } from "./content-types";

export type QuestStatus = "accepted" | "in-progress" | "ready-to-turn-in" | "completed";

export type QuestObjectiveProgress = {
  id: string;
  kind: ContentQuest["objectives"][number]["kind"];
  description: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
};

export type QuestLogEntry = {
  questId: string;
  questName: string;
  category: ContentQuest["category"];
  status: QuestStatus;
  offerNpcId?: string;
  turnInNpcId?: string;
  acceptedAtTick: number;
  completedAtTick?: number;
  turnedInAtTick?: number;
  objectives: QuestObjectiveProgress[];
};

type QuestLogState = {
  acceptedQuestIds: Record<string, true>;
  entriesByQuestId: Record<string, QuestLogEntry>;
  nextTick: number;
};

const questLogState: QuestLogState = {
  acceptedQuestIds: {},
  entriesByQuestId: {},
  nextTick: 1,
};

function buildObjectiveProgress(quest: ContentQuest): QuestObjectiveProgress[] {
  return quest.objectives.map((objective) => ({
    id: objective.id,
    kind: objective.kind,
    description: objective.description,
    currentCount: 0,
    targetCount: Math.max(1, Math.floor(objective.targetCount)),
    completed: false,
  }));
}

function createQuestEntry(questId: string): QuestLogEntry {
  const quest = getQuestById(questId);

  return {
    questId: quest.id,
    questName: quest.name,
    category: quest.category,
    status: "accepted",
    offerNpcId: quest.offerNpcId,
    turnInNpcId: quest.turnInNpcId,
    acceptedAtTick: questLogState.nextTick++,
    completedAtTick: undefined,
    turnedInAtTick: undefined,
    objectives: buildObjectiveProgress(quest),
  };
}

export function resetQuestLogForNewRun(): void {
  questLogState.acceptedQuestIds = {};
  questLogState.entriesByQuestId = {};
  questLogState.nextTick = 1;
}

export function acceptQuest(questId: string): QuestLogEntry {
  if (questLogState.entriesByQuestId[questId] !== undefined) {
    return questLogState.entriesByQuestId[questId];
  }

  const entry = createQuestEntry(questId);
  questLogState.entriesByQuestId[questId] = entry;
  questLogState.acceptedQuestIds[questId] = true;
  return entry;
}

export function isQuestAccepted(questId: string): boolean {
  return questLogState.acceptedQuestIds[questId] === true;
}

export function getAcceptedQuestIds(): string[] {
  return Object.keys(questLogState.acceptedQuestIds);
}

export function getQuestState(questId: string): QuestLogEntry | undefined {
  const entry = questLogState.entriesByQuestId[questId];
  if (entry === undefined) {
    return undefined;
  }

  return {
    ...entry,
    objectives: entry.objectives.map((objective) => ({ ...objective })),
  };
}

export function listQuestEntries(): QuestLogEntry[] {
  const entries = Object.values(questLogState.entriesByQuestId);
  entries.sort((a, b) => a.acceptedAtTick - b.acceptedAtTick);

  return entries.map((entry) => ({
    ...entry,
    objectives: entry.objectives.map((objective) => ({ ...objective })),
  }));
}

export function listQuestsByCategory(category: ContentQuest["category"]): QuestLogEntry[] {
  return listQuestEntries().filter((entry) => entry.category === category);
}

export function listQuestsByStatus(status: QuestStatus): QuestLogEntry[] {
  return listQuestEntries().filter((entry) => entry.status === status);
}

export function setQuestStatus(questId: string, status: QuestStatus): QuestLogEntry | undefined {
  const entry = questLogState.entriesByQuestId[questId];
  if (entry === undefined) {
    return undefined;
  }

  entry.status = status;
  if (status === "ready-to-turn-in" && entry.completedAtTick === undefined) {
    entry.completedAtTick = questLogState.nextTick++;
  }

  if (status === "completed") {
    if (entry.completedAtTick === undefined) {
      entry.completedAtTick = questLogState.nextTick++;
    }

    if (entry.turnedInAtTick === undefined) {
      entry.turnedInAtTick = questLogState.nextTick++;
    }
  }

  return getQuestState(questId);
}

function areAllObjectivesCompleted(entry: QuestLogEntry): boolean {
  if (entry.objectives.length === 0) {
    return false;
  }

  return entry.objectives.every((objective) => objective.completed === true);
}

function hasAnyObjectiveProgress(entry: QuestLogEntry): boolean {
  return entry.objectives.some((objective) => objective.currentCount > 0);
}

function recomputeQuestStatusFromObjectives(entry: QuestLogEntry): void {
  if (entry.status === "completed") {
    return;
  }

  if (areAllObjectivesCompleted(entry)) {
    if (entry.turnInNpcId !== undefined) {
      entry.status = "ready-to-turn-in";
      if (entry.completedAtTick === undefined) {
        entry.completedAtTick = questLogState.nextTick++;
      }
      return;
    }

    entry.status = "completed";
    if (entry.completedAtTick === undefined) {
      entry.completedAtTick = questLogState.nextTick++;
    }

    if (entry.turnedInAtTick === undefined) {
      entry.turnedInAtTick = questLogState.nextTick++;
    }
    return;
  }

  if (hasAnyObjectiveProgress(entry) && entry.status === "accepted") {
    entry.status = "in-progress";
  }
}

export function incrementObjectiveProgress(
  questId: string,
  objectiveId: string,
  amount = 1,
): QuestLogEntry | undefined {
  const entry = questLogState.entriesByQuestId[questId];
  if (entry === undefined || entry.status === "completed") {
    return entry === undefined ? undefined : getQuestState(questId);
  }

  const increment = Math.max(0, Math.floor(amount));
  if (increment <= 0) {
    return getQuestState(questId);
  }

  const objective = entry.objectives.find((candidate) => candidate.id === objectiveId);
  if (objective === undefined || objective.completed) {
    return getQuestState(questId);
  }

  objective.currentCount = Math.min(objective.targetCount, objective.currentCount + increment);
  objective.completed = objective.currentCount >= objective.targetCount;
  recomputeQuestStatusFromObjectives(entry);
  return getQuestState(questId);
}

export function areObjectivesComplete(questId: string): boolean {
  const entry = questLogState.entriesByQuestId[questId];
  if (entry === undefined) {
    return false;
  }

  return areAllObjectivesCompleted(entry);
}

export function isQuestReadyToTurnIn(questId: string): boolean {
  return questLogState.entriesByQuestId[questId]?.status === "ready-to-turn-in";
}

export function turnInQuest(questId: string): QuestLogEntry | undefined {
  const entry = questLogState.entriesByQuestId[questId];
  if (entry === undefined) {
    return undefined;
  }

  if (entry.status !== "ready-to-turn-in") {
    return getQuestState(questId);
  }

  entry.status = "completed";
  if (entry.completedAtTick === undefined) {
    entry.completedAtTick = questLogState.nextTick++;
  }

  if (entry.turnedInAtTick === undefined) {
    entry.turnedInAtTick = questLogState.nextTick++;
  }

  return getQuestState(questId);
}
