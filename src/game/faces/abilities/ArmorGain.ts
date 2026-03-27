import { type CombatEvent } from "../../combat-event-bus";
import { ArmorEffectScript } from "../../dice-effects";
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

export class ArmorGain extends Face {
  private static readonly minArmor = 0;
  static readonly armorImproveRate = 1;
  static readonly armorReduceRate = 0.5;
  static readonly armorPointExponent = 1;

  private armorGain: number;

  constructor(label: string, armorGain: number) {
    super(label, "abilities");
    this.armorGain = Math.max(0, Math.floor(armorGain));
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.armorGain += 1;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Gain ${this.armorGain} armor.`;
  }

  getResolvePopupText(): string {
    return `+${this.armorGain} armor`;
  }

  protected getLabel(): string {
    return `${super.getLabel()} +${this.armorGain} armor`;
  }

  cloneWithId(newId: string): ArmorGain {
    const c = new ArmorGain(this.getBaseLabel(), this.armorGain);
    c.id = newId;
    return c;
  }

  private getArmorPointValue(): number {
    return ArmorGain.getPointValueAtArmor(this.armorGain);
  }

  private static getPointValueAtArmor(armor: number): number {
    const safeArmor = Math.max(ArmorGain.minArmor, armor);
    return safeArmor ** ArmorGain.armorPointExponent;
  }

  private static calculateArmorPointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const steps = Math.max(1, Math.floor(input.steps));
    const currentArmor = Math.max(ArmorGain.minArmor, input.propertyValue);
    const currentPoints = ArmorGain.getPointValueAtArmor(currentArmor);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        const nextArmor = currentArmor + steps;
        return ArmorGain.getPointValueAtArmor(nextArmor) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        const nextArmor = Math.max(ArmorGain.minArmor, currentArmor - steps);
        return ArmorGain.getPointValueAtArmor(nextArmor) - currentPoints;
      }
      default:
        return 0;
    }
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "armor",
        label: "Armor",
        description: "How much armor this face grants.",
        value: this.armorGain,
        pointValue: this.getArmorPointValue(),
        pointDeltaCalculator: ArmorGain.calculateArmorPointDelta,
        improvementRate: ArmorGain.armorImproveRate,
        reductionRate: ArmorGain.armorReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: ArmorGain.armorImproveRate,
            min: ArmorGain.minArmor,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: ArmorGain.armorReduceRate,
            min: ArmorGain.minArmor,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Gain $armor armor.",
      bindings: {
        armor: {
          propertyId: "armor",
          display: "value",
          tooltipKey: "armor",
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
      case "armor":
        return this.applyArmorAdjustment(operation);
      default:
        return {
          applied: false,
          resourceDelta: 0,
          reason: "Unsupported property for this face.",
        };
    }
  }

  private applyArmorAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const requestedSteps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.armorGain += requestedSteps;
      return {
        applied: true,
        resourceDelta: -(requestedSteps * ArmorGain.armorImproveRate),
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
    const nextArmor = Math.max(ArmorGain.minArmor, this.armorGain - requestedSteps);
    const adjustedSteps = this.armorGain - nextArmor;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Armor is already at minimum.",
      };
    }

    this.armorGain = nextArmor;
    return {
      applied: true,
      resourceDelta: adjustedSteps * ArmorGain.armorReduceRate,
    };
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new ArmorEffectScript(`${this.id}-armor`, this.armorGain, "self");
    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}