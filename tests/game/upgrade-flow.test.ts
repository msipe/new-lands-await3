import { CombatEventBus } from "../../src/game/combat-event-bus";
import {
  applyUpgradeToDieSide,
  Die,
  EffectType,
  type SideResolveContext,
} from "../../src/game/dice";
import { ArcaneBurst, MinorMend, ScalingStrike } from "../../src/game/faces";

const resolveContext: SideResolveContext = {
  source: "player",
  cause: "player-roll",
  dieId: "test-die",
};

describe("upgrade flow", () => {
  it("applies numeric-plus-1 upgrade to damage face instance", () => {
    const die = new Die({
      id: "die-upgrade-1",
      name: "Upgrade Die",
      sides: [new ArcaneBurst()],
    });

    const didApply = applyUpgradeToDieSide(die, "die-upgrade-1-side-1", { type: "numeric-plus-1" });
    const event = die.sides[0].resolve(resolveContext)[0];

    expect(didApply).toBe(true);
    expect(event.effect).toBe(EffectType.Damage);
    expect(event.value).toBe(4);
  });

  it("applies heal-plus only to heal face instance", () => {
    const healDie = new Die({
      id: "heal-die",
      name: "Heal Die",
      sides: [new MinorMend()],
    });

    const didApply = applyUpgradeToDieSide(healDie, "heal-die-side-1", {
      type: "heal-plus",
      amount: 2,
    });
    const healEvent = healDie.sides[0].resolve(resolveContext)[0];

    expect(didApply).toBe(true);
    expect(healEvent.effect).toBe(EffectType.Heal);
    expect(healEvent.value).toBe(3);
  });

  it("rejects incompatible upgrade types per face", () => {
    const damageDie = new Die({
      id: "damage-die",
      name: "Damage Die",
      sides: [new ArcaneBurst()],
    });

    const didApply = applyUpgradeToDieSide(damageDie, "damage-die-side-1", {
      type: "heal-plus",
      amount: 2,
    });
    const damageEvent = damageDie.sides[0].resolve(resolveContext)[0];

    expect(didApply).toBe(false);
    expect(damageEvent.value).toBe(3);
  });

  it("keeps upgrade changes isolated to a single face instance", () => {
    const first = new ArcaneBurst();
    const second = new ArcaneBurst();
    const die = new Die({
      id: "instance-die",
      name: "Instance Die",
      sides: [first, second],
    });

    applyUpgradeToDieSide(die, "instance-die-side-1", { type: "damage-plus", amount: 2 });

    const firstValue = first.resolve(resolveContext)[0].value;
    const secondValue = second.resolve(resolveContext)[0].value;

    expect(firstValue).toBe(5);
    expect(secondValue).toBe(3);
  });

  it("supports scaling-step upgrades for scaling faces", () => {
    const scaling = new ScalingStrike(1, 5, 1);
    const die = new Die({
      id: "scaling-die",
      name: "Scaling Die",
      sides: [scaling],
    });

    applyUpgradeToDieSide(die, "scaling-die-side-1", { type: "scaling-step-plus", amount: 2 });

    const values: number[] = [];
    for (let roll = 0; roll < 6; roll += 1) {
      values.push(scaling.resolve(resolveContext)[0].value);
    }

    expect(values).toEqual([1, 1, 1, 1, 4, 4]);
  });

  it("returns false when side id is missing", () => {
    const die = new Die({
      id: "missing-side-die",
      name: "Missing Side Die",
      sides: [new ArcaneBurst()],
    });

    const didApply = applyUpgradeToDieSide(die, "unknown-side", { type: "numeric-plus-1" });
    expect(didApply).toBe(false);
  });

  it("returns false when side is not upgradable", () => {
    const nonUpgradableSide = {
      id: "plain-side",
      label: "Plain",
      resolve: () => [],
    };

    const die = new Die({
      id: "plain-die",
      name: "Plain Die",
      sides: [nonUpgradableSide],
    });

    const didApply = applyUpgradeToDieSide(die, "plain-die-side-1", { type: "numeric-plus-1" });
    expect(didApply).toBe(false);
  });
});
