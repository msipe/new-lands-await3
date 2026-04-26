import { type CombatEvent } from "../../combat-event-bus";
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

export class Enrage extends Face {
  static readonly rageImproveRate = 1.5;
  static readonly rageReduceRate = 0.75;
  private static readonly minRageCount = 1;

  private rageCount: number;

  constructor(rageCount: number) {
    super("Enrage", "abilities");
    this.rageCount = Math.max(Enrage.minRageCount, rageCount);
  }

  protected getLabel(): string {
    return this.rageCount === 1 ? "Enrage" : `Enrage x${this.rageCount}`;
  }

  getSpawnedDieConstructIds(): string[] {
    return Array.from({ length: this.rageCount }, () => "rage-die");
  }

  describe(): string {
    const dice = this.rageCount === 1 ? "a Rage Die" : `${this.rageCount} Rage Dice`;
    return `Gain ${dice}. Roll a Rage Die to gain bonus attack damage.`;
  }

  getResolvePopupText(): string {
    return this.rageCount === 1 ? "Rage!" : `Rage x${this.rageCount}!`;
  }

  protected getPower(): number {
    return this.rageCount * 1.5;
  }

  cloneWithId(newId: string): Enrage {
    const c = new Enrage(this.rageCount);
    c.id = newId;
    return c;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.rageCount += 1;
      return true;
    }
    return false;
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "rage-count",
        label: "Rage Dice",
        description: "How many Rage Dice this face spawns.",
        value: this.rageCount,
        pointValue: this.rageCount * Enrage.rageImproveRate,
        pointDeltaCalculator: Enrage.calculateRagePointDelta,
        improvementRate: Enrage.rageImproveRate,
        reductionRate: Enrage.rageReduceRate,
        modalities: [
          { type: FaceAdjustmentModalityType.Improve, step: 1, rate: Enrage.rageImproveRate, min: Enrage.minRageCount },
          { type: FaceAdjustmentModalityType.Reduce, step: 1, rate: Enrage.rageReduceRate, min: Enrage.minRageCount },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Spawn $rage-count Rage Dice.",
      bindings: {
        "rage-count": { propertyId: "rage-count", display: "value", tooltipKey: "rage-count" },
      },
    };
  }

  applyAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    const property = this.getAdjustmentProperty(operation.propertyId);
    if (!property) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported property for this face." };
    }
    if (!this.supportsAdjustmentModality(property, operation.type)) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported adjustment modality for this property." };
    }

    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const steps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.rageCount += steps;
      return { applied: true, resourceDelta: -(steps * Enrage.rageImproveRate) };
    }

    if (operation.type === FaceAdjustmentModalityType.Reduce) {
      const steps = Math.max(1, Math.floor(operation.steps ?? 1));
      const next = Math.max(Enrage.minRageCount, this.rageCount - steps);
      const adjusted = this.rageCount - next;
      if (adjusted === 0) {
        return { applied: false, resourceDelta: 0, reason: "Rage count is already at minimum." };
      }
      this.rageCount = next;
      return { applied: true, resourceDelta: adjusted * Enrage.rageReduceRate };
    }

    return { applied: false, resourceDelta: 0, reason: "Unsupported adjustment modality for this property." };
  }

  private static calculateRagePointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") return 0;
    const steps = Math.max(1, Math.floor(input.steps));
    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve:
        return steps * Enrage.rageImproveRate;
      case FaceAdjustmentModalityType.Reduce:
        return -(Math.min(steps, input.propertyValue - Enrage.minRageCount) * Enrage.rageReduceRate);
      default:
        return 0;
    }
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
