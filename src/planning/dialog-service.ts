import { getNpcById, listQuests } from "./content-registry";
import { isQuestAccepted, listQuestEntries } from "./quest-log";

export type QuestDialogPrompt = {
  kind: "offer" | "turn-in";
  questId: string;
  questName: string;
  prompt: string;
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
      prompt: `Quest offer: ${quest.summary}`,
    });
    QUEST_OFFERS_BY_NPC_ID[quest.offerNpcId] = bucket;
  }
}

buildQuestPromptMap();

export function getStandardDialogForNpc(npcId: string): string[] {
  const npc = getNpcById(npcId);
  return [...npc.standardDialog];
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
      prompt: `Turn in: ${entry.questName}`,
    });
  }

  return prompts;
}
