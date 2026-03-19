import { type CombatEvent } from "../../combat-event-bus";
import type { PlayerRollConversionRequest } from "../../player-roll-conversions";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

type FocusUpEffect = "critical-hit" | "critical-miss" | "power-up" | "power-down";

const FOCUS_UP_EFFECT_DESCRIPTIONS: Record<FocusUpEffect, string> = {
  "critical-hit": "next roll is converted to a critical",
  "critical-miss": "next roll is converted to a critical miss",
  "power-up": "next roll is converted to +1 on the dice power scale",
  "power-down": "next roll is converted to -1 on the dice power scale",
};

export class FocusUp extends Face {
  private readonly effect: FocusUpEffect;

  constructor(id: string, effect: FocusUpEffect) {
    super(id, "Focus Up", "abilities");
    this.effect = effect;
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    return false;
  }

  cloneWithId(newId: string): FocusUp {
    return new FocusUp(newId, this.effect);
  }

  describe(): string {
    return this.getEffectDescription();
  }

  getResolvePopupText(): string {
    return this.getEffectDescription();
  }

  getPlayerRollConversionRequests(): PlayerRollConversionRequest[] {
    switch (this.effect) {
      case "critical-hit":
        return [
          {
            kind: "to-critical-hit",
            description: FOCUS_UP_EFFECT_DESCRIPTIONS["critical-hit"],
          },
        ];
      case "critical-miss":
        return [
          {
            kind: "to-critical-miss",
            description: FOCUS_UP_EFFECT_DESCRIPTIONS["critical-miss"],
          },
        ];
      case "power-up":
        return [
          {
            kind: "shift-power",
            shift: 1,
            description: FOCUS_UP_EFFECT_DESCRIPTIONS["power-up"],
          },
        ];
      case "power-down":
      default:
        return [
          {
            kind: "shift-power",
            shift: -1,
            description: FOCUS_UP_EFFECT_DESCRIPTIONS["power-down"],
          },
        ];
    }
  }

  protected getLabel(): string {
    return `Focus Up: ${this.getEffectDescription()}`;
  }

  protected getPower(): number {
    switch (this.effect) {
      case "critical-hit":
        return 2;
      case "power-up":
        return 1;
      case "power-down":
        return -1;
      case "critical-miss":
      default:
        return -2;
    }
  }

  private getEffectDescription(): string {
    return FOCUS_UP_EFFECT_DESCRIPTIONS[this.effect];
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
