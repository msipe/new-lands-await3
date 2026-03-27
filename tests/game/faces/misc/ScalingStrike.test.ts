import { ScalingStrike } from "../../../../src/game/faces";

describe("ScalingStrike", () => {
  it("increases damage on each fifth roll", () => {
    const face = new ScalingStrike(1, 5, 1);
    const values: number[] = [];

    for (let roll = 0; roll < 6; roll += 1) {
      values.push(
        face.resolve({
          source: "player",
          cause: "player-roll",
          dieId: "misc-die",
        })[0].value,
      );
    }

    expect(values).toEqual([1, 1, 1, 1, 2, 2]);
  });
});
