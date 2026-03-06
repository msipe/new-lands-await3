import { EffectType } from "../../../../src/game/dice";
import { ArmorGain } from "../../../../src/game/faces";

describe("ArmorGain", () => {
  it("creates an armor event for self", () => {
    const face = new ArmorGain("armor-gain-face", "Armor Up", 4);
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "player-die-x",
    });

    expect(events).toHaveLength(1);
    expect(events[0].effect).toBe(EffectType.Armor);
    expect(events[0].target).toBe("self");
    expect(events[0].value).toBe(4);
    expect(face.getResolvePopupText()).toBe("+4 armor");
  });

  it("supports numeric-plus-1 upgrades", () => {
    const face = new ArmorGain("armor-gain-face", "Armor Up", 1);

    const didApply = face.applyUpgrade({ type: "numeric-plus-1" });

    expect(didApply).toBe(true);
    expect(face.describe()).toBe("Gain 2 armor.");
  });
});
