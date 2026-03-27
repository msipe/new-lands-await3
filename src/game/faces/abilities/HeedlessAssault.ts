import { type CombatEvent } from "../../combat-event-bus";
import { DamageEffectScript } from "../../dice-effects";
import { EffectType } from "../../dice";
import { Face, type FaceResolveContext } from "../Face";
import type { FaceUpgrade } from "../FaceUpgrade";
import type {
  FaceAdjustmentOperation,
  FaceAdjustmentPointDeltaInput,
  FaceAdjustmentProperty,
  FaceAdjustmentResult,
  FaceAdjustmentTextTemplate,
} from "../FaceAdjustmentModel";
import { FaceAdjustmentModalityType } from "../FaceAdjustmentModel";

type WeaponChoice = "both_hands" | "mainhand" | "offhand";

export class HeedlessAssault extends Face {
  private static readonly minDamage = 0;
  static readonly damageImproveRate = 1;
  static readonly damageReduceRate = 0.5;
  static readonly weaponChoiceChangeRate = 5;

  private bonusDamage: number;
  private weaponChoice: WeaponChoice;

  constructor(bonusDamage: number, weaponChoice: WeaponChoice = "both_hands") {
    super("Heedless Assault", "abilities");
    this.bonusDamage = Math.max(0, Math.floor(bonusDamage));
    this.weaponChoice = weaponChoice;
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
    const weaponLabel = HeedlessAssault.weaponChoiceLabel(this.weaponChoice);
    return `Lose all armor. Attack with ${weaponLabel} for +${this.bonusDamage} damage.`;
  }

  getResolvePopupText(): string {
    return `Heedless Assault (+${this.bonusDamage})`;
  }

  protected getLabel(): string {
    return `Heedless Assault ${this.weaponChoice.replace("_", " ")} +${this.bonusDamage}`;
  }

  protected getPower(): number {
    return Face.roundPower(
      Math.max(0, this.bonusDamage) + HeedlessAssault.weaponChoicePointValue(this.weaponChoice),
    );
  }

  cloneWithId(newId: string): HeedlessAssault {
    const c = new HeedlessAssault(this.bonusDamage, this.weaponChoice);
    c.id = newId;
    return c;
  }

  private static weaponChoiceLabel(choice: WeaponChoice): string {
    switch (choice) {
      case "both_hands": return "both weapons";
      case "mainhand":   return "main hand";
      case "offhand":    return "off hand";
    }
  }

  private static weaponChoicePointValue(choice: WeaponChoice): number {
    switch (choice) {
      case "both_hands": return 3;
      case "mainhand":   return 1;
      case "offhand":    return 0;
    }
  }

  // ── Damage point helpers ─────────────────────────────────────────────────

  private getDamagePointValue(): number {
    return HeedlessAssault.getPointValueAtDamage(this.bonusDamage);
  }

  private static getPointValueAtDamage(damage: number): number {
    return Math.max(HeedlessAssault.minDamage, damage);
  }

