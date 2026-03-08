import {
  createEncounterUiState,
  onEncounterMouseReleased,
} from "../../src/encounter-ui";
import {
  acceptQuest,
  getQuestState,
  isQuestAccepted,
  resetQuestLogForNewRun,
  setQuestStatus,
} from "../../src/planning/quest-log";

describe("encounter-ui quest flow", () => {
  beforeAll(() => {
    const loveMock = {
      graphics: {
        getWidth: () => 1120,
        getHeight: () => 620,
      },
    };

    (global as unknown as { love: unknown }).love = loveMock;
  });

  beforeEach(() => {
    resetQuestLogForNewRun();
  });

  function createTownEncounterForIgor() {
    return createEncounterUiState({
      tileName: "Starter Town",
      tileZone: "town",
      locations: [
        {
          id: "loc:square",
          name: "Market Square",
          description: "Town center.",
          locationType: "square",
          tags: [],
          characters: [
            {
              id: "char:igor",
              npcId: "npc:igor",
              name: "Igor",
              role: "Caretaker",
              disposition: "neutral",
              description: "Watches travelers closely.",
              questHooks: [],
            },
          ],
        },
      ],
    });
  }

  it("accepts quest offers through quest dialog confirmation", () => {
    const uiState = createTownEncounterForIgor();
    expect(isQuestAccepted("main:defeat-dracula")).toBe(false);

    onEncounterMouseReleased(
      uiState,
      uiState.dialogButtons.quest.x + 4,
      uiState.dialogButtons.quest.y + 4,
      1,
    );
    onEncounterMouseReleased(
      uiState,
      uiState.dialogButtons.yes.x + 4,
      uiState.dialogButtons.yes.y + 4,
      1,
    );

    expect(isQuestAccepted("main:defeat-dracula")).toBe(true);
    expect(uiState.questResponseText).toContain("Accepted");
  });

  it("turns in ready quests through quest dialog confirmation", () => {
    acceptQuest("main:defeat-dracula");
    setQuestStatus("main:defeat-dracula", "ready-to-turn-in");

    const uiState = createTownEncounterForIgor();

    onEncounterMouseReleased(
      uiState,
      uiState.dialogButtons.quest.x + 4,
      uiState.dialogButtons.quest.y + 4,
      1,
    );
    onEncounterMouseReleased(
      uiState,
      uiState.dialogButtons.yes.x + 4,
      uiState.dialogButtons.yes.y + 4,
      1,
    );

    expect(getQuestState("main:defeat-dracula")?.status).toBe("completed");
    expect(uiState.questResponseText).toContain("Turned in");
  });
});
