import type { CombatEvent } from "../../../../src/game/combat-event-bus";
import { EffectType } from "../../../../src/game/dice";
import { FaceAdjustmentModalityType, WildStrike } from "../../../../src/game/faces";
import { resolveTransientDieFromConstruct } from "../../../../src/game/transient-die";

jest.mock("../../../../src/game/transient-die", () => ({
  resolveTransientDieFromConstruct: jest.fn(),
}));

const mockedResolveTransientDieFromConstruct =
  resolveTransientDieFromConstruct as jest.MockedFunction<typeof resolveTransientDieFromConstruct>;

describe("WildStrike", () => {
  beforeEach(() => {
    mockedResolveTransientDieFromConstruct.mockReset();
  });

  it("tags transient weapon events with wild strike bonus metadata", () => {
    const baseEvent: CombatEvent = {
      effect: EffectType.Damage,
      value: 2,
      source: "player",
      target: "opponent",
      cause: "player-roll",
      dieId: "player-die-1",
      sideId: "transient-side",
    };

    mockedResolveTransientDieFromConstruct.mockReturnValue([baseEvent]);

    const face = new WildStrike("wild-strike-face", 2, "spark-die");
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(1);
    expect(events[0].meta?.wildStrike).toBe(true);
    expect(events[0].meta?.wildStrikeBonus).toBe(2);
    expect(events[0].meta?.wildStrikeSourceSideId).toBe("wild-strike-face");
  });

  it("returns no events when no transient weapon result is produced", () => {
    mockedResolveTransientDieFromConstruct.mockReturnValue([]);

    const face = new WildStrike("wild-strike-face", 1, "spark-die");
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(0);
  });

  it("captures spawned transient popup data even when transient events are empty", () => {
    mockedResolveTransientDieFromConstruct.mockImplementation((options) => {
      options.onResolvedTransientDie?.({
        constructId: "rusty-sword-die",
        dieLabel: "Rusty Sword Die",
        sideLabel: "Whiff!",
        popupText: "Miss",
      });
      return [];
    });

    const face = new WildStrike("wild-strike-face", 1, "rusty-sword-die");
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(0);
    expect(face.getSpawnedDiePopupData()).toEqual({
      constructId: "rusty-sword-die",
      dieLabel: "Rusty Sword Die",
      sideLabel: "Whiff!",
      popupText: "Miss",
    });
  });

  it("exposes upgradeable properties for attack count, weapon choice, and extra damage", () => {
    mockedResolveTransientDieFromConstruct.mockReturnValue([]);
    const face = new WildStrike("wild-strike-face", 2, "rusty-sword-die");

    const properties = face.getAdjustmentProperties();
    expect(properties.map((entry) => entry.id)).toEqual([
      "attack_times",
      "weapon_choice",
      "extra_damage",
    ]);

    const attackTimes = properties.find((entry) => entry.id === "attack_times");
    expect(attackTimes).toBeDefined();
    expect(
      attackTimes?.modalities.some((entry) => entry.type === FaceAdjustmentModalityType.Reduce),
    ).toBe(true);
  });

  it("supports property-based upgrades and applies attack count at resolve time", () => {
    mockedResolveTransientDieFromConstruct.mockImplementation((options) => {
      options.onResolvedTransientDie?.({
        constructId: "rusty-sword-die",
        dieLabel: "Rusty Sword Die",
        sideLabel: "Sword Slash",
        popupText: "+1 damage",
      });

      return [
        {
          effect: EffectType.Damage,
          value: 1,
          source: "player",
          target: "opponent",
          cause: "player-roll",
          dieId: "player-die-1",
          sideId: "transient-side",
        },
      ];
    });

    const face = new WildStrike("wild-strike-face", 1, "rusty-sword-die");

    const attackTimesUpgrade = face.applyAdjustment({
      propertyId: "attack_times",
      type: FaceAdjustmentModalityType.Improve,
      steps: 1,
    });
    expect(attackTimesUpgrade.applied).toBe(true);
    expect(attackTimesUpgrade.resourceDelta).toBe(-3);

    const damageUpgrade = face.applyAdjustment({
      propertyId: "extra_damage",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(damageUpgrade.applied).toBe(true);
    expect(damageUpgrade.resourceDelta).toBe(-2);

    const selectUpgrade = face.applyAdjustment({
      propertyId: "weapon_choice",
      type: FaceAdjustmentModalityType.Select,
      value: "offhand",
    });
    expect(selectUpgrade.applied).toBe(true);
    expect(selectUpgrade.resourceDelta).toBe(-5);

    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(2);
  });

  it("supports reducing attack count after improving it", () => {
    mockedResolveTransientDieFromConstruct.mockReturnValue([
      {
        effect: EffectType.Damage,
        value: 1,
        source: "player",
        target: "opponent",
        cause: "player-roll",
        dieId: "player-die-1",
        sideId: "transient-side",
      },
    ]);

    const face = new WildStrike("wild-strike-face", 1, "rusty-sword-die");

    const improve = face.applyAdjustment({
      propertyId: "attack_times",
      type: FaceAdjustmentModalityType.Improve,
      steps: 2,
    });
    expect(improve.applied).toBe(true);
    expect(improve.resourceDelta).toBe(-6);

    const reduce = face.applyAdjustment({
      propertyId: "attack_times",
      type: FaceAdjustmentModalityType.Reduce,
      steps: 2,
    });
    expect(reduce.applied).toBe(true);
    expect(reduce.resourceDelta).toBe(6);

    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(1);
  });
});
