import { DealDamage } from "../../../../src/game/faces";
import { FaceAdjustmentModalityType } from "../../../../src/game/faces/FaceAdjustmentModel";

describe("DealDamage", () => {
  it("reports point value metadata for damage property", () => {
    const face = new DealDamage("deal-damage-face", "Strike", 3);

    const damageProperty = face.getAdjustmentProperties().find((entry) => entry.id === "damage");
    expect(damageProperty?.value).toBe(3);
    expect(damageProperty?.pointValue).toBe(3);
    expect(typeof damageProperty?.pointDeltaCalculator).toBe("function");
    const oneStepImproveDelta = damageProperty?.pointDeltaCalculator?.({
      operationType: FaceAdjustmentModalityType.Improve,
      steps: 1,
      propertyValue: damageProperty.value,
      pointValue: damageProperty.pointValue ?? 0,
      properties: [damageProperty],
    });
    expect(oneStepImproveDelta).toBe(1);
  });

  it("updates point value after improve/reduce adjustments", () => {
    const face = new DealDamage("deal-damage-face", "Strike", 2);

    const improved = face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(improved.applied).toBe(true);

    const afterImprove = face.getAdjustmentProperties().find((entry) => entry.id === "damage");
    expect(afterImprove?.value).toBe(4);
    expect(afterImprove?.pointValue).toBe(4);

    const reduced = face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 1,
    });
    expect(reduced.applied).toBe(true);

    const afterReduce = face.getAdjustmentProperties().find((entry) => entry.id === "damage");
    expect(afterReduce?.value).toBe(3);
    expect(afterReduce?.pointValue).toBe(3);
  });

  it("exposes power based on damage value", () => {
    const face = new DealDamage("deal-damage-power", "Strike", 2);

    expect(face.power).toBe(2);

    face.applyAdjustment({
      propertyId: "damage",
      type: FaceAdjustmentModalityType.Improve,
      steps: 3,
    });

    expect(face.power).toBe(5);
  });
});
