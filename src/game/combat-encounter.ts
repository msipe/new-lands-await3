import { CombatEvent, CombatEventBus } from "./combat-event-bus";
import {
  Die,
  type DieSide,
  EffectType,
  type RandomSource,
  defaultRandomSource,
} from "./dice";
import { getDieConstructById } from "./dice-constructs";
import { createDieFromConstruct } from "./dice-factory";
import { getEnemyById, listEnemies } from "../planning/content-registry";
import type { ContentEnemy } from "../planning/content-types";
import type { PlayerProgressionState } from "./player-progression";
import { EQUIPMENT_SLOT_ORDER } from "./player-items";
import { Ironhide, Miss, Warcry, WildStrike } from "./faces";

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
  ghostDie?: {
    isGhost: true;
    constructId: string;
    dieLabel: string;
    sideLabel: string;
  };
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
  playerAttackModifier: number;
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

function queueGhostResolutionPopupFromEvents(
  state: CombatEncounterState,
  source: "player" | "enemy",
  dieId: string,
  events: CombatEvent[],
): void {
  const ghostEvent = events.find((event) => event.meta?.ghostDie === true);
  if (!ghostEvent) {
    return;
  }

  const dieLabelMeta = ghostEvent.meta?.ghostDieLabel;
  const sideLabelMeta = ghostEvent.meta?.ghostSideLabel;
  const constructIdMeta = ghostEvent.meta?.ghostDieConstructId;
  const popupTextMeta = ghostEvent.meta?.ghostPopupText;
  if (
    typeof dieLabelMeta !== "string" ||
    typeof sideLabelMeta !== "string" ||
    typeof constructIdMeta !== "string"
  ) {
    return;
  }

  state.pendingResolutionPopups.push({
    source,
    dieId,
    text:
      typeof popupTextMeta === "string" && popupTextMeta.length > 0
        ? `Ghost ${popupTextMeta}`
        : `Ghost ${sideLabelMeta}`,
    ghostDie: {
      isGhost: true,
      constructId: constructIdMeta,
      dieLabel: dieLabelMeta,
      sideLabel: sideLabelMeta,
    },
  });
}

function getGhostRollSummaryFromEvents(
  events: CombatEvent[],
): { dieLabel: string; sideLabel: string; popupText?: string } | undefined {
  const ghostEvent = events.find((event) => event.meta?.ghostDie === true);
  if (!ghostEvent) {
    return undefined;
  }

  const dieLabelMeta = ghostEvent.meta?.ghostDieLabel;
  const sideLabelMeta = ghostEvent.meta?.ghostSideLabel;
  if (typeof dieLabelMeta !== "string" || typeof sideLabelMeta !== "string") {
    return undefined;
  }

  return {
    dieLabel: dieLabelMeta,
    sideLabel: sideLabelMeta,
    popupText: typeof ghostEvent.meta?.ghostPopupText === "string" ? ghostEvent.meta.ghostPopupText : undefined,
  };
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

function applyPlayerAttackModifier(state: CombatEncounterState, event: CombatEvent): CombatEvent {
  if (
    state.playerAttackModifier === 0 ||
    event.effect !== EffectType.Damage ||
    event.source !== "player" ||
    event.target !== "opponent"
  ) {
    return event;
  }

  const nextValue = Math.max(0, event.value + state.playerAttackModifier);
  if (nextValue === event.value) {
    return event;
  }

  return {
    ...event,
    value: nextValue,
    meta: {
      ...(event.meta ?? {}),
      warcryAppliedModifier: state.playerAttackModifier,
    },
  };
}

function bundleWildStrikeDamage(
  event: CombatEvent,
  triggeredEvents: CombatEvent[],
): { eventToApply: CombatEvent; remainingTriggeredEvents: CombatEvent[] } {
  const isWildStrikeBaseDamage =
    event.effect === EffectType.Damage &&
    event.source === "player" &&
    event.target === "opponent" &&
    event.meta?.wildStrike === true &&
    event.meta?.wildStrikeBonusApplied !== true;

  if (!isWildStrikeBaseDamage) {
    return {
      eventToApply: event,
      remainingTriggeredEvents: triggeredEvents,
    };
  }

  let bonusDamage = 0;
  const remainingTriggeredEvents: CombatEvent[] = [];

  for (const triggeredEvent of triggeredEvents) {
    const isWildStrikeBonusEvent =
      triggeredEvent.effect === EffectType.Damage &&
      triggeredEvent.meta?.wildStrikeBonusApplied === true &&
      triggeredEvent.dieId === event.dieId;

    if (isWildStrikeBonusEvent) {
      bonusDamage += Math.max(0, Math.floor(triggeredEvent.value));
      continue;
    }

    remainingTriggeredEvents.push(triggeredEvent);
  }

  if (bonusDamage <= 0) {
    return {
      eventToApply: event,
      remainingTriggeredEvents,
    };
  }

  return {
    eventToApply: {
      ...event,
      value: event.value + bonusDamage,
      meta: {
        ...(event.meta ?? {}),
        wildStrikeBundledBonus: bonusDamage,
      },
    },
    remainingTriggeredEvents,
  };
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

    const eventWithModifier = applyPlayerAttackModifier(state, event);

    const triggeredEvents = eventBus.publish(eventWithModifier).map((nextEvent) => ({
      ...nextEvent,
      cause: "triggered" as const,
    }));

    const {
      eventToApply,
      remainingTriggeredEvents,
    } = bundleWildStrikeDamage(eventWithModifier, triggeredEvents);

    applyCombatEvent(state, eventToApply);

    queue.push(...remainingTriggeredEvents);
  }
}

