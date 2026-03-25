import { getExplorationFlowById, listExplorationFlows } from "../../src/planning/content-registry";

describe("exploration flow registry", () => {
  it("loads all flows with required fields", () => {
    const flows = listExplorationFlows();

    expect(flows.length).toBeGreaterThan(0);

    for (const flow of flows) {
      expect(flow.id.length).toBeGreaterThan(0);
      expect(flow.name.length).toBeGreaterThan(0);
      expect(flow.zone.length).toBeGreaterThan(0);
      expect(Array.isArray(flow.tags)).toBe(true);
      expect(flow.levels.length).toBeGreaterThan(0);
    }
  });

  it("each flow level has required narrative fields", () => {
    const flows = listExplorationFlows();

    for (const flow of flows) {
      for (const level of flow.levels) {
        expect(level.level).toBeGreaterThan(0);
        expect(level.label.length).toBeGreaterThan(0);
        expect(level.hook.length).toBeGreaterThan(0);
        expect(level.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("level numbers and labels are sequential and consistent", () => {
    const flows = listExplorationFlows();

    for (const flow of flows) {
      flow.levels.forEach((level, index) => {
        expect(level.level).toBe(index + 1);
        expect(level.label).toBe(`${index + 1}/${flow.levels.length}`);
      });
    }
  });

  it("retrieves a known forest flow by id", () => {
    const flow = getExplorationFlowById("flow:forest-ancient-ruin");

    expect(flow.name.length).toBeGreaterThan(0);
    expect(flow.zone).toBe("forest");
    expect(flow.levels.length).toBe(3);
  });

  it("retrieves a known mountain flow by id", () => {
    const flow = getExplorationFlowById("flow:mountain-warlock-tower");

    expect(flow.zone).toBe("mountain");
    expect(flow.levels.length).toBeGreaterThan(0);
  });

  it("throws on unknown flow id", () => {
    expect(() => getExplorationFlowById("flow:does-not-exist")).toThrow();
  });

  it("all flow ids are unique", () => {
    const flows = listExplorationFlows();
    const ids = flows.map((f) => f.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns independent copies on each listExplorationFlows call", () => {
    const a = listExplorationFlows();
    const b = listExplorationFlows();

    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);

    a[0].tags.push("mutated");
    expect(b[0].tags).not.toContain("mutated");
  });

  it("covers multiple zones", () => {
    const flows = listExplorationFlows();
    const zones = new Set(flows.map((f) => f.zone));

    expect(zones.size).toBeGreaterThanOrEqual(2);
  });
});
