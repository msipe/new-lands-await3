import {
  calculateCombatGoldReward,
  calculateCombatXpReward,
  canInvestInFacet,
  createPlayerProgression,
  grantPlayerGold,
  getXpRequiredForLevel,
  grantPlayerXp,
  investInFacet,
  recordCombatVictory,
  recordFaceAdjustment,
  setPlayerIdentity,
  spendPlayerGold,
} from "../../src/game/player-progression";
import { createPlayerCombatDiceLoadout } from "../../src/game/dice-constructs/player-combat-dice";
import { FaceAdjustmentModalityType } from "../../src/game/faces";
import { EQUIPMENT_SLOT_ORDER } from "../../src/game/player-items";

describe("player progression", () => {
  it("starts at level 1 with zero xp", () => {
    const progression = createPlayerProgression();

    expect(progression.level).toBe(1);
    expect(progression.classId).toBe("class:warrior");
    expect(progression.raceId).toBe("race:human");
    expect(progression.className).toBe("Warrior");
    expect(progression.raceName).toBe("Human");
    expect(progression.xp).toBe(0);
    expect(progression.totalXp).toBe(0);
    expect(progression.gold).toBe(1000);
    expect(progression.xpToNextLevel).toBe(getXpRequiredForLevel(1));
    expect(progression.battlesWon).toBe(0);
    expect(progression.unspentFacetPoints).toBe(0);
    expect(progression.facets.length).toBeGreaterThan(0);
  });

  it("awards xp without leveling until threshold", () => {
    const progression = createPlayerProgression();
    const result = grantPlayerXp(progression, 15);

    expect(result.didLevelUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(progression.level).toBe(1);
    expect(progression.xp).toBe(15);
    expect(progression.totalXp).toBe(15);
  });

  it("supports multi-level gains from one large reward", () => {
    const progression = createPlayerProgression();
    const result = grantPlayerXp(progression, 120);

    expect(result.didLevelUp).toBe(true);
    expect(result.levelsGained).toBe(2);
    expect(progression.level).toBe(3);
    expect(progression.xp).toBe(25);
    expect(progression.xpToNextLevel).toBe(getXpRequiredForLevel(3));
    expect(progression.maxHp).toBe(24);
    expect(progression.unspentFacetPoints).toBe(2);
  });

  it("records combat victories and temporarily guarantees one level per win", () => {
    const progression = createPlayerProgression();
    const expectedReward = progression.xpToNextLevel;
    const result = recordCombatVictory(progression, 4);

    expect(result.gainedXp).toBe(expectedReward);
    expect(result.levelsGained).toBe(1);
    expect(result.didLevelUp).toBe(true);
    expect(progression.level).toBe(2);
    expect(progression.xp).toBe(0);
    expect(progression.battlesWon).toBe(1);
    expect(progression.totalXp).toBe(expectedReward);
    expect(progression.unspentFacetPoints).toBe(1);
  });

  it("still exposes the base level-scaled reward helper", () => {
    expect(calculateCombatXpReward(4)).toBe(34);
    expect(calculateCombatGoldReward(4)).toBe(52);
  });

  it("grants and spends gold while enforcing affordability", () => {
    const progression = createPlayerProgression();

    const grantResult = grantPlayerGold(progression, 35);
    expect(grantResult.changed).toBe(true);
    expect(grantResult.amount).toBe(35);
    expect(progression.gold).toBe(1035);

    const spendResult = spendPlayerGold(progression, 20);
    expect(spendResult.changed).toBe(true);
    expect(spendResult.amount).toBe(20);
    expect(progression.gold).toBe(1015);

    const denied = spendPlayerGold(progression, 5000);
    expect(denied.changed).toBe(false);
    expect(progression.gold).toBe(1015);
  });

  it("persists chosen identity for character sheet", () => {
    const progression = createPlayerProgression();
    setPlayerIdentity(progression, "class:warrior", "race:human");

    expect(progression.className).toBe("Warrior");
    expect(progression.raceName).toBe("Human");
  });

  it("creates equipped and inventory buckets", () => {
    const progression = createPlayerProgression();

    expect(progression.items.inventory).toHaveLength(0);
    expect(Object.keys(progression.items.equipped)).toHaveLength(EQUIPMENT_SLOT_ORDER.length);
    expect(progression.items.equipped["weapon-1"]?.id).toBe("item:rusty-sword");
    expect(progression.items.equipped["weapon-2"]?.id).toBe("item:wooden-shield");
    expect(progression.items.equipped.armor?.id).toBe("item:patched-armor");

    for (const slotId of EQUIPMENT_SLOT_ORDER) {
      if (slotId === "weapon-1" || slotId === "weapon-2" || slotId === "armor") {
        continue;
      }

      expect(progression.items.equipped[slotId]).toBeUndefined();
    }
  });

  describe("facet investment", () => {
    it("starts with no unlocked facet die IDs", () => {
      const progression = createPlayerProgression();
      expect(progression.unlockedFacetDieIds).toHaveLength(0);
    });

    it("canInvestInFacet returns false when no points available", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 0;
      expect(canInvestInFacet(progression, "facet:soldier")).toBe(false);
    });

    it("canInvestInFacet returns false for unknown facet id", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 1;
      expect(canInvestInFacet(progression, "facet:nonexistent")).toBe(false);
    });

    it("canInvestInFacet returns true when points available and facet not full", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 1;
      expect(canInvestInFacet(progression, "facet:soldier")).toBe(true);
      expect(canInvestInFacet(progression, "facet:berserker")).toBe(true);
    });

    it("investInFacet returns false and changes nothing when no points available", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 0;
      const result = investInFacet(progression, "facet:soldier");
      expect(result).toBe(false);
      expect(progression.unlockedFacetDieIds).toHaveLength(0);
    });

    it("investInFacet unlocks the first ability and adds its die id to the pool", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 1;

      const result = investInFacet(progression, "facet:soldier");

      expect(result).toBe(true);
      expect(progression.unspentFacetPoints).toBe(0);
      const soldier = progression.facets.find((f) => f.id === "facet:soldier")!;
      expect(soldier.pointsInvested).toBe(1);
      expect(soldier.tiers[0].abilities[0].unlocked).toBe(true);
      expect(soldier.tiers[1].abilities[0].unlocked).toBe(false);
      expect(progression.unlockedFacetDieIds).toEqual(["facet-die-soldier-1"]);
    });

    it("sequential investments unlock abilities in order and accumulate die ids", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 3;

      investInFacet(progression, "facet:soldier");
      investInFacet(progression, "facet:soldier");
      investInFacet(progression, "facet:berserker");

      const soldier = progression.facets.find((f) => f.id === "facet:soldier")!;
      const berserker = progression.facets.find((f) => f.id === "facet:berserker")!;

      expect(soldier.pointsInvested).toBe(2);
      expect(berserker.pointsInvested).toBe(1);
      expect(progression.unspentFacetPoints).toBe(0);
      expect(progression.unlockedFacetDieIds).toEqual([
        "facet-die-soldier-1",
        "facet-die-soldier-2",
        "facet-die-berserker-1",
      ]);
    });

    it("investInFacet returns false once a facet is full", () => {
      const progression = createPlayerProgression();
      const soldier = progression.facets.find((f) => f.id === "facet:soldier")!;
      soldier.pointsInvested = soldier.tiers.length;
      for (const tier of soldier.tiers) {
        for (const ability of tier.abilities) {
          ability.unlocked = true;
        }
      }

      progression.unspentFacetPoints = 1;
      const result = investInFacet(progression, "facet:soldier");
      expect(result).toBe(false);
      expect(progression.unspentFacetPoints).toBe(1);
    });

    it("unlocked facet dies appear in the combat loadout with unique instance ids", () => {
      const progression = createPlayerProgression();
      progression.unspentFacetPoints = 2;

      investInFacet(progression, "facet:soldier");
      investInFacet(progression, "facet:berserker");

      const dice = createPlayerCombatDiceLoadout(progression);
      const typeIds = dice.map((d) => d.typeId);
      expect(typeIds).toContain("facet-die-soldier-1");
      expect(typeIds).toContain("facet-die-berserker-1");

      // Instance IDs are unique, not the type IDs
      const soldierDie = dice.find((d) => d.typeId === "facet-die-soldier-1")!;
      const berserkerDie = dice.find((d) => d.typeId === "facet-die-berserker-1")!;
      expect(soldierDie.id).toBe("facet-instance-0");
      expect(berserkerDie.id).toBe("facet-instance-1");
    });

    it("facet die absent from loadout until invested", () => {
      const progression = createPlayerProgression();
      const diceBefore = createPlayerCombatDiceLoadout(progression);
      expect(diceBefore.map((d) => d.typeId)).not.toContain("facet-die-soldier-1");

      progression.unspentFacetPoints = 1;
      investInFacet(progression, "facet:soldier");

      const diceAfter = createPlayerCombatDiceLoadout(progression);
      expect(diceAfter.map((d) => d.typeId)).toContain("facet-die-soldier-1");
    });
  });

  it("records persistent face adjustments", () => {
    const progression = createPlayerProgression();

    recordFaceAdjustment(progression, {
      dieId: "player-die-1",
      sideId: "player-die-1-side-1",
      operation: {
        propertyId: "attack_modifier",
        type: FaceAdjustmentModalityType.Improve,
        steps: 1,
      },
    });

    expect(progression.faceAdjustments).toHaveLength(1);
    expect(progression.faceAdjustments[0].dieId).toBe("player-die-1");
  });
});
