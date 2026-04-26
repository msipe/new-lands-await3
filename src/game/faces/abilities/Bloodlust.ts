import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class Bloodlust extends Face {
  readonly constructId: string;
  readonly countPerHit: number;

  constructor(constructId: string, countPerHit = 1) {
    const label = constructId === "killing-machine-die" ? "Bloodlust: Killing Machine" : "Bloodlust";
    super(label, "abilities");
    this.constructId = constructId;
    this.countPerHit = countPerHit;
  }

  createWeaponHitReaction(): { constructId: string; countPerHit: number } {
    return { constructId: this.constructId, countPerHit: this.countPerHit };
  }

  describe(): string {
    const dieName = this.constructId === "killing-machine-die" ? "Killing Machine Dice" : "Rage Dice";
    return `Each weapon hit this round queues ${this.countPerHit} ${dieName} for next round.`;
  }

  getResolvePopupText(): string {
    return this.constructId === "killing-machine-die" ? "Killing Machine mode!" : "Bloodlust!";
  }

  protected getPower(): number {
    return this.constructId === "killing-machine-die" ? 3 : 1.5;
  }

  cloneWithId(newId: string): Bloodlust {
    const c = new Bloodlust(this.constructId, this.countPerHit);
    c.id = newId;
    return c;
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    return false;
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
