export enum EffectType {
  Damage = "damage",
  Heal = "heal",
}

export type DiceEffect = {
  id: string;
  effect: EffectType;
  value: number;
};

export type DieSide = {
  id: string;
  label: string;
  effects: DiceEffect[];
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
