export enum EffectType {
  Damage = "damage",
  Heal = "heal",
  Armor = "armor",
}

export type DiceEventSource = "player" | "enemy";

export type DiceEventCause = "enemy-intent" | "player-roll" | "triggered";

export type SideResolveContext = {
  source: DiceEventSource;
  cause: DiceEventCause;
  dieId: string;
  randomSource?: RandomSource;
};

export interface DieSide {
  id: string;
  label: string;
  describe?: () => string;
  getResolvePopupText?: () => string;
  resolve(context: SideResolveContext): import("./combat-event-bus").CombatEvent[];
}

type UpgradableDieSide = DieSide & {
  applyUpgrade: (upgrade: import("./faces").FaceUpgrade) => boolean;
};

export type RandomSource = {
  nextInt: (maxExclusive: number) => number;
};

export type DieRollHookContext = {
  die: Die;
  randomSource: RandomSource;
  selectedSideIndex: number;
  candidateSideIndices: number[];
};

export type DieRollHookResult = {
  selectedSideIndex?: number;
  candidateSideIndices?: number[];
};

export type DieRollHook = (context: DieRollHookContext) => DieRollHookResult | void;

export type DieRollResult = {
  side: DieSide;
  selectedSideIndex: number;
  candidateSideIndices: number[];
};

export type DieInput = {
  id: string;
  name: string;
  sides: DieSide[];
  energyCost?: number;
};

export const defaultRandomSource: RandomSource = {
  nextInt: (maxExclusive) => Math.floor(Math.random() * maxExclusive),
};

function isValidSideIndex(index: number, sideCount: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < sideCount;
}

export class Die {
  readonly id: string;
  name: string;
  readonly sides: DieSide[];
  readonly energyCost: number;

  private readonly rollHooks: DieRollHook[];

  constructor(input: DieInput) {
    this.id = input.id;
    this.name = input.name;
    this.sides = [...input.sides];
    this.energyCost = Math.max(0, Math.floor(input.energyCost ?? 1));
    this.rollHooks = [];
  }

  roll(randomSource: RandomSource = defaultRandomSource): DieSide {
    return this.rollWithDetails(randomSource).side;
  }

  rollWithDetails(randomSource: RandomSource = defaultRandomSource): DieRollResult {
    if (this.sides.length === 0) {
      throw new Error(`Die ${this.id} has no sides.`);
    }

    let selectedSideIndex = randomSource.nextInt(this.sides.length);
    let candidateSideIndices = [selectedSideIndex];

    for (const hook of this.rollHooks) {
      const result = hook({
        die: this,
        randomSource,
        selectedSideIndex,
        candidateSideIndices: [...candidateSideIndices],
      });

      if (result?.candidateSideIndices) {
        const validCandidates = result.candidateSideIndices.filter((index) =>
          isValidSideIndex(index, this.sides.length),
        );
        if (validCandidates.length > 0) {
          candidateSideIndices = validCandidates;
        }
      }

      if (
        result?.selectedSideIndex !== undefined &&
        isValidSideIndex(result.selectedSideIndex, this.sides.length)
      ) {
        selectedSideIndex = result.selectedSideIndex;
        if (!candidateSideIndices.includes(selectedSideIndex)) {
          candidateSideIndices = [...candidateSideIndices, selectedSideIndex];
        }
      }

      if (!candidateSideIndices.includes(selectedSideIndex)) {
        selectedSideIndex = candidateSideIndices[0];
      }
    }

    return {
      side: this.sides[selectedSideIndex],
      selectedSideIndex,
      candidateSideIndices: [...candidateSideIndices],
    };
  }

  addRollHook(hook: DieRollHook): () => void {
    this.rollHooks.push(hook);

    return () => {
      const index = this.rollHooks.indexOf(hook);
      if (index >= 0) {
        this.rollHooks.splice(index, 1);
      }
    };
  }

  clearRollHooks(): void {
    this.rollHooks.length = 0;
  }

  addSide(side: DieSide): void {
    this.sides.push(side);
  }

  removeSide(sideId: string): void {
    const sideIndex = this.sides.findIndex((side) => side.id === sideId);
    if (sideIndex === -1) {
      return;
    }

    this.sides.splice(sideIndex, 1);
  }

  transposeSides(leftIndex: number, rightIndex: number): void {
    const leftSide = this.sides[leftIndex];
    const rightSide = this.sides[rightIndex];

    if (!leftSide || !rightSide) {
      return;
    }

    this.sides[leftIndex] = rightSide;
    this.sides[rightIndex] = leftSide;
  }

  replaceSide(sideId: string, nextSide: DieSide): void {
    const sideIndex = this.sides.findIndex((side) => side.id === sideId);
    if (sideIndex === -1) {
      return;
    }

    this.sides[sideIndex] = nextSide;
  }
}

export function createLuckyRollHook(
  compareSides?: (left: DieSide, right: DieSide) => number,
): DieRollHook {
  return ({ die, randomSource, selectedSideIndex }) => {
    if (die.sides.length === 0) {
      return undefined;
    }

    const rerollSideIndex = randomSource.nextInt(die.sides.length);
    const candidateSideIndices = [selectedSideIndex, rerollSideIndex];

    if (!compareSides) {
      // Placeholder rule until a full side-strength framework lands.
      return {
        candidateSideIndices,
        selectedSideIndex: Math.max(selectedSideIndex, rerollSideIndex),
      };
    }

    const chosen =
      compareSides(die.sides[selectedSideIndex], die.sides[rerollSideIndex]) >= 0
        ? selectedSideIndex
        : rerollSideIndex;

    return {
      candidateSideIndices,
      selectedSideIndex: chosen,
    };
  };
}

export function rollDie(die: Die, randomSource: RandomSource): DieSide {
  return die.roll(randomSource);
}

export function addDieSide(die: Die, side: DieSide): void {
  die.addSide(side);
}

export function removeDieSide(die: Die, sideId: string): void {
  die.removeSide(sideId);
}

export function transposeDieSides(die: Die, leftIndex: number, rightIndex: number): void {
  die.transposeSides(leftIndex, rightIndex);
}

export function replaceDieSide(die: Die, sideId: string, nextSide: DieSide): void {
  die.replaceSide(sideId, nextSide);
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
