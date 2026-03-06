import { type CombatEvent } from "../../combat-event-bus";
import { DamageEffectScript } from "../../dice-effects";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class DealSelfDamage extends Face {
  private damage: number;

  constructor(id: string, label: string, damage: number) {
    super(id, label, "abilities");
    this.damage = damage;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.damage += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.damage += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Deal ${this.damage} damage to self.`;
  }

  getResolvePopupText(): string {
    return `-${this.damage} self damage`;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new DamageEffectScript(`${this.id}-self-damage`, this.damage, "self");

    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}
