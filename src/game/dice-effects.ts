import type { CombatEvent } from "./combat-event-bus";
import { type DiceEventCause, type DiceEventSource, EffectType } from "./dice";

export type EffectTarget = "self" | "opponent";

export interface DiceEffectScript {
  id: string;
  effectType: EffectType;
  value: number;
  target: EffectTarget;
  toEvent(source: DiceEventSource, cause: DiceEventCause, dieId: string, sideId: string): CombatEvent;
}

abstract class BaseEffectScript implements DiceEffectScript {
  readonly id: string;
  readonly effectType: EffectType;
  readonly value: number;
  readonly target: EffectTarget;

  protected constructor(
    id: string,
    effectType: EffectType,
    value: number,
    target: EffectTarget,
  ) {
    this.id = id;
    this.effectType = effectType;
    this.value = value;
    this.target = target;
  }

  toEvent(source: DiceEventSource, cause: DiceEventCause, dieId: string, sideId: string): CombatEvent {
    return {
      effect: this.effectType,
      value: this.value,
      source,
      target: this.target,
      cause,
      dieId,
      sideId,
    };
  }
}

export class DamageEffectScript extends BaseEffectScript {
  constructor(id: string, value: number, target: EffectTarget = "opponent") {
    super(id, EffectType.Damage, value, target);
  }
}

export class HealEffectScript extends BaseEffectScript {
  constructor(id: string, value: number, target: EffectTarget = "self") {
    super(id, EffectType.Heal, value, target);
  }
}
