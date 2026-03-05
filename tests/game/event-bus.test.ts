import { CombatEventBus, type CombatEvent } from "../../src/game/combat-event-bus";
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
});
