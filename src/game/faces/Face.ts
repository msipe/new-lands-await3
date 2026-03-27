import type { CombatEvent } from "../combat-event-bus";
import type { DieSide, SideResolveContext } from "../dice";
import type { FaceUpgrade } from "./FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "./FaceAdjustmentModel";

export type FaceCategory = "abilities" | "items" | "misc";

export type FaceResolveContext = SideResolveContext & {
  rollCount: number;
};

export abstract class Face implements DieSide {
  id: string = "";
  readonly category: FaceCategory;

  private rollCount = 0;
  private readonly baseLabel: string;

  protected constructor(label: string, category: FaceCategory) {
    this.baseLabel = label;
    this.category = category;
  }

  get label(): string {
    return this.getLabel();
  }

  get power(): number {
    return this.getPower();
  }

  resolve(context: SideResolveContext): CombatEvent[] {
    this.rollCount += 1;

    const faceContext: FaceResolveContext = {
      ...context,
      rollCount: this.rollCount,
    };

    this.beforeResolve(faceContext);
    return this.onResolve(faceContext);
  }

  getRollCount(): number {
    return this.rollCount;
  }

  describe(): string {
    return this.label;
  }

  getResolvePopupText(): string {
    return this.label;
  }

  protected getLabel(): string {
    return this.baseLabel;
  }

  protected getBaseLabel(): string {
    return this.baseLabel;
  }

  protected getPower(): number {
    return this.getDefaultPowerFromAdjustments();
  }

  protected getDefaultPowerFromAdjustments(): number {
    const total = this.getAdjustmentProperties().reduce((sum, property) => {
      if (typeof property.pointValue !== "number" || Number.isNaN(property.pointValue)) {
        return sum;
      }

      return sum + property.pointValue;
    }, 0);

    return Face.roundPower(total);
  }

  protected static roundPower(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  abstract cloneWithId(newId: string): Face;

  abstract applyUpgrade(upgrade: FaceUpgrade): boolean;

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [];
  }

  applyAdjustment(_operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Face does not expose adjustable properties.",
    };
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate | undefined {
    return undefined;
  }

  protected getAdjustmentProperty(propertyId: string): FaceAdjustmentProperty | undefined {
    return this.getAdjustmentProperties().find((property) => property.id === propertyId);
  }

  protected supportsAdjustmentModality(
    property: FaceAdjustmentProperty,
    operationType: FaceAdjustmentOperation["type"],
  ): boolean {
    return property.modalities.some((modality) => modality.type === operationType);
  }

  protected beforeResolve(_context: FaceResolveContext): void {}

  protected abstract onResolve(context: FaceResolveContext): CombatEvent[];
}
