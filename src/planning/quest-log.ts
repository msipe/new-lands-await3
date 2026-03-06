type QuestLogState = {
  acceptedQuestIds: Record<string, true>;
};

const questLogState: QuestLogState = {
  acceptedQuestIds: {},
};

export function resetQuestLogForNewRun(): void {
  questLogState.acceptedQuestIds = {};
}

export function acceptQuest(questId: string): void {
  questLogState.acceptedQuestIds[questId] = true;
}

export function isQuestAccepted(questId: string): boolean {
  return questLogState.acceptedQuestIds[questId] === true;
}

export function getAcceptedQuestIds(): string[] {
  return Object.keys(questLogState.acceptedQuestIds);
}
