import {
  createInitialInventoryState,
  type EquipmentSlotId,
  type PlayerInventoryState,
} from "./player-items";
import type { FaceAdjustmentEntry } from "./face-adjustments";
import { getItemById } from "../planning/content-registry";

export type PlayerProgressionState = {
  classId: "class:warrior";
  className: string;
  raceId: "race:human";
  raceName: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  gold: number;
  faceAdjustments: FaceAdjustmentEntry[];
  battlesWon: number;
  maxHp: number;
  diceSlots: number;
  unspentTalentPoints: number;
  talents: TalentNode[];
  items: PlayerInventoryState;
};

export type TalentNode = {
  id: string;
  name: string;
  description: string;
  rank: number;
  maxRank: number;
};

export type LevelUpResult = {
  gainedXp: number;
  levelsGained: number;
  didLevelUp: boolean;
};

export type GoldChangeResult = {
  changed: boolean;
  amount: number;
  nextGold: number;
};

const BASE_XP_TO_LEVEL = 40;
const XP_STEP_PER_LEVEL = 15;

export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return BASE_XP_TO_LEVEL + (safeLevel - 1) * XP_STEP_PER_LEVEL;
}

export function createPlayerProgression(): PlayerProgressionState {
  const items = createInitialInventoryState();

  const starterItemIds = ["item:rusty-sword", "item:wooden-shield", "item:patched-armor"];
  for (const itemId of starterItemIds) {
    const starterItem = getItemById(itemId);
    if (starterItem.slot === "inventory") {
      items.inventory.push({ ...starterItem });
      continue;
    }

    items.equipped[starterItem.slot as EquipmentSlotId] = { ...starterItem };
  }

  return {
    classId: "class:warrior",
    className: "Warrior",
    raceId: "race:human",
    raceName: "Human",
    level: 1,
    xp: 0,
    xpToNextLevel: getXpRequiredForLevel(1),
    totalXp: 0,
    gold: 1000,
    faceAdjustments: [],
    battlesWon: 0,
    maxHp: 20,
    diceSlots: 3,
    unspentTalentPoints: 0,
    talents: [
      {
        id: "talent:unyielding-core",
        name: "Unyielding Core",
        description: "Stub: Future defensive scaling talent.",
        rank: 0,
        maxRank: 3,
      },
      {
        id: "talent:blade-discipline",
        name: "Blade Discipline",
        description: "Stub: Future weapon consistency talent.",
        rank: 0,
        maxRank: 3,
      },
      {
        id: "talent:battle-trance",
        name: "Battle Trance",
        description: "Stub: Future momentum talent.",
        rank: 0,
        maxRank: 2,
      },
    ],
    items,
  };
}

export function setPlayerIdentity(
  state: PlayerProgressionState,
  classId: "class:warrior",
  raceId: "race:human",
): void {
  state.classId = classId;
  state.raceId = raceId;
  state.className = "Warrior";
  state.raceName = "Human";
}

export function calculateCombatXpReward(enemyLevel: number): number {
  const safeEnemyLevel = Math.max(1, Math.floor(enemyLevel));
  return 10 + safeEnemyLevel * 6;
}

export function calculateCombatGoldReward(enemyLevel: number): number {
  const safeEnemyLevel = Math.max(1, Math.floor(enemyLevel));
  return 20 + safeEnemyLevel * 8;
}

export function grantPlayerGold(state: PlayerProgressionState, amount: number): GoldChangeResult {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) {
    return {
      changed: false,
      amount: 0,
      nextGold: state.gold,
    };
  }

  state.gold += safeAmount;
  return {
    changed: true,
    amount: safeAmount,
    nextGold: state.gold,
  };
}

export function spendPlayerGold(state: PlayerProgressionState, amount: number): GoldChangeResult {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0 || state.gold < safeAmount) {
    return {
      changed: false,
      amount: 0,
      nextGold: state.gold,
    };
  }

  state.gold -= safeAmount;
  return {
    changed: true,
    amount: safeAmount,
    nextGold: state.gold,
  };
}

export function recordFaceAdjustment(
  state: PlayerProgressionState,
  entry: FaceAdjustmentEntry,
): void {
  state.faceAdjustments.push({
    ...entry,
    operation: { ...entry.operation },
  });
}

export function grantPlayerXp(state: PlayerProgressionState, amount: number): LevelUpResult {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) {
    return {
      gainedXp: 0,
      levelsGained: 0,
      didLevelUp: false,
    };
  }

  state.totalXp += safeAmount;
  state.xp += safeAmount;

  let levelsGained = 0;
  while (state.xp >= state.xpToNextLevel) {
    state.xp -= state.xpToNextLevel;
    state.level += 1;
    state.maxHp += 2;
    state.unspentTalentPoints += 1;
    levelsGained += 1;
    state.xpToNextLevel = getXpRequiredForLevel(state.level);
  }

  return {
    gainedXp: safeAmount,
    levelsGained,
    didLevelUp: levelsGained > 0,
  };
}

export function recordCombatVictory(
  state: PlayerProgressionState,
  enemyLevel: number,
): LevelUpResult {
  state.battlesWon += 1;

  // Temporary testing mode: each combat victory guarantees one level-up.
  const guaranteedLevelUpXp = Math.max(1, state.xpToNextLevel - state.xp);
  return grantPlayerXp(state, guaranteedLevelUpXp);
}
