import { Die } from "../dice";
import { getDieConstructById } from ".";
import { createDieFromConstruct } from "../dice-factory";
import {
  applyRecordedDieFaceOperations,
  applyRecordedFaceAdjustments,
} from "../face-adjustments";
import type { PlayerProgressionState } from "../player-progression";
import { EQUIPMENT_SLOT_ORDER } from "../player-items";
import { Bloodlust, DealDamage, Enrage, FocusUp, HealSelf, HeedlessAssault, Ironhide, Miss, ScalingStrike, SpawnDie, WildStrike, Warcry } from "../faces";

function createWarcryDie(): Die {
  return new Die({
    id: "player-die-1",
    name: "Warcry Die",
    energyCost: 2,
    tags: ["starter"],
    sides: [
      new Warcry(3),
      new Warcry(2),
      new Warcry(1),
      new Warcry(0),
      new Warcry(-1),
      new Warcry(-2),
    ],
  });
}

function createWildStrikeDie(mainhandWeaponDiceId?: string): Die {
  return new Die({
    id: "player-die-2",
    name: "Wild Strike Die",
    energyCost: 1,
    tags: ["starter"],
    sides: [
      new WildStrike(2, mainhandWeaponDiceId),
      new WildStrike(1, mainhandWeaponDiceId),
      new WildStrike(0, mainhandWeaponDiceId),
      new Miss(),
      new Miss(),
      new Miss(),
    ],
  });
}

function createIronhideDie(): Die {
  return new Die({
    id: "player-die-3",
    name: "Ironhide Die",
    energyCost: 1,
    tags: ["starter"],
    sides: [
      new Ironhide(5),
      new Ironhide(4),
      new Ironhide(3),
      new Ironhide(2),
      new Ironhide(0),
      new Ironhide(0),
    ],
  });
}

function createFocusUpDie(): Die {
  return new Die({
    id: "player-die-4",
    name: "Focus Up Die",
    energyCost: 1,
    tags: ["starter"],
    sides: [
      new FocusUp("critical-hit"),
      new FocusUp("critical-hit"),
      new FocusUp("power-up"),
      new FocusUp("power-up"),
      new FocusUp("power-down"),
      new FocusUp("critical-miss"),
    ],
  });
}

