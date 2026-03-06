import { EffectType } from "./dice";

export type CombatEvent = {
  effect: EffectType;
  value: number;
  source: "player" | "enemy";
  target: "self" | "opponent";
  cause: "enemy-intent" | "player-roll" | "triggered";
  dieId: string;
  sideId: string;
  meta?: Record<string, string | number | boolean>;
};

export type CombatEventSubscriber = (event: CombatEvent) => CombatEvent[];

export class CombatEventBus {
  private readonly subscribers: Record<EffectType, CombatEventSubscriber[]> = {
    [EffectType.Damage]: [],
    [EffectType.Heal]: [],
  };

  subscribe(effectType: EffectType, subscriber: CombatEventSubscriber): () => void {
    this.subscribers[effectType].push(subscriber);

    return () => {
      const index = this.subscribers[effectType].indexOf(subscriber);
      if (index >= 0) {
        this.subscribers[effectType].splice(index, 1);
      }
    };
  }

  publish(event: CombatEvent): CombatEvent[] {
    const nextEvents: CombatEvent[] = [];

    for (const subscriber of this.subscribers[event.effect]) {
      nextEvents.push(...subscriber(event));
    }

    return nextEvents;
  }
}
