import type { CombatEvent } from "../../../../src/game/combat-event-bus";
import { EffectType } from "../../../../src/game/dice";
import { WildStrike } from "../../../../src/game/faces";

describe("WildStrike", () => {
  it("tags ghost weapon events with wild strike bonus metadata", () => {
    const baseEvent: CombatEvent = {
      effect: EffectType.Damage,
      value: 2,
      source: "player",
      target: "opponent",
      cause: "player-roll",
      dieId: "player-die-1",
      sideId: "ghost-side",
    };

    const face = new WildStrike("wild-strike-face", 2, () => [baseEvent]);
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

  it("returns no events when no ghost weapon result is produced", () => {
    const face = new WildStrike("wild-strike-face", 1, () => []);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(0);
  });
});
