import {
  CombatActionType,
  CombatEvent,
  CombatEventBus,
  type CombatEventModifierRegistration,
} from "./combat-event-bus";
import {
  Die,
  type DieSide,
  EffectType,
  type RandomSource,
  defaultRandomSource,
} from "./dice";
import { getDieConstructById } from "./dice-constructs";
import { createDieFromConstruct } from "./dice-factory";
import { createPlayerCombatDiceLoadout } from "./dice-constructs/player-combat-dice";
import { buildRollCombatLogLines } from "./combat-log";
import { getTransientDiePopupDataFromEvents } from "./transient-die";
import type {
  PlayerRollConversionRequest,
  QueuedPlayerRollConversion,
} from "./player-roll-conversions";
import { getEnemyById, listEnemies } from "../planning/content-registry";
import type { ContentEnemy } from "../planning/content-types";
import { createPlayerProgression, type PlayerProgressionState } from "./player-progression";

type CombatActor = {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  armor: number;
  dice: Die[];
};

export type DieFacePowerSnapshot = {
  sideId: string;
  baseIndex: number;
  power: number;
  isCriticalHit: boolean;
  isCriticalMiss: boolean;
};

export type DiePowerSnapshot = {
  dieId: string;
  totalPower: number;
  orderedFaces: DieFacePowerSnapshot[];
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
  sidePower?: number;
  sidePowerTone?: "positive" | "negative" | "neutral";
  isCriticalHit?: boolean;
  isCriticalMiss?: boolean;
  spawnedDie?: {
    constructId: string;
    dieLabel: string;
    sideLabel: string;
  };
};

export type CombatEncounterState = {
  player: CombatActor;
  enemy: CombatActor;
  playerEnergyMax: number;
  playerEnergyCurrent: number;
  round: number;
  phase: "player-turn" | "enemy-turn" | "resolved";
  playerRollIndex: number;
  rolledPlayerDieIds: string[];
  pendingEnemyDieIds: string[];
  resolvedEnemyDieIds: string[];
  enemyIntent: PendingEnemyIntent;
  diePowerById: Record<string, DiePowerSnapshot>;
  queuedPlayerRollConversions: QueuedPlayerRollConversion[];
  nextPlayerRollConversionId: number;
  combatLog: string[];
  pendingResolutionPopups: CombatResolutionPopup[];
};

function roundPower(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getSidePower(side: DieSide): number {
  return typeof side.power === "number" && Number.isFinite(side.power) ? side.power : 0;
}

function buildDiePowerSnapshot(die: Die): DiePowerSnapshot {
  const faces = die.sides.map((side, index) => ({
    sideId: side.id,
    baseIndex: index,
    power: roundPower(getSidePower(side)),
  }));

  const totalPower = roundPower(faces.reduce((sum, face) => sum + face.power, 0));
  const sortedFaces = [...faces].sort((left, right) => {
    if (right.power !== left.power) {
      return right.power - left.power;
    }

    return left.baseIndex - right.baseIndex;
  });

  const highestPower = sortedFaces[0]?.power ?? 0;
  const lowestPower = sortedFaces[sortedFaces.length - 1]?.power ?? 0;

  return {
    dieId: die.id,
    totalPower,
    orderedFaces: sortedFaces.map((face) => ({
      ...face,
      isCriticalHit: face.power === highestPower,
      isCriticalMiss: face.power === lowestPower,
    })),
  };
}

function buildCombatDiePowerSnapshotById(actors: CombatActor[]): Record<string, DiePowerSnapshot> {
  const byId: Record<string, DiePowerSnapshot> = {};

  for (const actor of actors) {
    for (const die of actor.dice) {
      byId[die.id] = buildDiePowerSnapshot(die);
    }
  }

  return byId;
}

export function getDiePowerSnapshot(
  state: CombatEncounterState,
  dieId: string,
): DiePowerSnapshot | undefined {
  return state.diePowerById[dieId];
}

function getDieFacePowerSnapshot(
  state: CombatEncounterState,
  dieId: string,
  sideId: string,
): DieFacePowerSnapshot | undefined {
  return state.diePowerById[dieId]?.orderedFaces.find((face) => face.sideId === sideId);
}

function getPlayerEnergyMax(playerProgression: PlayerProgressionState): number {
  if (playerProgression.classId === "class:warrior") {
    return 3;
  }

  return 3;
}

function canPlayerAffordAnyRemainingDie(state: CombatEncounterState): boolean {
  const remainingDice = state.player.dice.filter((die) => !state.rolledPlayerDieIds.includes(die.id));
  return remainingDice.some((die) => die.energyCost <= state.playerEnergyCurrent);
}

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
  const basePopupText =
    typeof side.getResolvePopupText === "function" ? side.getResolvePopupText() : side.label;
  const facePower = getDieFacePowerSnapshot(state, dieId, side.id);
  const tags: string[] = [];
  if (facePower?.isCriticalHit) {
    tags.push("CRIT");
  }
  if (facePower?.isCriticalMiss) {
    tags.push("CRITICAL MISS");
  }

  const popupText = tags.length > 0 ? `${tags.join(" | ")}: ${basePopupText}` : basePopupText;
  const sidePower = facePower?.power;
  const sidePowerTone = sidePower === undefined ? undefined : sidePower > 0 ? "positive" : sidePower < 0 ? "negative" : "neutral";

  state.pendingResolutionPopups.push({
    source,
    dieId,
    text: popupText,
    sideLabel: side.label,
    sidePower,
    sidePowerTone,
    isCriticalHit: facePower?.isCriticalHit,
    isCriticalMiss: facePower?.isCriticalMiss,
  });
}