  private static calculateDamagePointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const steps = Math.max(1, Math.floor(input.steps));
    const currentDamage = Math.max(HeedlessAssault.minDamage, input.propertyValue);
    const currentPoints = HeedlessAssault.getPointValueAtDamage(currentDamage);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        return HeedlessAssault.getPointValueAtDamage(currentDamage + steps) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        return HeedlessAssault.getPointValueAtDamage(Math.max(HeedlessAssault.minDamage, currentDamage - steps)) - currentPoints;
      }
      default:
        return 0;
    }
  }

  // ── Weapon choice point helpers ──────────────────────────────────────────

  private getWeaponChoicePointValue(): number {
    return HeedlessAssault.weaponChoicePointValue(this.weaponChoice);
  }

  private static calculateWeaponChoicePointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (input.operationType !== FaceAdjustmentModalityType.Select || typeof input.propertyValue !== "string") {
      return 0;
    }

    const current = input.properties.find((p) => p.id === "weapon_choice")?.value as WeaponChoice | undefined
      ?? (input.propertyValue as WeaponChoice);
    const next = input.propertyValue as WeaponChoice;
    return HeedlessAssault.weaponChoicePointValue(next) - HeedlessAssault.weaponChoicePointValue(current);
  }

  // ── Adjustment properties ────────────────────────────────────────────────

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "bonus_damage",
        label: "Bonus Damage",
        description: "Bonus damage dealt alongside the weapon attack.",
        value: this.bonusDamage,
        pointValue: this.getDamagePointValue(),
        pointDeltaCalculator: HeedlessAssault.calculateDamagePointDelta,
        improvementRate: HeedlessAssault.damageImproveRate,
        reductionRate: HeedlessAssault.damageReduceRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: HeedlessAssault.damageImproveRate,
            min: HeedlessAssault.minDamage,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: HeedlessAssault.damageReduceRate,
            min: HeedlessAssault.minDamage,
          },
        ],
      },
      {
        id: "weapon_choice",
        label: "Weapon Choice",
        description: "Which weapon(s) to attack with. Both hands is most powerful; off hand is cheapest.",
        value: this.weaponChoice,
        pointValue: this.getWeaponChoicePointValue(),
        pointDeltaCalculator: HeedlessAssault.calculateWeaponChoicePointDelta,
        improvementRate: HeedlessAssault.weaponChoiceChangeRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Select,
            options: ["both_hands", "mainhand", "offhand"],
            multi: false,
            rate: HeedlessAssault.weaponChoiceChangeRate,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template: "Lose all armor. Attack with $weapon_choice for +$bonus_damage damage.",
      bindings: {
        weapon_choice: {
          propertyId: "weapon_choice",
          display: "value",
          tooltipKey: "weapon-choice",
        },
        bonus_damage: {
          propertyId: "bonus_damage",
          display: "value",
          tooltipKey: "bonus-damage",
        },
      },
    };
  }

  // ── Apply adjustment ─────────────────────────────────────────────────────

  applyAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    const property = this.getAdjustmentProperty(operation.propertyId);
    if (!property) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported property for this face." };
    }

    if (!this.supportsAdjustmentModality(property, operation.type)) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported adjustment modality for this property." };
    }

    switch (operation.propertyId) {
      case "bonus_damage":   return this.applyBonusDamageAdjustment(operation);
      case "weapon_choice":  return this.applyWeaponChoiceAdjustment(operation);
      default:
        return { applied: false, resourceDelta: 0, reason: "Unsupported property for this face." };
    }
  }

  private applyBonusDamageAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const steps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.bonusDamage += steps;
      return { applied: true, resourceDelta: -(steps * HeedlessAssault.damageImproveRate) };
    }

    if (operation.type !== FaceAdjustmentModalityType.Reduce) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported adjustment modality for this property." };
    }

    const steps = Math.max(1, Math.floor(operation.steps ?? 1));
    const nextDamage = Math.max(HeedlessAssault.minDamage, this.bonusDamage - steps);
    const adjustedSteps = this.bonusDamage - nextDamage;
    if (adjustedSteps === 0) {
      return { applied: false, resourceDelta: 0, reason: "Bonus damage is already at minimum." };
    }

    this.bonusDamage = nextDamage;
    return { applied: true, resourceDelta: adjustedSteps * HeedlessAssault.damageReduceRate };
  }

  private applyWeaponChoiceAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type !== FaceAdjustmentModalityType.Select) {
      return { applied: false, resourceDelta: 0, reason: "Unsupported adjustment modality for this property." };
    }

    if (this.weaponChoice === operation.value) {
      return { applied: false, resourceDelta: 0, reason: "Weapon choice is already selected." };
    }

    const previous = this.weaponChoice;
    this.weaponChoice = operation.value as WeaponChoice;
    const pointDelta = HeedlessAssault.weaponChoicePointValue(this.weaponChoice)
      - HeedlessAssault.weaponChoicePointValue(previous);
    return { applied: true, resourceDelta: -(pointDelta * HeedlessAssault.weaponChoiceChangeRate) };
  }

  // ── Resolve ──────────────────────────────────────────────────────────────

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const stripArmorEvent: CombatEvent = {
      effect: EffectType.Armor,
      value: 0,
      source: context.source,
      target: "self",
      cause: context.cause,
      dieId: context.dieId,
      sideId: this.id,
      meta: { stripAllArmor: true },
    };

    const damageEffect = new DamageEffectScript(`${this.id}-damage`, this.bonusDamage, "opponent");
    const damageEvent = damageEffect.toEvent(context.source, context.cause, context.dieId, this.id);

    return [stripArmorEvent, damageEvent];
  }
}
