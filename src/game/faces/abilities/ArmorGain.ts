import { type CombatEvent } from "../../combat-event-bus";
import { ArmorEffectScript } from "../../dice-effects";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class ArmorGain extends Face {
  private armorGain: number;

  constructor(id: string, label: string, armorGain: number) {
    super(id, label, "abilities");
    this.armorGain = Math.max(0, Math.floor(armorGain));
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.armorGain += 1;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Gain ${this.armorGain} armor.`;
  }

  getResolvePopupText(): string {
    return `+${this.armorGain} armor`;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const effect = new ArmorEffectScript(`${this.id}-armor`, this.armorGain, "self");
    return [effect.toEvent(context.source, context.cause, context.dieId, this.id)];
  }
}