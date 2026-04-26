import {
  CombatEventSubscriberTarget,
  Duration,
  EventSubscriberType,
  type CombatEvent,
  type CombatEventModifierRegistration,
} from "../../combat-event-bus";
import type { CombatLogRollContext } from "../../combat-log";
import { EffectType, defaultRandomSource, type RandomSource } from "../../dice";
import {
  resolveTransientDieFromConstruct,
  type TransientDiePopupData,
} from "../../transient-die";
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

type WildStrikeWeaponChoice = "mainhand" | "offhand" | "both_hands";

type ResolveTransientWeaponEvents = (
  context: FaceResolveContext,
  randomSource: RandomSource,
  onResolvedTransientDie?: (popupData: TransientDiePopupData) => void,
) => CombatEvent[];

function createMainhandTransientResolver(
  mainhandWeaponConstructId?: string,
): ResolveTransientWeaponEvents {
  return (context, randomSource, onResolvedTransientDie) => {
    if (!mainhandWeaponConstructId) {
      return [];
    }

    return resolveTransientDieFromConstruct({
      constructId: mainhandWeaponConstructId,
      parentDieId: context.dieId,
      source: context.source,
      cause: context.cause,
      randomSource,
      onResolvedTransientDie,
    });
  };
}

export type WildStrikeRollSummary = {
  outcome: "miss" | "success" | "backfire";
  variantBonus: number;
  combinedDamage: number;
  weaponLabel?: string;
  popupText?: string;
};

function hasWildStrikeMeta(event: CombatEvent): boolean {
  return event.meta?.wildStrike === true;
}

function isMatchingWildStrikeDamageEvent(event: CombatEvent): boolean {
  return (
    event.effect === EffectType.Damage &&
    event.source === "player" &&
    event.target === "opponent" &&
    event.value > 0 &&
    event.meta?.wildStrike === true &&
    typeof event.meta?.wildStrikeSourceDieId === "string" &&
    typeof event.meta?.sourceDieId === "string" &&
    event.meta.wildStrikeSourceDieId === event.meta.sourceDieId
  );
}

function getWildStrikeBonusValue(rawBonus: unknown): number {
  return typeof rawBonus === "number" ? Math.max(0, Math.floor(rawBonus)) : 0;
}

export function getWildStrikeVariantBonus(events: CombatEvent[]): number {
  const rawBonus = events.find(hasWildStrikeMeta)?.meta?.wildStrikeBonus;
  return getWildStrikeBonusValue(rawBonus);
}

export function normalizeWildStrikeWeaponLabel(weaponLabel: string): string {
  return weaponLabel.endsWith(" Die") ? weaponLabel.slice(0, -4) : weaponLabel;
}

export function summarizeWildStrikeRoll(events: CombatEvent[]): WildStrikeRollSummary {
  const variantBonus = getWildStrikeVariantBonus(events);
  const transientEvent = events.find((event) => event.meta?.transientDie === true);

  if (!transientEvent) {
    return {
      outcome: "miss",
      variantBonus,
      combinedDamage: 0,
    };
  }

  const weaponLabel =
    typeof transientEvent.meta?.transientDieLabel === "string"
      ? transientEvent.meta.transientDieLabel
      : undefined;

  const baseDamage = events
    .filter(
      (event) =>
        event.effect === EffectType.Damage &&
        event.source === "player" &&
        event.target === "opponent" &&
        event.meta?.transientDie === true,
    )
    .reduce((total, event) => total + Math.max(0, Math.floor(event.value)), 0);

  const bonusDamage =
    baseDamage > 0 ? getWildStrikeBonusValue(transientEvent.meta?.wildStrikeBonus) : 0;
  const combinedDamage = baseDamage + bonusDamage;
  const popupText =
    typeof transientEvent.meta?.transientPopupText === "string"
      ? transientEvent.meta.transientPopupText
      : undefined;

  return {
    outcome: combinedDamage > 0 ? "success" : "backfire",
    variantBonus,
    combinedDamage,
    weaponLabel,
    popupText,
  };
}

export class WildStrike extends Face {
  private static readonly minAttackCount = 1;
  private static readonly minExtraDamage = 0;

