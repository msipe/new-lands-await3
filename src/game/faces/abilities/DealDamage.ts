import { type CombatEvent } from "../../combat-event-bus";
import { DamageEffectScript } from "../../dice-effects";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";
import { FaceAdjustmentModalityType } from "../FaceAdjustmentModel";

export class DealDamage extends Face {
  private static readonly minDamage = 0;
  static readonly damageImproveRate = 1;
  static readonly damageReduceRate = 0.5;

  private damage: number;

  constructor(id: string, label: string, damage: number) {
    super(id, label, "abilities");
    this.damage = damage;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.damage += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.damage += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Deal ${this.damage} damage to opponent.`;
  }

  getResolvePopupText(): string {
    return `+${this.damage} damage`;
  }

  protected getLabel(): string {
    return `${super.getLabel()} +${this.damage}`;
  }

  cloneWithId(newId: string): DealDamage {
    return new DealDamage(newId, this.getBaseLabel(), this.damage);
  }

  protected getDamageValue(): number {
    return this.damage;
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "damage",
        label: "Damage",
        description: "How much damage this face deals.",
        value: this.damage,
        improvementRate: DealDamage.damageImproveRate,
        reductionRate: DealDamage.damageReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: DealDamage.damageImproveRate,
            min: DealDamage.minDamage,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: DealDamage.damageReduceRate,
            min: DealDamage.minDamage,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Deal $damage to opponent.",
      bindings: {
        damage: {
          propertyId: "damage",
          display: "value",
          tooltipKey: "damage",
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
      case "damage":
        return this.applyDamageAdjustment(operation);
      default:
        return {
          applied: false,
          resourceDelta: 0,
          reason: "Unsupported property for this face.",
        };
    }
  }

  private applyDamageAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.damage += requestedSteps;
      return {
        applied: true,
        resourceDelta: -(requestedSteps * DealDamage.damageImproveRate),
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
    const nextDamage = Math.max(DealDamage.minDamage, this.damage - requestedSteps);
    const adjustedSteps = this.damage - nextDamage;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Damage is already at minimum.",
      };
    }

    this.damage = nextDamage;
    return {
      applied: true,
      resourceDelta: adjustedSteps * DealDamage.damageReduceRate,
    };
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new DamageEffectScript(`${this.id}-damage`, this.damage, "opponent");

    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}
