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

const loveMock = {
  graphics: {
    getWidth: () => 1120,
    getHeight: () => 620,
  },
};

describe("encounter-ui quest flow", () => {
  beforeAll(() => {
    (global as unknown as { love: unknown }).love = loveMock;
  });

  beforeEach(() => {
    resetQuestLogForNewRun();
  });

  function createTownEncounterForIgor() {
    return createEncounterUiState({
      tileName: "Starter Town",
      tileZone: "town",
      tileDescription: "A familiar starting town.",
      explorationFlowId: null,
      flowLevel: 0,
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

describe("encounter-ui exploration flow navigation", () => {
  beforeAll(() => {
    (global as unknown as { love: unknown }).love = loveMock;
  });

  function createFlowEncounter(flowId: string, flowLevel: number) {
    return createEncounterUiState({
      tileName: "Thornwood",
      tileZone: "forest",
      tileDescription: "A dense forest.",
      explorationFlowId: flowId,
      flowLevel,
      locations: [],
    });
  }

  it("initializes viewLevel to flowLevel on first visit", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);

    expect(uiState.viewLevel).toBe(0);
    expect(uiState.explorationFlow).not.toBeNull();
    expect(uiState.flowLevel).toBe(0);
  });

  it("initializes viewLevel to flowLevel on a return visit", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 2);

    expect(uiState.viewLevel).toBe(2);
  });

  it("clamps viewLevel to last level index when fully explored", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 3);

    expect(uiState.viewLevel).toBe(2);
    expect(uiState.flowLevel).toBe(3);
  });

  it("Back to Map button returns true to exit the encounter", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);
    const { backToMap } = uiState.genericButtons;

    const result = onEncounterMouseReleased(uiState, backToMap.x + 4, backToMap.y + 4, 1);

    expect(result).toBe(true);
    expect(uiState.viewLevel).toBe(0);
  });

  it("Explore Further increments viewLevel without exiting", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);
    const { exploreFurther } = uiState.genericButtons;

    const result = onEncounterMouseReleased(uiState, exploreFurther.x + 4, exploreFurther.y + 4, 1);

    expect(result).toBe(false);
    expect(uiState.viewLevel).toBe(1);
  });

  it("Previous Area decrements viewLevel without exiting", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 1);
    const { previousArea } = uiState.genericButtons;

    const result = onEncounterMouseReleased(uiState, previousArea.x + 4, previousArea.y + 4, 1);

    expect(result).toBe(false);
    expect(uiState.viewLevel).toBe(0);
  });

  it("Explore Further does nothing when already on the last level", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 2);
    const { exploreFurther } = uiState.genericButtons;

    const result = onEncounterMouseReleased(uiState, exploreFurther.x + 4, exploreFurther.y + 4, 1);

    expect(result).toBe(false);
    expect(uiState.viewLevel).toBe(2);
  });

  it("Previous Area does nothing when already on the first level", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);
    const { previousArea } = uiState.genericButtons;

    const result = onEncounterMouseReleased(uiState, previousArea.x + 4, previousArea.y + 4, 1);

    expect(result).toBe(false);
    expect(uiState.viewLevel).toBe(0);
  });

  it("can navigate forward and then backward through levels", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);
    const { exploreFurther, previousArea } = uiState.genericButtons;

    onEncounterMouseReleased(uiState, exploreFurther.x + 4, exploreFurther.y + 4, 1);
    expect(uiState.viewLevel).toBe(1);

    onEncounterMouseReleased(uiState, exploreFurther.x + 4, exploreFurther.y + 4, 1);
    expect(uiState.viewLevel).toBe(2);

    onEncounterMouseReleased(uiState, previousArea.x + 4, previousArea.y + 4, 1);
    expect(uiState.viewLevel).toBe(1);

    onEncounterMouseReleased(uiState, previousArea.x + 4, previousArea.y + 4, 1);
    expect(uiState.viewLevel).toBe(0);
  });

  it("falls back gracefully when no flow is assigned to the tile", () => {
    const uiState = createEncounterUiState({
      tileName: "Bare Knoll",
      tileZone: "mountain",
      tileDescription: "A rocky hill with no secrets.",
      explorationFlowId: null,
      flowLevel: 0,
      locations: [],
    });

    expect(uiState.explorationFlow).toBeNull();
    expect(uiState.viewLevel).toBe(0);

    const { backToMap } = uiState.genericButtons;
    const result = onEncounterMouseReleased(uiState, backToMap.x + 4, backToMap.y + 4, 1);
    expect(result).toBe(true);
  });

  it("ignores right-click on all generic buttons", () => {
    const uiState = createFlowEncounter("flow:forest-ancient-ruin", 0);
    const { backToMap, exploreFurther, previousArea } = uiState.genericButtons;

    expect(onEncounterMouseReleased(uiState, backToMap.x + 4, backToMap.y + 4, 2)).toBe(false);
    expect(onEncounterMouseReleased(uiState, exploreFurther.x + 4, exploreFurther.y + 4, 2)).toBe(false);
    expect(onEncounterMouseReleased(uiState, previousArea.x + 4, previousArea.y + 4, 2)).toBe(false);
    expect(uiState.viewLevel).toBe(0);
  });
});
