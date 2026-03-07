import { EffectType } from "../../../../src/game/dice";
import { ArcaneBurst, FaceAdjustmentModalityType } from "../../../../src/game/faces";

describe("ArcaneBurst", () => {
  it("deals 3 damage by default", () => {
    const face = new ArcaneBurst("arcane-burst-face");

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-3",
    })[0];

    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(3);
    expect(event.target).toBe("opponent");
  });

  it("supports face-specific numeric upgrade", () => {
    const face = new ArcaneBurst("arcane-burst-upgrade-face");
    face.applyUpgrade({ type: "numeric-plus-1" });

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-3b",
    })[0];

    expect(event.value).toBe(4);
  });

  it("exposes damage as an upgradeable property", () => {
    const face = new ArcaneBurst("arcane-burst-upgrade-props");
    const properties = face.getAdjustmentProperties();

    expect(properties).toHaveLength(1);
    expect(properties[0].id).toBe("damage");
    expect(properties[0].value).toBe(3);
    expect(
      properties[0].modalities.some((entry) => entry.type === FaceAdjustmentModalityType.Improve),
    ).toBe(true);
    expect(
      properties[0].modalities.some((entry) => entry.type === FaceAdjustmentModalityType.Reduce),
    ).toBe(true);
  });

  it("supports property-based improve/reduce operations", () => {
    const face = new ArcaneBurst("arcane-burst-upgrade-ops");

    const improved = face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(improved.applied).toBe(true);
    expect(improved.resourceDelta).toBe(-2);

    const reduced = face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 1,
    });
    expect(reduced.applied).toBe(true);
    expect(reduced.resourceDelta).toBe(0.5);

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-3c",
    })[0];

    expect(event.value).toBe(4);
  });

  it("keeps label synchronized with damage adjustments", () => {
    const face = new ArcaneBurst("arcane-burst-label-sync");

    expect(face.label).toBe("Arcane Burst +3");

    face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Improve,
      steps: 1,
    });
    expect(face.label).toBe("Arcane Burst +4");

    face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 2,
    });
    expect(face.label).toBe("Arcane Burst +2");
  });
});
