import { FaceAdjustmentModalityType, Warcry } from "../../../../src/game/faces";

describe("Warcry", () => {
  it("exposes its attack modifier and emits no combat events", () => {
    const face = new Warcry("warcry-face", 3);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(face.getAttackModifier()).toBe(3);
    expect(events).toHaveLength(0);
  });

  it("supports negative modifiers", () => {
    const face = new Warcry("warcry-face-negative", -2);

    expect(face.getAttackModifier()).toBe(-2);
    expect(face.getResolvePopupText()).toBe("Attacks -2 this turn");
  });

  it("keeps label synchronized with adjusted modifier", () => {
    const face = new Warcry("warcry-face-label-sync", 1);

    expect(face.label).toBe("Warcry +1");

    face.applyAdjustment({
      propertyId: "attack_modifier",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(face.label).toBe("Warcry +3");

    face.applyAdjustment({
      propertyId: "attack_modifier",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 1,
    });
    expect(face.label).toBe("Warcry +2");
  });

  it("exposes power as double the positive attack modifier", () => {
    const positive = new Warcry("warcry-power-positive", 3);
    const negative = new Warcry("warcry-power-negative", -2);

    expect(positive.power).toBe(6);
    expect(negative.power).toBe(0);
  });
});
