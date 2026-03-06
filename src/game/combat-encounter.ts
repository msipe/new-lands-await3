import { CombatEvent, CombatEventBus } from "./combat-event-bus";
import {
  type Die,
  type DieSide,
  EffectType,
  type RandomSource,
  defaultRandomSource,
} from "./dice";
import { getDieConstructById } from "./dice-constructs";
import { createDieFromConstruct } from "./dice-factory";
import { getEnemyById, listEnemies } from "../planning/content-registry";
import type { ContentEnemy } from "../planning/content-types";

type CombatActor = {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  armor: number;
  dice: Die[];
};

export type EnemyStub = {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  dice: Die[];
};

function createEnemyTemplate(enemy: ContentEnemy): EnemyStub {
  return {
    id: enemy.id,
    name: enemy.name,
    level: enemy.level,
    maxHp: enemy.hp,
    dice: enemy.dice.map((constructId, index) => {
      const construct = getDieConstructById(constructId);
      return createDieFromConstruct({
        construct,
        dieId: `${enemy.id}-die-${index + 1}`,
      });
    }),
  };
}

export type PendingEnemyIntent = {
  events: CombatEvent[];
  eventsByDieId: Record<string, CombatEvent[]>;
  sideByDieId: Record<string, DieSide>;
  dieOrder: string[];
  pendingPlayerDamage: number;
  pendingEnemyHealing: number;
};

export type CombatResolutionPopup = {
  source: "player" | "enemy";
  dieId: string;
  text: string;
  sideLabel?: string;
};

export type CombatEncounterState = {
  player: CombatActor;
  enemy: CombatActor;
  round: number;
  phase: "player-turn" | "enemy-turn" | "resolved";
  playerRollIndex: number;
  rolledPlayerDieIds: string[];
  pendingEnemyDieIds: string[];
  resolvedEnemyDieIds: string[];
  enemyIntent: PendingEnemyIntent;
  combatLog: string[];
  pendingResolutionPopups: CombatResolutionPopup[];
};

function enterEnemyTurn(state: CombatEncounterState): void {
  state.phase = "enemy-turn";
  state.pendingEnemyDieIds =
    state.enemyIntent.dieOrder.length > 0
      ? [...state.enemyIntent.dieOrder]
      : state.enemy.dice.map((die) => die.id);
  state.resolvedEnemyDieIds = [];
  state.combatLog.push("Enemy dice begin resolving.");
}

function queueResolutionPopup(
  state: CombatEncounterState,
  source: "player" | "enemy",
  dieId: string,
  side: DieSide,
): void {
  const popupText =
    typeof side.getResolvePopupText === "function" ? side.getResolvePopupText() : side.label;

  state.pendingResolutionPopups.push({
    source,
    dieId,
    text: popupText,
    sideLabel: side.label,
  });
}

