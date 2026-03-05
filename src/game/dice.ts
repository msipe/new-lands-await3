export enum EffectType {
  Damage = "damage",
  Heal = "heal",
}

export type DiceEventSource = "player" | "enemy";

export type DiceEventCause = "enemy-intent" | "player-roll" | "triggered";

export type SideResolveContext = {
  source: DiceEventSource;
  cause: DiceEventCause;
  dieId: string;
};

export interface DieSide {
  id: string;
  label: string;
  resolve(context: SideResolveContext): import("./combat-event-bus").CombatEvent[];
}

type UpgradableDieSide = DieSide & {
  applyUpgrade: (upgrade: import("./faces").FaceUpgrade) => boolean;
};

export type Die = {
  id: string;
  name: string;
  sides: DieSide[];
};

export type RandomSource = {
  nextInt: (maxExclusive: number) => number;
};

export const defaultRandomSource: RandomSource = {
  nextInt: (maxExclusive) => Math.floor(Math.random() * maxExclusive),
};

export function rollDie(die: Die, randomSource: RandomSource): DieSide {
  if (die.sides.length === 0) {
    throw new Error(`Die ${die.id} has no sides.`);
  }

  const sideIndex = randomSource.nextInt(die.sides.length);
  return die.sides[sideIndex];
}

export function addDieSide(die: Die, side: DieSide): void {
  die.sides.push(side);
}

export function removeDieSide(die: Die, sideId: string): void {
  const sideIndex = die.sides.findIndex((side) => side.id === sideId);

  if (sideIndex === -1) {
    return;
  }

  die.sides.splice(sideIndex, 1);
}

export function transposeDieSides(die: Die, leftIndex: number, rightIndex: number): void {
  const leftSide = die.sides[leftIndex];
  const rightSide = die.sides[rightIndex];

  if (!leftSide || !rightSide) {
    return;
  }

  die.sides[leftIndex] = rightSide;
  die.sides[rightIndex] = leftSide;
}

export function replaceDieSide(die: Die, sideId: string, nextSide: DieSide): void {
  const sideIndex = die.sides.findIndex((side) => side.id === sideId);

  if (sideIndex === -1) {
    return;
  }

  die.sides[sideIndex] = nextSide;
}

export function applyUpgradeToDieSide(
  die: Die,
  sideId: string,
  upgrade: import("./faces").FaceUpgrade,
): boolean {
  const side = die.sides.find((entry) => entry.id === sideId);

  if (!side) {
    return false;
  }

  const upgradableSide = side as Partial<UpgradableDieSide>;
  if (typeof upgradableSide.applyUpgrade !== "function") {
    return false;
  }

  return upgradableSide.applyUpgrade(upgrade);
}
