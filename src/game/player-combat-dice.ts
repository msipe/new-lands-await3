import { Die } from "./dice";
import { getDieConstructById } from "./dice-constructs";
import { createDieFromConstruct } from "./dice-factory";
import { applyRecordedFaceAdjustments } from "./face-adjustments";
import type { PlayerProgressionState } from "./player-progression";
import { EQUIPMENT_SLOT_ORDER } from "./player-items";
import { Ironhide, Miss, WildStrike, Warcry } from "./faces";

function createWarcryDie(): Die {
  return new Die({
    id: "player-die-1",
    name: "Warcry Die",
    sides: [
      new Warcry("player-die-1-side-1", 3),
      new Warcry("player-die-1-side-2", 2),
      new Warcry("player-die-1-side-3", 1),
      new Warcry("player-die-1-side-4", 0),
      new Warcry("player-die-1-side-5", -1),
      new Warcry("player-die-1-side-6", -2),
    ],
  });
}

function createWildStrikeDie(mainhandWeaponDiceId?: string): Die {
  return new Die({
    id: "player-die-2",
    name: "Wild Strike Die",
    sides: [
      new WildStrike("player-die-2-side-1", 2, mainhandWeaponDiceId),
      new WildStrike("player-die-2-side-2", 1, mainhandWeaponDiceId),
      new WildStrike("player-die-2-side-3", 0, mainhandWeaponDiceId),
      new Miss("player-die-2-side-4"),
      new Miss("player-die-2-side-5"),
      new Miss("player-die-2-side-6"),
    ],
  });
}

function createIronhideDie(): Die {
  return new Die({
    id: "player-die-3",
    name: "Ironhide Die",
    sides: [
      new Ironhide("player-die-3-side-1", 5),
      new Ironhide("player-die-3-side-2", 4),
      new Ironhide("player-die-3-side-3", 3),
      new Ironhide("player-die-3-side-4", 2),
      new Ironhide("player-die-3-side-5", 0),
      new Ironhide("player-die-3-side-6", 0),
    ],
  });
}

export function createWarriorStarterCombatDice(progression?: PlayerProgressionState): Die[] {
  const mainhandWeaponDiceId = progression?.items.equipped["weapon-1"]?.diceId;

  return [
    createWarcryDie(),
    createWildStrikeDie(mainhandWeaponDiceId),
    createIronhideDie(),
  ];
}

export function createEquippedItemCombatDice(progression?: PlayerProgressionState): Die[] {
  if (!progression) {
    return [];
  }

  const equipmentDice: Die[] = [];
  let equipmentIndex = 1;

  for (const slotId of EQUIPMENT_SLOT_ORDER) {
    const equippedItem = progression.items.equipped[slotId];
    const diceId = equippedItem?.diceId;
    if (!diceId) {
      continue;
    }

    const construct = getDieConstructById(diceId);
    equipmentDice.push(
      createDieFromConstruct({
        construct,
        dieId: `equipped-${slotId}-${equipmentIndex}`,
      }),
    );
    equipmentIndex += 1;
  }

  return equipmentDice;
}

export function createPlayerCombatDiceLoadout(progression?: PlayerProgressionState): Die[] {
  const dice = [
    ...createWarriorStarterCombatDice(progression),
    ...createEquippedItemCombatDice(progression),
  ];

  if (progression) {
    applyRecordedFaceAdjustments(dice, progression.faceAdjustments);
  }

  return dice;
}
