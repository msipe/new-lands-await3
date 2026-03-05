import { EffectType } from "../../../../src/game/dice";
import { ShieldBash } from "../../../../src/game/faces";

describe("ShieldBash", () => {
  it("deals 2 damage to opponent", () => {
    const face = new ShieldBash("shield-bash-face");

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-2",
    })[0];

    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(2);
    expect(event.target).toBe("opponent");
  });
});
