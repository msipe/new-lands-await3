import { SCENE_CONTRACTS, SCENE_IDS } from "../../src/game/scene-contracts";

describe("scene contracts", () => {
  it("defines contracts for all scene ids", () => {
    for (const sceneId of SCENE_IDS) {
      expect(SCENE_CONTRACTS[sceneId]).toBeDefined();
      expect(SCENE_CONTRACTS[sceneId].id).toBe(sceneId);
    }
  });

  it("creates stub context for every scene", () => {
    for (const sceneId of SCENE_IDS) {
      const context = SCENE_CONTRACTS[sceneId].createInitialContext();
      expect(context).toBeTruthy();
    }
  });

  it("routes explore branch through contract reducer", () => {
    const output = SCENE_CONTRACTS.explore.reduce(
      SCENE_CONTRACTS.explore.createInitialContext(),
      {
        kind: "choose-branch",
        branch: "encounter",
      },
    );

    expect(output.nextScene).toBe("encounter");
  });
});
