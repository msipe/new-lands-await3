import type { CombatEvent } from "./combat-event-bus";
import { buildRollCombatLogLines } from "./combat-log";
import {
  defaultRandomSource,
  type DiceEventCause,
  type DiceEventSource,
  type RandomSource,
} from "./dice";
import { getDieConstructById } from "./dice-constructs";
import { createDieFromConstruct } from "./dice-factory";

type EventMetaValue = string | number | boolean;

type ResolveTransientDieOptions = {
  constructId: string;
  parentDieId: string;
  source: DiceEventSource;
  cause: DiceEventCause;
  randomSource?: RandomSource;
  extraEventMeta?: Record<string, EventMetaValue>;
  onResolvedTransientDie?: (popupData: TransientDiePopupData) => void;
};

export type TransientDiePopupData = {
  constructId: string;
  dieLabel: string;
  sideLabel: string;
  popupText?: string;
  combatLogLines?: string[];
};

export function resolveTransientDieFromConstruct(options: ResolveTransientDieOptions): CombatEvent[] {
  const construct = getDieConstructById(options.constructId);
  const transientDie = createDieFromConstruct({
    construct,
    dieId: `${options.parentDieId}-transient-${construct.id}`,
    nameOverride: `${construct.name} (Transient)`,
  });

  const randomSource = options.randomSource ?? defaultRandomSource;
  const transientSide = transientDie.roll(randomSource);
  const popupText =
    typeof transientSide.getResolvePopupText === "function"
      ? transientSide.getResolvePopupText()
      : transientSide.label;

  const events = transientSide.resolve({
    source: options.source,
    cause: options.cause,
    dieId: options.parentDieId,
    randomSource: options.randomSource,
  });

  const combatLogLines = buildRollCombatLogLines({
    source: options.source,
    dieName: construct.name,
    side: transientSide,
    events,
  });

  options.onResolvedTransientDie?.({
    constructId: construct.id,
    dieLabel: construct.name,
    sideLabel: transientSide.label,
    popupText,
    combatLogLines,
  });

  return events.map((event) => ({
    ...event,
    meta: {
      ...(event.meta ?? {}),
      ...(options.extraEventMeta ?? {}),
      transientDie: true,
      transientDieConstructId: construct.id,
      transientDieLabel: construct.name,
      transientSideLabel: transientSide.label,
      transientPopupText: popupText,
      transientSideId: transientSide.id,
    },
  }));
}

export function getTransientDiePopupDataFromEvents(
  events: CombatEvent[],
): TransientDiePopupData | undefined {
  const transientEvent = events.find((event) => event.meta?.transientDie === true);
  if (!transientEvent) {
    return undefined;
  }

  const constructId =
    typeof transientEvent.meta?.transientDieConstructId === "string"
      ? transientEvent.meta.transientDieConstructId
      : undefined;

  const dieLabel =
    typeof transientEvent.meta?.transientDieLabel === "string"
      ? transientEvent.meta.transientDieLabel
      : undefined;

  const sideLabel =
    typeof transientEvent.meta?.transientSideLabel === "string"
      ? transientEvent.meta.transientSideLabel
      : undefined;

  const popupText =
    typeof transientEvent.meta?.transientPopupText === "string"
      ? transientEvent.meta.transientPopupText
      : undefined;

  if (!constructId || !dieLabel || !sideLabel) {
    return undefined;
  }

  return {
    constructId,
    dieLabel,
    sideLabel,
    popupText,
  };
}