  static readonly attackCountUpgradeRate = 3;
  static readonly attackCountReductionRate = 3;
  static readonly bonusDamageUpgradeRate = 1;
  static readonly bonusDamageReductionRate = 0.5;
  static readonly weaponChoiceChangeRate = 5;
  static readonly attackTimesPointWeight = 2;
  static readonly extraDamagePointWeight = 1;
  static readonly attackTimesBonusSynergyWeight = 0.5;
  static readonly attackCountPowerExponent = 1.35;
  static readonly bonusDamageSynergyScale = 0.75;
  static readonly attackBonusComboScale = 0.6;

  private attackCount = 1;
  private weaponChoice: WildStrikeWeaponChoice = "mainhand";
  private bonusDamage: number;
  private readonly mainhandWeaponConstructId?: string;
  private readonly resolveTransientWeaponEvents: ResolveTransientWeaponEvents;
  private lastTransientPopupData?: TransientDiePopupData;
  private lastTransientPopupDataList: TransientDiePopupData[] = [];

  constructor(
    bonusDamage: number,
    mainhandWeaponConstructId?: string,
    label = "Wild Strike",
  ) {
    super(label, "abilities");
    this.bonusDamage = Math.max(0, Math.floor(bonusDamage));
    this.mainhandWeaponConstructId = mainhandWeaponConstructId;
    this.resolveTransientWeaponEvents = createMainhandTransientResolver(mainhandWeaponConstructId);
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
    return `Trigger ${this.attackCount} extra ${this.weaponChoice.replace("_", " ")} attack(s). If they damage the opponent, add +${this.bonusDamage} damage.`;
  }

  protected getLabel(): string {
    return `Wild Strike ${this.attackCount}x ${this.weaponChoice.replace("_", " ")} +${this.bonusDamage}`;
  }

  protected getPower(): number {
    const safeAttackCount = Math.max(WildStrike.minAttackCount, Math.floor(this.attackCount));
    const safeBonusDamage = Math.max(WildStrike.minExtraDamage, Math.floor(this.bonusDamage));

    // We intentionally make multi-attacks scale super-linearly so each added hit is
    // more valuable than the previous one, then compound by bonus damage synergy.
    const attackCurve = safeAttackCount ** WildStrike.attackCountPowerExponent;
    const bonusSynergy =
      safeBonusDamage * (1 + Math.log2(safeAttackCount + 1) * WildStrike.bonusDamageSynergyScale);
    const comboPower =
      safeAttackCount * safeBonusDamage * WildStrike.attackBonusComboScale;
    const weaponMultiplier = WildStrike.getWeaponChoicePowerMultiplier(this.weaponChoice);

    return WildStrike.roundPower((attackCurve + bonusSynergy + comboPower) * weaponMultiplier);
  }

  cloneWithId(newId: string): WildStrike {
    const clone = new WildStrike(
      this.bonusDamage,
      this.mainhandWeaponConstructId,
      this.getBaseLabel(),
    );
    clone.id = newId;
    clone.attackCount = this.attackCount;
    clone.weaponChoice = this.weaponChoice;
    return clone;
  }

  getResolvePopupText(): string {
    return `Wild Strike (+${this.bonusDamage})`;
  }

  getSpawnedDiePopupData(): TransientDiePopupData | undefined {
    return this.lastTransientPopupData;
  }

  getSpawnedDicePopupData(): TransientDiePopupData[] {
    return [...this.lastTransientPopupDataList];
  }

  private getAttackTimesPointValue(): number {
    return WildStrike.computeAttackTimesPointValue(this.attackCount, this.bonusDamage);
  }

  private getWeaponChoicePointValue(): number {
    return WildStrike.getWeaponChoicePointValue(this.weaponChoice);
  }

  private getExtraDamagePointValue(): number {
    return WildStrike.computeExtraDamagePointValue(this.bonusDamage, this.attackCount);
  }

  private static getNumericProperty(properties: FaceAdjustmentProperty[], id: string, fallback: number): number {
    const value = properties.find((entry) => entry.id === id)?.value;
    return typeof value === "number" ? value : fallback;
  }

