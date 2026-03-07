import type { CombatEvent } from "../../../../src/game/combat-event-bus";
import { EffectType } from "../../../../src/game/dice";
import { WildStrike } from "../../../../src/game/faces";
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
});
