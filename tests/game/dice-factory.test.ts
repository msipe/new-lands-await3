import { getDieConstructById } from "../../src/game/dice-constructs";
import { createDieFromConstruct } from "../../src/game/dice-factory";
import { Die } from "../../src/game/dice";

describe("dice factory", () => {
  it("creates class-based die instances from constructs", () => {
    const construct = getDieConstructById("spark-die");
    const die = createDieFromConstruct({ construct, dieId: "player-die-test" });

    expect(die).toBeInstanceOf(Die);
    expect(die.id).toBe("player-die-test");
    expect(die.name).toBe("Spark Die");
    expect(die.sides).toHaveLength(construct.sideBuilders.length);
    expect(die.sides[0].id).toBe("player-die-test-side-1");
  });

  it("supports explicit name overrides", () => {
    const construct = getDieConstructById("mend-die");
    const die = createDieFromConstruct({
      construct,
      dieId: "player-die-override",
      nameOverride: "Custom Mend",
    });

    expect(die.name).toBe("Custom Mend");
    expect(die.sides).toHaveLength(construct.sideBuilders.length);
  });
});
