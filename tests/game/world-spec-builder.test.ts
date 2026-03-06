import { createDefaultGamePlannerConfig, GamePlanner } from "../../src/planning/game-planner";
import { createWorldSpecFromPlan } from "../../src/planning/world-spec-builder";
import type { GamePlanSpec } from "../../src/planning/game-planner";

describe("world-spec-builder", () => {
  it("extracts zone and special tile constraints from planner requirements", () => {
    const plan = new GamePlanner(createDefaultGamePlannerConfig("spec-seed")).createPlan();
    const worldSpec = createWorldSpecFromPlan(plan);

    expect(worldSpec.seed).toBe("spec-seed");
    expect(worldSpec.maxTownTiles).toBe(2);
    expect(worldSpec.requiredSpecialTiles.some((entry) => entry.id === "tile:draculas-castle")).toBe(true);
    expect(worldSpec.requiredZones.length).toBeGreaterThan(0);
    expect(worldSpec.requiredNpcs.some((entry) => entry.npcId === "npc:igor")).toBe(true);
  });

  it("treats duplicated npc requirements as map-level presence, not additive counts", () => {
    const fakePlan: GamePlanSpec = {
      seed: "npc-dedupe-seed",
      worldConfig: {
        maxTownTiles: 2,
      },
      bigBad: {
        id: "bb",
        name: "BB",
        summary: "",
        tileRequirement: {
          id: "tile:draculas-castle",
          kind: "special-tile",
          description: "",
          tags: [],
          metadata: {},
        },
        eventRequirement: {
          id: "event-collection:dracula",
          kind: "event-collection",
          description: "",
          tags: [],
          metadata: {},
        },
      },
      mainQuest: {
        id: "q-main",
        name: "",
        summary: "",
        type: "main",
        requirementTemplates: [],
      },
      sideQuests: [],
      townQuests: [],
      requirements: [
        {
          id: "npc:req-a",
          kind: "npc-presence",
          description: "",
          minCount: 1,
          tags: [],
          metadata: { npcId: "npc:igor", preferredZone: "town" },
        },
        {
          id: "npc:req-b",
          kind: "npc-presence",
          description: "",
          minCount: 1,
          tags: [],
          metadata: { npcId: "npc:igor", preferredZone: "town" },
        },
      ],
      debugNotes: [],
    };

    const worldSpec = createWorldSpecFromPlan(fakePlan);
    const igorReq = worldSpec.requiredNpcs.find((entry) => entry.npcId === "npc:igor");

    expect(igorReq).toBeDefined();
    expect(igorReq?.minCount).toBe(1);
  });
});
