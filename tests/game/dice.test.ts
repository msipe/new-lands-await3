import {
  Die,
  type DieSide,
  type RandomSource,
  createLuckyRollHook,
} from "../../src/game/dice";

function makeRandomSource(sequence: number[]): RandomSource {
  let index = 0;
  return {
    nextInt: (maxExclusive: number) => {
      const value = sequence[index] ?? 0;
      index += 1;
      return Math.max(0, Math.min(maxExclusive - 1, value));
    },
  };
}

function makeSide(id: string, label = id): DieSide {
  return {
    id,
    label,
    resolve: () => [],
  };
}

describe("die", () => {
  it("rolls using random source through die.roll", () => {
    const die = new Die({
      id: "d-1",
      name: "Test Die",
      sides: [makeSide("s1"), makeSide("s2"), makeSide("s3")],
    });

    const rolled = die.roll(makeRandomSource([2]));
    expect(rolled.id).toBe("d-1-side-3");
  });

  it("supports roll hooks that alter selected side", () => {
    const die = new Die({
      id: "d-2",
      name: "Hooked Die",
      sides: [makeSide("a"), makeSide("b")],
    });

    die.addRollHook(() => ({ selectedSideIndex: 1 }));
    const result = die.rollWithDetails(makeRandomSource([0]));

    expect(result.selectedSideIndex).toBe(1);
    expect(result.side.id).toBe("d-2-side-2");
  });

  it("applies lucky roll hook and tracks both candidate outcomes", () => {
    const die = new Die({
      id: "d-3",
      name: "Lucky Die",
      sides: [makeSide("low"), makeSide("mid"), makeSide("high")],
    });

    die.addRollHook(createLuckyRollHook());
    const result = die.rollWithDetails(makeRandomSource([0, 2]));

    expect(result.candidateSideIndices).toEqual([0, 2]);
    expect(result.selectedSideIndex).toBe(2);
    expect(result.side.id).toBe("d-3-side-3");
  });

  it("allows lucky hook to use custom comparator", () => {
    const die = new Die({
      id: "d-4",
      name: "Comparator Die",
      sides: [makeSide("alpha", "A"), makeSide("beta", "B")],
    });

    die.addRollHook(
      createLuckyRollHook((left, right) => {
        if (left.label === right.label) {
          return 0;
        }

        return left.label === "A" ? 1 : -1;
      }),
    );

    const result = die.rollWithDetails(makeRandomSource([1, 0]));
    expect(result.side.label).toBe("A");
  });
});
