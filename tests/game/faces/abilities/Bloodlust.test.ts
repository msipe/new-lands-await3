import { Bloodlust } from "../../../../src/game/faces/abilities/Bloodlust";

describe("Bloodlust", () => {
  it("emits no combat events on resolve", () => {
    const face = new Bloodlust("rage-die");
    const events = face.resolve({
      source: "player",
      cause: "player-roll",
      dieId: "test-die",
    });

    expect(events).toHaveLength(0);
  });

  it("returns weapon hit reaction with correct construct id and count", () => {
    const face = new Bloodlust("rage-die");
    const reaction = face.createWeaponHitReaction();

    expect(reaction.constructId).toBe("rage-die");
    expect(reaction.countPerHit).toBe(1);
  });

  it("supports custom countPerHit", () => {
    const face = new Bloodlust("rage-die", 2);
    const reaction = face.createWeaponHitReaction();

    expect(reaction.countPerHit).toBe(2);
  });

  it("uses killing-machine-die variant correctly", () => {
    const face = new Bloodlust("killing-machine-die");
    const reaction = face.createWeaponHitReaction();

    expect(reaction.constructId).toBe("killing-machine-die");
    expect(face.label).toBe("Bloodlust: Killing Machine");
    expect(face.getResolvePopupText()).toBe("Killing Machine mode!");
  });

  it("uses rage-die label and popup text", () => {
    const face = new Bloodlust("rage-die");

    expect(face.label).toBe("Bloodlust");
    expect(face.getResolvePopupText()).toBe("Bloodlust!");
  });

  it("has higher power for killing-machine variant", () => {
    const rage = new Bloodlust("rage-die");
    const killing = new Bloodlust("killing-machine-die");

    expect(killing.power).toBeGreaterThan(rage.power);
  });

  it("clones correctly", () => {
    const original = new Bloodlust("rage-die", 2);
    const clone = original.cloneWithId("clone-id");

    expect(clone.id).toBe("clone-id");
    expect(clone.constructId).toBe("rage-die");
    expect(clone.countPerHit).toBe(2);
  });
});
