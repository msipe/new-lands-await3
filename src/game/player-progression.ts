import {
  createInitialInventoryState,
  type EquipmentSlotId,
  type PlayerInventoryState,
} from "./player-items";
import type {
  DieFaceOperation,
  FaceAdjustmentEntry,
  AppendFaceCopyEntry,
  RemoveFaceEntry,
} from "./face-adjustments";
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
  dieFaceOperations: DieFaceOperation[];
  nextGeneratedFaceId: number;
  battlesWon: number;
  maxHp: number;
  diceSlots: number;
  unspentFacetPoints: number;
  facets: FacetTree[];
  unlockedFacetDieIds: string[];
  items: PlayerInventoryState;
};

export type FacetAbility = {
  id: string;
  dieId: string;
  name: string;
  description: string;
  unlocked: boolean;
};

export type FacetTier = {
  level: number;
  name: string;
  description: string;
  abilities: FacetAbility[];
};

export type FacetTree = {
  id: string;
  name: string;
  description: string;
  pointsInvested: number;
  tiers: FacetTier[];
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
    dieFaceOperations: [],
    nextGeneratedFaceId: 1,
    battlesWon: 0,
    maxHp: 20,
    diceSlots: 3,
    unspentFacetPoints: 0,
    unlockedFacetDieIds: [],
    facets: [
      {
        id: "facet:soldier",
        name: "Soldier",
        description: "A disciplined warrior who endures punishment and commands the battlefield.",
        pointsInvested: 0,
        tiers: [
          { level: 1,  name: "", description: "", abilities: [{ id: "facet:soldier:1",  dieId: "facet-die-soldier-1",  name: "Shield Bash",    description: "Deal 2 damage to opponent.",             unlocked: false }] },
          { level: 2,  name: "", description: "", abilities: [{ id: "facet:soldier:2",  dieId: "facet-die-soldier-2",  name: "Iron Guard",     description: "Gain 3 armor.",                          unlocked: false }] },
          { level: 3,  name: "", description: "", abilities: [{ id: "facet:soldier:3",  dieId: "facet-die-soldier-3",  name: "Warcry I",       description: "Attacks deal +1 damage this turn.",       unlocked: false }] },
          { level: 4,  name: "", description: "", abilities: [{ id: "facet:soldier:4",  dieId: "facet-die-soldier-4",  name: "Shield Wall",    description: "Gain 5 armor.",                          unlocked: false }] },
          { level: 5,  name: "", description: "", abilities: [{ id: "facet:soldier:5",  dieId: "facet-die-soldier-5",  name: "Battle Strike",  description: "Deal 3 damage to opponent.",             unlocked: false }] },
          { level: 6,  name: "", description: "", abilities: [{ id: "facet:soldier:6",  dieId: "facet-die-soldier-6",  name: "Warcry II",      description: "Attacks deal +2 damage this turn.",       unlocked: false }] },
          { level: 7,  name: "", description: "", abilities: [{ id: "facet:soldier:7",  dieId: "facet-die-soldier-7",  name: "Minor Mend",     description: "Heal 2 HP.",                             unlocked: false }] },
          { level: 8,  name: "", description: "", abilities: [{ id: "facet:soldier:8",  dieId: "facet-die-soldier-8",  name: "Bulwark",        description: "Gain 6 armor.",                          unlocked: false }] },
          { level: 9,  name: "", description: "", abilities: [{ id: "facet:soldier:9",  dieId: "facet-die-soldier-9",  name: "Crushing Blow",  description: "Deal 5 damage to opponent.",             unlocked: false }] },
          { level: 10, name: "", description: "", abilities: [{ id: "facet:soldier:10", dieId: "facet-die-soldier-10", name: "Warcry III",     description: "Attacks deal +3 damage this turn.",       unlocked: false }] },
        ],
      },
      {
        id: "facet:berserker",
        name: "Berserker",
        description: "A reckless aggressor who overwhelms enemies with raw force and unpredictability.",
        pointsInvested: 0,
        tiers: [
          { level: 1,  name: "", description: "", abilities: [{ id: "facet:berserker:1",  dieId: "facet-die-berserker-1",  name: "Wild Strike I",    description: "Trigger an extra weapon attack.",                        unlocked: false }, { id: "facet:berserker:10", dieId: "facet-die-berserker-10", name: "Enrage", description: "Piss yourself off. Gain Rage Dice to boost attacks.", unlocked: false }] },
          { level: 2,  name: "", description: "", abilities: [{ id: "facet:berserker:2",  dieId: "facet-die-berserker-2",  name: "Reckless Slash",   description: "Deal 3 damage — risky but powerful.",                    unlocked: false }] },
          { level: 3,  name: "", description: "", abilities: [{ id: "facet:berserker:3",  dieId: "facet-die-berserker-3",  name: "Wild Strike II",   description: "Trigger extra weapon attack with +2 bonus.",             unlocked: false }] },
          { level: 4,  name: "", description: "", abilities: [{ id: "facet:berserker:4",  dieId: "facet-die-berserker-4",  name: "Arcane Burst",     description: "Deal 3 magic damage to opponent.",                       unlocked: false }] },
          { level: 5,  name: "", description: "", abilities: [{ id: "facet:berserker:5",  dieId: "facet-die-berserker-5",  name: "Frenzy",           description: "Deal 4 damage to opponent.",                             unlocked: false }] },
          { level: 6,  name: "", description: "", abilities: [{ id: "facet:berserker:6",  dieId: "facet-die-berserker-6",  name: "Focus Up",         description: "Manipulate the outcome of your next roll.",               unlocked: false }] },
          { level: 7,  name: "", description: "", abilities: [{ id: "facet:berserker:7",  dieId: "facet-die-berserker-7",  name: "Wild Storm",       description: "Trigger extra weapon attack with +3 bonus.",             unlocked: false }] },
          { level: 8,  name: "", description: "", abilities: [{ id: "facet:berserker:8",  dieId: "facet-die-berserker-8",  name: "Scaling Strike",   description: "Deal damage that grows every 5 rolls.",                  unlocked: false }] },
          { level: 9,  name: "", description: "", abilities: [{ id: "facet:berserker:9",  dieId: "facet-die-berserker-9",  name: "Rampage",          description: "Deal 5 damage to opponent.",                             unlocked: false }] },
          { level: 10, name: "", description: "", abilities: [{ id: "facet:berserker:11", dieId: "facet-die-berserker-11", name: "Heedless Assault", description: "Lose all armor, attack with both weapons for bonus dmg.", unlocked: false }] },
          { level: 11, name: "", description: "", abilities: [{ id: "facet:berserker:12", dieId: "facet-die-berserker-12", name: "Battle Cry",       description: "Spawn a Spark Die into your pool for this round.",     unlocked: false }] },
        ],
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
  const clonedEntry = {
    ...entry,
    operation: { ...entry.operation },
  };

  state.faceAdjustments.push(clonedEntry);
  state.dieFaceOperations.push({
    kind: "adjust",
    entry: clonedEntry,
  });
}

export function buildGeneratedFaceId(state: PlayerProgressionState, dieId: string): string {
  const generatedId = `${dieId}-extra-side-${state.nextGeneratedFaceId}`;
  state.nextGeneratedFaceId += 1;
  return generatedId;
}

export function recordAppendFaceCopy(
  state: PlayerProgressionState,
  entry: AppendFaceCopyEntry,
): void {
  state.dieFaceOperations.push({
    kind: "append-copy",
    entry: { ...entry },
  });
}

export function recordRemoveFace(
  state: PlayerProgressionState,
  entry: RemoveFaceEntry,
): void {
  state.dieFaceOperations.push({
    kind: "remove",
    entry: { ...entry },
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
    state.unspentFacetPoints += 1;
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

export function canInvestInFacet(state: PlayerProgressionState, facetId: string): boolean {
  if (state.unspentFacetPoints <= 0) {
    return false;
  }

  const facet = state.facets.find((f) => f.id === facetId);
  if (!facet) {
    return false;
  }

  return facet.pointsInvested < facet.tiers.length;
}

export function investInFacet(state: PlayerProgressionState, facetId: string): boolean {
  if (!canInvestInFacet(state, facetId)) {
    return false;
  }

  const facet = state.facets.find((f) => f.id === facetId)!;
  const nextTier = facet.tiers[facet.pointsInvested];
  if (!nextTier) {
    return false;
  }

  for (const ability of nextTier.abilities) {
    ability.unlocked = true;
    state.unlockedFacetDieIds.push(ability.dieId);
  }
  facet.pointsInvested += 1;
  state.unspentFacetPoints = Math.max(0, state.unspentFacetPoints - 1);
  return true;
}
