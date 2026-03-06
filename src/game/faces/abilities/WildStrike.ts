import { type CombatEvent } from "../../combat-event-bus";
import { defaultRandomSource, type RandomSource } from "../../dice";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";

type ResolveGhostWeaponEvents = (context: FaceResolveContext, randomSource: RandomSource) => CombatEvent[];

export class WildStrike extends Face {
  private bonusDamage: number;
  private readonly resolveGhostWeaponEvents: ResolveGhostWeaponEvents;

  constructor(
    id: string,
    bonusDamage: number,
    resolveGhostWeaponEvents: ResolveGhostWeaponEvents,
    label = "Wild Strike",
  ) {
    super(id, label, "abilities");
    this.bonusDamage = Math.max(0, Math.floor(bonusDamage));
    this.resolveGhostWeaponEvents = resolveGhostWeaponEvents;
  }

  applyUpgrade(upgrade: FaceUpgrade): boolean {
    if (upgrade.type === "numeric-plus-1") {
      this.bonusDamage += 1;
      return true;
    }

    if (upgrade.type === "damage-plus") {
      this.bonusDamage += upgrade.amount;
      return true;
    }

    return false;
  }

  describe(): string {
    return `Trigger an extra mainhand weapon attack. If it damages the opponent, add +${this.bonusDamage} damage.`;
  }

  getResolvePopupText(): string {
    return `Wild Strike (+${this.bonusDamage})`;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const randomSource = context.randomSource ?? defaultRandomSource;
    const ghostEvents = this.resolveGhostWeaponEvents(context, randomSource);

    if (ghostEvents.length === 0) {
      return [];
    }

    return ghostEvents.map((event) => ({
      ...event,
      meta: {
        ...(event.meta ?? {}),
        wildStrike: true,
        wildStrikeBonus: this.bonusDamage,
        wildStrikeSourceSideId: this.id,
      },
    }));
  }
}