function summarizeWildStrikeGhostDamage(
  events: CombatEvent[],
): { weaponLabel: string; combinedDamage: number; popupText?: string } | undefined {
  const ghostEvent = events.find((event) => event.meta?.ghostDie === true);
  if (!ghostEvent) {
    return undefined;
  }

  const weaponLabel = ghostEvent.meta?.ghostDieLabel;
  if (typeof weaponLabel !== "string") {
    return undefined;
  }

  const baseDamage = events
    .filter(
      (event) =>
        event.effect === EffectType.Damage &&
        event.source === "player" &&
        event.target === "opponent" &&
        event.meta?.ghostDie === true,
    )
    .reduce((total, event) => total + Math.max(0, Math.floor(event.value)), 0);

  const bonusRaw = ghostEvent.meta?.wildStrikeBonus;
  const bonusDamage =
    baseDamage > 0 && typeof bonusRaw === "number" ? Math.max(0, Math.floor(bonusRaw)) : 0;
  const popupText =
    typeof ghostEvent.meta?.ghostPopupText === "string" ? ghostEvent.meta.ghostPopupText : undefined;

  return {
    weaponLabel,
    combinedDamage: baseDamage + bonusDamage,
    popupText,
  };
}

function normalizeWildStrikeWeaponLabel(weaponLabel: string): string {
  return weaponLabel.endsWith(" Die") ? weaponLabel.slice(0, -4) : weaponLabel;
}

function getWildStrikeVariantBonus(events: CombatEvent[]): number {
  const rawBonus = events.find((event) => event.meta?.wildStrike === true)?.meta?.wildStrikeBonus;
  return typeof rawBonus === "number" ? Math.max(0, Math.floor(rawBonus)) : 0;
}

