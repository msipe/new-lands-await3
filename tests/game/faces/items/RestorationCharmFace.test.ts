import { EffectType } from "../../../../src/game/dice";
import { RestorationCharmFace } from "../../../../src/game/faces";

describe("RestorationCharmFace", () => {
  it("heals self for 2", () => {
    const face = new RestorationCharmFace("restoration-charm-face");

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
