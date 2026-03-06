import { getItemById, listItems } from "../../src/planning/content-registry";
import { getDieConstructById } from "../../src/game/dice-constructs";

describe("item registry", () => {
  it("loads item definitions with required fields", () => {
    const items = listItems();

    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.level).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThanOrEqual(0);
      expect(item.slot.length).toBeGreaterThan(0);
    }
  });

  it("resolves a known equipment item with dice linkage", () => {
    const rustySword = getItemById("item:rusty-sword");

    expect(rustySword.slot).toBe("weapon-1");
    expect(rustySword.diceId).toBe("rusty-sword-die");
    expect(() => getDieConstructById(rustySword.diceId ?? "")).not.toThrow();
  });

  it("resolves starter armor and shield dice links", () => {
    const woodenShield = getItemById("item:wooden-shield");
    const patchedArmor = getItemById("item:patched-armor");

    expect(woodenShield.diceId).toBe("wooden-shield-die");
    expect(patchedArmor.diceId).toBe("patched-armor-die");
    expect(() => getDieConstructById(woodenShield.diceId ?? "")).not.toThrow();
    expect(() => getDieConstructById(patchedArmor.diceId ?? "")).not.toThrow();
  });
});
