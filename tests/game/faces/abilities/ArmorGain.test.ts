import { EffectType } from "../../../../src/game/dice";
import { ArmorGain, FaceAdjustmentModalityType } from "../../../../src/game/faces";

describe("ArmorGain", () => {
  it("creates an armor event for self", () => {
    const face = new ArmorGain("Armor Up", 4);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-x",
    });

    expect(events).toHaveLength(1);
    expect(events[0].effect).toBe(EffectType.Armor);
    expect(events[0].target).toBe("self");
    expect(events[0].value).toBe(4);
    expect(face.getResolvePopupText()).toBe("+4 armor");
  });

  it("supports numeric-plus-1 upgrades", () => {
    const face = new ArmorGain("Armor Up", 1);

    const didApply = face.applyUpgrade({ type: "numeric-plus-1" });

    expect(didApply).toBe(true);
    expect(face.describe()).toBe("Gain 2 armor.");
  });

  it("keeps label synchronized with armor adjustments", () => {
    const face = new ArmorGain("Armor Up", 2);

    expect(face.label).toBe("Armor Up +2 armor");

    face.applyAdjustment({
      propertyId: "armor",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(face.label).toBe("Armor Up +4 armor");

    face.applyAdjustment({
      propertyId: "armor",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 1,
    });
    expect(face.label).toBe("Armor Up +3 armor");
  });
});
