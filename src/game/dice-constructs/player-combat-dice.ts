import { Die } from "../dice";
import { getDieConstructById } from ".";
import { createDieFromConstruct } from "../dice-factory";
import {
  applyRecordedDieFaceOperations,
  applyRecordedFaceAdjustments,
} from "../face-adjustments";
import type { PlayerProgressionState } from "../player-progression";
import { EQUIPMENT_SLOT_ORDER } from "../player-items";
import { DealDamage, Enrage, FocusUp, HealSelf, HeedlessAssault, Ironhide, Miss, ScalingStrike, SpawnDie, WildStrike, Warcry } from "../faces";

function createWarcryDie(): Die {
  return new Die({
    id: "player-die-1",
    name: "Warcry Die",
    energyCost: 2,
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
    energyCost: 1,
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
    energyCost: 1,
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

function createFocusUpDie(): Die {
  return new Die({
    id: "player-die-4",
    name: "Focus Up Die",
    energyCost: 1,
    sides: [
      new FocusUp("player-die-4-side-1", "critical-hit"),
      new FocusUp("player-die-4-side-2", "critical-hit"),
      new FocusUp("player-die-4-side-3", "power-up"),
      new FocusUp("player-die-4-side-4", "power-up"),
      new FocusUp("player-die-4-side-5", "power-down"),
      new FocusUp("player-die-4-side-6", "critical-miss"),
    ],
  });
}

const FACET_ABILITY_DIE_FACTORIES: Partial<Record<string, (instanceId: string) => Die>> = {
  "facet-die-soldier-1": (id) => new Die({
    id, typeId: "facet-die-soldier-1", name: "Shield Bash Die", energyCost: 1,
    sides: [new DealDamage("fds1-s1", "Shield Bash", 2), new DealDamage("fds1-s2", "Shield Bash", 2), new DealDamage("fds1-s3", "Shield Bash", 2), new DealDamage("fds1-s4", "Shield Bash", 1), new DealDamage("fds1-s5", "Shield Bash", 1), new Miss("fds1-s6")],
  }),
  "facet-die-soldier-2": (id) => new Die({
    id, typeId: "facet-die-soldier-2", name: "Iron Guard Die", energyCost: 1,
    sides: [new Ironhide("fds2-s1", 3), new Ironhide("fds2-s2", 3), new Ironhide("fds2-s3", 3), new Ironhide("fds2-s4", 2), new Ironhide("fds2-s5", 1), new Ironhide("fds2-s6", 0)],
  }),
  "facet-die-soldier-3": (id) => new Die({
    id, typeId: "facet-die-soldier-3", name: "Warcry I Die", energyCost: 2,
    sides: [new Warcry("fds3-s1", 2), new Warcry("fds3-s2", 2), new Warcry("fds3-s3", 1), new Warcry("fds3-s4", 1), new Warcry("fds3-s5", 0), new Warcry("fds3-s6", -1)],
  }),
  "facet-die-soldier-4": (id) => new Die({
    id, typeId: "facet-die-soldier-4", name: "Shield Wall Die", energyCost: 1,
    sides: [new Ironhide("fds4-s1", 5), new Ironhide("fds4-s2", 5), new Ironhide("fds4-s3", 4), new Ironhide("fds4-s4", 4), new Ironhide("fds4-s5", 3), new Ironhide("fds4-s6", 1)],
  }),
  "facet-die-soldier-5": (id) => new Die({
    id, typeId: "facet-die-soldier-5", name: "Battle Strike Die", energyCost: 1,
    sides: [new DealDamage("fds5-s1", "Battle Strike", 3), new DealDamage("fds5-s2", "Battle Strike", 3), new DealDamage("fds5-s3", "Battle Strike", 3), new DealDamage("fds5-s4", "Battle Strike", 2), new DealDamage("fds5-s5", "Battle Strike", 1), new Miss("fds5-s6")],
  }),
  "facet-die-soldier-6": (id) => new Die({
    id, typeId: "facet-die-soldier-6", name: "Warcry II Die", energyCost: 2,
    sides: [new Warcry("fds6-s1", 3), new Warcry("fds6-s2", 3), new Warcry("fds6-s3", 2), new Warcry("fds6-s4", 2), new Warcry("fds6-s5", 1), new Warcry("fds6-s6", 0)],
  }),
  "facet-die-soldier-7": (id) => new Die({
    id, typeId: "facet-die-soldier-7", name: "Minor Mend Die", energyCost: 1,
    sides: [new HealSelf("fds7-s1", "Minor Mend", 3), new HealSelf("fds7-s2", "Minor Mend", 2), new HealSelf("fds7-s3", "Minor Mend", 2), new HealSelf("fds7-s4", "Minor Mend", 2), new HealSelf("fds7-s5", "Minor Mend", 1), new HealSelf("fds7-s6", "Minor Mend", 1)],
  }),
  "facet-die-soldier-8": (id) => new Die({
    id, typeId: "facet-die-soldier-8", name: "Bulwark Die", energyCost: 1,
    sides: [new Ironhide("fds8-s1", 6), new Ironhide("fds8-s2", 6), new Ironhide("fds8-s3", 5), new Ironhide("fds8-s4", 5), new Ironhide("fds8-s5", 4), new Ironhide("fds8-s6", 2)],
  }),
  "facet-die-soldier-9": (id) => new Die({
    id, typeId: "facet-die-soldier-9", name: "Crushing Blow Die", energyCost: 1,
    sides: [new DealDamage("fds9-s1", "Crushing Blow", 5), new DealDamage("fds9-s2", "Crushing Blow", 5), new DealDamage("fds9-s3", "Crushing Blow", 4), new DealDamage("fds9-s4", "Crushing Blow", 4), new DealDamage("fds9-s5", "Crushing Blow", 3), new DealDamage("fds9-s6", "Crushing Blow", 2)],
  }),
  "facet-die-soldier-10": (id) => new Die({
    id, typeId: "facet-die-soldier-10", name: "Warcry III Die", energyCost: 2,
    sides: [new Warcry("fds10-s1", 4), new Warcry("fds10-s2", 4), new Warcry("fds10-s3", 3), new Warcry("fds10-s4", 3), new Warcry("fds10-s5", 2), new Warcry("fds10-s6", 1)],
  }),
  "facet-die-berserker-1": (id) => new Die({
    id, typeId: "facet-die-berserker-1", name: "Wild Strike I Die", energyCost: 1,
    sides: [new WildStrike("fdb1-s1", 1), new WildStrike("fdb1-s2", 1), new WildStrike("fdb1-s3", 1), new WildStrike("fdb1-s4", 0), new Miss("fdb1-s5"), new Miss("fdb1-s6")],
  }),
  "facet-die-berserker-2": (id) => new Die({
    id, typeId: "facet-die-berserker-2", name: "Reckless Slash Die", energyCost: 1,
    sides: [new DealDamage("fdb2-s1", "Reckless Slash", 3), new DealDamage("fdb2-s2", "Reckless Slash", 3), new DealDamage("fdb2-s3", "Reckless Slash", 2), new DealDamage("fdb2-s4", "Reckless Slash", 1), new Miss("fdb2-s5"), new Miss("fdb2-s6")],
  }),
  "facet-die-berserker-3": (id) => new Die({
    id, typeId: "facet-die-berserker-3", name: "Wild Strike II Die", energyCost: 1,
    sides: [new WildStrike("fdb3-s1", 2), new WildStrike("fdb3-s2", 2), new WildStrike("fdb3-s3", 1), new WildStrike("fdb3-s4", 1), new Miss("fdb3-s5"), new Miss("fdb3-s6")],
  }),
  "facet-die-berserker-4": (id) => new Die({
    id, typeId: "facet-die-berserker-4", name: "Arcane Burst Die", energyCost: 1,
    sides: [new DealDamage("fdb4-s1", "Arcane Burst", 3), new DealDamage("fdb4-s2", "Arcane Burst", 3), new DealDamage("fdb4-s3", "Arcane Burst", 3), new DealDamage("fdb4-s4", "Arcane Burst", 2), new DealDamage("fdb4-s5", "Arcane Burst", 2), new DealDamage("fdb4-s6", "Arcane Burst", 1)],
  }),
  "facet-die-berserker-5": (id) => new Die({
    id, typeId: "facet-die-berserker-5", name: "Frenzy Die", energyCost: 1,
    sides: [new DealDamage("fdb5-s1", "Frenzy", 4), new DealDamage("fdb5-s2", "Frenzy", 4), new DealDamage("fdb5-s3", "Frenzy", 4), new DealDamage("fdb5-s4", "Frenzy", 3), new DealDamage("fdb5-s5", "Frenzy", 2), new Miss("fdb5-s6")],
  }),
  "facet-die-berserker-6": (id) => new Die({
    id, typeId: "facet-die-berserker-6", name: "Focus Up Die", energyCost: 1,
    sides: [new FocusUp("fdb6-s1", "critical-hit"), new FocusUp("fdb6-s2", "critical-hit"), new FocusUp("fdb6-s3", "power-up"), new FocusUp("fdb6-s4", "power-up"), new FocusUp("fdb6-s5", "power-down"), new FocusUp("fdb6-s6", "critical-miss")],
  }),
  "facet-die-berserker-7": (id) => new Die({
    id, typeId: "facet-die-berserker-7", name: "Wild Storm Die", energyCost: 1,
    sides: [new WildStrike("fdb7-s1", 3), new WildStrike("fdb7-s2", 3), new WildStrike("fdb7-s3", 2), new WildStrike("fdb7-s4", 2), new WildStrike("fdb7-s5", 1), new Miss("fdb7-s6")],
  }),
  "facet-die-berserker-8": (id) => new Die({
    id, typeId: "facet-die-berserker-8", name: "Scaling Strike Die", energyCost: 1,
    sides: [new ScalingStrike("fdb8-s1", 1, 5, 1), new ScalingStrike("fdb8-s2", 1, 5, 1), new ScalingStrike("fdb8-s3", 1, 5, 1), new ScalingStrike("fdb8-s4", 1, 5, 1), new Miss("fdb8-s5"), new Miss("fdb8-s6")],
  }),
  "facet-die-berserker-9": (id) => new Die({
    id, typeId: "facet-die-berserker-9", name: "Rampage Die", energyCost: 1,
    sides: [new DealDamage("fdb9-s1", "Rampage", 5), new DealDamage("fdb9-s2", "Rampage", 5), new DealDamage("fdb9-s3", "Rampage", 5), new DealDamage("fdb9-s4", "Rampage", 4), new DealDamage("fdb9-s5", "Rampage", 3), new DealDamage("fdb9-s6", "Rampage", 2)],
  }),
  "facet-die-berserker-10": (id) => new Die({
    id, typeId: "facet-die-berserker-10", name: "Enrage Die", energyCost: 1,
    sides: [new Miss("fdb10-s1"), new Miss("fdb10-s2"), new Enrage("fdb10-s3", 1), new Enrage("fdb10-s4", 1), new Enrage("fdb10-s5", 2), new Enrage("fdb10-s6", 3)],
  }),
  "facet-die-berserker-11": (id) => new Die({
    id, typeId: "facet-die-berserker-11", name: "Heedless Assault Die", energyCost: 1,
    sides: [new Miss("fdb11-s1"), new Miss("fdb11-s2"), new Miss("fdb11-s3"), new HeedlessAssault("fdb11-s4", 1), new HeedlessAssault("fdb11-s5", 2), new HeedlessAssault("fdb11-s6", 3)],
  }),
  "facet-die-berserker-12": (id) => new Die({
    id, typeId: "facet-die-berserker-12", name: "Battle Cry Die", energyCost: 1,
    sides: [
      new SpawnDie("fdb12-s1", "spark-die", "Spark Die"),
      new SpawnDie("fdb12-s2", "spark-die", "Spark Die"),
      new SpawnDie("fdb12-s3", "spark-die", "Spark Die"),
      new SpawnDie("fdb12-s4", "spark-die", "Spark Die"),
      new SpawnDie("fdb12-s5", "spark-die", "Spark Die"),
      new SpawnDie("fdb12-s6", "spark-die", "Spark Die"),
    ],
  }),
};

function createFacetAbilityDice(progression: PlayerProgressionState): Die[] {
  return progression.unlockedFacetDieIds.flatMap((typeId, index) => {
    const factory = FACET_ABILITY_DIE_FACTORIES[typeId];
    return factory ? [factory(`facet-instance-${index}`)] : [];
  });
}

export function createWarriorStarterCombatDice(progression?: PlayerProgressionState): Die[] {
  const mainhandWeaponDiceId = progression?.items.equipped["weapon-1"]?.diceId;

  return [
    createWarcryDie(),
    createWildStrikeDie(mainhandWeaponDiceId),
    createIronhideDie(),
    createFocusUpDie(),
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
    ...(progression ? createFacetAbilityDice(progression) : []),
  ];

  if (progression) {
    if (progression.dieFaceOperations.length > 0) {
      applyRecordedDieFaceOperations(dice, progression.dieFaceOperations);
    } else {
      applyRecordedFaceAdjustments(dice, progression.faceAdjustments);
    }
  }

  return dice;
}
