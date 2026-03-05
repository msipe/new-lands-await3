import { CombatEventBus } from "../../src/game/combat-event-bus";
import {
  createCombatEncounter,
  createStubEnemies,
  rollNextPlayerDie,
} from "../../src/game/combat-encounter";
import { EffectType } from "../../src/game/dice";

function fixedRandomSource() {
  return {
    nextInt: () => 0,
  };
}

describe("combat encounter", () => {
  it("provides stubbed enemies", () => {
    const enemies = createStubEnemies();

    expect(enemies.length).toBeGreaterThanOrEqual(2);
    expect(enemies[0].dice).toHaveLength(3);
    expect(enemies[1].dice).toHaveLength(3);
  });

  it("rolls enemy dice first and exposes pending intent", () => {
    const { state } = createCombatEncounter({ randomSource: fixedRandomSource() });

    expect(state.enemyIntent.events).toHaveLength(3);
    expect(state.enemyIntent.pendingPlayerDamage).toBe(3);
    expect(state.enemyIntent.pendingEnemyHealing).toBe(1);
    expect(state.player.hp).toBe(20);
  });

  it("rolls player dice one at a time and applies effects immediately", () => {
    const encounter = createCombatEncounter({ randomSource: fixedRandomSource() });

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(1);
    expect(encounter.state.enemy.hp).toBe(12);
    expect(encounter.state.phase).toBe("player-turn");

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.playerRollIndex).toBe(2);
    expect(encounter.state.enemy.hp).toBe(11);

    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());
    expect(encounter.state.phase).toBe("resolved");
    expect(encounter.state.player.hp).toBe(17);
    expect(encounter.state.enemy.hp).toBe(12);
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

    encounter.state.player.hp = 15;
    rollNextPlayerDie(encounter.state, encounter.eventBus, fixedRandomSource());

    expect(encounter.state.player.hp).toBe(16);
  });
});
