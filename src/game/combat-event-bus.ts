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

export enum CombatActionType {
  PlayerTurnEnded = "player-turn-ended",
  EnemyTurnEnded = "enemy-turn-ended",
}

export type CombatAction = {
  type: CombatActionType;
  meta?: Record<string, string | number | boolean>;
};

export type CombatActionSubscriber = (action: CombatAction) => void;

export enum CombatHitSubscriberTarget {
  PlayerAttackHit = "player-attack-hit",
  EnemyAttackHit = "enemy-attack-hit",
}

export type CombatHitSubscriberDefinition = {
  name: string;
  id: string;
  target: CombatHitSubscriberTarget;
  duration: Duration;
};

export type CombatHitSubscriber = (event: CombatEvent) => void;

export type CombatHitSubscriberRegistration = {
  definition: CombatHitSubscriberDefinition;
  subscriber: CombatHitSubscriber;
};

export enum CombatEventSubscriberTarget {
  PlayerAttackDamage = "player-attack-damage",
  EnemyAttackDamage = "enemy-attack-damage",
}

export enum EventSubscriberType {
  AdditiveDamageBuff = "additive-damage-buff",
  MultiplicativeDamageBuff = "multiplicative-damage-buff",
  PreMitigationReaction = "pre-mitigation-reaction",
}

export enum Duration {
  PlayerTurn = "player-turn",
  EnemyTurn = "enemy-turn",
  Combat = "combat",
}

export type CombatEventModifierDefinition = {
  name: string;
  id: string;
  target: CombatEventSubscriberTarget;
  modifierType: EventSubscriberType;
  duration: Duration;
};

export type CombatEventModifierSubscriber = (event: CombatEvent) => CombatEvent;

export type CombatEventModifierRegistration = {
  definition: CombatEventModifierDefinition;
  modifier: CombatEventModifierSubscriber;
};

type CombatEventModifierEntry = {
  definition: CombatEventModifierDefinition;
  modifier: CombatEventModifierSubscriber;
  order: number;
};

type CombatHitSubscriberEntry = {
  definition: CombatHitSubscriberDefinition;
  subscriber: CombatHitSubscriber;
};

function eventMatchesTarget(event: CombatEvent, target: CombatEventSubscriberTarget): boolean {
  if (target === CombatEventSubscriberTarget.PlayerAttackDamage) {
    return (
      event.effect === EffectType.Damage &&
      event.source === "player" &&
      (event.target === "opponent" ||
        (event.target === "self" && event.meta?.isWeaponAttack === true))
    );
  }

  return (
    event.effect === EffectType.Damage &&
    event.source === "enemy" &&
    event.target === "opponent"
  );
}

function eventMatchesHitTarget(event: CombatEvent, target: CombatHitSubscriberTarget): boolean {
  if (target === CombatHitSubscriberTarget.PlayerAttackHit) {
    return (
      event.effect === EffectType.Damage &&
      event.source === "player" &&
      event.target === "opponent" &&
      event.value > 0
    );
  }

  return (
    event.effect === EffectType.Damage &&
    event.source === "enemy" &&
    event.target === "opponent" &&
    event.value > 0
  );
}

function getModifierTypePriority(modifierType: EventSubscriberType): number {
  if (modifierType === EventSubscriberType.AdditiveDamageBuff) {
    return 100;
  }

  if (modifierType === EventSubscriberType.MultiplicativeDamageBuff) {
    return 200;
  }

  return 300;
}

export class CombatEventBus {
  private readonly subscribers: Record<EffectType, CombatEventSubscriber[]> = {
    [EffectType.Damage]: [],
    [EffectType.Heal]: [],
    [EffectType.Armor]: [],
  };

  private readonly modifierSubscribers: CombatEventModifierEntry[] = [];
  private readonly hitSubscribers: CombatHitSubscriberEntry[] = [];
  private modifierSubscriptionOrder = 0;
  private readonly actionSubscribers: Record<CombatActionType, CombatActionSubscriber[]> = {
    [CombatActionType.PlayerTurnEnded]: [],
    [CombatActionType.EnemyTurnEnded]: [],
  };

  constructor() {
    this.installLifecycleDurationSubscribers();
  }

