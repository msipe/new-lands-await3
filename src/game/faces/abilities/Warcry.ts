import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class Warcry extends Face {
  private attackModifier: number;

  constructor(id: string, attackModifier: number) {
    super(id, `Warcry ${attackModifier >= 0 ? "+" : ""}${attackModifier}`, "abilities");
    this.attackModifier = Math.floor(attackModifier);
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.attackModifier += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.attackModifier += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    const value = this.attackModifier;
    const signed = `${value >= 0 ? "+" : ""}${value}`;
    return `Your attacks deal ${signed} damage until end of turn.`;
  }

  getResolvePopupText(): string {
    return this.attackModifier >= 0
      ? `Attacks +${this.attackModifier} this turn`
      : `Attacks ${this.attackModifier} this turn`;
  }

  getAttackModifier(): number {
    return this.attackModifier;
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}