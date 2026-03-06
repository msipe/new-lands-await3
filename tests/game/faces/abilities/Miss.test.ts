import { Miss } from "../../../../src/game/faces";

describe("Miss", () => {
  it("resolves with no combat events", () => {
    const face = new Miss("miss-face");

    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-1",
    });

    expect(events).toHaveLength(0);
    expect(face.getResolvePopupText()).toBe("Miss");
  });

  it("does not accept damage upgrades", () => {
    const face = new Miss("miss-face");

    expect(face.applyUpgrade({ type: "damage-plus", amount: 3 })).toBe(false);
    expect(face.applyUpgrade({ type: "numeric-plus-1" })).toBe(false);

    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "die-1",
    });

    expect(events).toHaveLength(0);
  });
});
