import type { CombatEvent } from "../combat-event-bus";
import type { DieSide, SideResolveContext } from "../dice";
import type { FaceUpgrade } from "./FaceUpgrade";

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

  abstract applyUpgrade(upgrade: FaceUpgrade): boolean;

  protected beforeResolve(_context: FaceResolveContext): void {}

  protected abstract onResolve(context: FaceResolveContext): CombatEvent[];
}
