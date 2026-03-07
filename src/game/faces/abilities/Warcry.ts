import { type CombatEvent } from "../../combat-event-bus";
import {
  CombatEventSubscriberTarget,
  Duration,
  EventSubscriberType,
  type CombatEventModifierRegistration,
} from "../../combat-event-bus";
import type { CombatLogRollContext } from "../../combat-log";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class Warcry extends Face {
  private attackModifier: number;

  constructor(id: string, attackModifier: number) {
    super(id, `Warcry ${attackModifier >= 0 ? "+" : ""}${attackModifier}`, "abilities");
    this.attackModifier = Math.floor(attackModifier);
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.attackModifier += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.attackModifier += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    const value = this.attackModifier;
    const signed = `${value >= 0 ? "+" : ""}${value}`;
    return `Your attacks deal ${signed} damage until end of turn.`;
  }

  getResolvePopupText(): string {
    return this.attackModifier >= 0
      ? `Attacks +${this.attackModifier} this turn`
      : `Attacks ${this.attackModifier} this turn`;
  }

  getAttackModifier(): number {
    return this.attackModifier;
  }

  getAttackModifierOnRoll(): number {
    return this.attackModifier;
  }

  createCombatEventModifier(): CombatEventModifierRegistration {
    const modifierValue = this.attackModifier;

    return {
      definition: {
        name: "warcry",
        id: this.id,
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      modifier: (event) => {
        const nextValue = Math.max(0, event.value + modifierValue);
        if (nextValue === event.value) {
          return event;
        }

        return {
          ...event,
          value: nextValue,
          meta: {
            ...(event.meta ?? {}),
            warcryAppliedModifier: modifierValue,
          },
        };
      },
    };
  }

  getCombatLogLines(context: CombatLogRollContext): string[] {
    const signedModifier = this.attackModifier >= 0
      ? `+${this.attackModifier}`
      : `${this.attackModifier}`;
    const actorLabel = context.source === "player" ? "Player" : "Enemy";

    return [
      `${actorLabel} rolls ${context.dieName}: ${this.label} (attacks ${signedModifier} this turn).`,
    ];
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}