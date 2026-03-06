import {
  createInitialInventoryState,
  type EquipmentSlotId,
  type PlayerInventoryState,
} from "./player-items";
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
  battlesWon: number;
  maxHp: number;
  diceSlots: number;
  items: PlayerInventoryState;
};

export type LevelUpResult = {
  gainedXp: number;
  levelsGained: number;
  didLevelUp: boolean;
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
    battlesWon: 0,
    maxHp: 20,
    diceSlots: 3,
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
  return grantPlayerXp(state, calculateCombatXpReward(enemyLevel));
}
