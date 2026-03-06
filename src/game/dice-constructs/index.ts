import { ENEMY_DIE_CONSTRUCTS } from "./enemy";
import { ITEM_DIE_CONSTRUCTS } from "./items";
import { PLAYER_DIE_CONSTRUCTS } from "./player";
import type { DieConstruct } from "./types";

const allConstructs = [
  ...PLAYER_DIE_CONSTRUCTS,
  ...ITEM_DIE_CONSTRUCTS,
  ...ENEMY_DIE_CONSTRUCTS,
];

const constructById: Record<string, DieConstruct> = {};
for (const construct of allConstructs) {
  constructById[construct.id] = construct;
}

export { ENEMY_DIE_CONSTRUCTS, PLAYER_DIE_CONSTRUCTS };
export { ITEM_DIE_CONSTRUCTS };
export type { DieConstruct, DieConstructMetadata, DieSideBuilder } from "./types";

export function getDieConstructById(constructId: string): DieConstruct {
  const construct = constructById[constructId];
  if (!construct) {
    throw new Error(`Unknown die construct: ${constructId}`);
  }

  return construct;
}
