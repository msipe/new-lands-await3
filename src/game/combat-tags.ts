export type CombatTagId = string;

export type CombatTag = {
  id: CombatTagId;
  name: string;
  description: string;
};

export type CombatTagRef = CombatTag | CombatTagId;

const CAUSE_TAG_PREFIX = "cause:";

function cleanTagId(tag: CombatTagId): CombatTagId | undefined {
  const trimmed = tag.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toCombatTagId(tag: CombatTagRef): CombatTagId {
  return typeof tag === "string" ? tag : tag.id;
}

function createCombatTag(id: CombatTagId, name: string, description: string): CombatTag {
  return { id, name, description };
}

const dynamicTagRegistry: Record<CombatTagId, CombatTag> = {};

function getOrCreateDynamicTag(
  id: CombatTagId,
  name: string,
  description: string,
): CombatTag {
  const existing = dynamicTagRegistry[id];
  if (existing !== undefined) {
    return existing;
  }

  const created = createCombatTag(id, name, description);
  dynamicTagRegistry[id] = created;
  return created;
}

export const CoreCombatTags = {
  Attack: createCombatTag("attack", "Attack", "Marks a damage event as an attack-class event."),
  AttackWeapon: createCombatTag(
    "attack:weapon",
    "Weapon Attack",
    "Marks an attack that came from a weapon-tagged die path.",
  ),
  Hit: createCombatTag("hit", "Hit", "Marks a positive-value damage event."),
  Transient: createCombatTag(
    "transient",
    "Transient",
    "Marks events originating from a transient/spawned-for-resolution die flow.",
  ),
  LifecycleTransient: createCombatTag(
    "lifecycle:transient",
    "Lifecycle Transient",
    "Marks a transient lifecycle classification.",
  ),
} as const;

export const CombatTagFactory = {
  effect(effect: string): CombatTag {
    return getOrCreateDynamicTag(
      `effect:${effect}`,
      `Effect ${effect}`,
      `Marks event effect type ${effect}.`,
    );
  },
  actor(actor: "player" | "enemy"): CombatTag {
    return getOrCreateDynamicTag(
      `actor:${actor}`,
      `${actor === "player" ? "Player" : "Enemy"} Actor`,
      `Marks events sourced from ${actor}.`,
    );
  },
  target(target: "self" | "opponent"): CombatTag {
    return getOrCreateDynamicTag(
      `target:${target}`,
      `${target === "self" ? "Self" : "Opponent"} Target`,
      `Marks events targeting ${target}.`,
    );
  },
  cause(cause: "enemy-intent" | "player-roll" | "triggered"): CombatTag {
    return getOrCreateDynamicTag(
      `cause:${cause}`,
      `Cause ${cause}`,
      `Marks event cause ${cause}.`,
    );
  },
  dieTag(tag: string): CombatTag {
    return getOrCreateDynamicTag(`die:${tag}`, `Die Tag ${tag}`, `Cascaded die tag ${tag}.`);
  },
  faceCategory(category: string): CombatTag {
    return getOrCreateDynamicTag(
      `face-category:${category}`,
      `Face Category ${category}`,
      `Cascaded face category ${category}.`,
    );
  },
  faceType(type: string): CombatTag {
    return getOrCreateDynamicTag(
      `face-type:${type}`,
      `Face Type ${type}`,
      `Cascaded face type ${type}.`,
    );
  },
};

export function isCauseTagId(tagId: CombatTagId): boolean {
  return tagId.startsWith(CAUSE_TAG_PREFIX);
}

export function getCommonCombatTags(): CombatTag[] {
  return [
    CoreCombatTags.Attack,
    CoreCombatTags.AttackWeapon,
    CoreCombatTags.Hit,
    CoreCombatTags.Transient,
    CoreCombatTags.LifecycleTransient,
  ];
}

export function normalizeCombatTags(tags: readonly CombatTagRef[]): CombatTagId[] {
  const deduped = new Set<CombatTagId>();
  for (const tag of tags) {
    const clean = cleanTagId(toCombatTagId(tag));
    if (clean !== undefined) {
      deduped.add(clean);
    }
  }

  return [...deduped];
}

export function mergeCombatTags(...groups: Array<readonly CombatTagRef[] | undefined>): CombatTagId[] {
  const merged: CombatTagRef[] = [];
  for (const group of groups) {
    if (group === undefined) {
      continue;
    }
    merged.push(...group);
  }

  return normalizeCombatTags(merged);
}

export function hasCombatTag(tags: readonly CombatTagId[] | undefined, tag: CombatTagRef): boolean {
  if (tags === undefined) {
    return false;
  }

  return tags.includes(toCombatTagId(tag));
}

export function hasAllCombatTags(
  tags: readonly CombatTagId[] | undefined,
  required: readonly CombatTagRef[],
): boolean {
  if (tags === undefined) {
    return false;
  }

  return required.every((tag) => tags.includes(toCombatTagId(tag)));
}

export function prefixCombatTags(
  factory: (tag: string) => CombatTag,
  tags: readonly string[] | undefined,
): CombatTag[] {
  if (tags === undefined || tags.length === 0) {
    return [];
  }

  return tags.map((tag) => factory(tag));
}
