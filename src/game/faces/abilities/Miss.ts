import { type CombatEvent } from "../../combat-event-bus";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

export class Miss extends Face {
  constructor(id: string) {
    super(id, "Whiff!", "abilities");
  }

  applyUpgrade(_upgrade: FaceUpgrade): boolean {
    // Miss is intentionally immutable so damage buffs never convert it into a hit.
    return false;
  }

  describe(): string {
    return "Do nothing.";
  }

  getResolvePopupText(): string {
    return "Miss";
  }

  protected onResolve(_context: FaceResolveContext): CombatEvent[] {
    return [];
  }
}
