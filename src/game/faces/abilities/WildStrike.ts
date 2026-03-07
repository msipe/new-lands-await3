import { CombatEventBus, type CombatEvent } from "../../combat-event-bus";
import type { CombatLogRollContext } from "../../combat-log";
import { EffectType, defaultRandomSource, type RandomSource } from "../../dice";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

type ResolveGhostWeaponEvents = (context: FaceResolveContext, randomSource: RandomSource) => CombatEvent[];

export type WildStrikeRollSummary = {
  outcome: "miss" | "success" | "backfire";
  variantBonus: number;
  combinedDamage: number;
  weaponLabel?: string;
  popupText?: string;
};

function hasWildStrikeMeta(event: CombatEvent): boolean {
  return event.meta?.wildStrike === true;
}

function getWildStrikeBonusValue(rawBonus: unknown): number {
  return typeof rawBonus === "number" ? Math.max(0, Math.floor(rawBonus)) : 0;
}

function isWildStrikeBaseDamageEvent(event: CombatEvent): boolean {
  return (
    event.effect === EffectType.Damage &&
    event.source === "player" &&
    event.target === "opponent" &&
    hasWildStrikeMeta(event) &&
    event.meta?.wildStrikeBonusApplied !== true
  );
}

export function getWildStrikeVariantBonus(events: CombatEvent[]): number {
  const rawBonus = events.find(hasWildStrikeMeta)?.meta?.wildStrikeBonus;
  return getWildStrikeBonusValue(rawBonus);
}

export function normalizeWildStrikeWeaponLabel(weaponLabel: string): string {
  return weaponLabel.endsWith(" Die") ? weaponLabel.slice(0, -4) : weaponLabel;
}

export function summarizeWildStrikeRoll(events: CombatEvent[]): WildStrikeRollSummary {
  const variantBonus = getWildStrikeVariantBonus(events);
  const ghostEvent = events.find((event) => event.meta?.ghostDie === true);

  if (!ghostEvent) {
    return {
      outcome: "miss",
      variantBonus,
      combinedDamage: 0,
    };
  }

  const weaponLabel =
    typeof ghostEvent.meta?.ghostDieLabel === "string" ? ghostEvent.meta.ghostDieLabel : undefined;

  const baseDamage = events
    .filter(
      (event) =>
        event.effect === EffectType.Damage &&
        event.source === "player" &&
        event.target === "opponent" &&
        event.meta?.ghostDie === true,
    )
    .reduce((total, event) => total + Math.max(0, Math.floor(event.value)), 0);

  const bonusDamage =
    baseDamage > 0 ? getWildStrikeBonusValue(ghostEvent.meta?.wildStrikeBonus) : 0;
  const combinedDamage = baseDamage + bonusDamage;
  const popupText =
    typeof ghostEvent.meta?.ghostPopupText === "string" ? ghostEvent.meta.ghostPopupText : undefined;

  return {
    outcome: combinedDamage > 0 ? "success" : "backfire",
    variantBonus,
    combinedDamage,
    weaponLabel,
    popupText,
  };
}

export function bundleWildStrikeDamageEvents(
  event: CombatEvent,
  triggeredEvents: CombatEvent[],
): { eventToApply: CombatEvent; remainingTriggeredEvents: CombatEvent[] } {
  if (!isWildStrikeBaseDamageEvent(event)) {
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

export function registerWildStrikeBonusSubscriber(eventBus: CombatEventBus): void {
  eventBus.subscribe(EffectType.Damage, (event) => {
    const bonus = typeof event.meta?.wildStrikeBonus === "number"
      ? Math.floor(event.meta.wildStrikeBonus)
      : 0;

    if (event.meta?.wildStrikeBonusApplied === true) {
      return [];
    }

    if (
      bonus <= 0 ||
      event.source !== "player" ||
      event.target !== "opponent" ||
      event.value <= 0 ||
      !hasWildStrikeMeta(event)
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

export class WildStrike extends Face {
  private bonusDamage: number;
  private readonly resolveGhostWeaponEvents: ResolveGhostWeaponEvents;

  constructor(
    id: string,
    bonusDamage: number,
    resolveGhostWeaponEvents: ResolveGhostWeaponEvents,
    label = "Wild Strike",
  ) {
    super(id, label, "abilities");
    this.bonusDamage = Math.max(0, Math.floor(bonusDamage));
    this.resolveGhostWeaponEvents = resolveGhostWeaponEvents;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.bonusDamage += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.bonusDamage += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Trigger an extra mainhand weapon attack. If it damages the opponent, add +${this.bonusDamage} damage.`;
  }

  getResolvePopupText(): string {
    return `Wild Strike (+${this.bonusDamage})`;
  }

  getCombatLogLines(context: CombatLogRollContext): string[] {
    const summary = summarizeWildStrikeRoll(context.events);
    const lines: string[] = ["Player rolls Wild Strike."];

    if (summary.outcome === "miss") {
      lines.push(`  > Miss (Wild Strike +${summary.variantBonus})`);
      return lines;
    }

    if (summary.outcome === "success") {
      lines.push(`  > Success (Wild Strike +${summary.variantBonus})`);
      if (summary.weaponLabel) {
        lines.push(`${normalizeWildStrikeWeaponLabel(summary.weaponLabel)} (from Wild Strike):`);
      }
      lines.push(`  > ${summary.combinedDamage} damage`);
      return lines;
    }

    lines.push(`  > Backfire (Wild Strike +${summary.variantBonus})`);
    if (summary.weaponLabel) {
      lines.push(`${normalizeWildStrikeWeaponLabel(summary.weaponLabel)} (from Wild Strike):`);
    }
    lines.push(`  > ${summary.popupText ?? "No effect"}`);
    return lines;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const randomSource = context.randomSource ?? defaultRandomSource;
    const ghostEvents = this.resolveGhostWeaponEvents(context, randomSource);

    if (ghostEvents.length === 0) {
      return [];
    }

    return ghostEvents.map((event) => ({
      ...event,
      meta: {
        ...(event.meta ?? {}),
        wildStrike: true,
        wildStrikeBonus: this.bonusDamage,
        wildStrikeSourceSideId: this.id,
      },
    }));
  }
}
