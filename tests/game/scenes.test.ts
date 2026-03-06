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
    expect(state.current).toBe("explore");
    expect(state.visitCounts.explore).toBe(2);
  });

  it("supports explore branch to encounter", () => {
    let state = createInitialSceneState();
    state = advanceScene(state);

    state = chooseExploreBranch(state, "encounter");
    expect(state.current).toBe("encounter");
    expect(state.visitCounts.encounter).toBe(1);
  });

  it("returns from encounter to exploration", () => {
    let state = createInitialSceneState();
    state = advanceScene(state);
    state = chooseExploreBranch(state, "encounter");

    state = advanceScene(state);
    expect(state.current).toBe("explore");
    expect(state.visitCounts.explore).toBe(2);
  });

  it("ignores explore branch selection outside explore scene", () => {
    const state = createInitialSceneState();
    const unchanged = chooseExploreBranch(state, "encounter");

    expect(unchanged).toBe(state);
    expect(unchanged.current).toBe("main-menu");
  });

  it("provides explore-specific prompt", () => {
    expect(getScenePrompt("explore")).toContain("neighboring hex");
  });
});