const FACET_ABILITY_DIE_FACTORIES: Partial<Record<string, (instanceId: string) => Die>> = {
  "facet-die-soldier-1": (id) => new Die({
    id, typeId: "facet-die-soldier-1", name: "Shield Bash Die", energyCost: 1,
    sides: [new DealDamage("Shield Bash", 2), new DealDamage("Shield Bash", 2), new DealDamage("Shield Bash", 2), new DealDamage("Shield Bash", 1), new DealDamage("Shield Bash", 1), new Miss()],
  }),
  "facet-die-soldier-2": (id) => new Die({
    id, typeId: "facet-die-soldier-2", name: "Iron Guard Die", energyCost: 1,
    sides: [new Ironhide(3), new Ironhide(3), new Ironhide(3), new Ironhide(2), new Ironhide(1), new Ironhide(0)],
  }),
  "facet-die-soldier-3": (id) => new Die({
    id, typeId: "facet-die-soldier-3", name: "Warcry I Die", energyCost: 2,
    sides: [new Warcry(2), new Warcry(2), new Warcry(1), new Warcry(1), new Warcry(0), new Warcry(-1)],
  }),
  "facet-die-soldier-4": (id) => new Die({
    id, typeId: "facet-die-soldier-4", name: "Shield Wall Die", energyCost: 1,
    sides: [new Ironhide(5), new Ironhide(5), new Ironhide(4), new Ironhide(4), new Ironhide(3), new Ironhide(1)],
  }),
  "facet-die-soldier-5": (id) => new Die({
    id, typeId: "facet-die-soldier-5", name: "Battle Strike Die", energyCost: 1,
    sides: [new DealDamage("Battle Strike", 3), new DealDamage("Battle Strike", 3), new DealDamage("Battle Strike", 3), new DealDamage("Battle Strike", 2), new DealDamage("Battle Strike", 1), new Miss()],
  }),
  "facet-die-soldier-6": (id) => new Die({
    id, typeId: "facet-die-soldier-6", name: "Warcry II Die", energyCost: 2,
    sides: [new Warcry(3), new Warcry(3), new Warcry(2), new Warcry(2), new Warcry(1), new Warcry(0)],
  }),
  "facet-die-soldier-7": (id) => new Die({
    id, typeId: "facet-die-soldier-7", name: "Minor Mend Die", energyCost: 1,
    sides: [new HealSelf("Minor Mend", 3), new HealSelf("Minor Mend", 2), new HealSelf("Minor Mend", 2), new HealSelf("Minor Mend", 2), new HealSelf("Minor Mend", 1), new HealSelf("Minor Mend", 1)],
  }),
  "facet-die-soldier-8": (id) => new Die({
    id, typeId: "facet-die-soldier-8", name: "Bulwark Die", energyCost: 1,
    sides: [new Ironhide(6), new Ironhide(6), new Ironhide(5), new Ironhide(5), new Ironhide(4), new Ironhide(2)],
  }),
  "facet-die-soldier-9": (id) => new Die({
    id, typeId: "facet-die-soldier-9", name: "Crushing Blow Die", energyCost: 1,
    sides: [new DealDamage("Crushing Blow", 5), new DealDamage("Crushing Blow", 5), new DealDamage("Crushing Blow", 4), new DealDamage("Crushing Blow", 4), new DealDamage("Crushing Blow", 3), new DealDamage("Crushing Blow", 2)],
  }),
  "facet-die-soldier-10": (id) => new Die({
    id, typeId: "facet-die-soldier-10", name: "Warcry III Die", energyCost: 2,
    sides: [new Warcry(4), new Warcry(4), new Warcry(3), new Warcry(3), new Warcry(2), new Warcry(1)],
  }),
  "facet-die-berserker-1": (id) => new Die({
    id, typeId: "facet-die-berserker-1", name: "Wild Strike I Die", energyCost: 1,
    sides: [new WildStrike(1), new WildStrike(1), new WildStrike(1), new WildStrike(0), new Miss(), new Miss()],
  }),
  "facet-die-berserker-2": (id) => new Die({
    id, typeId: "facet-die-berserker-2", name: "Reckless Slash Die", energyCost: 1,
    sides: [new DealDamage("Reckless Slash", 3), new DealDamage("Reckless Slash", 3), new DealDamage("Reckless Slash", 2), new DealDamage("Reckless Slash", 1), new Miss(), new Miss()],
  }),
  "facet-die-berserker-3": (id) => new Die({
    id, typeId: "facet-die-berserker-3", name: "Wild Strike II Die", energyCost: 1,
    sides: [new WildStrike(2), new WildStrike(2), new WildStrike(1), new WildStrike(1), new Miss(), new Miss()],
  }),
  "facet-die-berserker-4": (id) => new Die({
    id, typeId: "facet-die-berserker-4", name: "Arcane Burst Die", energyCost: 1,
    sides: [new DealDamage("Arcane Burst", 3), new DealDamage("Arcane Burst", 3), new DealDamage("Arcane Burst", 3), new DealDamage("Arcane Burst", 2), new DealDamage("Arcane Burst", 2), new DealDamage("Arcane Burst", 1)],
  }),
  "facet-die-berserker-5": (id) => new Die({
    id, typeId: "facet-die-berserker-5", name: "Frenzy Die", energyCost: 1,
    sides: [new DealDamage("Frenzy", 4), new DealDamage("Frenzy", 4), new DealDamage("Frenzy", 4), new DealDamage("Frenzy", 3), new DealDamage("Frenzy", 2), new Miss()],
  }),
  "facet-die-berserker-6": (id) => new Die({
    id, typeId: "facet-die-berserker-6", name: "Focus Up Die", energyCost: 1,
    sides: [new FocusUp("critical-hit"), new FocusUp("critical-hit"), new FocusUp("power-up"), new FocusUp("power-up"), new FocusUp("power-down"), new FocusUp("critical-miss")],
  }),
  "facet-die-berserker-7": (id) => new Die({
    id, typeId: "facet-die-berserker-7", name: "Wild Storm Die", energyCost: 1,
    sides: [new WildStrike(3), new WildStrike(3), new WildStrike(2), new WildStrike(2), new WildStrike(1), new Miss()],
  }),
  "facet-die-berserker-8": (id) => new Die({
    id, typeId: "facet-die-berserker-8", name: "Scaling Strike Die", energyCost: 1,
    sides: [new ScalingStrike(1, 5, 1), new ScalingStrike(1, 5, 1), new ScalingStrike(1, 5, 1), new ScalingStrike(1, 5, 1), new Miss(), new Miss()],
  }),
  "facet-die-berserker-9": (id) => new Die({
    id, typeId: "facet-die-berserker-9", name: "Rampage Die", energyCost: 1,
    sides: [new DealDamage("Rampage", 5), new DealDamage("Rampage", 5), new DealDamage("Rampage", 5), new DealDamage("Rampage", 4), new DealDamage("Rampage", 3), new DealDamage("Rampage", 2)],
  }),
  "facet-die-berserker-10": (id) => new Die({
    id, typeId: "facet-die-berserker-10", name: "Enrage Die", energyCost: 1,
    sides: [new Miss(), new Miss(), new Enrage(1), new Enrage(1), new Enrage(2), new Enrage(3)],
  }),
  "facet-die-berserker-11": (id) => new Die({
    id, typeId: "facet-die-berserker-11", name: "Heedless Assault Die", energyCost: 1,
    sides: [new Miss(), new Miss(), new Miss(), new HeedlessAssault(1), new HeedlessAssault(2), new HeedlessAssault(3)],
  }),
  "facet-die-berserker-12": (id) => new Die({
    id, typeId: "facet-die-berserker-12", name: "Battle Cry Die", energyCost: 1,
    sides: [
      new SpawnDie("spark-die", "Spark Die"),
      new SpawnDie("spark-die", "Spark Die"),
      new SpawnDie("spark-die", "Spark Die"),
      new SpawnDie("spark-die", "Spark Die"),
      new SpawnDie("spark-die", "Spark Die"),
      new SpawnDie("spark-die", "Spark Die"),
    ],
  }),
  "facet-die-berserker-13": (id) => new Die({
    id, typeId: "facet-die-berserker-13", name: "Bloodlust Die", energyCost: 1,
    sides: [
      new Warcry(-1),
      new Warcry(-1),
      new Bloodlust("rage-die"),
      new Bloodlust("rage-die"),
      new Bloodlust("rage-die"),
      new Bloodlust("killing-machine-die"),
    ],
  }),
};

function createFacetAbilityDice(progression: PlayerProgressionState): Die[] {
  return progression.unlockedFacetDieIds.flatMap((typeId, index) => {
    const factory = FACET_ABILITY_DIE_FACTORIES[typeId];
    if (!factory) return [];
    const die = factory(`facet-instance-${index}`);
    die.tags.push("facet");
    return [die];
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
        extraTags: ["weapon"],
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
