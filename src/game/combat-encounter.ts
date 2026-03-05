import { CombatEvent, CombatEventBus } from "./combat-event-bus";
import {
  type Die,
  EffectType,
  type RandomSource,
  defaultRandomSource,
  rollDie,
} from "./dice";
import { MinorMendFace, ShieldBashFace, SwordSlashFace } from "./faces";

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
  const appliesToPlayer =
    (event.source === "enemy" && event.target === "opponent") ||
    (event.source === "player" && event.target === "self");

  const recipient = appliesToPlayer ? state.player : state.enemy;
  const recipientLabel = appliesToPlayer ? "Player" : "Enemy";

  if (event.effect === EffectType.Damage) {
    recipient.hp = Math.max(0, recipient.hp - event.value);
    state.combatLog.push(`${recipientLabel} takes ${event.value} damage.`);
    return;
  }

  recipient.hp = Math.min(recipient.maxHp, recipient.hp + event.value);
  state.combatLog.push(`${recipientLabel} heals ${event.value}.`);
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
      sides: [new ShieldBashFace("player-die-1-side-1")],
    },
    {
      id: "player-die-2",
      name: "Ward Die",
      sides: [new SwordSlashFace("player-die-2-side-1")],
    },
    {
      id: "player-die-3",
      name: "Mend Die",
      sides: [new MinorMendFace("player-die-3-side-1")],
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
          sides: [new ShieldBashFace("enemy-die-1-side-1")],
        },
        {
          id: "enemy-die-2",
          name: "Slime Jab",
          sides: [new SwordSlashFace("enemy-die-2-side-1")],
        },
        {
          id: "enemy-die-3",
          name: "Slime Ooze",
          sides: [new MinorMendFace("enemy-die-3-side-1")],
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
          sides: [new ShieldBashFace("goblin-die-1-side-1")],
        },
        {
          id: "goblin-die-2",
          name: "Knife Toss",
          sides: [new SwordSlashFace("goblin-die-2-side-1")],
        },
        {
          id: "goblin-die-3",
          name: "Brew Sip",
          sides: [new MinorMendFace("goblin-die-3-side-1")],
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
    events.push(
      ...side.resolve({
        source: "enemy",
        cause: "enemy-intent",
        dieId: die.id,
      }),
    );
  }

  return {
    events,
    pendingPlayerDamage: events
      .filter(
        (event) =>
          event.effect === EffectType.Damage &&
          event.source === "enemy" &&
          event.target === "opponent",
      )
      .reduce((total, event) => total + event.value, 0),
    pendingEnemyHealing: events
      .filter(
        (event) =>
          event.effect === EffectType.Heal && event.source === "enemy" && event.target === "self",
      )
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
  const events = side.resolve({
    source: "player",
    cause: "player-roll",
    dieId: nextDie.id,
  });

  state.combatLog.push(`Player rolls ${nextDie.name}: ${side.label}.`);
  resolveImmediateEvents(state, eventBus, events);
  state.playerRollIndex += 1;

  if (state.enemy.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Enemy defeated.");
    return state;
  }

  return resolveEnemyIntentIfNeeded(state, eventBus);
}

export function getEnemyIntentSummary(state: CombatEncounterState): string {
  return `Enemy intent: ${state.enemyIntent.pendingPlayerDamage} incoming damage, ${state.enemyIntent.pendingEnemyHealing} enemy healing.`;
}

export function getRecentCombatLog(state: CombatEncounterState, count: number): string[] {
  return state.combatLog.slice(Math.max(0, state.combatLog.length - count));
}
