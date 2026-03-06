import {
  calculateCombatXpReward,
  createPlayerProgression,
  getXpRequiredForLevel,
  grantPlayerXp,
  recordCombatVictory,
  setPlayerIdentity,
} from "../../src/game/player-progression";
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
    expect(progression.xpToNextLevel).toBe(getXpRequiredForLevel(1));
    expect(progression.battlesWon).toBe(0);
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
  });

  it("records combat victories and grants level-scaled xp", () => {
    const progression = createPlayerProgression();
    const expectedReward = calculateCombatXpReward(4);
    const result = recordCombatVictory(progression, 4);

    expect(result.gainedXp).toBe(expectedReward);
    expect(progression.battlesWon).toBe(1);
    expect(progression.totalXp).toBe(expectedReward);
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
});
