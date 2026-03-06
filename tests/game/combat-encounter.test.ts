import { CombatEventBus } from "../../src/game/combat-event-bus";
import {
  createCombatEncounter,
  createStubEnemies,
  resolveNextEnemyDie,
  rollPlayerDie,
  rollNextPlayerDie,
} from "../../src/game/combat-encounter";
import { EffectType } from "../../src/game/dice";
import { createPlayerProgression } from "../../src/game/player-progression";

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
  function resolveAllEnemyDice(encounter: ReturnType<typeof createCombatEncounter>): void {
    let guard = 0;
    while (encounter.state.phase === "enemy-turn" && guard < 20) {
      resolveNextEnemyDie(encounter.state, encounter.eventBus, fixedRandomSource());
      guard += 1;
    }
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

  it("creates six-sided player starter dice", () => {
    const { state } = createCombatEncounter({ randomSource: fixedRandomSource() });

    expect(state.player.dice).toHaveLength(4);
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

    expect(state.player.dice).toHaveLength(5);
    expect(state.player.dice.some((die) => die.id.includes("equipped-weapon-1"))).toBe(true);
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
    expect(encounter.state.playerAttackModifier).toBe(3);
    expect(encounter.state.phase).toBe("player-turn");

    const enemyHpAfterFirstRoll = encounter.state.enemy.hp;

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(2);
    expect(encounter.state.enemy.hp).toBeLessThanOrEqual(enemyHpAfterFirstRoll);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(3);
    expect(encounter.state.phase).toBe("player-turn");

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.phase).toBe("enemy-turn");
    expect(encounter.state.round).toBe(2);
    expect(encounter.state.playerRollIndex).toBe(0);
    expect(encounter.state.player.hp).toBe(17);
    expect(encounter.state.enemy.hp).toBeLessThanOrEqual(enemyHpAtTurnStart);
  });

  it("continues rounds until a combatant is defeated", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    let safety = 0;
    while (encounter.state.phase !== "resolved" && safety < 50) {
      if (encounter.state.phase === "player-turn") {
        rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
      } else {
        resolveNextEnemyDie(encounter.state, encounter.eventBus, fixedRandomSource());
      }

      safety += 1;
    }

    expect(safety).toBeLessThan(50);
    expect(encounter.state.phase).toBe("resolved");
    expect(encounter.state.enemy.hp === 0 || encounter.state.player.hp === 0).toBe(true);
  });

  it("supports rolling player dice in any order once per round", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-3", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-4", fixedRandomSource());

    expect(encounter.state.phase).toBe("enemy-turn");

    resolveAllEnemyDice(encounter);
    expect(encounter.state.round).toBe(2);
    expect(encounter.state.playerRollIndex).toBe(0);
    expect(encounter.state.phase).toBe("player-turn");

    const snapshotRound = encounter.state.round;
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());
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
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());

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
    expect(encounter.state.player.hp).toBe(20);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.phase).toBe("player-turn");

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());

    // Enemy intent resolves only after player finishes all rolls.
    expect(encounter.state.player.hp).toBe(17);
    expect(encounter.state.phase).toBe("enemy-turn");
  });

  it("applies Warcry +3 to attacks for the rest of the turn", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const enemyHpBefore = encounter.state.enemy.hp;

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());
    expect(encounter.state.playerAttackModifier).toBe(3);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());
    expect(enemyHpBefore - encounter.state.enemy.hp).toBe(4);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-4", fixedRandomSource());
    expect(encounter.state.combatLog).toContain("Player rolls Wild Strike.");
  });

  it("expires Warcry modifier at end of player turn", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });
    encounter.state.enemy.hp = 50;

    resolveAllEnemyDice(encounter);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", fixedRandomSource());
    expect(encounter.state.playerAttackModifier).toBe(3);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-3", fixedRandomSource());
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-4", fixedRandomSource());

    expect(encounter.state.phase).toBe("enemy-turn");
    expect(encounter.state.playerAttackModifier).toBe(0);

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const enemyHpBefore = encounter.state.enemy.hp;
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", fixedRandomSource());
    expect(enemyHpBefore - encounter.state.enemy.hp).toBe(1);
  });

  it("supports negative Warcry modifiers", () => {
    const randomSource = sequenceRandomSource([0, 0, 0, 5, 0]);
    const encounter = createCombatEncounter({ randomSource });

    resolveAllEnemyDice(encounter);
    expect(encounter.state.phase).toBe("player-turn");

    const enemyHpBefore = encounter.state.enemy.hp;
    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-1", randomSource);
    expect(encounter.state.playerAttackModifier).toBe(-2);

    rollPlayerDie(encounter.state, encounter.eventBus, "player-die-2", randomSource);
    expect(encounter.state.enemy.hp).toBe(enemyHpBefore);
  });
});
