import { DealDamage } from "../abilities/DealDamage";
import type { FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentPointDeltaInput,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";
import { FaceAdjustmentModalityType } from "../FaceAdjustmentModel";

export class ScalingStrike extends DealDamage {
  private static readonly minScalingStep = 1;
  static readonly scalingStepImproveRate = 2;
  static readonly scalingStepReduceRate = 1;
  static readonly scalingStepPointWeight = 1;

  private readonly rollThreshold: number;
  private scalingStep: number;

  constructor(id: string, baseDamage = 1, rollThreshold = 5, scalingStep = 1) {
    super(id, "Scaling Strike", baseDamage);
    this.rollThreshold = rollThreshold;
    this.scalingStep = scalingStep;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "scaling-step-plus") {
      this.scalingStep += upgrade.amount;
      return true;
    }

    return super.applyUpgrade(upgrade);
  }

  describe(): string {
    return `${super.describe()} Every ${this.rollThreshold} rolls, gain +${this.scalingStep} damage permanently.`;
  }

  cloneWithId(newId: string): ScalingStrike {
    return new ScalingStrike(
      newId,
      this.getDamageValue(),
      this.rollThreshold,
      this.scalingStep,
    );
  }

  private getScalingStepPointValue(): number {
    return ScalingStrike.getPointValueAtScalingStep(this.scalingStep, this.rollThreshold);
  }

  private static getPointValueAtScalingStep(scalingStep: number, rollThreshold: number): number {
    const safeScalingStep = Math.max(ScalingStrike.minScalingStep, scalingStep);
    const tempoWeight = Math.max(1, Math.floor(6 / Math.max(1, rollThreshold)));
    return safeScalingStep * ScalingStrike.scalingStepPointWeight * tempoWeight;
  }

  private calculateScalingStepPointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const requestedSteps = Math.max(1, Math.floor(input.steps));
    const currentStep = Math.max(ScalingStrike.minScalingStep, input.propertyValue);
    const currentPoints = ScalingStrike.getPointValueAtScalingStep(currentStep, this.rollThreshold);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        const nextStep = currentStep + requestedSteps;
        return ScalingStrike.getPointValueAtScalingStep(nextStep, this.rollThreshold) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        const nextStep = Math.max(ScalingStrike.minScalingStep, currentStep - requestedSteps);
        return ScalingStrike.getPointValueAtScalingStep(nextStep, this.rollThreshold) - currentPoints;
      }
      default:
        return 0;
    }
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      ...super.getAdjustmentProperties(),
      {
        id: "scaling_step",
        label: "Scaling Step",
        description: "Damage gained when the scaling threshold is reached.",
        value: this.scalingStep,
        pointValue: this.getScalingStepPointValue(),
        pointDeltaCalculator: (input) => this.calculateScalingStepPointDelta(input),
        improvementRate: ScalingStrike.scalingStepImproveRate,
        reductionRate: ScalingStrike.scalingStepReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: ScalingStrike.scalingStepImproveRate,
            min: ScalingStrike.minScalingStep,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: ScalingStrike.scalingStepReduceRate,
            min: ScalingStrike.minScalingStep,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template:
        `Deal $damage damage to opponent. Every ${this.rollThreshold} rolls, gain +$scaling_step damage permanently.`,
      bindings: {
        damage: {
          propertyId: "damage",
          display: "value",
          tooltipKey: "damage",
        },
        scaling_step: {
          propertyId: "scaling_step",
          display: "value",
          tooltipKey: "scaling-step",
        },
      },
    };
  }

  applyAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    switch (operation.propertyId) {
      case "scaling_step": {
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

        return this.applyScalingStepAdjustment(operation);
      }
      default:
        return super.applyAdjustment(operation);
    }
  }

  private applyScalingStepAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.scalingStep += requestedSteps;
      return {
        applied: true,
        resourceDelta: -(requestedSteps * ScalingStrike.scalingStepImproveRate),
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
    const nextScalingStep = Math.max(
      ScalingStrike.minScalingStep,
      this.scalingStep - requestedSteps,
    );
    const adjustedSteps = this.scalingStep - nextScalingStep;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Scaling step is already at minimum.",
      };
    }

    this.scalingStep = nextScalingStep;
    return {
      applied: true,
      resourceDelta: adjustedSteps * ScalingStrike.scalingStepReduceRate,
    };
  }

  protected beforeResolve(context: FaceResolveContext): void {
    if (context.rollCount % this.rollThreshold === 0) {
      this.applyUpgrade({ type: "damage-plus", amount: this.scalingStep });
    }
  }
}
