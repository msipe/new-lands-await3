import { type CombatEvent } from "../../combat-event-bus";
import { HealEffectScript } from "../../dice-effects";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";
import { FaceAdjustmentModalityType } from "../FaceAdjustmentModel";

export class HealSelf extends Face {
  private static readonly minHeal = 0;
  static readonly healImproveRate = 1;
  static readonly healReduceRate = 0.5;

  private heal: number;

  constructor(id: string, label: string, heal: number) {
    super(id, label, "abilities");
    this.heal = heal;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.heal += 1;
      return true;
    }

    if (upgrade.type === "heal-plus") {
      this.heal += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Heal ${this.heal} HP.`;
  }

  getResolvePopupText(): string {
    return `+${this.heal} heal`;
  }

  protected getLabel(): string {
    return `${super.getLabel()} +${this.heal}`;
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "heal",
        label: "Heal",
        description: "How much HP this face restores.",
        value: this.heal,
        improvementRate: HealSelf.healImproveRate,
        reductionRate: HealSelf.healReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: HealSelf.healImproveRate,
            min: HealSelf.minHeal,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: HealSelf.healReduceRate,
            min: HealSelf.minHeal,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Heal $heal HP.",
      bindings: {
        heal: {
          propertyId: "heal",
          display: "value",
          tooltipKey: "heal",
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
      case "heal":
        return this.applyHealAdjustment(operation);
      default:
        return {
          applied: false,
          resourceDelta: 0,
          reason: "Unsupported property for this face.",
        };
    }
  }

  private applyHealAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.heal += requestedSteps;
      return {
        applied: true,
        resourceDelta: -(requestedSteps * HealSelf.healImproveRate),
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
    const nextHeal = Math.max(HealSelf.minHeal, this.heal - requestedSteps);
    const adjustedSteps = this.heal - nextHeal;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Heal is already at minimum.",
      };
    }

    this.heal = nextHeal;
    return {
      applied: true,
      resourceDelta: adjustedSteps * HealSelf.healReduceRate,
    };
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new HealEffectScript(`${this.id}-heal`, this.heal, "self");

    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}
