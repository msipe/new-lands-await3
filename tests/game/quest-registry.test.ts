import { listQuests } from "../../src/planning/content-registry";

describe("quest registry", () => {
  it("loads objective-first quest definitions", () => {
    const quests = listQuests();

    expect(quests.length).toBeGreaterThan(0);

    for (const quest of quests) {
      expect(quest.id.length).toBeGreaterThan(0);
      expect(quest.name.length).toBeGreaterThan(0);
      expect(quest.summary.length).toBeGreaterThan(0);
      expect(["main", "side", "town"]).toContain(quest.category);
      expect(quest.objectives.length).toBeGreaterThan(0);
      expect(quest.worldRequirements.length).toBeGreaterThan(0);

      for (const objective of quest.objectives) {
        expect(objective.id.length).toBeGreaterThan(0);
        expect(objective.description.length).toBeGreaterThan(0);
        expect(objective.targetCount).toBeGreaterThan(0);

        if (objective.kind === "kill-enemy") {
          expect(objective.enemyIds.length).toBeGreaterThan(0);
        } else if (objective.kind === "collect-item") {
          expect(objective.itemIds.length).toBeGreaterThan(0);
        } else {
          const hasTileTarget =
            (objective.tileIds !== undefined && objective.tileIds.length > 0) ||
            objective.zone !== undefined;
          expect(hasTileTarget).toBe(true);
        }
      }

      // Legacy schema should no longer be present.
      expect((quest as unknown as { requirements?: unknown }).requirements).toBeUndefined();
    }
  });

  it("maps main quest offers to Igor", () => {
    const quests = listQuests();
    const main = quests.find((entry) => entry.id === "main:defeat-dracula");

    expect(main).toBeDefined();
    expect(main?.offerNpcId).toBe("npc:igor");
    expect(main?.turnInNpcId).toBe("npc:igor");
  });
});
