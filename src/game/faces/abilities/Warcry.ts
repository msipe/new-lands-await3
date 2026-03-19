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
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentPointDeltaInput,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";
import { FaceAdjustmentModalityType } from "../FaceAdjustmentModel";

export class Warcry extends Face {
  private static readonly minAttackModifier = 0;
  static readonly attackModifierImproveRate = 1;
  static readonly attackModifierReduceRate = 0.5;
  static readonly attackModifierPointExponent = 1;

  private attackModifier: number;

  constructor(id: string, attackModifier: number) {
    super(id, "Warcry", "abilities");
    this.attackModifier = Math.floor(attackModifier);
  }

  protected getLabel(): string {
    return `Warcry ${this.attackModifier >= 0 ? "+" : ""}${this.attackModifier}`;
  }

  protected getPower(): number {
    return Math.max(0, this.attackModifier * 2);
  }

  cloneWithId(newId: string): Warcry {
    return new Warcry(newId, this.attackModifier);
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

  private getAttackModifierPointValue(): number {
    return Warcry.getPointValueAtAttackModifier(this.attackModifier);
  }

  private static getPointValueAtAttackModifier(modifier: number): number {
    const safeModifier = Math.max(Warcry.minAttackModifier, modifier);
    return safeModifier ** Warcry.attackModifierPointExponent;
  }

  private static calculateAttackModifierPointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const steps = Math.max(1, Math.floor(input.steps));
    const currentModifier = Math.max(Warcry.minAttackModifier, input.propertyValue);
    const currentPoints = Warcry.getPointValueAtAttackModifier(currentModifier);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        const nextModifier = currentModifier + steps;
        return Warcry.getPointValueAtAttackModifier(nextModifier) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        const nextModifier = Math.max(Warcry.minAttackModifier, currentModifier - steps);
        return Warcry.getPointValueAtAttackModifier(nextModifier) - currentPoints;
      }
      default:
        return 0;
    }
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "attack_modifier",
        label: "Attack Modifier",
        description: "How much this face adds to attack damage this turn.",
        value: this.attackModifier,
        pointValue: this.getAttackModifierPointValue(),
        pointDeltaCalculator: Warcry.calculateAttackModifierPointDelta,
        improvementRate: Warcry.attackModifierImproveRate,
        reductionRate: Warcry.attackModifierReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: Warcry.attackModifierImproveRate,
            min: Warcry.minAttackModifier,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: Warcry.attackModifierReduceRate,
            min: Warcry.minAttackModifier,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Your attacks deal $attack_modifier damage until end of turn.",
      bindings: {
        attack_modifier: {
          propertyId: "attack_modifier",
          display: "value",
          tooltipKey: "attack-modifier",
        },
      },
    };
  }

  applyAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    const property = this.getAdjustmentProperty(operation.propertyId);
    if (!property) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported property for this face.",
      };
    }

    if (!this.supportsAdjustmentModality(property, operation.type)) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    switch (operation.propertyId) {
      case "attack_modifier":
        return this.applyAttackModifierAdjustment(operation);
      default:
        return {
          applied: false,
          resourceDelta: 0,
          reason: "Unsupported property for this face.",
        };
    }
  }

  private applyAttackModifierAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.attackModifier += requestedSteps;
      return {
        applied: true,
        resourceDelta: -(requestedSteps * Warcry.attackModifierImproveRate),
      };
    }

    if (operation.type !== FaceAdjustmentModalityType.Reduce) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
    const nextModifier = Math.max(
      Warcry.minAttackModifier,
      this.attackModifier - requestedSteps,
    );
    const adjustedSteps = this.attackModifier - nextModifier;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Attack modifier is already at minimum.",
      };
    }

    this.attackModifier = nextModifier;
    return {
      applied: true,
      resourceDelta: adjustedSteps * Warcry.attackModifierReduceRate,
    };
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