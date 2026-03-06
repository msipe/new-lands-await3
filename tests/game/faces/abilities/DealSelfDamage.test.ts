import { EffectType } from "../../../../src/game/dice";
import { DealSelfDamage } from "../../../../src/game/faces";

describe("DealSelfDamage", () => {
  it("deals damage to self", () => {
    const face = new DealSelfDamage("self-hit-face", "Backfire", 2);

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-self-hit",
    })[0];

    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(2);
    expect(event.target).toBe("self");
  });
});