  private static getWeaponChoiceProperty(
    properties: FaceAdjustmentProperty[],
    fallback: WildStrikeWeaponChoice,
  ): WildStrikeWeaponChoice {
    const value = properties.find((entry) => entry.id === "weapon_choice")?.value;
    if (value === "mainhand" || value === "offhand" || value === "both_hands") {
      return value;
    }

    return fallback;
  }

  private static getWeaponChoicePointValue(choice: WildStrikeWeaponChoice): number {
    switch (choice) {
      case "both_hands":
        return 2;
      case "offhand":
        return 0.5;
      case "mainhand":
      default:
        return 0;
    }
  }

  private static getWeaponChoicePowerMultiplier(choice: WildStrikeWeaponChoice): number {
    switch (choice) {
      case "both_hands":
        return 1.35;
      case "offhand":
        return 0.9;
      case "mainhand":
      default:
        return 1;
    }
  }

  private static computeAttackTimesPointValue(attackTimes: number, extraDamage: number): number {
    const safeAttackTimes = Math.max(WildStrike.minAttackCount, Math.floor(attackTimes));
    const safeExtraDamage = Math.max(WildStrike.minExtraDamage, Math.floor(extraDamage));
    return (
      safeAttackTimes * WildStrike.attackTimesPointWeight +
      safeAttackTimes * safeExtraDamage * WildStrike.attackTimesBonusSynergyWeight
    );
  }

  private static computeExtraDamagePointValue(extraDamage: number, attackTimes: number): number {
    const safeExtraDamage = Math.max(WildStrike.minExtraDamage, Math.floor(extraDamage));
    const safeAttackTimes = Math.max(WildStrike.minAttackCount, Math.floor(attackTimes));
    return (
      safeExtraDamage * WildStrike.extraDamagePointWeight +
      safeAttackTimes * safeExtraDamage * WildStrike.attackTimesBonusSynergyWeight
    );
  }

