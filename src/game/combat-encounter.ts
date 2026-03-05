import { CombatEvent, CombatEventBus } from "./combat-event-bus";
import {
  type DiceEffect,
  type Die,
  EffectType,
  type RandomSource,
  defaultRandomSource,
  rollDie,
} from "./dice";

type CombatActor = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  dice: Die[];
};

export type EnemyStub = {
  id: string;
  name: string;
  maxHp: number;
  dice: Die[];
};

export type PendingEnemyIntent = {
  events: CombatEvent[];
  pendingPlayerDamage: number;
  pendingEnemyHealing: number;
};

export type CombatEncounterState = {
  player: CombatActor;
  enemy: CombatActor;
  phase: "player-turn" | "resolved";
  playerRollIndex: number;
  enemyIntent: PendingEnemyIntent;
  combatLog: string[];
};

function applyCombatEvent(state: CombatEncounterState, event: CombatEvent): void {
  if (event.effect === EffectType.Damage) {
    if (event.source === "player") {
      state.enemy.hp = Math.max(0, state.enemy.hp - event.value);
      state.combatLog.push(`Player deals ${event.value} damage.`);
      return;
    }

    state.player.hp = Math.max(0, state.player.hp - event.value);
    state.combatLog.push(`Enemy deals ${event.value} damage.`);
    return;
  }

  if (event.source === "player") {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + event.value);
    state.combatLog.push(`Player heals ${event.value}.`);
    return;
  }

  state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + event.value);
  state.combatLog.push(`Enemy heals ${event.value}.`);
}

function emitEffectEvents(
  source: "player" | "enemy",
  die: Die,
  sideId: string,
  effects: DiceEffect[],
  cause: CombatEvent["cause"],
): CombatEvent[] {
  return effects.map((effect) => ({
    effect: effect.effect,
    value: effect.value,
    source,
    cause,
    dieId: die.id,
    sideId,
  }));
}

function resolveImmediateEvents(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  events: CombatEvent[],
): void {
  const queue = [...events];

  while (queue.length > 0) {
    const event = queue.shift();
    if (!event) {
      break;
    }

    applyCombatEvent(state, event);

    const triggeredEvents = eventBus.publish(event).map((nextEvent) => ({
      ...nextEvent,
      cause: "triggered" as const,
    }));

    queue.push(...triggeredEvents);
  }
}

function createPlayerDice(): Die[] {
  return [
    {
      id: "player-die-1",
      name: "Spark Die",
      sides: [
        {
          id: "player-die-1-side-1",
          label: "Strike 2",
          effects: [{ id: "player-die-1-e1", effect: EffectType.Damage, value: 2 }],
        },
      ],
    },
    {
      id: "player-die-2",
      name: "Ward Die",
      sides: [
        {
          id: "player-die-2-side-1",
          label: "Strike 1",
          effects: [{ id: "player-die-2-e1", effect: EffectType.Damage, value: 1 }],
        },
      ],
    },
    {
      id: "player-die-3",
      name: "Mend Die",
      sides: [
        {
          id: "player-die-3-side-1",
          label: "Heal 1",
          effects: [{ id: "player-die-3-e1", effect: EffectType.Heal, value: 1 }],
        },
      ],
    },
  ];
}

