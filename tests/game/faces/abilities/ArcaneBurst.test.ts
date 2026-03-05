import { EffectType } from "../../../../src/game/dice";
import { ArcaneBurst } from "../../../../src/game/faces";

describe("ArcaneBurst", () => {
  it("deals 3 damage by default", () => {
    const face = new ArcaneBurst("arcane-burst-face");

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-3",
    })[0];

    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(3);
    expect(event.target).toBe("opponent");
  });

  it("supports face-specific numeric upgrade", () => {
    const face = new ArcaneBurst("arcane-burst-upgrade-face");
    face.applyUpgrade({ type: "numeric-plus-1" });

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-3b",
    })[0];

    expect(event.value).toBe(4);
  });
});
