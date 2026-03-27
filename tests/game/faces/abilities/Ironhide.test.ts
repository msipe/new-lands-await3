import { EffectType } from "../../../../src/game/dice";
import { Ironhide } from "../../../../src/game/faces";

describe("Ironhide", () => {
  it("creates an armor event for self", () => {
    const face = new Ironhide(5);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-5",
    });

    expect(events).toHaveLength(1);
    expect(events[0].effect).toBe(EffectType.Armor);
    expect(events[0].target).toBe("self");
    expect(events[0].value).toBe(5);
  });

  it("supports zero-armor faces", () => {
    const face = new Ironhide(0);

    expect(face.getResolvePopupText()).toBe("+0 armor");
    expect(face.describe()).toBe("Gain 0 armor.");
  });
});