  subscribe(effectType: EffectType, subscriber: CombatEventSubscriber): () => void {
    this.subscribers[effectType].push(subscriber);

    return () => {
      const index = this.subscribers[effectType].indexOf(subscriber);
      if (index >= 0) {
        this.subscribers[effectType].splice(index, 1);
      }
    };
  }

  subscribeModifier(
    definition: CombatEventModifierDefinition,
    modifier: CombatEventModifierSubscriber,
  ): () => void {
    const entry: CombatEventModifierEntry = {
      definition,
      modifier,
      order: this.modifierSubscriptionOrder,
    };

    this.modifierSubscriptionOrder += 1;
    this.modifierSubscribers.push(entry);
    this.sortModifierSubscribers();

    return () => {
      const index = this.modifierSubscribers.indexOf(entry);
      if (index >= 0) {
        this.modifierSubscribers.splice(index, 1);
      }
    };
  }

  subscribeHit(
    definition: CombatHitSubscriberDefinition,
    subscriber: CombatHitSubscriber,
  ): () => void {
    const entry: CombatHitSubscriberEntry = {
      definition,
      subscriber,
    };

    this.hitSubscribers.push(entry);

    return () => {
      const index = this.hitSubscribers.indexOf(entry);
      if (index >= 0) {
        this.hitSubscribers.splice(index, 1);
      }
    };
  }

  subscribeAction(actionType: CombatActionType, subscriber: CombatActionSubscriber): () => void {
    this.actionSubscribers[actionType].push(subscriber);

    return () => {
      const index = this.actionSubscribers[actionType].indexOf(subscriber);
      if (index >= 0) {
        this.actionSubscribers[actionType].splice(index, 1);
      }
    };
  }

  emitAction(action: CombatAction): void {
    for (const subscriber of this.actionSubscribers[action.type]) {
      subscriber(action);
    }
  }

  clearSubscribersByDuration(duration: Duration): void {
    for (let index = this.modifierSubscribers.length - 1; index >= 0; index -= 1) {
      if (this.modifierSubscribers[index].definition.duration === duration) {
        this.modifierSubscribers.splice(index, 1);
      }
    }

    for (let index = this.hitSubscribers.length - 1; index >= 0; index -= 1) {
      if (this.hitSubscribers[index].definition.duration === duration) {
        this.hitSubscribers.splice(index, 1);
      }
    }
  }

  prepareEvent(event: CombatEvent): CombatEvent {
    return this.applyModifierSubscribers(event);
  }

  publish(event: CombatEvent, options?: { alreadyPrepared?: boolean }): CombatEvent[] {
    const nextEvents: CombatEvent[] = [];
    const modifiedEvent = options?.alreadyPrepared === true
      ? event
      : this.applyModifierSubscribers(event);

    this.publishHitSubscribers(modifiedEvent);

    for (const subscriber of this.subscribers[modifiedEvent.effect]) {
      nextEvents.push(...subscriber(modifiedEvent));
    }

    return nextEvents;
  }

  private sortModifierSubscribers(): void {
    this.modifierSubscribers.sort((left, right) => {
      const leftPriority = getModifierTypePriority(left.definition.modifierType);
      const rightPriority = getModifierTypePriority(right.definition.modifierType);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.order - right.order;
    });
  }

  private applyModifierSubscribers(event: CombatEvent): CombatEvent {
    let modifiedEvent = event;

    for (const entry of this.modifierSubscribers) {
      if (!eventMatchesTarget(modifiedEvent, entry.definition.target)) {
        continue;
      }

      modifiedEvent = entry.modifier(modifiedEvent);
    }

    return modifiedEvent;
  }

  private publishHitSubscribers(event: CombatEvent): void {
    for (const entry of this.hitSubscribers) {
      if (!eventMatchesHitTarget(event, entry.definition.target)) {
        continue;
      }

      entry.subscriber(event);
    }
  }

  private installLifecycleDurationSubscribers(): void {
    this.subscribeAction(CombatActionType.PlayerTurnEnded, () => {
      this.clearSubscribersByDuration(Duration.PlayerTurn);
    });

    this.subscribeAction(CombatActionType.EnemyTurnEnded, () => {
      this.clearSubscribersByDuration(Duration.EnemyTurn);
    });
  }
}
