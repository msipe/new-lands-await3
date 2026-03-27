import { Die } from "./dice";
import type { DieConstruct } from "./dice-constructs";

export type CreateDieFromConstructInput = {
  construct: DieConstruct;
  dieId: string;
  nameOverride?: string;
  singleUse?: boolean;
  fleeting?: boolean;
};

export function createDieFromConstruct(input: CreateDieFromConstructInput): Die {
  const { construct, dieId, nameOverride } = input;

  return new Die({
    id: dieId,
    name: nameOverride ?? construct.name,
    energyCost: construct.energyCost,
    singleUse: input.singleUse,
    fleeting: input.fleeting,
    tint: construct.tint,
    sides: construct.sideBuilders.map((buildSide, sideIndex) => buildSide(`${dieId}-side-${sideIndex + 1}`)),
  });
}
