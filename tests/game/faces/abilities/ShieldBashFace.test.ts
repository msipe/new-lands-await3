import { EffectType } from "../../../../src/game/dice";
import { ShieldBashFace } from "../../../../src/game/faces";

describe("ShieldBashFace", () => {
  it("deals 2 damage to opponent", () => {
    const face = new ShieldBashFace("shield-bash-face");

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
