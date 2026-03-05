import { EffectType } from "../../../../src/game/dice";
import { SwordSlashFace } from "../../../../src/game/faces";

describe("SwordSlashFace", () => {
  it("deals 1 damage to opponent", () => {
    const face = new SwordSlashFace("sword-slash-face");

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
