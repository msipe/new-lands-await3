import { createFacetUiState, onFacetKeyPressed, onFacetMouseReleased } from "../../src/facet-ui";
import { createPlayerProgression, investInFacet } from "../../src/game/player-progression";

describe("facet-ui", () => {
  beforeAll(() => {
    (global as unknown as { love: unknown }).love = {
      graphics: {
        getWidth: () => 1120,
        getHeight: () => 620,
      },
    };
  });

  it("escape key signals close", () => {
    const progression = createPlayerProgression();
    const uiState = createFacetUiState(progression);
    expect(onFacetKeyPressed(uiState, "escape")).toBe(true);
    expect(onFacetKeyPressed(uiState, "t")).toBe(false);
  });

  it("close button returns close signal", () => {
    const progression = createPlayerProgression();
    const uiState = createFacetUiState(progression);
    // Close button is centered right of center at bottom of screen (1120x620)
    // centerX = 560, closeButton.x = 560+8=568, y = 620-72=548, width=160, height=40
    const result = onFacetMouseReleased(uiState, 568 + 80, 548 + 20, 1);
    expect(result).toBe("close");
  });

  it("clicking soldier column selects it", () => {
    const progression = createPlayerProgression();
    const uiState = createFacetUiState(progression);
    // Soldier column: x=32, y=90, width=530 (floor((1120-32*2-20)/2))
    onFacetMouseReleased(uiState, 100, 150, 1);
    expect(uiState.selectedFacetId).toBe("facet:soldier");
  });

  it("clicking berserker column selects it", () => {
    const progression = createPlayerProgression();
    const uiState = createFacetUiState(progression);
    // Berserker column starts at 32+530+20=582
    onFacetMouseReleased(uiState, 700, 150, 1);
    expect(uiState.selectedFacetId).toBe("facet:berserker");
  });

  it("invest button does nothing without a point to spend", () => {
    const progression = createPlayerProgression();
    const uiState = createFacetUiState(progression);
    onFacetMouseReleased(uiState, 100, 150, 1); // select soldier
    // investButton.x = 560-160-8=392, y=548, width=160
    const result = onFacetMouseReleased(uiState, 392 + 80, 548 + 20, 1);
    expect(result).toBeUndefined();
    expect(progression.facets[0].pointsInvested).toBe(0);
  });

  it("invest button unlocks next ability and stays on screen", () => {
    const progression = createPlayerProgression();
    progression.unspentFacetPoints = 1;
    const uiState = createFacetUiState(progression);

    onFacetMouseReleased(uiState, 100, 150, 1); // select soldier
    expect(uiState.selectedFacetId).toBe("facet:soldier");

    // investButton: x=392, y=548, width=160, height=40
    const result = onFacetMouseReleased(uiState, 392 + 80, 548 + 20, 1);
    expect(result).toBeUndefined(); // stays on screen
    expect(progression.facets[0].pointsInvested).toBe(1);
    expect(progression.facets[0].tiers[0].abilities[0].unlocked).toBe(true);
    expect(progression.unspentFacetPoints).toBe(0);
    expect(uiState.selectedFacetId).toBeUndefined(); // deselected after invest
  });

  it("can invest multiple times without leaving the screen", () => {
    const progression = createPlayerProgression();
    progression.unspentFacetPoints = 3;
    const uiState = createFacetUiState(progression);

    for (let i = 0; i < 3; i += 1) {
      onFacetMouseReleased(uiState, 100, 150, 1); // select soldier
      onFacetMouseReleased(uiState, 392 + 80, 548 + 20, 1); // invest
    }

    expect(progression.facets[0].pointsInvested).toBe(3);
    expect(progression.unspentFacetPoints).toBe(0);
  });
});
