import { EffectType } from "../../../../src/game/dice";
import { SwordSlash } from "../../../../src/game/faces";

describe("SwordSlash", () => {
  it("deals 1 damage to opponent", () => {
    const face = new SwordSlash();

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-1",
    })[0];

    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(1);
    expect(event.target).toBe("opponent");
  });
});
