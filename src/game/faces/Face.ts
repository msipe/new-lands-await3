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
  readonly id: string;
  readonly label: string;
  readonly category: FaceCategory;

  private rollCount = 0;

  protected constructor(id: string, label: string, category: FaceCategory) {
    this.id = id;
    this.label = label;
    this.category = category;
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
