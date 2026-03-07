import type { CombatEvent } from "./combat-event-bus";
import type { DiceEventSource, DieSide } from "./dice";

export type CombatLogRollContext = {
  source: DiceEventSource;
  dieName: string;
  side: DieSide;
  events: CombatEvent[];
};

type CombatLogRollAwareSide = DieSide & {
  getCombatLogLines?: (context: CombatLogRollContext) => string[];
};

function actorLabel(source: DiceEventSource): string {
  return source === "player" ? "Player" : "Enemy";
}

function buildGenericRollLine(context: CombatLogRollContext): string {
  return `${actorLabel(context.source)} rolls ${context.dieName}: ${context.side.label}.`;
}

export function buildRollCombatLogLines(context: CombatLogRollContext): string[] {
  const rollAwareSide = context.side as CombatLogRollAwareSide;

  if (typeof rollAwareSide.getCombatLogLines === "function") {
    const customLines = rollAwareSide.getCombatLogLines(context);
    if (customLines.length > 0) {
      return customLines;
    }
  }

  return [buildGenericRollLine(context)];
}
