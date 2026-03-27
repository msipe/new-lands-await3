import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type { FaceAdjustmentOperation, FaceAdjustmentResult } from "../FaceAdjustmentModel";

export class Enrage extends Face {
  private readonly rageCount: number;

  constructor(id: string, rageCount: number) {
    const label = rageCount === 1 ? "Enrage" : `Enrage x${rageCount}`;
    super(id, label, "abilities");
    this.rageCount = rageCount;
  }

  getSpawnedDieConstructIds(): string[] {
    return Array.from({ length: this.rageCount }, () => "rage-die");
  }

  describe(): string {
    const dice = this.rageCount === 1 ? "a Rage Die" : `${this.rageCount} Rage Dice`;
    return `Gain ${dice}. Each Rage Die adds bonus attack damage this round.`;
  }

  getResolvePopupText(): string {
    return this.rageCount === 1 ? "Rage!" : `Rage x${this.rageCount}!`;
  }

  protected getPower(): number {
    return this.rageCount * 1.5;
  }

  cloneWithId(newId: string): Enrage {
    return new Enrage(newId, this.rageCount);
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    return false;
  }

  applyAdjustment(_operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    return { applied: false, resourceDelta: 0, reason: "Enrage has no adjustable properties." };
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
