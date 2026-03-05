import { DamageEffectScript } from "../../src/game/dice-effects";
import { Deal3DamageSide, ScriptedDiceSide } from "../../src/game/dice-sides";
import { EffectType } from "../../src/game/dice";

describe("class-based dice sides", () => {
  it("resolves Deal3DamageSide into a targeted damage event", () => {
    const side = new Deal3DamageSide("deal-3-side");

    const events = side.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      effect: EffectType.Damage,
      value: 3,
      source: "player",
      target: "opponent",
      dieId: "player-die-1",
      sideId: "deal-3-side",
    });
  });

  it("allows specific side scripts to reuse generic DamageEffectScript", () => {
    const side = new ScriptedDiceSide("custom-damage-side", "Custom Damage", [
      new DamageEffectScript("custom-dmg", 3, "opponent"),
    ]);

    const events = side.resolve({
      source: "enemy",
      cause: "enemy-intent",
      dieId: "enemy-die-1",
    });

    expect(events[0].effect).toBe(EffectType.Damage);
    expect(events[0].value).toBe(3);
    expect(events[0].target).toBe("opponent");
  });
});
