import { EffectType } from "../../../../src/game/dice";
import { RestorationCharm } from "../../../../src/game/faces";

describe("RestorationCharm", () => {
  it("heals self for 2", () => {
    const face = new RestorationCharm();

    const event = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "item-die",
    })[0];

    expect(event.effect).toBe(EffectType.Heal);
    expect(event.value).toBe(2);
    expect(event.target).toBe("self");
  });
});
