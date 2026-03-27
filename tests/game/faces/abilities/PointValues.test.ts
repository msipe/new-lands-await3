import {
  ArmorGain,
  DealSelfDamage,
  FaceAdjustmentModalityType,
  HealSelf,
  Warcry,
  WildStrike,
} from "../../../../src/game/faces";
import { ScalingStrike } from "../../../../src/game/faces/misc/ScalingStrike";

describe("face adjustment point values", () => {
  it("calculates point metadata for single-property faces", () => {
    const dealSelfDamage = new DealSelfDamage("Backfire", 2);
    const healSelf = new HealSelf("Mend", 3);
    const armorGain = new ArmorGain("Armor Up", 4);
    const warcry = new Warcry(2);

    const selfDamageProperty = dealSelfDamage.getAdjustmentProperties()[0];
    expect(selfDamageProperty.pointValue).toBe(-2);
    expect(
      selfDamageProperty.pointDeltaCalculator?.({
        operationType: FaceAdjustmentModalityType.Improve,
        steps: 1,
        propertyValue: selfDamageProperty.value,
        pointValue: selfDamageProperty.pointValue ?? 0,
        properties: [selfDamageProperty],
      }),
    ).toBe(-1);

    const healProperty = healSelf.getAdjustmentProperties()[0];
    expect(healProperty.pointValue).toBe(3);
    expect(
      healProperty.pointDeltaCalculator?.({
        operationType: FaceAdjustmentModalityType.Reduce,
        steps: 1,
        propertyValue: healProperty.value,
        pointValue: healProperty.pointValue ?? 0,
        properties: [healProperty],
      }),
    ).toBe(-1);

    const armorProperty = armorGain.getAdjustmentProperties()[0];
    expect(armorProperty.pointValue).toBe(4);

    const warcryProperty = warcry.getAdjustmentProperties()[0];
    expect(warcryProperty.pointValue).toBe(2);
  });

  it("supports cross-property point calculations for wild strike", () => {
    const wildStrike = new WildStrike(2, "rusty-sword-die");
    const properties = wildStrike.getAdjustmentProperties();

    const attackTimes = properties.find((entry) => entry.id === "attack_times");
    const extraDamage = properties.find((entry) => entry.id === "extra_damage");
    expect(attackTimes?.pointValue).toBe(3);
    expect(extraDamage?.pointValue).toBe(3);

    const attackTimesDelta = attackTimes?.pointDeltaCalculator?.({
      operationType: FaceAdjustmentModalityType.Improve,
      steps: 1,
      propertyValue: attackTimes.value,
      pointValue: attackTimes.pointValue ?? 0,
      properties,
    });
    expect(attackTimesDelta).toBe(3);

    const extraDamageDelta = extraDamage?.pointDeltaCalculator?.({
      operationType: FaceAdjustmentModalityType.Improve,
      steps: 1,
      propertyValue: extraDamage.value,
      pointValue: extraDamage.pointValue ?? 0,
      properties,
    });
    expect(extraDamageDelta).toBeCloseTo(1.5, 5);
  });

  it("adds point metadata for scaling strike scaling step", () => {
    const scalingStrike = new ScalingStrike(1, 5, 1);
    const scalingStep = scalingStrike
      .getAdjustmentProperties()
      .find((entry) => entry.id === "scaling_step");

    expect(scalingStep?.pointValue).toBe(1);
    const scalingDelta = scalingStep?.pointDeltaCalculator?.({
      operationType: FaceAdjustmentModalityType.Improve,
      steps: 2,
      propertyValue: scalingStep?.value ?? 1,
      pointValue: scalingStep?.pointValue ?? 0,
      properties: scalingStrike.getAdjustmentProperties(),
    });
    expect(scalingDelta).toBe(2);
  });
});
