import {
  getQuestDialogPromptsForNpc,
  getStandardDialogForNpc,
} from "../../src/planning/dialog-service";
import { acceptQuest, resetQuestLogForNewRun } from "../../src/planning/quest-log";

describe("dialog-service", () => {
  beforeEach(() => {
    resetQuestLogForNewRun();
  });

  it("returns standard dialog lines for registry NPC", () => {
    const lines = getStandardDialogForNpc("npc:igor");

    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].length).toBeGreaterThan(0);
  });

  it("returns quest dialog prompts linked through quest requirements", () => {
    const prompts = getQuestDialogPromptsForNpc("npc:igor");

    expect(prompts.some((entry) => entry.questId === "main:defeat-dracula")).toBe(true);
  });

  it("hides accepted quests from new offers", () => {
    acceptQuest("main:defeat-dracula");
    const prompts = getQuestDialogPromptsForNpc("npc:igor");

    expect(prompts.some((entry) => entry.questId === "main:defeat-dracula")).toBe(false);
  });
});
