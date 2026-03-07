import { EffectType, type SideResolveContext } from "../../src/game/dice";
import { FaceAdjustmentModalityType } from "../../src/game/faces";
import { applyFaceAdjustmentEntry } from "../../src/game/face-adjustments";
import { createPlayerCombatDiceLoadout } from "../../src/game/player-combat-dice";
import { createPlayerProgression, recordFaceAdjustment } from "../../src/game/player-progression";

const resolveContext: SideResolveContext = {
  source: "player",
  cause: "player-roll",
  dieId: "test-die",
};

describe("face adjustments", () => {
  it("applies persisted side adjustments when creating player loadout", () => {
    const progression = createPlayerProgression();

    const baselineLoadout = createPlayerCombatDiceLoadout(progression);
    const rustySwordDie = baselineLoadout.find((die) => die.name === "Rusty Sword Die");
    if (!rustySwordDie) {
      throw new Error("Expected Rusty Sword Die to exist");
    }
    const rustySwordSide = rustySwordDie.sides[0];

    recordFaceAdjustment(progression, {
      dieId: rustySwordDie.id,
      sideId: rustySwordSide.id,
      operation: {
        propertyId: "self_damage",
        type: FaceAdjustmentModalityType.Improve,
        steps: 2,
      },
    });

    const loadout = createPlayerCombatDiceLoadout(progression);
    const weaponDie = loadout.find((die) => die.id === rustySwordDie.id);
    if (!weaponDie) {
      throw new Error("Expected equipped weapon die to exist");
    }

    const event = weaponDie.sides[0].resolve(resolveContext)[0];
    expect(event.effect).toBe(EffectType.Damage);
    expect(event.target).toBe("self");
    expect(event.value).toBe(3);
  });

  it("returns failure result when adjustment targets are missing", () => {
    const loadout = createPlayerCombatDiceLoadout(createPlayerProgression());

    const result = applyFaceAdjustmentEntry(loadout, {
      dieId: "missing-die",
      sideId: "missing-side",
      operation: {
        propertyId: "damage",
        type: FaceAdjustmentModalityType.Improve,
        steps: 1,
      },
    });

    expect(result.applied).toBe(false);
    expect(result.resourceDelta).toBe(0);
  });
});