export function createStubEnemies(): EnemyStub[] {
  return [
    {
      id: "slime-raider",
      name: "Slime Raider",
      maxHp: 14,
      dice: [
        {
          id: "enemy-die-1",
          name: "Slime Claw",
          sides: [
            {
              id: "enemy-die-1-side-1",
              label: "Damage 2",
              effects: [{ id: "enemy-die-1-e1", effect: EffectType.Damage, value: 2 }],
            },
          ],
        },
        {
          id: "enemy-die-2",
          name: "Slime Jab",
          sides: [
            {
              id: "enemy-die-2-side-1",
              label: "Damage 1",
              effects: [{ id: "enemy-die-2-e1", effect: EffectType.Damage, value: 1 }],
            },
          ],
        },
        {
          id: "enemy-die-3",
          name: "Slime Ooze",
          sides: [
            {
              id: "enemy-die-3-side-1",
              label: "Heal 1",
              effects: [{ id: "enemy-die-3-e1", effect: EffectType.Heal, value: 1 }],
            },
          ],
        },
      ],
    },
    {
      id: "goblin-hexer",
      name: "Goblin Hexer",
      maxHp: 12,
      dice: [
        {
          id: "goblin-die-1",
          name: "Hex Bolt",
          sides: [
            {
              id: "goblin-die-1-side-1",
              label: "Damage 2",
              effects: [{ id: "goblin-die-1-e1", effect: EffectType.Damage, value: 2 }],
            },
          ],
        },
        {
          id: "goblin-die-2",
          name: "Knife Toss",
          sides: [
            {
              id: "goblin-die-2-side-1",
              label: "Damage 1",
              effects: [{ id: "goblin-die-2-e1", effect: EffectType.Damage, value: 1 }],
            },
          ],
        },
        {
          id: "goblin-die-3",
          name: "Brew Sip",
          sides: [
            {
              id: "goblin-die-3-side-1",
              label: "Heal 1",
              effects: [{ id: "goblin-die-3-e1", effect: EffectType.Heal, value: 1 }],
            },
          ],
        },
      ],
    },
  ];
}

function buildEnemyIntent(
  enemy: CombatActor,
  randomSource: RandomSource,
): PendingEnemyIntent {
  const events: CombatEvent[] = [];

  for (const die of enemy.dice) {
    const side = rollDie(die, randomSource);
    events.push(...emitEffectEvents("enemy", die, side.id, side.effects, "enemy-intent"));
  }

  return {
    events,
    pendingPlayerDamage: events
      .filter((event) => event.effect === EffectType.Damage)
      .reduce((total, event) => total + event.value, 0),
    pendingEnemyHealing: events
      .filter((event) => event.effect === EffectType.Heal)
      .reduce((total, event) => total + event.value, 0),
  };
}

export function createCombatEncounter(
  options?: {
    enemyId?: string;
    randomSource?: RandomSource;
    eventBus?: CombatEventBus;
  },
): { state: CombatEncounterState; eventBus: CombatEventBus } {
  const randomSource = options?.randomSource ?? defaultRandomSource;
  const eventBus = options?.eventBus ?? new CombatEventBus();
  const enemyTemplate =
    createStubEnemies().find((enemy) => enemy.id === options?.enemyId) ?? createStubEnemies()[0];

  const player: CombatActor = {
    id: "player",
    name: "Arcanist",
    hp: 20,
    maxHp: 20,
    dice: createPlayerDice(),
  };

  const enemy: CombatActor = {
    id: enemyTemplate.id,
    name: enemyTemplate.name,
    hp: enemyTemplate.maxHp,
    maxHp: enemyTemplate.maxHp,
    dice: enemyTemplate.dice,
  };

  const enemyIntent = buildEnemyIntent(enemy, randomSource);
  const state: CombatEncounterState = {
    player,
    enemy,
    phase: "player-turn",
    playerRollIndex: 0,
    enemyIntent,
    combatLog: [
      `${enemy.name} prepares ${enemyIntent.pendingPlayerDamage} damage and ${enemyIntent.pendingEnemyHealing} healing.`,
    ],
  };

  return { state, eventBus };
}

function resolveEnemyIntentIfNeeded(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
): CombatEncounterState {
  if (state.playerRollIndex < state.player.dice.length) {
    return state;
  }

  if (state.enemy.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Enemy defeated before intent resolves.");
    return state;
  }

  resolveImmediateEvents(state, eventBus, state.enemyIntent.events);
  state.phase = "resolved";
  state.combatLog.push("Enemy intent resolves.");
  return state;
}

export function rollNextPlayerDie(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (state.phase !== "player-turn") {
    return state;
  }

  const nextDie = state.player.dice[state.playerRollIndex];
  if (!nextDie) {
    return resolveEnemyIntentIfNeeded(state, eventBus);
  }

  const side = rollDie(nextDie, randomSource);
  const events = emitEffectEvents("player", nextDie, side.id, side.effects, "player-roll");

  state.combatLog.push(`Player rolls ${nextDie.name}: ${side.label}.`);
  resolveImmediateEvents(state, eventBus, events);
  state.playerRollIndex += 1;

  return resolveEnemyIntentIfNeeded(state, eventBus);
}