function queueSpawnedDiePopupFromEvents(
  state: CombatEncounterState,
  source: "player" | "enemy",
  dieId: string,
  events: CombatEvent[],
  side?: DieSide,
): void {
  const spawnedPopupSide = side as SpawnedDiePopupSide | undefined;
  const transientPopups = spawnedPopupSide?.getSpawnedDicePopupData?.() ?? [];

  const popupsToQueue =
    transientPopups.length > 0
      ? transientPopups
      : [
          getTransientDiePopupDataFromEvents(events) ??
            spawnedPopupSide?.getSpawnedDiePopupData?.(),
        ].filter((popup): popup is NonNullable<typeof popup> => popup !== undefined);

  if (popupsToQueue.length === 0) {
    return;
  }

  for (const transientPopup of popupsToQueue) {
    state.pendingResolutionPopups.push({
      source,
      dieId,
      text:
        typeof transientPopup.popupText === "string" && transientPopup.popupText.length > 0
          ? `Transient ${transientPopup.popupText}`
          : `Transient ${transientPopup.sideLabel}`,
      spawnedDie: {
        constructId: transientPopup.constructId,
        dieLabel: transientPopup.dieLabel,
        sideLabel: transientPopup.sideLabel,
      },
    });
  }
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

  if (event.effect === EffectType.Armor) {
    recipient.armor = Math.max(0, recipient.armor + Math.max(0, Math.floor(event.value)));
    state.combatLog.push(`${recipientLabel} gains ${Math.max(0, Math.floor(event.value))} armor.`);
    return;
  }

  recipient.hp = Math.min(recipient.maxHp, recipient.hp + event.value);
  state.combatLog.push(`${recipientLabel} heals ${event.value}.`);
}

type CombatEventModifierSide = DieSide & {
  createCombatEventModifier?: () => CombatEventModifierRegistration;
};

type SpawnedDiePopupSide = DieSide & {
  getSpawnedDiePopupData?: () => {
    constructId: string;
    dieLabel: string;
    sideLabel: string;
    popupText?: string;
  } | undefined;
  getSpawnedDicePopupData?: () => Array<{
    constructId: string;
    dieLabel: string;
    sideLabel: string;
    popupText?: string;
  }>;
};

type PlayerRollConversionProviderSide = DieSide & {
  getPlayerRollConversionRequests?: () => PlayerRollConversionRequest[];
};

function getSideIndexById(die: Die, sideId: string): number {
  return die.sides.findIndex((side) => side.id === sideId);
}

function getCriticalSideIndex(
  state: CombatEncounterState,
  die: Die,
  criticalType: "hit" | "miss",
  selectedSideIndex: number,
): number {
  const snapshot = state.diePowerById[die.id];
  if (!snapshot || snapshot.orderedFaces.length === 0) {
    return selectedSideIndex;
  }

  const candidates = snapshot.orderedFaces.filter((face) =>
    criticalType === "hit" ? face.isCriticalHit : face.isCriticalMiss,
  );

  if (candidates.length === 0) {
    return selectedSideIndex;
  }

  const selectedSide = die.sides[selectedSideIndex];
  if (selectedSide && candidates.some((face) => face.sideId === selectedSide.id)) {
    return selectedSideIndex;
  }

  const chosen = candidates[0];
  const chosenIndex = getSideIndexById(die, chosen.sideId);
  return chosenIndex >= 0 ? chosenIndex : selectedSideIndex;
}

