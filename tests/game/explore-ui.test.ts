import {
  createExploreUiState,
  onExploreKeyPressed,
  onExploreMouseReleased,
} from "../../src/exploration/explore-ui";

describe("explore-ui talent tree", () => {
  beforeAll(() => {
    const loveMock = {
      graphics: {
        getWidth: () => 1120,
        getHeight: () => 620,
      },
    };

    (global as unknown as { love: unknown }).love = loveMock;
  });

  it("toggles talent tree when clicking XP bar", () => {
    const uiState = createExploreUiState();

    const clickX = uiState.xpBarRect.x + uiState.xpBarRect.width / 2;
    const clickY = uiState.xpBarRect.y + uiState.xpBarRect.height / 2;

    expect(uiState.isTalentTreeOpen).toBe(false);

    onExploreMouseReleased(uiState, clickX, clickY, 1);
    expect(uiState.isTalentTreeOpen).toBe(true);

    // With modal behavior enabled, clicks behind the panel should not toggle it off.
    onExploreMouseReleased(uiState, clickX, clickY, 1);
    expect(uiState.isTalentTreeOpen).toBe(true);
  });

  it("closes other overlays when opening talent tree by click", () => {
    const uiState = createExploreUiState();
    uiState.isCharacterSheetOpen = true;
    uiState.isInventoryOpen = true;

    const clickX = uiState.xpBarRect.x + 8;
    const clickY = uiState.xpBarRect.y + 8;

    onExploreMouseReleased(uiState, clickX, clickY, 1);

    expect(uiState.isTalentTreeOpen).toBe(true);
    expect(uiState.isCharacterSheetOpen).toBe(false);
    expect(uiState.isInventoryOpen).toBe(false);
  });

  it("supports keyboard toggle and escape close", () => {
    const uiState = createExploreUiState();

    expect(onExploreKeyPressed(uiState, "t")).toBe(true);
    expect(uiState.isTalentTreeOpen).toBe(true);

    expect(onExploreKeyPressed(uiState, "escape")).toBe(true);
    expect(uiState.isTalentTreeOpen).toBe(false);
  });

  it("captures clicks while talent tree is open", () => {
    const uiState = createExploreUiState();

    const xpX = uiState.xpBarRect.x + 8;
    const xpY = uiState.xpBarRect.y + 8;
    onExploreMouseReleased(uiState, xpX, xpY, 1);
    expect(uiState.isTalentTreeOpen).toBe(true);

    const branch = uiState.buttons[0];
    const action = onExploreMouseReleased(
      uiState,
      branch.rect.x + 4,
      branch.rect.y + 4,
      1,
    );

    expect(action).toBeUndefined();
    expect(uiState.isTalentTreeOpen).toBe(true);
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
    onExploreMouseReleased(uiState, 840, 530, 1);
    expect(uiState.playerProgression.gold).toBe(999);
    expect(uiState.playerProgression.faceAdjustments.length).toBe(1);

    // Downgrade button in 1120x620 test layout.
    onExploreMouseReleased(uiState, 930, 530, 1);
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
    onExploreMouseReleased(uiState, 840, 530, 1);
    expect(uiState.playerProgression.gold).toBe(startingGold - 12);
    expect(
      uiState.playerProgression.dieFaceOperations.some((entry) => entry.kind === "append-copy"),
    ).toBe(true);

    // Remove Face button.
    onExploreMouseReleased(uiState, 930, 530, 1);
    expect(uiState.playerProgression.gold).toBe(startingGold - 8);
    expect(
      uiState.playerProgression.dieFaceOperations.some((entry) => entry.kind === "remove"),
    ).toBe(true);
  });

  it("applies confirm and cancel for selected talents", () => {
    const uiState = createExploreUiState();
    uiState.playerProgression.unspentTalentPoints = 1;

    const xpX = uiState.xpBarRect.x + 8;
    const xpY = uiState.xpBarRect.y + 8;
    onExploreMouseReleased(uiState, xpX, xpY, 1);
    expect(uiState.isTalentTreeOpen).toBe(true);

    // First row in 1120x620 test layout.
    onExploreMouseReleased(uiState, 280, 150, 1);
    expect(uiState.selectedTalentId).toBe("talent:unyielding-core");

    // Confirm button in 1120x620 test layout.
    onExploreMouseReleased(uiState, 560, 500, 1);
    expect(uiState.playerProgression.talents[0].rank).toBe(1);
    expect(uiState.playerProgression.unspentTalentPoints).toBe(0);
    expect(uiState.selectedTalentId).toBeUndefined();
    expect(uiState.isTalentTreeOpen).toBe(false);

    // Select again and cancel; modal closes without spending.
    onExploreMouseReleased(uiState, xpX, xpY, 1);
    expect(uiState.isTalentTreeOpen).toBe(true);

    onExploreMouseReleased(uiState, 280, 150, 1);
    expect(uiState.selectedTalentId).toBe("talent:unyielding-core");

    onExploreMouseReleased(uiState, 720, 500, 1);
    expect(uiState.selectedTalentId).toBeUndefined();
    expect(uiState.isTalentTreeOpen).toBe(false);
    expect(uiState.playerProgression.talents[0].rank).toBe(1);
    expect(uiState.playerProgression.unspentTalentPoints).toBe(0);
  });
});