function createMainhandGhostResolver(mainhandWeaponDiceId?: string) {
  return (context: { source: "player" | "enemy"; cause: "enemy-intent" | "player-roll" | "triggered"; dieId: string; randomSource?: RandomSource }) => {
    if (!mainhandWeaponDiceId) {
      return [] as CombatEvent[];
    }

    const construct = getDieConstructById(mainhandWeaponDiceId);
    const ghostDie = createDieFromConstruct({
      construct,
      dieId: `${context.dieId}-ghost-mainhand`,
      nameOverride: `${construct.name} (Ghost)`,
    });

    const ghostSide = ghostDie.roll(context.randomSource ?? defaultRandomSource);
    const ghostPopupText =
      typeof ghostSide.getResolvePopupText === "function"
        ? ghostSide.getResolvePopupText()
        : ghostSide.label;
    return ghostSide.resolve({
      source: context.source,
      cause: context.cause,
      dieId: context.dieId,
      randomSource: context.randomSource,
    }).map((event) => ({
      ...event,
      meta: {
        ...(event.meta ?? {}),
        ghostDie: true,
        ghostDieConstructId: construct.id,
        ghostDieLabel: construct.name,
        ghostSideLabel: ghostSide.label,
        ghostPopupText,
        ghostSideId: ghostSide.id,
      },
    }));
  };
}

function createWarcryDie(): Die {
  return new Die({
    id: "player-die-1",
    name: "Warcry Die",
    sides: [
      new Warcry("player-die-1-side-1", 3),
      new Warcry("player-die-1-side-2", 2),
      new Warcry("player-die-1-side-3", 1),
      new Warcry("player-die-1-side-4", 0),
      new Warcry("player-die-1-side-5", -1),
      new Warcry("player-die-1-side-6", -2),
    ],
  });
}

function createWildStrikeDie(mainhandWeaponDiceId?: string): Die {
  const resolveGhostWeaponEvents = createMainhandGhostResolver(mainhandWeaponDiceId);

  return new Die({
    id: "player-die-4",
    name: "Wild Strike Die",
    sides: [
      new WildStrike("player-die-4-side-1", 2, resolveGhostWeaponEvents),
      new WildStrike("player-die-4-side-2", 1, resolveGhostWeaponEvents),
      new WildStrike("player-die-4-side-3", 0, resolveGhostWeaponEvents),
      new Miss("player-die-4-side-4"),
      new Miss("player-die-4-side-5"),
      new Miss("player-die-4-side-6"),
    ],
  });
}

function createIronhideDie(): Die {
  return new Die({
    id: "player-die-5",
    name: "Ironhide Die",
    sides: [
      new Ironhide("player-die-5-side-1", 5),
      new Ironhide("player-die-5-side-2", 4),
      new Ironhide("player-die-5-side-3", 3),
      new Ironhide("player-die-5-side-4", 2),
      new Ironhide("player-die-5-side-5", 0),
      new Ironhide("player-die-5-side-6", 0),
    ],
  });
}

function registerWildStrikeBonusSubscriber(eventBus: CombatEventBus): void {
  eventBus.subscribe(EffectType.Damage, (event) => {
    const bonusRaw = event.meta?.wildStrikeBonus;
    const bonus = typeof bonusRaw === "number" ? Math.floor(bonusRaw) : 0;

    if (event.meta?.wildStrikeBonusApplied === true) {
      return [];
    }

    if (
      bonus <= 0 ||
      event.source !== "player" ||
      event.target !== "opponent" ||
      event.value <= 0 ||
      event.meta?.wildStrike !== true
    ) {
      return [];
    }

    return [
      {
        effect: EffectType.Damage,
        value: bonus,
        source: event.source,
        target: event.target,
        cause: "triggered",
        dieId: event.dieId,
        sideId: `${event.sideId}-wild-strike-bonus`,
        meta: {
          ...(event.meta ?? {}),
          wildStrikeBonusApplied: true,
        },
      },
    ];
  });
}

