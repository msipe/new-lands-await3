import {
  CombatActionType,
  CombatEventBus,
  CombatEventSubscriberTarget,
  Duration,
  EventSubscriberType,
  type CombatEvent,
} from "../../src/game/combat-event-bus";
import { EffectType } from "../../src/game/dice";

function createDamageEvent(value: number): CombatEvent {
  return {
    effect: EffectType.Damage,
    value,
    source: "player",
    target: "opponent",
    cause: "player-roll",
    dieId: "die-1",
    sideId: "side-1",
    originDieId: "die-1",
    tags: ["effect:damage", "actor:player", "target:opponent", "cause:player-roll", "attack", "hit"],
  };
}

describe("combat event bus", () => {
  it("publishes events only to matching effect subscribers", () => {
    const bus = new CombatEventBus();
    const damageSpy: number[] = [];
    const healSpy: number[] = [];

    bus.subscribe(EffectType.Damage, (event) => {
      damageSpy.push(event.value);
      return [];
    });

    bus.subscribe(EffectType.Heal, (event) => {
      healSpy.push(event.value);
      return [];
    });

    bus.publish(createDamageEvent(3));

    expect(damageSpy).toEqual([3]);
    expect(healSpy).toEqual([]);
  });

  it("returns concatenated emitted events from all subscribers", () => {
    const bus = new CombatEventBus();

    bus.subscribe(EffectType.Damage, () => [
      {
        effect: EffectType.Heal,
        value: 1,
        source: "player",
        target: "self",
        cause: "triggered",
        dieId: "trigger-a",
        sideId: "trigger-a",
        originDieId: "trigger-a",
        tags: ["effect:heal", "actor:player", "target:self", "cause:triggered"],
      },
    ]);

    bus.subscribe(EffectType.Damage, () => [
      {
        effect: EffectType.Damage,
        value: 2,
        source: "enemy",
        target: "opponent",
        cause: "triggered",
        dieId: "trigger-b",
        sideId: "trigger-b",
        originDieId: "trigger-b",
        tags: ["effect:damage", "actor:enemy", "target:opponent", "cause:triggered", "attack", "hit"],
      },
    ]);

    const emitted = bus.publish(createDamageEvent(5));

    expect(emitted).toHaveLength(2);
    expect(emitted[0].effect).toBe(EffectType.Heal);
    expect(emitted[1].effect).toBe(EffectType.Damage);
  });

  it("stops notifying subscriber after unsubscribe", () => {
    const bus = new CombatEventBus();
    const received: number[] = [];

    const unsubscribe = bus.subscribe(EffectType.Damage, (event) => {
      received.push(event.value);
      return [];
    });

    bus.publish(createDamageEvent(1));
    unsubscribe();
    bus.publish(createDamageEvent(2));

    expect(received).toEqual([1]);
  });

  it("supports external queue-based chaining of triggered events", () => {
    const bus = new CombatEventBus();
    const processed: CombatEvent[] = [];

    bus.subscribe(EffectType.Damage, () => [
      {
        effect: EffectType.Heal,
        value: 1,
        source: "player",
        target: "self",
        cause: "triggered",
        dieId: "chain-a",
        sideId: "chain-a",
        originDieId: "chain-a",
        tags: ["effect:heal", "actor:player", "target:self", "cause:triggered"],
      },
    ]);

    bus.subscribe(EffectType.Heal, () => [
      {
        effect: EffectType.Damage,
        value: 1,
        source: "enemy",
        target: "opponent",
        cause: "triggered",
        dieId: "chain-b",
        sideId: "chain-b",
        originDieId: "chain-b",
        tags: ["effect:damage", "actor:enemy", "target:opponent", "cause:triggered", "attack", "hit"],
      },
    ]);

    const queue: CombatEvent[] = [createDamageEvent(2)];

    while (queue.length > 0 && processed.length < 5) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      processed.push(current);
      queue.push(...bus.publish(current));
    }

    expect(processed.map((event) => event.effect)).toEqual([
      EffectType.Damage,
      EffectType.Heal,
      EffectType.Damage,
      EffectType.Heal,
      EffectType.Damage,
    ]);
  });

  it("applies modifier subscribers in hierarchy order before standard subscribers", () => {
    const bus = new CombatEventBus();

    bus.subscribeModifier(
      {
        name: "flat-buff",
        id: "flat-buff",
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      (event) => ({ ...event, value: event.value + 2 }),
    );

    bus.subscribeModifier(
      {
        name: "mult-buff",
        id: "mult-buff",
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.MultiplicativeDamageBuff,
        duration: Duration.PlayerTurn,
      },
      (event) => ({ ...event, value: event.value * 2 }),
    );

    const seenValues: number[] = [];
    bus.subscribe(EffectType.Damage, (event) => {
      seenValues.push(event.value);
      return [];
    });

    bus.publish(createDamageEvent(3));

    // Additive first => (3 + 2) * 2 = 10.
    expect(seenValues).toEqual([10]);
  });

  it("clears turn-duration modifier subscribers", () => {
    const bus = new CombatEventBus();

    bus.subscribeModifier(
      {
        name: "warcry",
        id: "warcry",
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      (event) => ({ ...event, value: event.value + 3 }),
    );

    const seenValues: number[] = [];
    bus.subscribe(EffectType.Damage, (event) => {
      seenValues.push(event.value);
      return [];
    });

    bus.publish(createDamageEvent(1));
    bus.clearSubscribersByDuration(Duration.PlayerTurn);
    bus.publish(createDamageEvent(1));

    expect(seenValues).toEqual([4, 1]);
  });

  it("automatically clears player-turn modifiers when player turn end action is emitted", () => {
    const bus = new CombatEventBus();

    bus.subscribeModifier(
      {
        name: "warcry",
        id: "warcry",
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      (event) => ({ ...event, value: event.value + 3 }),
    );

    const seenValues: number[] = [];
    bus.subscribe(EffectType.Damage, (event) => {
      seenValues.push(event.value);
      return [];
    });

    bus.publish(createDamageEvent(1));
    bus.emitAction({ type: CombatActionType.PlayerTurnEnded });
    bus.publish(createDamageEvent(1));

    expect(seenValues).toEqual([4, 1]);
  });
});