function getShiftedPowerSideIndex(
  state: CombatEncounterState,
  die: Die,
  selectedSideIndex: number,
  shift: -1 | 1,
): number {
  const snapshot = state.diePowerById[die.id];
  const selectedSide = die.sides[selectedSideIndex];
  if (!snapshot || !selectedSide) {
    return selectedSideIndex;
  }

  const selectedFace = snapshot.orderedFaces.find((face) => face.sideId === selectedSide.id);
  if (!selectedFace) {
    return selectedSideIndex;
  }

  const uniquePowerLevels = [...new Set(snapshot.orderedFaces.map((face) => face.power))];
  const currentLevelIndex = uniquePowerLevels.findIndex((power) => power === selectedFace.power);
  if (currentLevelIndex === -1) {
    return selectedSideIndex;
  }

  const targetLevelIndex = Math.max(
    0,
    Math.min(
      uniquePowerLevels.length - 1,
      shift > 0 ? currentLevelIndex - 1 : currentLevelIndex + 1,
    ),
  );
  const targetPower = uniquePowerLevels[targetLevelIndex];
  if (targetPower === selectedFace.power) {
    return selectedSideIndex;
  }

  const targetFace = snapshot.orderedFaces.find((face) => face.power === targetPower);
  if (!targetFace) {
    return selectedSideIndex;
  }

  const targetIndex = getSideIndexById(die, targetFace.sideId);
  return targetIndex >= 0 ? targetIndex : selectedSideIndex;
}

function applyQueuedPlayerRollConversion(
  state: CombatEncounterState,
  die: Die,
  selectedSideIndex: number,
): { selectedSideIndex: number; applied?: QueuedPlayerRollConversion } {
  const conversion = state.queuedPlayerRollConversions.shift();
  if (!conversion) {
    return { selectedSideIndex };
  }

  switch (conversion.kind) {
    case "to-critical-hit":
      return {
        selectedSideIndex: getCriticalSideIndex(state, die, "hit", selectedSideIndex),
        applied: conversion,
      };
    case "to-critical-miss":
      return {
        selectedSideIndex: getCriticalSideIndex(state, die, "miss", selectedSideIndex),
        applied: conversion,
      };
    case "shift-power":
      return {
        selectedSideIndex: getShiftedPowerSideIndex(state, die, selectedSideIndex, conversion.shift),
        applied: conversion,
      };
    default:
      return { selectedSideIndex, applied: conversion };
  }
}

