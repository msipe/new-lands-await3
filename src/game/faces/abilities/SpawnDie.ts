import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type { FaceAdjustmentOperation, FaceAdjustmentResult } from "../FaceAdjustmentModel";

export class SpawnDie extends Face {
  private readonly constructId: string;
  private readonly dieName: string;
  private readonly count: number;

  constructor(id: string, constructId: string, dieName: string, count = 1) {
    const countLabel = count > 1 ? ` x${count}` : "";
    super(id, `Spawn ${dieName}${countLabel}`, "abilities");
    this.constructId = constructId;
    this.dieName = dieName;
    this.count = count;
  }

  getSpawnedDieConstructIds(): string[] {
    return Array.from({ length: this.count }, () => this.constructId);
  }

  describe(): string {
    const plural = this.count > 1 ? `${this.count} copies of ` : "a ";
    return `Add ${plural}${this.dieName} to your pool for this round.`;
  }

  getResolvePopupText(): string {
    return this.count > 1
      ? `${this.count}x ${this.dieName} added to pool!`
      : `${this.dieName} added to pool!`;
  }

  protected getPower(): number {
    return this.count;
  }

  cloneWithId(newId: string): SpawnDie {
    return new SpawnDie(newId, this.constructId, this.dieName, this.count);
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    return false;
  }

  applyAdjustment(_operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    return { applied: false, resourceDelta: 0, reason: "SpawnDie has no adjustable properties." };
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
