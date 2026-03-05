import { DealDamage } from "../abilities/DealDamage";
import type { FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class ScalingStrike extends DealDamage {
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

  protected beforeResolve(context: FaceResolveContext): void {
    if (context.rollCount % this.rollThreshold === 0) {
      this.applyUpgrade({ type: "damage-plus", amount: this.scalingStep });
    }
  }
}
