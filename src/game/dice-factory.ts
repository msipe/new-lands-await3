import type { Die } from "./dice";
import type { DieConstruct } from "./dice-constructs";

export type CreateDieFromConstructInput = {
  construct: DieConstruct;
  dieId: string;
  nameOverride?: string;
};

export function createDieFromConstruct(input: CreateDieFromConstructInput): Die {
  const { construct, dieId, nameOverride } = input;

  return {
    id: dieId,
    name: nameOverride ?? construct.name,
    sides: construct.sideBuilders.map((buildSide, sideIndex) => buildSide(`${dieId}-side-${sideIndex + 1}`)),
  };
}

export function assertDieSideCount(construct: DieConstruct, expectedSideCount: number): void {
  if (construct.sideBuilders.length !== expectedSideCount) {
    throw new Error(
      `Die construct ${construct.id} must have ${expectedSideCount} sides, found ${construct.sideBuilders.length}.`,
    );
  }
}
