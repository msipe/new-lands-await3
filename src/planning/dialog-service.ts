import { getNpcById, listQuests } from "./content-registry";
import { isQuestAccepted } from "./quest-log";

export type QuestDialogPrompt = {
  questId: string;
  questName: string;
  prompt: string;
};

const QUEST_PROMPTS_BY_NPC_ID: Record<string, QuestDialogPrompt[]> = {};

function buildQuestPromptMap(): void {
  const quests = listQuests();

  for (const quest of quests) {
    for (const requirement of quest.requirements) {
      if (requirement.kind !== "npc-presence") {
        continue;
      }

      const npcId = requirement.metadata.npcId;
      if (typeof npcId !== "string") {
        continue;
      }

      const bucket = QUEST_PROMPTS_BY_NPC_ID[npcId] ?? [];
      bucket.push({
        questId: quest.id,
        questName: quest.name,
        prompt: `Quest offer: ${quest.summary}`,
      });
      QUEST_PROMPTS_BY_NPC_ID[npcId] = bucket;
    }
  }
}

buildQuestPromptMap();

export function getStandardDialogForNpc(npcId: string): string[] {
  const npc = getNpcById(npcId);
  return [...npc.standardDialog];
}

export function getQuestDialogPromptsForNpc(npcId: string): QuestDialogPrompt[] {
  const prompts = QUEST_PROMPTS_BY_NPC_ID[npcId] ?? [];
  return prompts.filter((entry) => !isQuestAccepted(entry.questId)).map((entry) => ({ ...entry }));
}
