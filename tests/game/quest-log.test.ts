import {
  acceptQuest,
  getAcceptedQuestIds,
  isQuestAccepted,
  resetQuestLogForNewRun,
} from "../../src/planning/quest-log";

describe("quest-log", () => {
  beforeEach(() => {
    resetQuestLogForNewRun();
  });

  it("tracks accepted quests", () => {
    expect(isQuestAccepted("main:defeat-dracula")).toBe(false);
    acceptQuest("main:defeat-dracula");
    expect(isQuestAccepted("main:defeat-dracula")).toBe(true);
    expect(getAcceptedQuestIds()).toContain("main:defeat-dracula");
  });

  it("resets accepted quests for a new run", () => {
    acceptQuest("side:sacred-tome");
    expect(isQuestAccepted("side:sacred-tome")).toBe(true);

    resetQuestLogForNewRun();
    expect(isQuestAccepted("side:sacred-tome")).toBe(false);
  });
});
