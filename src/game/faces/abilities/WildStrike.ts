import {
  CombatEventSubscriberTarget,
  Duration,
  EventSubscriberType,
  type CombatEvent,
  type CombatEventModifierRegistration,
} from "../../combat-event-bus";
import type { CombatLogRollContext } from "../../combat-log";
import { EffectType, defaultRandomSource, type RandomSource } from "../../dice";
import {
  resolveTransientDieFromConstruct,
  type TransientDiePopupData,
} from "../../transient-die";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

type ResolveTransientWeaponEvents = (
  context: FaceResolveContext,
  randomSource: RandomSource,
  onResolvedTransientDie?: (popupData: TransientDiePopupData) => void,
) => CombatEvent[];

function createMainhandTransientResolver(
  mainhandWeaponConstructId?: string,
): ResolveTransientWeaponEvents {
  return (context, randomSource, onResolvedTransientDie) => {
    if (!mainhandWeaponConstructId) {
      return [];
    }

    return resolveTransientDieFromConstruct({
      constructId: mainhandWeaponConstructId,
      parentDieId: context.dieId,
      source: context.source,
      cause: context.cause,
      randomSource,
      onResolvedTransientDie,
    });
  };
}

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

function isMatchingWildStrikeDamageEvent(event: CombatEvent): boolean {
  return (
    event.effect === EffectType.Damage &&
    event.source === "player" &&
    event.target === "opponent" &&
    event.value > 0 &&
    event.meta?.wildStrike === true &&
    typeof event.meta?.wildStrikeSourceDieId === "string" &&
    event.meta.wildStrikeSourceDieId === event.dieId
  );
}

function getWildStrikeBonusValue(rawBonus: unknown): number {
  return typeof rawBonus === "number" ? Math.max(0, Math.floor(rawBonus)) : 0;
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
  const transientEvent = events.find((event) => event.meta?.transientDie === true);

  if (!transientEvent) {
    return {
      outcome: "miss",
      variantBonus,
      combinedDamage: 0,
    };
  }

  const weaponLabel =
    typeof transientEvent.meta?.transientDieLabel === "string"
      ? transientEvent.meta.transientDieLabel
      : undefined;

  const baseDamage = events
    .filter(
      (event) =>
        event.effect === EffectType.Damage &&
        event.source === "player" &&
        event.target === "opponent" &&
        event.meta?.transientDie === true,
    )
    .reduce((total, event) => total + Math.max(0, Math.floor(event.value)), 0);

  const bonusDamage =
    baseDamage > 0 ? getWildStrikeBonusValue(transientEvent.meta?.wildStrikeBonus) : 0;
  const combinedDamage = baseDamage + bonusDamage;
  const popupText =
    typeof transientEvent.meta?.transientPopupText === "string"
      ? transientEvent.meta.transientPopupText
      : undefined;

  return {
    outcome: combinedDamage > 0 ? "success" : "backfire",
    variantBonus,
    combinedDamage,
    weaponLabel,
    popupText,
  };
}

export class WildStrike extends Face {
  private bonusDamage: number;
  private readonly resolveTransientWeaponEvents: ResolveTransientWeaponEvents;
  private lastTransientPopupData?: TransientDiePopupData;

  constructor(
    id: string,
    bonusDamage: number,
    mainhandWeaponConstructId?: string,
    label = "Wild Strike",
  ) {
    super(id, label, "abilities");
    this.bonusDamage = Math.max(0, Math.floor(bonusDamage));
    this.resolveTransientWeaponEvents = createMainhandTransientResolver(mainhandWeaponConstructId);
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

  getSpawnedDiePopupData(): TransientDiePopupData | undefined {
    return this.lastTransientPopupData;
  }

  createCombatEventModifier(): CombatEventModifierRegistration {
    const bonusDamage = this.bonusDamage;

    return {
      definition: {
        name: "wild-strike-bonus",
        id: this.id,
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      modifier: (event) => {
        if (!isMatchingWildStrikeDamageEvent(event) || bonusDamage <= 0) {
          return event;
        }

        return {
          ...event,
          value: event.value + bonusDamage,
          meta: {
            ...(event.meta ?? {}),
            wildStrikeBundledBonus: bonusDamage,
          },
        };
      },
    };
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
    this.lastTransientPopupData = undefined;
    const transientEvents = this.resolveTransientWeaponEvents(
      context,
      randomSource,
      (popupData) => {
        this.lastTransientPopupData = popupData;
      },
    );

    if (transientEvents.length === 0) {
      return [];
    }

    return transientEvents.map((event) => ({
      ...event,
      meta: {
        ...(event.meta ?? {}),
        wildStrike: true,
        wildStrikeBonus: this.bonusDamage,
        wildStrikeSourceDieId: context.dieId,
        wildStrikeSourceSideId: this.id,
      },
    }));
  }
}