function createPlayerDice(progression?: PlayerProgressionState): Die[] {
  const mainhandWeaponDiceId = progression
    ? progression.items.equipped["weapon-1"]?.diceId
    : "spark-die";

  const wardConstruct = getDieConstructById("ward-die");
  const mendConstruct = getDieConstructById("mend-die");

  const baseDice = [
    createWarcryDie(),
    createDieFromConstruct({ construct: wardConstruct, dieId: "player-die-2" }),
    createDieFromConstruct({ construct: mendConstruct, dieId: "player-die-3" }),
    createWildStrikeDie(mainhandWeaponDiceId),
    createIronhideDie(),
  ];

  if (!progression) {
    return baseDice;
  }

  const equipmentDice: Die[] = [];
  let equipmentIndex = 1;

  for (const slotId of EQUIPMENT_SLOT_ORDER) {
    const equippedItem = progression.items.equipped[slotId];
    const diceId = equippedItem?.diceId;
    if (!diceId) {
      continue;
    }

    const construct = getDieConstructById(diceId);
    equipmentDice.push(
      createDieFromConstruct({
        construct,
        dieId: `equipped-${slotId}-${equipmentIndex}`,
      }),
    );
    equipmentIndex += 1;
  }

  return [...baseDice, ...equipmentDice];
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
  },
): { state: CombatEncounterState; eventBus: CombatEventBus } {
  const randomSource = options?.randomSource ?? defaultRandomSource;
  const eventBus = options?.eventBus ?? new CombatEventBus();
  registerWildStrikeBonusSubscriber(eventBus);
  const enemyTemplate =
    options?.enemyId !== undefined
      ? createEnemyTemplate(getEnemyById(options.enemyId))
      : createStubEnemies()[0];

  const player: CombatActor = {
    id: "player",
    name: "Arcanist",
    level: options?.playerProgression?.level ?? 1,
    hp: options?.playerProgression?.maxHp ?? 20,
    maxHp: options?.playerProgression?.maxHp ?? 20,
    armor: 0,
    dice: createPlayerDice(options?.playerProgression),
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
    playerAttackModifier: 0,
  };

  enterEnemyTurn(state);

  return { state, eventBus };
}

function startNextRound(state: CombatEncounterState, randomSource: RandomSource): void {
  state.round += 1;
  state.playerRollIndex = 0;
  state.rolledPlayerDieIds = [];
  state.enemyIntent = buildEnemyIntent(state.enemy, randomSource);
  state.playerAttackModifier = 0;

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

  state.playerAttackModifier = 0;

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
  if (side instanceof Warcry) {
    state.playerAttackModifier = side.getAttackModifier();
  }

  const events = side.resolve({
    source: "player",
    cause: "player-roll",
    dieId: die.id,
    randomSource,
  });

  const isWildStrikeRoll = die.name === "Wild Strike Die";
  if (isWildStrikeRoll) {
    state.combatLog.push("Player rolls Wild Strike.");
  } else if (side instanceof Warcry) {
    const signedModifier = state.playerAttackModifier >= 0
      ? `+${state.playerAttackModifier}`
      : `${state.playerAttackModifier}`;
    state.combatLog.push(
      `Player rolls ${die.name}: ${side.label} (attacks ${signedModifier} this turn).`,
    );
  } else {
    state.combatLog.push(`Player rolls ${die.name}: ${side.label}.`);
  }

  if (isWildStrikeRoll) {
    const ghostDamageSummary = summarizeWildStrikeGhostDamage(events);
    const variantBonus = getWildStrikeVariantBonus(events);
    if (!ghostDamageSummary) {
      state.combatLog.push(`  > Miss (Wild Strike +${variantBonus})`);
    } else if (ghostDamageSummary.combinedDamage > 0) {
      state.combatLog.push(`  > Success (Wild Strike +${variantBonus})`);
      state.combatLog.push(
        `${normalizeWildStrikeWeaponLabel(ghostDamageSummary.weaponLabel)} (from Wild Strike):`,
      );
      state.combatLog.push(`  > ${ghostDamageSummary.combinedDamage} damage`);
    } else {
      state.combatLog.push(`  > Backfire (Wild Strike +${variantBonus})`);
      state.combatLog.push(
        `${normalizeWildStrikeWeaponLabel(ghostDamageSummary.weaponLabel)} (from Wild Strike):`,
      );
      state.combatLog.push(`  > ${ghostDamageSummary.popupText ?? "No effect"}`);
    }
  }

  resolveImmediateEvents(state, eventBus, events);
  queueResolutionPopup(state, "player", die.id, side);
  queueGhostResolutionPopupFromEvents(state, "player", die.id, events);

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
