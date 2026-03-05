import { type CombatEvent } from "../../combat-event-bus";
import { HealEffectScript } from "../../dice-effects";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class HealSelf extends Face {
  private heal: number;

  constructor(id: string, label: string, heal: number) {
    super(id, label, "abilities");
    this.heal = heal;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.heal += 1;
      return true;
    }

    if (upgrade.type === "heal-plus") {
      this.heal += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Heal ${this.heal} HP.`;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new HealEffectScript(`${this.id}-heal`, this.heal, "self");

    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}