function applyCombatEvent(state: CombatEncounterState, event: CombatEvent): void {
  const appliesToPlayer =
    (event.source === "enemy" && event.target === "opponent") ||
    (event.source === "player" && event.target === "self");

  const recipient = appliesToPlayer ? state.player : state.enemy;
  const recipientLabel = appliesToPlayer ? "Player" : "Enemy";

  if (event.effect === EffectType.Damage) {
    let remainingDamage = event.value;
    if (recipient.armor > 0) {
      const absorbed = Math.min(recipient.armor, remainingDamage);
      recipient.armor -= absorbed;
      remainingDamage -= absorbed;
      state.combatLog.push(`${recipientLabel} blocks ${absorbed} damage.`);
    }

    if (remainingDamage > 0) {
      recipient.hp = Math.max(0, recipient.hp - remainingDamage);
      state.combatLog.push(`${recipientLabel} takes ${remainingDamage} damage.`);
    }
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
  const sparkConstruct = getDieConstructById("spark-die");
  const wardConstruct = getDieConstructById("ward-die");
  const mendConstruct = getDieConstructById("mend-die");

  return [
    createDieFromConstruct({ construct: sparkConstruct, dieId: "player-die-1" }),
    createDieFromConstruct({ construct: wardConstruct, dieId: "player-die-2" }),
    createDieFromConstruct({ construct: mendConstruct, dieId: "player-die-3" }),
  ];
}

export function createStubEnemies(): EnemyStub[] {
  return listEnemies().map((entry) => createEnemyTemplate(entry));
}

function buildEnemyIntent(
  enemy: CombatActor,
  randomSource: RandomSource,
): PendingEnemyIntent {
  const events: CombatEvent[] = [];
  const eventsByDieId: Record<string, CombatEvent[]> = {};
  const sideByDieId: Record<string, DieSide> = {};
  const dieOrder: string[] = [];

  for (const die of enemy.dice) {
    const side = die.roll(randomSource);
    const dieEvents = side.resolve({
      source: "enemy",
      cause: "enemy-intent",
      dieId: die.id,
    });

    eventsByDieId[die.id] = dieEvents;
    sideByDieId[die.id] = side;
    dieOrder.push(die.id);
    events.push(...dieEvents);
  }

  return {
    events,
    eventsByDieId,
    sideByDieId,
    dieOrder,
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
    options?.enemyId !== undefined
      ? createEnemyTemplate(getEnemyById(options.enemyId))
      : createStubEnemies()[0];

  const player: CombatActor = {
    id: "player",
    name: "Arcanist",
    level: 1,
    hp: 20,
    maxHp: 20,
    armor: 0,
    dice: createPlayerDice(),
  };

  const enemy: CombatActor = {
    id: enemyTemplate.id,
    name: enemyTemplate.name,
    level: enemyTemplate.level,
    hp: enemyTemplate.maxHp,
    maxHp: enemyTemplate.maxHp,
    armor: 0,
    dice: enemyTemplate.dice,
  };

  const enemyIntent = buildEnemyIntent(enemy, randomSource);
  const state: CombatEncounterState = {
    player,
    enemy,
    round: 1,
    phase: "enemy-turn",
    playerRollIndex: 0,
    rolledPlayerDieIds: [],
    pendingEnemyDieIds: [],
    resolvedEnemyDieIds: [],
    enemyIntent,
    combatLog: [
      `Round 1 begins.`,
      `${enemy.name} prepares ${enemyIntent.pendingPlayerDamage} damage and ${enemyIntent.pendingEnemyHealing} healing.`,
    ],
    pendingResolutionPopups: [],
  };

  enterEnemyTurn(state);

  return { state, eventBus };
}

function startNextRound(state: CombatEncounterState, randomSource: RandomSource): void {
  state.round += 1;
  state.playerRollIndex = 0;
  state.rolledPlayerDieIds = [];
  state.player.armor = 0;
  state.enemy.armor = 0;
  state.enemyIntent = buildEnemyIntent(state.enemy, randomSource);

  state.combatLog.push(`Round ${state.round} begins.`);
  state.combatLog.push(
    `${state.enemy.name} prepares ${state.enemyIntent.pendingPlayerDamage} damage and ${state.enemyIntent.pendingEnemyHealing} healing.`,
  );

  enterEnemyTurn(state);
}

function beginEnemyResolutionIfNeeded(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource,
): CombatEncounterState {
  if (state.rolledPlayerDieIds.length < state.player.dice.length) {
    return state;
  }

  if (state.enemy.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Enemy defeated before intent resolves.");
    return state;
  }

  for (const dieId of state.enemyIntent.dieOrder) {
    if (!state.resolvedEnemyDieIds.includes(dieId)) {
      continue;
    }

    const events = state.enemyIntent.eventsByDieId[dieId] ?? [];
    resolveImmediateEvents(state, eventBus, events);
  }

  state.combatLog.push("Enemy intent resolves.");

  if (state.player.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Player defeated.");
    return state;
  }

  startNextRound(state, randomSource);
  return state;
}

export function rollPlayerDie(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  dieId: string,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (state.phase !== "player-turn") {
    return state;
  }

  if (state.rolledPlayerDieIds.includes(dieId)) {
    return state;
  }

  const die = state.player.dice.find((entry) => entry.id === dieId);
  if (!die) {
    return state;
  }

  const side = die.roll(randomSource);
  const events = side.resolve({
    source: "player",
    cause: "player-roll",
    dieId: die.id,
  });

  state.combatLog.push(`Player rolls ${die.name}: ${side.label}.`);
  resolveImmediateEvents(state, eventBus, events);
  queueResolutionPopup(state, "player", die.id, side);
  state.rolledPlayerDieIds.push(die.id);
  state.playerRollIndex = state.rolledPlayerDieIds.length;

  if (state.enemy.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Enemy defeated.");
    return state;
  }

  return beginEnemyResolutionIfNeeded(state, eventBus, randomSource);
}

export function rollNextPlayerDie(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (state.phase !== "player-turn") {
    return state;
  }

  const nextDie = state.player.dice.find((die) => !state.rolledPlayerDieIds.includes(die.id));
  if (!nextDie) {
    return beginEnemyResolutionIfNeeded(state, eventBus, randomSource);
  }

  return rollPlayerDie(state, eventBus, nextDie.id, randomSource);
}

export function resolveEnemyDie(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  dieId: string,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (state.phase !== "enemy-turn") {
    return state;
  }

  if (!state.pendingEnemyDieIds.includes(dieId)) {
    return state;
  }

  const die = state.enemy.dice.find((entry) => entry.id === dieId);
  if (!die) {
    return state;
  }

  const side = state.enemyIntent.sideByDieId[dieId];
  const sideLabel = side?.label ?? "No Effect";

  state.combatLog.push(`Enemy rolls ${die.name}: ${sideLabel}.`);
  if (side !== undefined) {
    queueResolutionPopup(state, "enemy", die.id, side);
  }

  state.pendingEnemyDieIds = state.pendingEnemyDieIds.filter((entry) => entry !== dieId);
  if (!state.resolvedEnemyDieIds.includes(dieId)) {
    state.resolvedEnemyDieIds.push(dieId);
  }

  if (state.pendingEnemyDieIds.length > 0) {
    return state;
  }

  state.phase = "player-turn";
  state.playerRollIndex = 0;
  state.rolledPlayerDieIds = [];
  state.combatLog.push("Enemy intent revealed. Player turn begins.");
  return state;
}

export function resolveNextEnemyDie(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (state.phase !== "enemy-turn") {
    return state;
  }

  const nextEnemyDieId = state.pendingEnemyDieIds[0];
  if (!nextEnemyDieId) {
    return state;
  }

  return resolveEnemyDie(state, eventBus, nextEnemyDieId, randomSource);
}

export function drainResolutionPopups(state: CombatEncounterState): CombatResolutionPopup[] {
  if (state.pendingResolutionPopups.length === 0) {
    return [];
  }

  const popups = [...state.pendingResolutionPopups];
  state.pendingResolutionPopups = [];
  return popups;
}

export function getEnemyIntentSummary(state: CombatEncounterState): string {
  return `Enemy intent: ${state.enemyIntent.pendingPlayerDamage} incoming damage, ${state.enemyIntent.pendingEnemyHealing} enemy healing.`;
}

export function getRecentCombatLog(state: CombatEncounterState, count: number): string[] {
  return state.combatLog.slice(Math.max(0, state.combatLog.length - count));
}
