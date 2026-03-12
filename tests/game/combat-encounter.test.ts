import { CombatEventBus } from "../../src/game/combat-event-bus";
import {
  canEndPlayerTurn,
  createCombatEncounter,
  createStubEnemies,
  drainResolutionPopups,
  endPlayerTurn,
  resolveNextEnemyDie,
  rollPlayerDie,
  rollNextPlayerDie,
} from "../../src/game/combat-encounter";
import { EffectType } from "../../src/game/dice";
import { FaceAdjustmentModalityType } from "../../src/game/faces";
import { createPlayerCombatDiceLoadout } from "../../src/game/player-combat-dice";
import {
  createPlayerProgression,
  recordFaceAdjustment,
  recordRemoveFace,
} from "../../src/game/player-progression";

function fixedRandomSource() {
  return {
    nextInt: () => 0,
  };
}

function sequenceRandomSource(sequence: number[]) {
  let index = 0;
  return {
    nextInt: () => {
      const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0;
      index += 1;
      return value;
    },
  };
}

describe("combat encounter", () => {
  function getPlayerDieIdByName(
    encounter: ReturnType<typeof createCombatEncounter>,
    dieName: string,
  ): string {
    const die = encounter.state.player.dice.find((entry) => entry.name === dieName);
    if (!die) {
      throw new Error(`Expected player die '${dieName}' to exist`);
    }

    return die.id;
  }

  function resolveAllEnemyDice(encounter: ReturnType<typeof createCombatEncounter>): void {
    let guard = 0;
    while (encounter.state.phase === "enemy-turn" && guard < 20) {
      resolveNextEnemyDie(encounter.state, encounter.eventBus, fixedRandomSource());
      guard += 1;
    }
  }

  function endPlayerTurnWhenReady(encounter: ReturnType<typeof createCombatEncounter>): void {
    expect(canEndPlayerTurn(encounter.state)).toBe(true);
    endPlayerTurn(encounter.state, encounter.eventBus, fixedRandomSource());
  }

  it("provides stubbed enemies", () => {
    const enemies = createStubEnemies();

    expect(enemies.length).toBeGreaterThanOrEqual(2);
    expect(enemies[0].dice).toHaveLength(3);
    expect(enemies[1].dice).toHaveLength(3);

    for (const enemy of enemies) {
      for (const die of enemy.dice) {
        expect(die.sides).toHaveLength(6);
      }
    }
  });

  it("creates six-sided player class + starter equipment dice", () => {
    const { state } = createCombatEncounter({ randomSource: fixedRandomSource() });

    expect(state.player.dice).toHaveLength(6);
    for (const die of state.player.dice) {
      expect(die.sides).toHaveLength(6);
    }
  });

  it("adds equipped item dice to player combat dice", () => {
    const progression = createPlayerProgression();
    progression.items.equipped.armor = undefined;
    progression.items.equipped["weapon-1"] = undefined;
    progression.items.equipped["weapon-2"] = undefined;

    progression.items.equipped["weapon-1"] = {
      id: "item:test-spark-blade",
      name: "Spark Blade",
      description: "A basic test weapon.",
      level: 1,
      cost: 10,
      slot: "weapon-1",
      diceId: "spark-die",
    };

    const { state } = createCombatEncounter({
      randomSource: fixedRandomSource(),
      playerProgression: progression,
    });

    expect(state.player.dice).toHaveLength(4);
    expect(state.player.dice.some((die) => die.id.includes("equipped-weapon-1"))).toBe(true);
  });

  it("removes persisted faces from dice used in combat rolls", () => {
    const progression = createPlayerProgression();
    const baselineLoadout = createPlayerCombatDiceLoadout(progression);
    const weaponDie = baselineLoadout.find((die) => die.name === "Rusty Sword Die");
    if (!weaponDie) {
      throw new Error("Expected Rusty Sword Die");
    }

    const baselineSideCount = weaponDie.sides.length;
    const removedSideId = weaponDie.sides[0]?.id;
    if (!removedSideId) {
      throw new Error("Expected Rusty Sword Die to have at least one side");
    }

    recordRemoveFace(progression, {
      dieId: weaponDie.id,
      sideId: removedSideId,
    });

    const encounter = createCombatEncounter({
      randomSource: fixedRandomSource(),
      playerProgression: progression,
    });
    const combatWeaponDie = encounter.state.player.dice.find((die) => die.id === weaponDie.id);
    if (!combatWeaponDie) {
      throw new Error("Expected Rusty Sword Die in combat loadout");
    }

    expect(combatWeaponDie.sides).toHaveLength(baselineSideCount - 1);
    expect(combatWeaponDie.sides.some((side) => side.id === removedSideId)).toBe(false);
  });

  it("rolls enemy dice first and exposes pending intent", () => {
    const { state } = createCombatEncounter({ randomSource: fixedRandomSource() });

    expect(state.round).toBe(1);
    expect(state.enemyIntent.events).toHaveLength(3);
    expect(state.enemyIntent.pendingPlayerDamage).toBe(3);
    expect(state.enemyIntent.pendingEnemyHealing).toBe(1);
    expect(state.player.hp).toBe(20);
  });

  it("rolls player dice one at a time and starts next round when both survive", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");
    expect(encounter.state.round).toBe(1);
    expect(encounter.state.player.hp).toBe(20);

    const enemyHpAtTurnStart = encounter.state.enemy.hp;

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(1);
    expect(encounter.state.enemy.hp).toBe(enemyHpAtTurnStart);
    expect(encounter.state.phase).toBe("player-turn");

    const enemyHpAfterFirstRoll = encounter.state.enemy.hp;

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(2);
    expect(encounter.state.enemy.hp).toBeLessThanOrEqual(enemyHpAfterFirstRoll);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(3);
    expect(encounter.state.phase).toBe("player-turn");

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(3);
    expect(encounter.state.playerEnergyCurrent).toBe(0);
    expect(encounter.state.phase).toBe("player-turn");

    endPlayerTurnWhenReady(encounter);
    expect(encounter.state.phase).toBe("enemy-turn");
    expect(encounter.state.round).toBe(2);
    expect(encounter.state.playerRollIndex).toBe(0);
    expect(encounter.state.playerEnergyCurrent).toBe(encounter.state.playerEnergyMax);
    expect(encounter.state.player.hp).toBe(19);
    expect(encounter.state.player.armor).toBe(2);
    expect(encounter.state.enemy.hp).toBeLessThanOrEqual(enemyHpAtTurnStart);
  });

  it("continues rounds without stalling", () => {
    const randomSource = sequenceRandomSource([1, 1, 1, 1, 1, 1, 1, 1]);
    const encounter = createCombatEncounter({ randomSource });

    let safety = 0;
    while (safety < 220) {
      if (encounter.state.phase === "player-turn") {
        if (canEndPlayerTurn(encounter.state)) {
          endPlayerTurn(encounter.state, encounter.eventBus, randomSource);
        } else {
          rollNextPlayerDie(encounter.state, encounter.eventBus, randomSource);
        }
      } else {
        resolveNextEnemyDie(encounter.state, encounter.eventBus, randomSource);
      }

      safety += 1;
    }

    expect(safety).toBe(220);
    expect(encounter.state.round).toBeGreaterThan(8);
    expect(encounter.state.player.hp).toBeGreaterThanOrEqual(0);
    expect(encounter.state.enemy.hp).toBeGreaterThanOrEqual(0);
  });

  it("supports rolling player dice in any order once per round", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const dieIds = encounter.state.player.dice.map((die) => die.id);
    if (dieIds.length < 3) {
      throw new Error("Expected at least three player dice");
    }

    rollPlayerDie(encounter.state, encounter.eventBus, dieIds[2], fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, dieIds[0], fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, dieIds[1], fixedRandomSource());

    endPlayerTurnWhenReady(encounter);

    expect(encounter.state.phase).toBe("enemy-turn");

    resolveAllEnemyDice(encounter);
    expect(encounter.state.round).toBe(2);
    expect(encounter.state.playerRollIndex).toBe(0);
    expect(encounter.state.phase).toBe("player-turn");

    const snapshotRound = encounter.state.round;
    rollPlayerDie(encounter.state, encounter.eventBus, dieIds[1], fixedRandomSource());
    expect(encounter.state.round).toBe(snapshotRound);
    expect(encounter.state.playerRollIndex).toBe(1);
  });

  it("supports pub-sub triggers when damage events are published", () => {
    const eventBus = new CombatEventBus();

    eventBus.subscribe(EffectType.Damage, (event) => {
      if (event.source !== "player") {
        return [];
      }

      return [
        {
          effect: EffectType.Heal,
          value: 1,
          source: "player",
          target: "self",
          cause: "triggered",
          dieId: "trigger",
          sideId: "trigger",
        },
      ];
    });

    const encounter = createCombatEncounter({
      randomSource: fixedRandomSource(),
      eventBus,
    });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    encounter.state.player.hp = 15;
    const woodenShieldDieId = getPlayerDieIdByName(encounter, "Wooden Shield Die");
    rollPlayerDie(encounter.state, encounter.eventBus, woodenShieldDieId, sequenceRandomSource([1]));

    expect(encounter.state.player.hp).toBe(16);
  });

  it("reveals enemy intent first and applies it after player finishes rolling", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");
    expect(encounter.state.player.hp).toBe(20);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());

    // Enemy intent should still be deferred while player is mid-turn.
    expect(encounter.state.player.hp).toBe(19);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerEnergyCurrent).toBe(0);

    endPlayerTurnWhenReady(encounter);

    // Enemy intent resolves only after player explicitly ends the turn.
    expect(encounter.state.player.hp).toBe(19);
    expect(encounter.state.phase).toBe("enemy-turn");
  });

  it("applies Warcry +3 to attacks for the rest of the turn", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const woodenShieldDieId = getPlayerDieIdByName(encounter, "Wooden Shield Die");
    const wildStrikeDieId = getPlayerDieIdByName(encounter, "Wild Strike Die");
    const ironhideDieId = getPlayerDieIdByName(encounter, "Ironhide Die");
    const enemyHpBefore = encounter.state.enemy.hp;

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());

    rollPlayerDie(encounter.state, encounter.eventBus, woodenShieldDieId, sequenceRandomSource([1]));
    expect(enemyHpBefore - encounter.state.enemy.hp).toBe(5);

    rollPlayerDie(encounter.state, encounter.eventBus, wildStrikeDieId, fixedRandomSource());
    expect(encounter.state.combatLog).toContain("Player rolls Wild Strike.");
    rollPlayerDie(encounter.state, encounter.eventBus, ironhideDieId, fixedRandomSource());
    expect(encounter.state.playerEnergyCurrent).toBe(0);
  });

  it("expires Warcry modifier at end of player turn", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });
    encounter.state.enemy.hp = 50;

    resolveAllEnemyDice(encounter);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());

    for (const die of encounter.state.player.dice) {
      if (die.id === "player-die-1") {
        continue;
      }

      if (encounter.state.playerEnergyCurrent <= 0) {
        break;
      }
      rollPlayerDie(encounter.state, encounter.eventBus, die.id, fixedRandomSource());
    }

    endPlayerTurnWhenReady(encounter);
    expect(encounter.state.phase).toBe("enemy-turn");

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const woodenShieldDieId = getPlayerDieIdByName(encounter, "Wooden Shield Die");
    const enemyHpBefore = encounter.state.enemy.hp;
    rollPlayerDie(encounter.state, encounter.eventBus, woodenShieldDieId, sequenceRandomSource([1]));
    expect(enemyHpBefore - encounter.state.enemy.hp).toBe(2);
  });

  it("supports negative Warcry modifiers", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const woodenShieldDieId = getPlayerDieIdByName(encounter, "Wooden Shield Die");
    const enemyHpBefore = encounter.state.enemy.hp;
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", sequenceRandomSource([5]));

    rollPlayerDie(encounter.state, encounter.eventBus, woodenShieldDieId, sequenceRandomSource([1]));
    expect(encounter.state.enemy.hp).toBe(enemyHpBefore);
  });

  it("queues spawned transient popup when wild strike transient roll misses", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const wildStrikeDieId = getPlayerDieIdByName(encounter, "Wild Strike Die");
    rollPlayerDie(encounter.state, encounter.eventBus, wildStrikeDieId, sequenceRandomSource([0, 1]));

    const popups = drainResolutionPopups(encounter.state);
    const spawnedPopup = popups.find((popup) => popup.spawnedDie !== undefined);

    expect(spawnedPopup).toBeDefined();
    expect(spawnedPopup?.text).toContain("Transient");
    expect(spawnedPopup?.spawnedDie?.dieLabel).toBe("Rusty Sword Die");
    expect(spawnedPopup?.spawnedDie?.sideLabel).toBe("Whiff!");
  });

  it("applies upgraded wild strike attack count to total extra attacks", () => {
    const baselineEncounter = createCombatEncounter({ randomSource: fixedRandomSource() });
    resolveAllEnemyDice(baselineEncounter);
    expect(baselineEncounter.state.phase).toBe("player-turn");

    const wildStrikeDieId = getPlayerDieIdByName(baselineEncounter, "Wild Strike Die");
    baselineEncounter.state.enemy.hp = 200;
    const baselineEnemyHpBefore = baselineEncounter.state.enemy.hp;
    const baselineWildStrikeRolls = sequenceRandomSource([0, 3]);
    rollPlayerDie(
      baselineEncounter.state,
      baselineEncounter.eventBus,
      wildStrikeDieId,
      baselineWildStrikeRolls,
    );
    const baselineDamage = baselineEnemyHpBefore - baselineEncounter.state.enemy.hp;
    expect(baselineDamage).toBeGreaterThan(0);

    const upgradedProgression = createPlayerProgression();
    recordFaceAdjustment(upgradedProgression, {
      dieId: "player-die-2",
      sideId: "player-die-2-side-1",
      operation: {
        propertyId: "attack_times",
        type: FaceAdjustmentModalityType.Improve,
        steps: 2,
      },
    });

    const upgradedEncounter = createCombatEncounter({
      randomSource: fixedRandomSource(),
      playerProgression: upgradedProgression,
    });
    resolveAllEnemyDice(upgradedEncounter);
    expect(upgradedEncounter.state.phase).toBe("player-turn");

    const upgradedWildStrikeDieId = getPlayerDieIdByName(upgradedEncounter, "Wild Strike Die");
    upgradedEncounter.state.enemy.hp = 200;
    const upgradedEnemyHpBefore = upgradedEncounter.state.enemy.hp;
    const upgradedWildStrikeRolls = sequenceRandomSource([0, 3, 3, 3]);
    rollPlayerDie(
      upgradedEncounter.state,
      upgradedEncounter.eventBus,
      upgradedWildStrikeDieId,
      upgradedWildStrikeRolls,
    );
    const upgradedDamage = upgradedEnemyHpBefore - upgradedEncounter.state.enemy.hp;

    expect(upgradedDamage).toBe(baselineDamage * 3);
  });

  it("queues one spawned transient popup per wild strike extra attack", () => {
    const progression = createPlayerProgression();
    recordFaceAdjustment(progression, {
      dieId: "player-die-2",
      sideId: "player-die-2-side-1",
      operation: {
        propertyId: "attack_times",
        type: FaceAdjustmentModalityType.Improve,
        steps: 2,
      },
    });

    const encounter = createCombatEncounter({
      randomSource: fixedRandomSource(),
      playerProgression: progression,
    });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const wildStrikeDieId = getPlayerDieIdByName(encounter, "Wild Strike Die");
    // Roll Wild Strike face first, then force three transient misses so events may be empty.
    rollPlayerDie(encounter.state, encounter.eventBus, wildStrikeDieId, sequenceRandomSource([0, 1, 1, 1]));

    const popups = drainResolutionPopups(encounter.state);
    const spawnedPopups = popups.filter((popup) => popup.spawnedDie !== undefined);
    expect(spawnedPopups).toHaveLength(3);
  });

  it("logs each transient wild strike die roll", () => {
    const progression = createPlayerProgression();
    recordFaceAdjustment(progression, {
      dieId: "player-die-2",
      sideId: "player-die-2-side-1",
      operation: {
        propertyId: "attack_times",
        type: FaceAdjustmentModalityType.Improve,
        steps: 2,
      },
    });

    const encounter = createCombatEncounter({
      randomSource: fixedRandomSource(),
      playerProgression: progression,
    });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const wildStrikeDieId = getPlayerDieIdByName(encounter, "Wild Strike Die");
    rollPlayerDie(encounter.state, encounter.eventBus, wildStrikeDieId, sequenceRandomSource([0, 1, 1, 1]));

    const transientRollLines = encounter.state.combatLog.filter(
      (line) => line === "Player rolls Rusty Sword Die: Whiff!.",
    );
    expect(transientRollLines).toHaveLength(3);
  });

  it("grants armor from Ironhide and applies armor before hp damage", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-3", fixedRandomSource());
    expect(encounter.state.player.armor).toBe(5);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());

    endPlayerTurnWhenReady(encounter);

    expect(encounter.state.phase).toBe("enemy-turn");
    expect(encounter.state.player.hp).toBe(20);
    expect(encounter.state.player.armor).toBe(1);
    expect(encounter.state.combatLog).toContain("Player gains 5 armor.");
  });
});
