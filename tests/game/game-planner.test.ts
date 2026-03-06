import {
  createDefaultGamePlannerConfig,
  formatGamePlanSpec,
  GamePlanner,
} from "../../src/planning/game-planner";

describe("GamePlanner", () => {
  it("always includes dracula baseline requirements", () => {
    const planner = new GamePlanner(createDefaultGamePlannerConfig("test-seed-a"));
    const plan = planner.createPlan();

    expect(plan.bigBad.name).toBe("Lord Dracula");
    expect(plan.requirements.some((entry) => entry.id === "tile:draculas-castle")).toBe(true);
    expect(plan.requirements.some((entry) => entry.id === "event-collection:dracula")).toBe(true);
    expect(plan.requirements.some((entry) => entry.id === "npc:igor")).toBe(true);
  });

  it("includes mandatory sacred tome side quest", () => {
    const planner = new GamePlanner(createDefaultGamePlannerConfig("test-seed-b"));
    const plan = planner.createPlan();

    expect(plan.sideQuests.some((entry) => entry.id === "side:sacred-tome")).toBe(true);
    expect(plan.requirements.some((entry) => entry.id === "npc:castle-librarian")).toBe(true);
  });

  it("aggregates dense forest requirement when two forest town quests are selected", () => {
    const config = createDefaultGamePlannerConfig("forest-heavy");
    config.townQuestIds = ["town:big-scary-wolf", "town:bandit-den"];
    config.townCount = 2;

    const planner = new GamePlanner(config);
    const plan = planner.createPlan();

    const forestReq = plan.requirements.find((entry) => entry.id === "tile-zone:forest");
    expect(forestReq).toBeDefined();
    expect(forestReq?.minCount).toBe(2);
  });

  it("formats debug lines for the planner screen", () => {
    const planner = new GamePlanner(createDefaultGamePlannerConfig("debug-lines"));
    const plan = planner.createPlan();
    const lines = formatGamePlanSpec(plan);

    expect(lines.some((line) => line.includes("Big Bad: Lord Dracula"))).toBe(true);
    expect(lines.some((line) => line.includes("Requirements:"))).toBe(true);
  });

  it("does not crash when requested quest counts exceed available pools", () => {
    const config = createDefaultGamePlannerConfig("tiny-pools");
    config.sideQuestIds = ["side:sacred-tome"];
    config.townQuestIds = ["town:river-toll"];
    config.sideQuestCount = 3;
    config.townCount = 3;
    config.mandatorySideQuestIds = [];

    const planner = new GamePlanner(config);
    const createPlan = () => planner.createPlan();
    expect(createPlan).not.toThrow();
  });

  it("produces deterministic selections for the same seed", () => {
    const configA = createDefaultGamePlannerConfig("same-seed");
    const configB = createDefaultGamePlannerConfig("same-seed");

    const planA = new GamePlanner(configA).createPlan();
    const planB = new GamePlanner(configB).createPlan();

    expect(planA.sideQuests.map((entry) => entry.id)).toEqual(planB.sideQuests.map((entry) => entry.id));
    expect(planA.townQuests.map((entry) => entry.id)).toEqual(planB.townQuests.map((entry) => entry.id));
    expect(planA.requirements.map((entry) => `${entry.id}:${entry.minCount}`)).toEqual(
      planB.requirements.map((entry) => `${entry.id}:${entry.minCount}`),
    );
  });

  it("does not include duplicate selected quests", () => {
    const plan = new GamePlanner(createDefaultGamePlannerConfig("dupe-check")).createPlan();

    const sideIds = plan.sideQuests.map((entry) => entry.id);
    const townIds = plan.townQuests.map((entry) => entry.id);

    expect(new Set(sideIds).size).toBe(sideIds.length);
    expect(new Set(townIds).size).toBe(townIds.length);
  });

  it("keeps requirements valid for proc-gen constraints", () => {
    const plan = new GamePlanner(createDefaultGamePlannerConfig("requirement-shape")).createPlan();

    expect(plan.requirements.length).toBeGreaterThan(0);
    for (const requirement of plan.requirements) {
      expect(requirement.id.length).toBeGreaterThan(0);
      expect(requirement.description.length).toBeGreaterThan(0);
      expect(requirement.minCount).toBeGreaterThan(0);
    }
  });
});
