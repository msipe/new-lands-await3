import type { CombatEvent } from "./combat-event-bus";
import { DamageEffectScript, type DiceEffectScript, HealEffectScript } from "./dice-effects";
import type { DieSide, SideResolveContext } from "./dice";

export class ScriptedDiceSide implements DieSide {
  readonly id: string;
  readonly label: string;
  private readonly effects: DiceEffectScript[];

  constructor(id: string, label: string, effects: DiceEffectScript[]) {
    this.id = id;
    this.label = label;
    this.effects = effects;
  }

  resolve(context: SideResolveContext): CombatEvent[] {
    return this.effects.map((effect) =>
      effect.toEvent(context.source, context.cause, context.dieId, this.id),
    );
  }
}

export class DealDamageSide extends ScriptedDiceSide {
  constructor(id: string, label: string, amount: number) {
    super(id, label, [new DamageEffectScript(`${id}-damage`, amount, "opponent")]);
  }
}

export class HealSelfSide extends ScriptedDiceSide {
  constructor(id: string, label: string, amount: number) {
    super(id, label, [new HealEffectScript(`${id}-heal`, amount, "self")]);
  }
}

export class Deal1DamageSide extends DealDamageSide {
  constructor(id: string) {
    super(id, "Deal 1 Damage", 1);
  }
}

export class Deal2DamageSide extends DealDamageSide {
  constructor(id: string) {
    super(id, "Deal 2 Damage", 2);
  }
}

export class Deal3DamageSide extends DealDamageSide {
  constructor(id: string) {
    super(id, "Deal 3 Damage", 3);
  }
}

export class Heal1Side extends HealSelfSide {
  constructor(id: string) {
    super(id, "Heal 1", 1);
  }
}
