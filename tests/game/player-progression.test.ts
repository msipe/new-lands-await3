import {
  calculateCombatGoldReward,
  calculateCombatXpReward,
  createPlayerProgression,
  grantPlayerGold,
  getXpRequiredForLevel,
  grantPlayerXp,
  recordCombatVictory,
  recordFaceAdjustment,
  setPlayerIdentity,
  spendPlayerGold,
} from "../../src/game/player-progression";
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
    expect(progression.unspentTalentPoints).toBe(0);
    expect(progression.talents.length).toBeGreaterThan(0);
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
    expect(progression.unspentTalentPoints).toBe(2);
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
    expect(progression.unspentTalentPoints).toBe(1);
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
