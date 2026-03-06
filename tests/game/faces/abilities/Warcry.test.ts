import { Warcry } from "../../../../src/game/faces";

describe("Warcry", () => {
  it("exposes its attack modifier and emits no combat events", () => {
    const face = new Warcry("warcry-face", 3);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-1",
    });

    expect(face.getAttackModifier()).toBe(3);
    expect(events).toHaveLength(0);
  });

  it("supports negative modifiers", () => {
    const face = new Warcry("warcry-face-negative", -2);

    expect(face.getAttackModifier()).toBe(-2);
    expect(face.getResolvePopupText()).toBe("Attacks -2 this turn");
  });
});
