import { computeWobbleY } from "../../src/game/wobble";

describe("computeWobbleY", () => {
  it("returns base y when elapsed is zero", () => {
    expect(computeWobbleY(230, 0, 12, 2)).toBe(230);
  });

  it("applies positive wobble displacement", () => {
    const value = computeWobbleY(100, Math.PI / 4, 10, 2);
    expect(value).toBeCloseTo(110, 6);
  });

  it("applies negative wobble displacement", () => {
    const value = computeWobbleY(100, (3 * Math.PI) / 4, 10, 2);
    expect(value).toBeCloseTo(90, 6);
  });
});