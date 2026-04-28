import { getNpcById, getQuestById, listQuests } from "./content-registry";
import { isQuestAccepted, listQuestEntries } from "./quest-log";

export type QuestDialogPrompt = {
  kind: "offer" | "turn-in";
  questId: string;
  questName: string;
  recommendedLevel: number;
  playerLine: string;
  prompt: string;
};

export type NpcDialogOption = {
  id: string;
  playerLine: string;
  npcResponse: string;
  questReady: boolean;
};

const QUEST_OFFERS_BY_NPC_ID: Record<string, QuestDialogPrompt[]> = {};

function buildQuestPromptMap(): void {
  const quests = listQuests();

  for (const quest of quests) {
    if (quest.offerNpcId === undefined) {
      continue;
    }

    const bucket = QUEST_OFFERS_BY_NPC_ID[quest.offerNpcId] ?? [];
    bucket.push({
      kind: "offer",
      questId: quest.id,
      questName: quest.name,
      recommendedLevel: quest.recommendedLevel,
      playerLine: quest.conversationStarter ?? `Do you have work related to ${quest.name}?`,
      prompt: `${quest.name}: ${quest.summary}`,
    });
    QUEST_OFFERS_BY_NPC_ID[quest.offerNpcId] = bucket;
  }
}

buildQuestPromptMap();

export function getStandardDialogForNpc(npcId: string): string[] {
  const npc = getNpcById(npcId);
  return [...npc.standardDialog];
}

export function getDialogOptionsForNpc(npcId: string): NpcDialogOption[] {
  const npc = getNpcById(npcId);
  if (npc.dialogOptions === undefined || npc.dialogOptions.length === 0) {
    return [
      {
        id: `${npcId}:default-greeting`,
        playerLine: "How are things around town?",
        npcResponse: npc.standardDialog[0] ?? npc.notes,
        questReady: false,
      },
    ];
  }

  return npc.dialogOptions.map((option) => ({
    id: option.id,
    playerLine: option.playerLine,
    npcResponse: option.npcResponse,
    questReady: option.questReady === true,
  }));
}

export function getQuestDialogPromptsForNpc(npcId: string): QuestDialogPrompt[] {
  const prompts: QuestDialogPrompt[] = [];

  const offers = QUEST_OFFERS_BY_NPC_ID[npcId] ?? [];
  for (const offer of offers) {
    if (isQuestAccepted(offer.questId)) {
      continue;
    }

    prompts.push({ ...offer });
  }

  const readyToTurnIn = listQuestEntries().filter(
    (entry) => entry.turnInNpcId === npcId && entry.status === "ready-to-turn-in",
  );
  for (const entry of readyToTurnIn) {
    prompts.push({
      kind: "turn-in",
      questId: entry.questId,
      questName: entry.questName,
      recommendedLevel: getQuestById(entry.questId).recommendedLevel,
      playerLine: `I've finished ${entry.questName}.`,
      prompt: `Turn in: ${entry.questName}`,
    });
  }

  return prompts;
}