function queuePlayerRollConversionsFromSide(
  state: CombatEncounterState,
  dieId: string,
  side: DieSide,
): void {
  const provider = side as PlayerRollConversionProviderSide;
  const requests = provider.getPlayerRollConversionRequests?.() ?? [];
  if (requests.length === 0) {
    return;
  }

  for (const request of requests) {
    const queued: QueuedPlayerRollConversion = {
      ...request,
      id: `player-roll-conversion-${state.nextPlayerRollConversionId}`,
      sourceDieId: dieId,
      sourceSideId: side.id,
    };
    state.nextPlayerRollConversionId += 1;
    state.queuedPlayerRollConversions.push(queued);
    state.combatLog.push(`Focus effect queued: ${request.description}`);
  }
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

    const preparedEvent = eventBus.prepareEvent(event);

    const triggeredEvents = eventBus.publish(preparedEvent, { alreadyPrepared: true }).map((nextEvent) => ({
      ...nextEvent,
      cause: "triggered" as const,
    }));

    applyCombatEvent(state, preparedEvent);

    queue.push(...triggeredEvents);
  }
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
    playerProgression?: PlayerProgressionState;
    playerDice?: Die[];
  },
): { state: CombatEncounterState; eventBus: CombatEventBus } {
  const randomSource = options?.randomSource ?? defaultRandomSource;
  const eventBus = options?.eventBus ?? new CombatEventBus();
  const playerProgression = options?.playerProgression ?? createPlayerProgression();
  const enemyTemplate =
    options?.enemyId !== undefined
      ? createEnemyTemplate(getEnemyById(options.enemyId))
      : createStubEnemies()[0];

  const player: CombatActor = {
    id: "player",
    name: "Arcanist",
    level: playerProgression.level,
    hp: playerProgression.maxHp,
    maxHp: playerProgression.maxHp,
    armor: 0,
    dice: options?.playerDice ?? createPlayerCombatDiceLoadout(playerProgression),
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
  const diePowerById = buildCombatDiePowerSnapshotById([player, enemy]);
  const state: CombatEncounterState = {
    player,
    enemy,
    playerEnergyMax: getPlayerEnergyMax(playerProgression),
    playerEnergyCurrent: getPlayerEnergyMax(playerProgression),
    round: 1,
    phase: "enemy-turn",
    playerRollIndex: 0,
    rolledPlayerDieIds: [],
    pendingEnemyDieIds: [],
    resolvedEnemyDieIds: [],
    enemyIntent,
    diePowerById,
    queuedPlayerRollConversions: [],
    nextPlayerRollConversionId: 1,
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
  state.playerEnergyCurrent = state.playerEnergyMax;
  state.playerRollIndex = 0;
  state.rolledPlayerDieIds = [];
  state.enemyIntent = buildEnemyIntent(state.enemy, randomSource);

  state.combatLog.push(`Round ${state.round} begins.`);
  state.combatLog.push(
    `${state.enemy.name} prepares ${state.enemyIntent.pendingPlayerDamage} damage and ${state.enemyIntent.pendingEnemyHealing} healing.`,
  );

  enterEnemyTurn(state);
}

function resolveEnemyIntentAndAdvanceRound(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource,
): CombatEncounterState {
  eventBus.emitAction({ type: CombatActionType.PlayerTurnEnded });

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

  if (die.energyCost > state.playerEnergyCurrent) {
    return state;
  }

  const rollResult = die.rollWithDetails(randomSource);
  const convertedRoll = applyQueuedPlayerRollConversion(state, die, rollResult.selectedSideIndex);
  const side = die.sides[convertedRoll.selectedSideIndex] ?? rollResult.side;

  if (convertedRoll.applied) {
    state.combatLog.push(
      `Focus effect applied: ${convertedRoll.applied.description} on ${die.name}.`,
    );
  }

  const eventModifier = (side as CombatEventModifierSide).createCombatEventModifier?.();
  if (eventModifier) {
    eventBus.subscribeModifier(eventModifier.definition, eventModifier.modifier);
  }

  const events = side.resolve({
    source: "player",
    cause: "player-roll",
    dieId: die.id,
    randomSource,
  });

  state.combatLog.push(
    ...buildRollCombatLogLines({
      source: "player",
      dieName: die.name,
      side,
      events,
    }),
  );

  resolveImmediateEvents(state, eventBus, events);
  queueResolutionPopup(state, "player", die.id, side);
  queueSpawnedDiePopupFromEvents(state, "player", die.id, events, side);
  queuePlayerRollConversionsFromSide(state, die.id, side);

  state.playerEnergyCurrent = Math.max(0, state.playerEnergyCurrent - die.energyCost);
  state.rolledPlayerDieIds.push(die.id);
  state.playerRollIndex = state.rolledPlayerDieIds.length;

  if (state.enemy.hp <= 0) {
    state.phase = "resolved";
    state.combatLog.push("Enemy defeated.");
    return state;
  }

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

  const nextDie = state.player.dice.find(
    (die) => !state.rolledPlayerDieIds.includes(die.id) && die.energyCost <= state.playerEnergyCurrent,
  );
  if (!nextDie) {
    return state;
  }

  return rollPlayerDie(state, eventBus, nextDie.id, randomSource);
}

export function canEndPlayerTurn(state: CombatEncounterState): boolean {
  return state.phase === "player-turn";
}

export function endPlayerTurn(
  state: CombatEncounterState,
  eventBus: CombatEventBus,
  randomSource: RandomSource = defaultRandomSource,
): CombatEncounterState {
  if (!canEndPlayerTurn(state)) {
    return state;
  }

  return resolveEnemyIntentAndAdvanceRound(state, eventBus, randomSource);
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
  eventBus.emitAction({ type: CombatActionType.EnemyTurnEnded });
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
