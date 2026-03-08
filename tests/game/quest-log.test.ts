import {
  acceptQuest,
  getAcceptedQuestIds,
  getQuestState,
  isQuestAccepted,
  isQuestReadyToTurnIn,
  listQuestsByCategory,
  listQuestsByStatus,
  resetQuestLogForNewRun,
  setQuestStatus,
  turnInQuest,
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

    const entry = getQuestState("main:defeat-dracula");
    expect(entry?.category).toBe("main");
    expect(entry?.status).toBe("accepted");
    expect(entry?.objectives.length).toBeGreaterThan(0);
  });

  it("resets accepted quests for a new run", () => {
    acceptQuest("side:sacred-tome");
    expect(isQuestAccepted("side:sacred-tome")).toBe(true);

    resetQuestLogForNewRun();
    expect(isQuestAccepted("side:sacred-tome")).toBe(false);
  });

  it("supports status transitions through turn-in", () => {
    acceptQuest("town:river-toll");
    expect(isQuestReadyToTurnIn("town:river-toll")).toBe(false);

    setQuestStatus("town:river-toll", "in-progress");
    expect(getQuestState("town:river-toll")?.status).toBe("in-progress");

    setQuestStatus("town:river-toll", "ready-to-turn-in");
    expect(isQuestReadyToTurnIn("town:river-toll")).toBe(true);

    turnInQuest("town:river-toll");
    expect(getQuestState("town:river-toll")?.status).toBe("completed");
    expect(getQuestState("town:river-toll")?.turnedInAtTick).toBeDefined();
  });

  it("can filter accepted quests by category and status", () => {
    acceptQuest("main:defeat-dracula");
    acceptQuest("town:bandit-den");
    setQuestStatus("town:bandit-den", "in-progress");

    const main = listQuestsByCategory("main");
    const inProgress = listQuestsByStatus("in-progress");

    expect(main.some((entry) => entry.questId === "main:defeat-dracula")).toBe(true);
    expect(inProgress.some((entry) => entry.questId === "town:bandit-den")).toBe(true);
  });
});
