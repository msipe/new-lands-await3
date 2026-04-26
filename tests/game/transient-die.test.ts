import { resolveTransientDieFromConstruct } from "../../src/game/transient-die";

describe("transient die resolution", () => {
  it("resolves with transient die identity and transient tagging", () => {
    const parentDieId = "player-die-2";
    const events = resolveTransientDieFromConstruct({
      constructId: "rusty-sword-die",
      parentDieId,
      source: "player",
      cause: "player-roll",
      randomSource: { nextInt: () => 0 },
    });

    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.dieId).toBe(`${parentDieId}-transient-rusty-sword-die`);
      expect(event.meta?.transientDie).toBe(true);
      expect(event.meta?.transientDieId).toBe(`${parentDieId}-transient-rusty-sword-die`);
      expect(event.meta?.transientSourceDieId).toBe(parentDieId);
      expect(event.meta?.transientDieIsWeapon).toBe(true);
    }
  });
});
