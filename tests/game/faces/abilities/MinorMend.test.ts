import { EffectType } from "../../../../src/game/dice";
import { MinorMend } from "../../../../src/game/faces";

describe("MinorMend", () => {
  it("heals self for 1", () => {
    const face = new MinorMend();

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-heal",
    })[0];

    expect(event.effect).toBe(EffectType.Heal);
    expect(event.value).toBe(1);
    expect(event.target).toBe("self");
  });
});
