import {
  calculateCombatXpReward,
  createPlayerProgression,
  getXpRequiredForLevel,
  grantPlayerXp,
  recordCombatVictory,
  setPlayerIdentity,
} from "../../src/game/player-progression";

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
});