  private static calculateAttackTimesPointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const steps = Math.max(1, Math.floor(input.steps));
    const currentAttackTimes = Math.max(WildStrike.minAttackCount, Math.floor(input.propertyValue));
    const extraDamage = WildStrike.getNumericProperty(input.properties, "extra_damage", 0);
    const currentPoints = WildStrike.computeAttackTimesPointValue(currentAttackTimes, extraDamage);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        const nextAttackTimes = currentAttackTimes + steps;
        return WildStrike.computeAttackTimesPointValue(nextAttackTimes, extraDamage) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        const nextAttackTimes = Math.max(WildStrike.minAttackCount, currentAttackTimes - steps);
        return WildStrike.computeAttackTimesPointValue(nextAttackTimes, extraDamage) - currentPoints;
      }
      default:
        return 0;
    }
  }

  private static calculateWeaponChoicePointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (input.operationType !== FaceAdjustmentModalityType.Select || typeof input.propertyValue !== "string") {
      return 0;
    }

    const currentChoice = WildStrike.getWeaponChoiceProperty(
      input.properties,
      input.propertyValue as WildStrikeWeaponChoice,
    );
    const nextChoice = input.propertyValue as WildStrikeWeaponChoice;
    return WildStrike.getWeaponChoicePointValue(nextChoice) - WildStrike.getWeaponChoicePointValue(currentChoice);
  }

  private static calculateExtraDamagePointDelta(input: FaceAdjustmentPointDeltaInput): number {
    if (typeof input.propertyValue !== "number") {
      return 0;
    }

    const steps = Math.max(1, Math.floor(input.steps));
    const currentExtraDamage = Math.max(WildStrike.minExtraDamage, Math.floor(input.propertyValue));
    const attackTimes = WildStrike.getNumericProperty(input.properties, "attack_times", 1);
    const currentPoints = WildStrike.computeExtraDamagePointValue(currentExtraDamage, attackTimes);

    switch (input.operationType) {
      case FaceAdjustmentModalityType.Improve: {
        const nextExtraDamage = currentExtraDamage + steps;
        return WildStrike.computeExtraDamagePointValue(nextExtraDamage, attackTimes) - currentPoints;
      }
      case FaceAdjustmentModalityType.Reduce: {
        const nextExtraDamage = Math.max(WildStrike.minExtraDamage, currentExtraDamage - steps);
        return WildStrike.computeExtraDamagePointValue(nextExtraDamage, attackTimes) - currentPoints;
      }
      default:
        return 0;
    }
  }

  getAdjustmentProperties(): FaceAdjustmentProperty[] {
    return [
      {
        id: "attack_times",
        label: "Attack Times",
        description: "How many extra attacks Wild Strike triggers.",
        value: this.attackCount,
        pointValue: this.getAttackTimesPointValue(),
        pointDeltaCalculator: WildStrike.calculateAttackTimesPointDelta,
        improvementRate: WildStrike.attackCountUpgradeRate,
        reductionRate: WildStrike.attackCountReductionRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: WildStrike.attackCountUpgradeRate,
            min: WildStrike.minAttackCount,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: WildStrike.attackCountReductionRate,
            min: WildStrike.minAttackCount,
          },
        ],
      },
      {
        id: "weapon_choice",
        label: "Weapon Choice",
        description: "Which equipped weapon slot Wild Strike should use.",
        value: this.weaponChoice,
        pointValue: this.getWeaponChoicePointValue(),
        pointDeltaCalculator: WildStrike.calculateWeaponChoicePointDelta,
        improvementRate: WildStrike.weaponChoiceChangeRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Select,
            options: ["mainhand", "offhand", "both_hands"],
            multi: false,
            rate: WildStrike.weaponChoiceChangeRate,
          },
        ],
      },
      {
        id: "extra_damage",
        label: "Extra Damage",
        description: "Bonus damage applied when the transient strike hits.",
        value: this.bonusDamage,
        pointValue: this.getExtraDamagePointValue(),
        pointDeltaCalculator: WildStrike.calculateExtraDamagePointDelta,
        improvementRate: WildStrike.bonusDamageUpgradeRate,
        reductionRate: WildStrike.bonusDamageReductionRate,
        modalities: [
          {
            type: FaceAdjustmentModalityType.Improve,
            step: 1,
            rate: WildStrike.bonusDamageUpgradeRate,
            min: WildStrike.minExtraDamage,
          },
          {
            type: FaceAdjustmentModalityType.Reduce,
            step: 1,
            rate: WildStrike.bonusDamageReductionRate,
            min: WildStrike.minExtraDamage,
          },
        ],
      },
    ];
  }

  getAdjustmentTextTemplate(): FaceAdjustmentTextTemplate {
    return {
      template:
        "Trigger $attack_times extra $weapon_choice attack(s). If they damage the opponent, add +$extra_damage damage.",
      bindings: {
        attack_times: {
          propertyId: "attack_times",
          display: "value",
          tooltipKey: "attack-times",
        },
        weapon_choice: {
          propertyId: "weapon_choice",
          display: "value",
          tooltipKey: "weapon-choice",
        },
        extra_damage: {
          propertyId: "extra_damage",
          display: "value",
          tooltipKey: "extra-damage",
        },
      },
    };
  }

  applyAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    const property = this.getAdjustmentProperty(operation.propertyId);
    if (!property) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported property for this face.",
      };
    }

    if (!this.supportsAdjustmentModality(property, operation.type)) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    switch (operation.propertyId) {
      case "attack_times":
        return this.applyAttackTimesAdjustment(operation);
      case "weapon_choice":
        return this.applyWeaponChoiceAdjustment(operation);
      case "extra_damage":
        return this.applyExtraDamageAdjustment(operation);
      default:
        return {
          applied: false,
          resourceDelta: 0,
          reason: "Unsupported property for this face.",
        };
    }
  }

  private applyAttackTimesAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const steps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.attackCount += steps;
      return {
        applied: true,
        resourceDelta: -(steps * WildStrike.attackCountUpgradeRate),
      };
    }

    if (operation.type !== FaceAdjustmentModalityType.Reduce) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    const steps = Math.max(1, Math.floor(operation.steps ?? 1));
    const nextAttackCount = Math.max(WildStrike.minAttackCount, this.attackCount - steps);
    const adjustedSteps = this.attackCount - nextAttackCount;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Attack times is already at minimum.",
      };
    }

    this.attackCount = nextAttackCount;
    return {
      applied: true,
      resourceDelta: adjustedSteps * WildStrike.attackCountReductionRate,
    };
  }

  private applyWeaponChoiceAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type !== FaceAdjustmentModalityType.Select) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    if (this.weaponChoice === operation.value) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Weapon choice is already selected.",
      };
    }

    this.weaponChoice = operation.value as WildStrikeWeaponChoice;
    return {
      applied: true,
      resourceDelta: -WildStrike.weaponChoiceChangeRate,
    };
  }

  private applyExtraDamageAdjustment(operation: FaceAdjustmentOperation): FaceAdjustmentResult {
    if (operation.type === FaceAdjustmentModalityType.Improve) {
      const steps = Math.max(1, Math.floor(operation.steps ?? 1));
      this.bonusDamage += steps;
      return {
        applied: true,
        resourceDelta: -(steps * WildStrike.bonusDamageUpgradeRate),
      };
    }

    if (operation.type !== FaceAdjustmentModalityType.Reduce) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Unsupported adjustment modality for this property.",
      };
    }

    const steps = Math.max(1, Math.floor(operation.steps ?? 1));
    const nextBonusDamage = Math.max(WildStrike.minExtraDamage, this.bonusDamage - steps);
    const adjustedSteps = this.bonusDamage - nextBonusDamage;
    if (adjustedSteps === 0) {
      return {
        applied: false,
        resourceDelta: 0,
        reason: "Extra damage is already at minimum.",
      };
    }

    this.bonusDamage = nextBonusDamage;
    return {
      applied: true,
      resourceDelta: adjustedSteps * WildStrike.bonusDamageReductionRate,
    };
  }

  createCombatEventModifier(): CombatEventModifierRegistration {
    const bonusDamage = this.bonusDamage;

    return {
      definition: {
        name: "wild-strike-bonus",
        id: this.id,
        target: CombatEventSubscriberTarget.PlayerAttackDamage,
        modifierType: EventSubscriberType.AdditiveDamageBuff,
        duration: Duration.PlayerTurn,
      },
      modifier: (event) => {
        if (!isMatchingWildStrikeDamageEvent(event) || bonusDamage <= 0) {
          return event;
        }

        return {
          ...event,
          value: event.value + bonusDamage,
          meta: {
            ...(event.meta ?? {}),
            wildStrikeBundledBonus: bonusDamage,
          },
        };
      },
    };
  }

  getCombatLogLines(context: CombatLogRollContext): string[] {
    const lines: string[] = ["Player rolls Wild Strike."];

    if (this.lastTransientPopupDataList.length === 0) {
      lines.push(`  > Miss (Wild Strike +${getWildStrikeVariantBonus(context.events)})`);
      return lines;
    }

    for (const popupData of this.lastTransientPopupDataList) {
      const transientLines =
        popupData.combatLogLines && popupData.combatLogLines.length > 0
          ? popupData.combatLogLines
          : [`Player rolls ${popupData.dieLabel}: ${popupData.sideLabel}.`];
      lines.push(...transientLines);
    }

    return lines;
  }

  protected onResolve(context: FaceResolveContext): CombatEvent[] {
    const randomSource = context.randomSource ?? defaultRandomSource;
    this.lastTransientPopupData = undefined;
    this.lastTransientPopupDataList = [];

    const transientEvents: CombatEvent[] = [];
    for (let attackIndex = 0; attackIndex < this.attackCount; attackIndex += 1) {
      const resolvedEvents = this.resolveTransientWeaponEvents(
        context,
        randomSource,
        (popupData) => {
          // Keep full popup history for multi-attack faces and preserve legacy single-popup access.
          this.lastTransientPopupDataList.push(popupData);
          this.lastTransientPopupData = popupData;
        },
      );
      transientEvents.push(...resolvedEvents);
    }

    if (transientEvents.length === 0) {
      return [];
    }

    return transientEvents.map((event) => ({
      ...event,
      meta: {
        ...(event.meta ?? {}),
        wildStrike: true,
        wildStrikeBonus: this.bonusDamage,
        wildStrikeSourceDieId: context.dieId,
        wildStrikeSourceSideId: this.id,
      },
    }));
  }
}
