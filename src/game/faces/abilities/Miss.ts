import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";

export class Miss extends Face {
  constructor(id: string) {
    super(id, "Whiff!", "abilities");
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    // Miss is intentionally immutable so damage buffs never convert it into a hit.
    return false;
  }

  describe(): string {
    return "Do nothing.";
  }

  getResolvePopupText(): string {
    return "Miss";
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Miss.",
      bindings: {},
    };
  }

  applyAdjustment(_operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    return {
      applied: false,
      resourceDelta: 0,
      reason: "Miss has no adjustable properties.",
    };
  }

  cloneWithId(newId: string): Miss {
    return new Miss(newId);
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
