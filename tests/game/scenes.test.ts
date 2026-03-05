import {
  advanceScene,
  chooseExploreBranch,
  createInitialSceneState,
  getScenePrompt,
} from "../../src/game/scenes";

describe("scene state machine", () => {
  it("starts at main menu", () => {
    const initial = createInitialSceneState();
    expect(initial.current).toBe("main-menu");
    expect(initial.visitCounts["main-menu"]).toBe(1);
  });

  it("follows default flow between scenes", () => {
    let state = createInitialSceneState();

    state = advanceScene(state);
    expect(state.current).toBe("explore");

    state = advanceScene(state);
    expect(state.current).toBe("combat");

    state = advanceScene(state);
    expect(state.current).toBe("post-combat");

    state = advanceScene(state);
    expect(state.current).toBe("end-game");

    state = advanceScene(state);
    expect(state.current).toBe("main-menu");
    expect(state.visitCounts["main-menu"]).toBe(2);
  });

  it("supports explore branch to encounter", () => {
    let state = createInitialSceneState();
    state = advanceScene(state);

    state = chooseExploreBranch(state, "encounter");
    expect(state.current).toBe("encounter");
    expect(state.visitCounts.encounter).toBe(1);
  });

  it("ignores explore branch selection outside explore scene", () => {
    const state = createInitialSceneState();
    const unchanged = chooseExploreBranch(state, "encounter");

    expect(unchanged).toBe(state);
    expect(unchanged.current).toBe("main-menu");
  });

  it("provides explore-specific prompt", () => {
    expect(getScenePrompt("explore")).toContain("Press C");
  });
});
