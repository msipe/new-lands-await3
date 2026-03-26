import {
  createExploreUiState,
  onExploreKeyPressed,
  onExploreMouseReleased,
} from "../../src/exploration/explore-ui";
import { acceptQuest, getQuestState, resetQuestLogForNewRun } from "../../src/planning/quest-log";

describe("explore-ui", () => {
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

  it("emits open-facets action when clicking XP bar", () => {
    const uiState = createExploreUiState();

    const clickX = uiState.xpBarRect.x + uiState.xpBarRect.width / 2;
    const clickY = uiState.xpBarRect.y + uiState.xpBarRect.height / 2;

    const action = onExploreMouseReleased(uiState, clickX, clickY, 1);
    expect(action).toEqual({ kind: "open-facets" });
  });

  it("emits open-facets action when pressing T", () => {
    const uiState = createExploreUiState();

    const result = onExploreKeyPressed(uiState, "t");
    expect(result).toEqual({ kind: "open-facets" });
  });

  it("toggles craft shop with keyboard and closes other overlays", () => {
    const uiState = createExploreUiState();
    uiState.isInventoryOpen = true;
    uiState.isCharacterSheetOpen = true;

    expect(onExploreKeyPressed(uiState, "u")).toBe(true);
    expect(uiState.isCraftShopOpen).toBe(true);
    expect(uiState.isInventoryOpen).toBe(false);
    expect(uiState.isCharacterSheetOpen).toBe(false);

    expect(onExploreKeyPressed(uiState, "escape")).toBe(true);
    expect(uiState.isCraftShopOpen).toBe(false);
  });

  it("supports selecting craftsfolk and die while shop is open", () => {
    const uiState = createExploreUiState();
    onExploreKeyPressed(uiState, "u");
    expect(uiState.isCraftShopOpen).toBe(true);

    // Click craftsfolk row in 1120x620 test layout.
    onExploreMouseReleased(uiState, 120, 108, 1);
    expect(uiState.selectedCraftsfolkId).toBe("craft:up-down-smith");

    // Click first die row in 1120x620 test layout.
    onExploreMouseReleased(uiState, 120, 260, 1);
    expect(uiState.selectedUpgradeDieId).toBeDefined();
    expect(uiState.selectedUpgradeSideId).toBeDefined();
  });

  it("applies upgrade and downgrade from craft shop using gold", () => {
    const uiState = createExploreUiState();
    onExploreKeyPressed(uiState, "u");

    // Select the only craftsfolk.
    onExploreMouseReleased(uiState, 120, 108, 1);
    // Select first die row.
    onExploreMouseReleased(uiState, 120, 260, 1);

    expect(uiState.playerProgression.gold).toBe(1000);
    expect(uiState.selectedUpgradePropertyId).toBeDefined();

    // Upgrade button in 1120x620 test layout.
    onExploreMouseReleased(uiState, 840, 486, 1);
    expect(uiState.playerProgression.gold).toBe(999);
    expect(uiState.playerProgression.faceAdjustments.length).toBe(1);

    // Downgrade button in 1120x620 test layout.
    onExploreMouseReleased(uiState, 930, 486, 1);
    expect(uiState.playerProgression.gold).toBe(999.5);
    expect(uiState.playerProgression.faceAdjustments.length).toBe(2);
  });

  it("captures branch clicks while craft shop modal is open", () => {
    const uiState = createExploreUiState();
    onExploreKeyPressed(uiState, "u");

    const branch = uiState.buttons[0];
    const action = onExploreMouseReleased(uiState, branch.rect.x + 8, branch.rect.y + 8, 1);

    expect(action).toBeUndefined();
    expect(uiState.isCraftShopOpen).toBe(true);
  });

  it("supports face-smith copying and removing selected faces", () => {
    const uiState = createExploreUiState();
    onExploreKeyPressed(uiState, "u");

    // Select Face Smith (second craftsfolk row).
    onExploreMouseReleased(uiState, 120, 158, 1);
    expect(uiState.selectedCraftsfolkId).toBe("craft:face-smith");

    // Select first die and its first face.
    onExploreMouseReleased(uiState, 120, 260, 1);
    onExploreMouseReleased(uiState, 520, 260, 1);

    const startingGold = uiState.playerProgression.gold;

    // Copy Face button.
    onExploreMouseReleased(uiState, 840, 486, 1);
    expect(uiState.playerProgression.gold).toBe(startingGold - 12);
    expect(
      uiState.playerProgression.dieFaceOperations.some((entry) => entry.kind === "append-copy"),
    ).toBe(true);

    // Remove Face now requires confirm click.
    onExploreMouseReleased(uiState, 930, 486, 1);
    expect(uiState.playerProgression.gold).toBe(startingGold - 12);

    onExploreMouseReleased(uiState, 930, 486, 1);
    expect(uiState.playerProgression.gold).toBe(startingGold - 8);
    expect(
      uiState.playerProgression.dieFaceOperations.some((entry) => entry.kind === "remove"),
    ).toBe(true);
  });


  it("emits tile-visit quest progress when travel succeeds", () => {
    const uiState = createExploreUiState();
    acceptQuest("side:grave-sigil");

    const target = uiState.model.tileByKey["1,0"];
    target.zone = "mountain";

    const sqrt3 = Math.sqrt(3);
    const clickX = uiState.mapCenterX + uiState.hexSize * (sqrt3 * target.coord.q + (sqrt3 * 0.5) * target.coord.r);
    const clickY = uiState.mapCenterY + uiState.hexSize * (1.5 * target.coord.r);

    onExploreMouseReleased(uiState, clickX, clickY, 1);

    const entry = getQuestState("side:grave-sigil");
    const objective = entry?.objectives.find((candidate) => candidate.id === "obj:visit-cursed-mountains");

    expect(objective?.currentCount).toBe(1);
    expect(entry?.status).toBe("in-progress");
  });

  it("toggles quest menu with keyboard and captures branch clicks", () => {
    const uiState = createExploreUiState();
    acceptQuest("main:defeat-dracula");

    expect(onExploreKeyPressed(uiState, "q")).toBe(true);
    expect(uiState.isQuestMenuOpen).toBe(true);

    const branch = uiState.buttons[0];
    const action = onExploreMouseReleased(uiState, branch.rect.x + 6, branch.rect.y + 6, 1);
    expect(action).toBeUndefined();
    expect(uiState.isQuestMenuOpen).toBe(true);

    expect(onExploreKeyPressed(uiState, "escape")).toBe(true);
    expect(uiState.isQuestMenuOpen).toBe(false);
  });

  it("activates go-to mode from a visit-tile objective", () => {
    const uiState = createExploreUiState();
    acceptQuest("main:defeat-dracula");

    const questButtonX = uiState.questMenuButtonRect.x + 8;
    const questButtonY = uiState.questMenuButtonRect.y + 8;
    onExploreMouseReleased(uiState, questButtonX, questButtonY, 1);
    expect(uiState.isQuestMenuOpen).toBe(true);

    // First objective Go To button in 1120x620 test layout.
    onExploreMouseReleased(uiState, 820, 182, 1);

    expect(uiState.isQuestMenuOpen).toBe(false);
    expect(uiState.isGoToTileMode).toBe(true);
    expect(uiState.goToTileIds).toContain("tile:draculas-castle");
  });
});
