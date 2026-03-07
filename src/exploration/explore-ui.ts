import {
  createExploreState,
  getCurrentTile,
  getHexDistance,
  toCoordKey,
  tryTravelToCoord,
  type ExploreBranch,
  type ExploreState,
  type ExploreTile,
} from "./explore-state";
import {
  createDefaultGamePlannerConfig,
  formatGamePlanSpec,
  GamePlanner,
  type GamePlanSpec,
} from "../planning/game-planner";
import { createWorldSpecFromPlan, type WorldSpec } from "../planning/world-spec-builder";
import { validateWorldAgainstSpec, type WorldValidationResult } from "../planning/world-validator";
import { applyWorldSpecToExploreState } from "./world-generator";
import {
  recordFaceAdjustment,
  createPlayerProgression,
  type PlayerProgressionState,
} from "../game/player-progression";
import { createPlayerCombatDiceLoadout } from "../game/player-combat-dice";
import { applyFaceAdjustmentEntry } from "../game/face-adjustments";
import {
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOT_ORDER,
} from "../game/player-items";
import type { Die } from "../game/dice";
import {
  FaceAdjustmentModalityType,
  type FaceAdjustmentOperation,
  type FaceAdjustmentProperty,
} from "../game/faces";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ActionButton = {
  kind: "branch";
  branch: ExploreBranch;
  rect: Rect;
};

type CraftsfolkId = "craft:up-down-smith";

type CraftsfolkOption = {
  id: CraftsfolkId;
  name: string;
  description: string;
};

type ShopRowRect = {
  id: string;
  rect: Rect;
};

type ShopLayout = {
  panelRect: Rect;
  closeButtonRect: Rect;
  dieListRect: Rect;
  faceListRect: Rect;
  propertyListRect: Rect;
  upgradeButtonRect: Rect;
  downgradeButtonRect: Rect;
  craftsfolkRows: ShopRowRect[];
  dieRows: ShopRowRect[];
  faceRows: ShopRowRect[];
  propertyRows: ShopRowRect[];
};

export type CreateExploreUiStateOptions = {
  initialSeedIndex?: number;
  playerProgression?: PlayerProgressionState;
};

export type ExploreUiAction =
  | { kind: "choose-branch"; branch: ExploreBranch }
  | undefined;

export type ExploreUiState = {
  model: ExploreState;
  hoveredTileKey?: string;
  width: number;
  height: number;
  mapCenterX: number;
  mapCenterY: number;
  hexSize: number;
  buttons: ActionButton[];
  time: number;
  plannerSpec: GamePlanSpec;
  worldSpec: WorldSpec;
  worldValidation: WorldValidationResult;
  plannerSeedIndex: number;
  isPlannerDebugOpen: boolean;
  playerProgression: PlayerProgressionState;
  xpBarRect: Rect;
  isTalentTreeOpen: boolean;
  selectedTalentId?: string;
  isCharacterSheetOpen: boolean;
  characterSheetButtonRect: Rect;
  isInventoryOpen: boolean;
  inventoryButtonRect: Rect;
  isCraftShopOpen: boolean;
  craftShopButtonRect: Rect;
  availableCraftsfolk: CraftsfolkOption[];
  selectedCraftsfolkId?: CraftsfolkId;
  selectedUpgradeDieId?: string;
  selectedUpgradeSideId?: string;
  selectedUpgradePropertyId?: string;
  shopStatusText?: string;
};

type TalentTreeLayout = {
  panelRect: Rect;
  talentRowRects: Array<{ talentId: string; rect: Rect }>;
  confirmButtonRect: Rect;
  cancelButtonRect: Rect;
};

function createPlannerPackage(seedIndex: number): {
  plannerSpec: GamePlanSpec;
  worldSpec: WorldSpec;
  model: ExploreState;
  worldValidation: WorldValidationResult;
} {
  const plannerSpec = new GamePlanner(
    createDefaultGamePlannerConfig(`run-${seedIndex.toString().padStart(3, "0")}`),
  ).createPlan();
  const worldSpec = createWorldSpecFromPlan(plannerSpec);
  const model = createExploreState({ radius: 3, seed: plannerSpec.seed });
  applyWorldSpecToExploreState(model, worldSpec);
  const worldValidation = validateWorldAgainstSpec(model, worldSpec);

  return {
    plannerSpec,
    worldSpec,
    model,
    worldValidation,
  };
}

const SQRT3 = Math.sqrt(3);

function axialToScreen(state: ExploreUiState, q: number, r: number): { x: number; y: number } {
  const x = state.mapCenterX + state.hexSize * (SQRT3 * q + (SQRT3 * 0.5) * r);
  const y = state.mapCenterY + state.hexSize * (1.5 * r);
  return { x, y };
}

function createButtons(width: number, height: number): ActionButton[] {
  const panelWidth = Math.min(240, Math.floor(width * 0.24));
  const buttonWidth = panelWidth - 28;
  const buttonHeight = 50;
  const rightEdge = width - 20;
  const x = rightEdge - panelWidth + 14;
  const top = Math.floor(height * 0.52);

  return [
    {
      kind: "branch",
      branch: "combat",
      rect: { x, y: top, width: buttonWidth, height: buttonHeight },
    },
    {
      kind: "branch",
      branch: "encounter",
      rect: { x, y: top + buttonHeight + 14, width: buttonWidth, height: buttonHeight },
    },
  ];
}

function createCharacterSheetButtonRect(): Rect {
  return {
    x: 20,
    y: 52,
    width: 180,
    height: 34,
  };
}

function createXpBarRect(): Rect {
  return {
    x: 30,
    y: 134,
    width: 240,
    height: 20,
  };
}

function getTalentTreeLayout(uiState: ExploreUiState): TalentTreeLayout {
  const width = Math.min(620, Math.floor(uiState.width * 0.82));
  const height = Math.min(520, Math.floor(uiState.height * 0.86));
  const x = Math.floor((uiState.width - width) * 0.5);
  const y = Math.floor((uiState.height - height) * 0.5);

  const talentRowRects: Array<{ talentId: string; rect: Rect }> = [];
  let rowY = y + 88;
  for (const talent of uiState.playerProgression.talents) {
    if (rowY > y + height - 124) {
      break;
    }

    talentRowRects.push({
      talentId: talent.id,
      rect: {
        x: x + 20,
        y: rowY,
        width: width - 40,
        height: 86,
      },
    });

    rowY += 96;
  }

  const buttonY = y + height - 80;
  const buttonWidth = 150;
  const buttonHeight = 36;

  return {
    panelRect: { x, y, width, height },
    talentRowRects,
    confirmButtonRect: {
      x: x + width - buttonWidth * 2 - 32,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    cancelButtonRect: {
      x: x + width - buttonWidth - 20,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
  };
}

function canConfirmSelectedTalent(uiState: ExploreUiState): boolean {
  if (!uiState.selectedTalentId || uiState.playerProgression.unspentTalentPoints <= 0) {
    return false;
  }

  const selected = uiState.playerProgression.talents.find(
    (talent) => talent.id === uiState.selectedTalentId,
  );
  if (!selected) {
    return false;
  }

  return selected.rank < selected.maxRank;
}

function createInventoryButtonRect(): Rect {
  return {
    x: 212,
    y: 52,
    width: 180,
    height: 34,
  };
}

function createCraftShopButtonRect(): Rect {
  return {
    x: 404,
    y: 52,
    width: 200,
    height: 34,
  };
}

function createCraftsfolkOptions(): CraftsfolkOption[] {
  return [
    {
      id: "craft:up-down-smith",
      name: "Up/Down Smith",
      description: "Simple face tuning specialist for upgrade and downgrade work.",
    },
  ];
}

function getActionLabel(branch: ExploreBranch, currentTile: ExploreTile): string {
  if (branch === "combat") {
    return "Travel to Combat";
  }

  if (currentTile.zone === "town") {
    return "Enter Town";
  }

  return "Travel to Encounter";
}

function refreshLayoutIfNeeded(uiState: ExploreUiState): void {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  if (uiState.width === width && uiState.height === height) {
    return;
  }

  uiState.width = width;
  uiState.height = height;
  uiState.mapCenterX = Math.floor(width * 0.42);
  uiState.mapCenterY = Math.floor(height * 0.5);
  uiState.hexSize = Math.max(26, Math.min(42, Math.floor(Math.min(width, height) * 0.045)));
  uiState.buttons = createButtons(width, height);
  uiState.characterSheetButtonRect = createCharacterSheetButtonRect();
  uiState.inventoryButtonRect = createInventoryButtonRect();
  uiState.craftShopButtonRect = createCraftShopButtonRect();
  uiState.xpBarRect = createXpBarRect();
}

function isPointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function getButtonAt(uiState: ExploreUiState, x: number, y: number): ActionButton | undefined {
  for (const button of uiState.buttons) {
    if (isPointInRect(x, y, button.rect)) {
      return button;
    }
  }

  return undefined;
}

function getCraftShopLayout(uiState: ExploreUiState, dice: Die[]): ShopLayout {
  const panelWidth = Math.min(960, Math.floor(uiState.width * 0.92));
  const panelHeight = Math.min(560, Math.floor(uiState.height * 0.9));
  const panelX = Math.floor((uiState.width - panelWidth) * 0.5);
  const panelY = Math.floor((uiState.height - panelHeight) * 0.5);

  const craftsfolkRows: ShopRowRect[] = [];
  let craftsfolkY = panelY + 74;
  for (const option of uiState.availableCraftsfolk) {
    craftsfolkRows.push({
      id: option.id,
      rect: {
        x: panelX + 20,
        y: craftsfolkY,
        width: panelWidth - 40,
        height: 42,
      },
    });
    craftsfolkY += 50;
  }

  const dieListRect: Rect = {
    x: panelX + 20,
    y: craftsfolkY + 12,
    width: Math.floor((panelWidth - 60) * 0.45),
    height: panelHeight - (craftsfolkY - panelY) - 36,
  };

  const faceListRect: Rect = {
    x: dieListRect.x + dieListRect.width + 20,
    y: dieListRect.y,
    width: Math.floor((panelWidth - (dieListRect.width + 80)) * 0.58),
    height: dieListRect.height,
  };

  const propertyListRect: Rect = {
    x: faceListRect.x + faceListRect.width + 20,
    y: faceListRect.y,
    width: panelX + panelWidth - (faceListRect.x + faceListRect.width + 20) - 20,
    height: faceListRect.height,
  };

  const dieRows: ShopRowRect[] = [];
  let dieY = dieListRect.y + 36;
  for (const die of dice) {
    if (dieY > dieListRect.y + dieListRect.height - 32) {
      break;
    }

    dieRows.push({
      id: die.id,
      rect: {
        x: dieListRect.x + 10,
        y: dieY,
        width: dieListRect.width - 20,
        height: 28,
      },
    });
    dieY += 32;
  }

  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId) ?? dice[0];
  const faceRows: ShopRowRect[] = [];
  let faceY = faceListRect.y + 36;
  if (selectedDie !== undefined) {
    for (const side of selectedDie.sides) {
      if (faceY > faceListRect.y + faceListRect.height - 32) {
        break;
      }

      faceRows.push({
        id: side.id,
        rect: {
          x: faceListRect.x + 10,
          y: faceY,
          width: faceListRect.width - 20,
          height: 28,
        },
      });
      faceY += 32;
    }
  }

  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  const adjustableSide = asAdjustableShopSide(selectedSide);
  const propertyRows: ShopRowRect[] = [];
  let propertyY = propertyListRect.y + 36;
  if (adjustableSide !== undefined) {
    for (const property of adjustableSide.getAdjustmentProperties()) {
      if (propertyY > propertyListRect.y + propertyListRect.height - 90) {
        break;
      }

      propertyRows.push({
        id: property.id,
        rect: {
          x: propertyListRect.x + 10,
          y: propertyY,
          width: propertyListRect.width - 20,
          height: 46,
        },
      });
      propertyY += 52;
    }
  }

  const actionButtonWidth = Math.max(90, Math.floor((propertyListRect.width - 30) * 0.5));
  const actionButtonY = propertyListRect.y + propertyListRect.height - 42;
  const upgradeButtonRect: Rect = {
    x: propertyListRect.x + 10,
    y: actionButtonY,
    width: actionButtonWidth,
    height: 28,
  };
  const downgradeButtonRect: Rect = {
    x: propertyListRect.x + propertyListRect.width - actionButtonWidth - 10,
    y: actionButtonY,
    width: actionButtonWidth,
    height: 28,
  };

  return {
    panelRect: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    closeButtonRect: {
      x: panelX + panelWidth - 126,
      y: panelY + 14,
      width: 106,
      height: 34,
    },
    dieListRect,
    faceListRect,
    propertyListRect,
    upgradeButtonRect,
    downgradeButtonRect,
    craftsfolkRows,
    dieRows,
    faceRows,
    propertyRows,
  };
}

type AdjustableShopSide = {
  getAdjustmentProperties: () => FaceAdjustmentProperty[];
};

function asAdjustableShopSide(side: Die["sides"][number] | undefined): AdjustableShopSide | undefined {
  if (!side) {
    return undefined;
  }

  const candidate = side as Partial<AdjustableShopSide>;
  if (typeof candidate.getAdjustmentProperties !== "function") {
    return undefined;
  }

  return candidate as AdjustableShopSide;
}

function formatGold(value: number): string {
  const roundedToTenth = Math.round(value * 10) / 10;
  if (Math.abs(roundedToTenth - Math.floor(roundedToTenth)) < 0.001) {
    return `${Math.floor(roundedToTenth)}`;
  }

  return roundedToTenth.toFixed(1);
}

function applyShopPropertyAdjustment(
  uiState: ExploreUiState,
  dice: Die[],
  operationType: FaceAdjustmentModalityType.Improve | FaceAdjustmentModalityType.Reduce,
): void {
  if (!uiState.selectedCraftsfolkId) {
    uiState.shopStatusText = "Select a craftsfolk before adjusting a face.";
    return;
  }

  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId);
  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  const adjustableSide = asAdjustableShopSide(selectedSide);
  if (!selectedDie || !selectedSide || !adjustableSide) {
    uiState.shopStatusText = "Select an adjustable die face first.";
    return;
  }

  const selectedProperty = adjustableSide
    .getAdjustmentProperties()
    .find((property) => property.id === uiState.selectedUpgradePropertyId);
  if (!selectedProperty) {
    uiState.shopStatusText = "Select a property before upgrading or downgrading.";
    return;
  }

  const operation: FaceAdjustmentOperation = {
    propertyId: selectedProperty.id,
    type: operationType,
    steps: 1,
  };

  const result = applyFaceAdjustmentEntry(dice, {
    dieId: selectedDie.id,
    sideId: selectedSide.id,
    operation,
  });

  if (!result.applied) {
    uiState.shopStatusText = result.reason ?? "Adjustment failed.";
    return;
  }

  const nextGold = uiState.playerProgression.gold + result.resourceDelta;
  if (nextGold < 0) {
    uiState.shopStatusText = "Not enough gold for that adjustment.";
    return;
  }

  uiState.playerProgression.gold = nextGold;
  recordFaceAdjustment(uiState.playerProgression, {
    dieId: selectedDie.id,
    sideId: selectedSide.id,
    operation,
  });

  const deltaText = result.resourceDelta < 0
    ? `Spent ${formatGold(Math.abs(result.resourceDelta))} gold.`
    : `Refunded ${formatGold(result.resourceDelta)} gold.`;
  uiState.shopStatusText = `${deltaText} Gold now ${formatGold(uiState.playerProgression.gold)}.`;
}

function getTileAt(uiState: ExploreUiState, x: number, y: number): ExploreTile | undefined {
  let bestTile: ExploreTile | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const tile of uiState.model.tiles) {
    const center = axialToScreen(uiState, tile.coord.q, tile.coord.r);
    const dx = x - center.x;
    const dy = y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < uiState.hexSize * 0.95 && distance < bestDistance) {
      bestTile = tile;
      bestDistance = distance;
    }
  }

  return bestTile;
}

function drawHex(centerX: number, centerY: number, size: number, mode: "fill" | "line"): void {
  const vertices: number[] = [];

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    vertices.push(centerX + size * Math.cos(angle), centerY + size * Math.sin(angle));
  }

  love.graphics.polygon(mode, ...vertices);
}

export function createExploreUiState(input?: number | CreateExploreUiStateOptions): ExploreUiState {
  const options: CreateExploreUiStateOptions =
    typeof input === "number" ? { initialSeedIndex: input } : input ?? {};
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  const plannerSeedIndex = Math.max(1, Math.floor(options.initialSeedIndex ?? 1));
  const plannerPackage = createPlannerPackage(plannerSeedIndex);

  return {
    model: plannerPackage.model,
    hoveredTileKey: undefined,
    width,
    height,
    mapCenterX: Math.floor(width * 0.42),
    mapCenterY: Math.floor(height * 0.5),
    hexSize: Math.max(26, Math.min(42, Math.floor(Math.min(width, height) * 0.045))),
    buttons: createButtons(width, height),
    time: 0,
    plannerSpec: plannerPackage.plannerSpec,
    worldSpec: plannerPackage.worldSpec,
    worldValidation: plannerPackage.worldValidation,
    plannerSeedIndex,
    isPlannerDebugOpen: false,
    playerProgression: options.playerProgression ?? createPlayerProgression(),
    xpBarRect: createXpBarRect(),
    isTalentTreeOpen: false,
    selectedTalentId: undefined,
    isCharacterSheetOpen: false,
    characterSheetButtonRect: createCharacterSheetButtonRect(),
    isInventoryOpen: false,
    inventoryButtonRect: createInventoryButtonRect(),
    isCraftShopOpen: false,
    craftShopButtonRect: createCraftShopButtonRect(),
    availableCraftsfolk: createCraftsfolkOptions(),
    selectedCraftsfolkId: undefined,
    selectedUpgradeDieId: undefined,
    selectedUpgradeSideId: undefined,
    selectedUpgradePropertyId: undefined,
    shopStatusText: undefined,
  };
}

function regeneratePlannerSpec(uiState: ExploreUiState): void {
  uiState.plannerSeedIndex += 1;
  const plannerPackage = createPlannerPackage(uiState.plannerSeedIndex);
  uiState.plannerSpec = plannerPackage.plannerSpec;
  uiState.worldSpec = plannerPackage.worldSpec;
  uiState.model = plannerPackage.model;
  uiState.worldValidation = plannerPackage.worldValidation;
}

export function onExploreKeyPressed(uiState: ExploreUiState, key: string): boolean {
  if (key === "c") {
    uiState.isCharacterSheetOpen = !uiState.isCharacterSheetOpen;
    if (uiState.isCharacterSheetOpen) {
      uiState.isInventoryOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
    }
    return true;
  }

  if (key === "i") {
    uiState.isInventoryOpen = !uiState.isInventoryOpen;
    if (uiState.isInventoryOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
    }
    return true;
  }

  if (key === "u") {
    uiState.isCraftShopOpen = !uiState.isCraftShopOpen;
    if (uiState.isCraftShopOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
    }
    return true;
  }

  if (key === "escape" && (uiState.isCharacterSheetOpen || uiState.isInventoryOpen || uiState.isTalentTreeOpen)) {
    uiState.isCharacterSheetOpen = false;
    uiState.isInventoryOpen = false;
    uiState.isTalentTreeOpen = false;
    uiState.selectedTalentId = undefined;
    return true;
  }

  if (key === "escape" && uiState.isCraftShopOpen) {
    uiState.isCraftShopOpen = false;
    return true;
  }

  if (key === "t") {
    uiState.isTalentTreeOpen = !uiState.isTalentTreeOpen;
    if (uiState.isTalentTreeOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
    } else {
      uiState.selectedTalentId = undefined;
    }
    return true;
  }

  if (key === "p") {
    uiState.isPlannerDebugOpen = !uiState.isPlannerDebugOpen;
    return true;
  }

  if (key === "r") {
    regeneratePlannerSpec(uiState);
    return true;
  }

  return false;
}

export function updateExploreUiState(uiState: ExploreUiState, dt: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.time += dt;
}

export function onExploreMouseMoved(uiState: ExploreUiState, x: number, y: number): void {
  refreshLayoutIfNeeded(uiState);
  if (uiState.isTalentTreeOpen) {
    return;
  }

  const hovered = getTileAt(uiState, x, y);
  uiState.hoveredTileKey = hovered?.key;
}

export function onExploreMouseReleased(uiState: ExploreUiState, x: number, y: number, button: number): ExploreUiAction {
  if (button !== 1) {
    return undefined;
  }

  if (uiState.isCraftShopOpen) {
    const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
    const layout = getCraftShopLayout(uiState, dice);
    const selectedDie =
      dice.find((die) => die.id === uiState.selectedUpgradeDieId) ??
      dice[0];

    if (isPointInRect(x, y, layout.closeButtonRect)) {
      uiState.isCraftShopOpen = false;
      return undefined;
    }

    for (const row of layout.craftsfolkRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedCraftsfolkId = row.id as CraftsfolkId;
      uiState.shopStatusText = `Selected craftsfolk: ${
        uiState.availableCraftsfolk.find((entry) => entry.id === row.id)?.name ?? row.id
      }`;
      return undefined;
    }

    for (const row of layout.dieRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedUpgradeDieId = row.id;
      const clickedDie = dice.find((die) => die.id === row.id);
      uiState.selectedUpgradeSideId = clickedDie?.sides[0]?.id;
      const initialAdjustableSide = asAdjustableShopSide(clickedDie?.sides[0]);
      uiState.selectedUpgradePropertyId = initialAdjustableSide?.getAdjustmentProperties()[0]?.id;
      uiState.shopStatusText = `Selected die: ${clickedDie?.name ?? row.id}`;
      return undefined;
    }

    for (const row of layout.faceRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedUpgradeSideId = row.id;
      const selectedSide = selectedDie?.sides.find((side) => side.id === row.id);
      const adjustableSide = asAdjustableShopSide(selectedSide);
      uiState.selectedUpgradePropertyId = adjustableSide?.getAdjustmentProperties()[0]?.id;
      uiState.shopStatusText = "Selected die face.";
      return undefined;
    }

    for (const row of layout.propertyRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedUpgradePropertyId = row.id;
      uiState.shopStatusText = "Selected face property.";
      return undefined;
    }

    if (isPointInRect(x, y, layout.upgradeButtonRect)) {
      applyShopPropertyAdjustment(uiState, dice, FaceAdjustmentModalityType.Improve);
      return undefined;
    }

    if (isPointInRect(x, y, layout.downgradeButtonRect)) {
      applyShopPropertyAdjustment(uiState, dice, FaceAdjustmentModalityType.Reduce);
      return undefined;
    }

    // Shop is modal and swallows all clicks behind it.
    return undefined;
  }

  refreshLayoutIfNeeded(uiState);

  if (uiState.isTalentTreeOpen) {
    const layout = getTalentTreeLayout(uiState);

    if (isPointInRect(x, y, layout.cancelButtonRect)) {
      uiState.selectedTalentId = undefined;
      uiState.isTalentTreeOpen = false;
      return undefined;
    }

    if (isPointInRect(x, y, layout.confirmButtonRect) && canConfirmSelectedTalent(uiState)) {
      const selected = uiState.playerProgression.talents.find(
        (talent) => talent.id === uiState.selectedTalentId,
      );
      if (selected && selected.rank < selected.maxRank) {
        selected.rank += 1;
        uiState.playerProgression.unspentTalentPoints = Math.max(
          0,
          uiState.playerProgression.unspentTalentPoints - 1,
        );
      }
      uiState.selectedTalentId = undefined;
      uiState.isTalentTreeOpen = false;
      return undefined;
    }

    for (const row of layout.talentRowRects) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedTalentId = row.talentId;
      return undefined;
    }

    // Talent tree acts as a modal; swallow all clicks behind it.
    return undefined;
  }

  if (isPointInRect(x, y, uiState.characterSheetButtonRect)) {
    uiState.isCharacterSheetOpen = !uiState.isCharacterSheetOpen;
    if (uiState.isCharacterSheetOpen) {
      uiState.isInventoryOpen = false;
    }
    return undefined;
  }

  if (isPointInRect(x, y, uiState.inventoryButtonRect)) {
    uiState.isInventoryOpen = !uiState.isInventoryOpen;
    if (uiState.isInventoryOpen) {
      uiState.isCharacterSheetOpen = false;
    }
    return undefined;
  }

  if (isPointInRect(x, y, uiState.craftShopButtonRect)) {
    uiState.isCraftShopOpen = !uiState.isCraftShopOpen;
    if (uiState.isCraftShopOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
    }
    return undefined;
  }

  if (isPointInRect(x, y, uiState.xpBarRect)) {
    uiState.isTalentTreeOpen = !uiState.isTalentTreeOpen;
    if (uiState.isTalentTreeOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
    } else {
      uiState.selectedTalentId = undefined;
    }
    return undefined;
  }

  const actionButton = getButtonAt(uiState, x, y);
  if (actionButton) {
    return {
      kind: "choose-branch",
      branch: actionButton.branch,
    };
  }

  const clickedTile = getTileAt(uiState, x, y);
  if (clickedTile) {
    tryTravelToCoord(uiState.model, clickedTile.coord);
  }

  return undefined;
}

function drawPlayerProgressHud(uiState: ExploreUiState): void {
  const progression = uiState.playerProgression;
  const panelX = 20;
  const panelY = 94;
  const panelWidth = 260;
  const panelHeight = 88;

  love.graphics.setColor(0.1, 0.12, 0.17, 0.92);
  love.graphics.rectangle("fill", panelX, panelY, panelWidth, panelHeight, 8, 8);
  love.graphics.setColor(0.67, 0.76, 0.9, 0.85);
  love.graphics.rectangle("line", panelX, panelY, panelWidth, panelHeight, 8, 8);

  love.graphics.setColor(0.96, 0.98, 1, 1);
  love.graphics.printf(
    `${progression.raceName} ${progression.className}  |  Level ${progression.level}`,
    panelX + 10,
    panelY + 10,
    panelWidth - 20,
    "left",
    0,
    0.66,
    0.66,
  );

  const barX = panelX + 10;
  const barY = panelY + 40;
  const barWidth = panelWidth - 20;
  const barHeight = 20;
  uiState.xpBarRect = {
    x: barX,
    y: barY,
    width: barWidth,
    height: barHeight,
  };
  const fillRatio = progression.xpToNextLevel > 0 ? progression.xp / progression.xpToNextLevel : 0;
  const canAdvanceTalents =
    progression.unspentTalentPoints > 0 ||
    (progression.xpToNextLevel > 0 && progression.xp >= progression.xpToNextLevel);

  if (canAdvanceTalents) {
    const pulse = (Math.sin(uiState.time * 5.8) + 1) * 0.5;
    const glowAlpha = 0.28 + pulse * 0.34;
    love.graphics.setColor(0.92, 0.8, 0.32, glowAlpha);
    love.graphics.rectangle("line", barX - 3, barY - 3, barWidth + 6, barHeight + 6, 7, 7);
    love.graphics.setColor(0.98, 0.88, 0.38, glowAlpha * 0.65);
    love.graphics.rectangle("line", barX - 6, barY - 6, barWidth + 12, barHeight + 12, 9, 9);
  }

  love.graphics.setColor(0.18, 0.22, 0.32, 1);
  love.graphics.rectangle("fill", barX, barY, barWidth, barHeight, 5, 5);
  love.graphics.setColor(0.4, 0.71, 0.94, 0.95);
  love.graphics.rectangle("fill", barX, barY, Math.max(0, Math.floor(barWidth * fillRatio)), barHeight, 5, 5);
  love.graphics.setColor(0.72, 0.83, 0.98, 0.9);
  love.graphics.rectangle("line", barX, barY, barWidth, barHeight, 5, 5);

  love.graphics.setColor(0.85, 0.92, 1, 0.92);
  love.graphics.printf(
    `XP ${progression.xp}/${progression.xpToNextLevel}  |  Battles won: ${progression.battlesWon}`,
    panelX + 10,
    panelY + 66,
    panelWidth - 20,
    "left",
    0,
    0.58,
    0.58,
  );

  if (canAdvanceTalents) {
    love.graphics.setColor(0.97, 0.9, 0.52, 0.95);
    love.graphics.printf(
      "Talent available: click XP bar (or press T)",
      panelX + 10,
      panelY + panelHeight - 14,
      panelWidth - 20,
      "left",
      0,
      0.5,
      0.5,
    );
  }
}

function drawActionPanel(uiState: ExploreUiState): void {
  const panelX = Math.floor(uiState.width * 0.78);
  const panelY = 24;
  const panelWidth = uiState.width - panelX - 20;
  const panelHeight = uiState.height - 48;

  love.graphics.setColor(0.11, 0.13, 0.2, 0.92);
  love.graphics.rectangle("fill", panelX, panelY, panelWidth, panelHeight, 10, 10);
  love.graphics.setColor(0.66, 0.72, 0.86, 0.78);
  love.graphics.rectangle("line", panelX, panelY, panelWidth, panelHeight, 10, 10);

  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf("Expedition Map", panelX + 14, panelY + 14, panelWidth - 28, "left", 0, 0.96, 0.96);

  love.graphics.setColor(0.2, 0.28, 0.43, 0.96);
  love.graphics.rectangle(
    "fill",
    uiState.characterSheetButtonRect.x,
    uiState.characterSheetButtonRect.y,
    uiState.characterSheetButtonRect.width,
    uiState.characterSheetButtonRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.73, 0.84, 0.98, 0.95);
  love.graphics.rectangle(
    "line",
    uiState.characterSheetButtonRect.x,
    uiState.characterSheetButtonRect.y,
    uiState.characterSheetButtonRect.width,
    uiState.characterSheetButtonRect.height,
    8,
    8,
  );

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(
    uiState.isCharacterSheetOpen ? "Close Character (C)" : "Open Character (C)",
    uiState.characterSheetButtonRect.x,
    uiState.characterSheetButtonRect.y + 9,
    uiState.characterSheetButtonRect.width,
    "center",
    0,
    0.62,
    0.62,
  );

  love.graphics.setColor(0.2, 0.28, 0.43, 0.96);
  love.graphics.rectangle(
    "fill",
    uiState.inventoryButtonRect.x,
    uiState.inventoryButtonRect.y,
    uiState.inventoryButtonRect.width,
    uiState.inventoryButtonRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.73, 0.84, 0.98, 0.95);
  love.graphics.rectangle(
    "line",
    uiState.inventoryButtonRect.x,
    uiState.inventoryButtonRect.y,
    uiState.inventoryButtonRect.width,
    uiState.inventoryButtonRect.height,
    8,
    8,
  );

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(
    uiState.isInventoryOpen ? "Close Inventory (I)" : "Open Inventory (I)",
    uiState.inventoryButtonRect.x,
    uiState.inventoryButtonRect.y + 9,
    uiState.inventoryButtonRect.width,
    "center",
    0,
    0.62,
    0.62,
  );

  love.graphics.setColor(0.2, 0.28, 0.43, 0.96);
  love.graphics.rectangle(
    "fill",
    uiState.craftShopButtonRect.x,
    uiState.craftShopButtonRect.y,
    uiState.craftShopButtonRect.width,
    uiState.craftShopButtonRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.73, 0.84, 0.98, 0.95);
  love.graphics.rectangle(
    "line",
    uiState.craftShopButtonRect.x,
    uiState.craftShopButtonRect.y,
    uiState.craftShopButtonRect.width,
    uiState.craftShopButtonRect.height,
    8,
    8,
  );

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(
    uiState.isCraftShopOpen ? "Close Upgrade Shop (U)" : "Open Upgrade Shop (U)",
    uiState.craftShopButtonRect.x,
    uiState.craftShopButtonRect.y + 9,
    uiState.craftShopButtonRect.width,
    "center",
    0,
    0.62,
    0.62,
  );

  const currentTile = getCurrentTile(uiState.model);
  const playerKey = toCoordKey(uiState.model.playerCoord);
  love.graphics.setColor(0.81, 0.87, 0.97, 0.95);
  love.graphics.printf(
    `Current tile: ${currentTile.name} (${playerKey})`,
    panelX + 14,
    panelY + 46,
    panelWidth - 28,
    "left",
    0,
    0.72,
    0.72,
  );

  love.graphics.setColor(0.75, 0.82, 0.93, 0.93);
  love.graphics.printf(uiState.model.notice, panelX + 14, panelY + 74, panelWidth - 28, "left", 0, 0.68, 0.68);

  love.graphics.setColor(0.74, 0.8, 0.91, 0.9);
  love.graphics.printf(currentTile.description, panelX + 14, panelY + 112, panelWidth - 28, "left", 0, 0.62, 0.62);

  for (const actionButton of uiState.buttons) {
    love.graphics.setColor(0.2, 0.28, 0.43, 0.96);
    love.graphics.rectangle(
      "fill",
      actionButton.rect.x,
      actionButton.rect.y,
      actionButton.rect.width,
      actionButton.rect.height,
      8,
      8,
    );
    love.graphics.setColor(0.73, 0.84, 0.98, 0.95);
    love.graphics.rectangle(
      "line",
      actionButton.rect.x,
      actionButton.rect.y,
      actionButton.rect.width,
      actionButton.rect.height,
      8,
      8,
    );

    love.graphics.setColor(1, 1, 1, 1);
    const label = getActionLabel(actionButton.branch, currentTile);
    love.graphics.printf(
      label,
      actionButton.rect.x,
      actionButton.rect.y + 16,
      actionButton.rect.width,
      "center",
      0,
      0.74,
      0.74,
    );
  }

  love.graphics.setColor(0.72, 0.8, 0.95, 0.86);
  love.graphics.printf(
    "Movement: click neighboring hexes | Click XP bar or T: Talents | C: Character | I: Inventory | U: Upgrade Shop | P: Planner Debug | R: Reroll Plan",
    panelX + 14,
    uiState.height - 62,
    panelWidth - 28,
    "left",
    0,
    0.66,
    0.66,
  );
}

function drawTalentTreeOverlay(uiState: ExploreUiState): void {
  if (!uiState.isTalentTreeOpen) {
    return;
  }

  const progression = uiState.playerProgression;
  const layout = getTalentTreeLayout(uiState);
  const x = layout.panelRect.x;
  const y = layout.panelRect.y;
  const width = layout.panelRect.width;
  const height = layout.panelRect.height;

  love.graphics.setColor(0, 0, 0, 0.54);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.09, 0.1, 0.14, 0.98);
  love.graphics.rectangle("fill", x, y, width, height, 10, 10);
  love.graphics.setColor(0.88, 0.8, 0.36, 0.92);
  love.graphics.rectangle("line", x, y, width, height, 10, 10);

  love.graphics.setColor(0.98, 0.97, 0.92, 1);
  love.graphics.printf("Talent Tree (Stub)", x + 20, y + 18, width - 40, "left", 0, 0.94, 0.94);

  love.graphics.setColor(0.9, 0.88, 0.75, 0.96);
  love.graphics.printf(
    `Unspent talent points: ${progression.unspentTalentPoints}`,
    x + 20,
    y + 52,
    width - 40,
    "left",
    0,
    0.66,
    0.66,
  );

  for (const row of layout.talentRowRects) {
    const talent = progression.talents.find((entry) => entry.id === row.talentId);
    if (!talent) {
      continue;
    }

    const isSelected = uiState.selectedTalentId === talent.id;

    if (isSelected) {
      love.graphics.setColor(0.31, 0.32, 0.16, 0.95);
    } else {
      love.graphics.setColor(0.18, 0.2, 0.28, 0.95);
    }
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 8, 8);

    if (isSelected) {
      love.graphics.setColor(0.95, 0.84, 0.36, 0.95);
    } else {
      love.graphics.setColor(0.74, 0.79, 0.9, 0.86);
    }
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 8, 8);

    love.graphics.setColor(0.96, 0.97, 1, 0.98);
    love.graphics.printf(talent.name, row.rect.x + 14, row.rect.y + 12, row.rect.width - 28, "left", 0, 0.72, 0.72);

    love.graphics.setColor(0.76, 0.84, 0.97, 0.92);
    love.graphics.printf(
      `${talent.description}`,
      row.rect.x + 14,
      row.rect.y + 38,
      row.rect.width - 28,
      "left",
      0,
      0.56,
      0.56,
    );

    love.graphics.setColor(0.89, 0.92, 0.98, 0.92);
    love.graphics.printf(
      `Rank ${talent.rank}/${talent.maxRank}`,
      row.rect.x + row.rect.width - 140,
      row.rect.y + 12,
      120,
      "right",
      0,
      0.56,
      0.56,
    );
  }

  const canConfirm = canConfirmSelectedTalent(uiState);
  love.graphics.setColor(canConfirm ? 0.26 : 0.2, canConfirm ? 0.5 : 0.22, canConfirm ? 0.31 : 0.25, canConfirm ? 0.95 : 0.72);
  love.graphics.rectangle(
    "fill",
    layout.confirmButtonRect.x,
    layout.confirmButtonRect.y,
    layout.confirmButtonRect.width,
    layout.confirmButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(canConfirm ? 0.78 : 0.6, canConfirm ? 0.95 : 0.7, canConfirm ? 0.84 : 0.72, 0.95);
  love.graphics.rectangle(
    "line",
    layout.confirmButtonRect.x,
    layout.confirmButtonRect.y,
    layout.confirmButtonRect.width,
    layout.confirmButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(1, 1, 1, canConfirm ? 0.98 : 0.7);
  love.graphics.printf(
    "Confirm",
    layout.confirmButtonRect.x,
    layout.confirmButtonRect.y + 10,
    layout.confirmButtonRect.width,
    "center",
    0,
    0.62,
    0.62,
  );

  love.graphics.setColor(0.28, 0.22, 0.22, 0.9);
  love.graphics.rectangle(
    "fill",
    layout.cancelButtonRect.x,
    layout.cancelButtonRect.y,
    layout.cancelButtonRect.width,
    layout.cancelButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(0.9, 0.76, 0.76, 0.95);
  love.graphics.rectangle(
    "line",
    layout.cancelButtonRect.x,
    layout.cancelButtonRect.y,
    layout.cancelButtonRect.width,
    layout.cancelButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(1, 1, 1, 0.96);
  love.graphics.printf(
    "Cancel",
    layout.cancelButtonRect.x,
    layout.cancelButtonRect.y + 10,
    layout.cancelButtonRect.width,
    "center",
    0,
    0.62,
    0.62,
  );

  love.graphics.setColor(0.84, 0.87, 0.95, 0.9);
  love.graphics.printf(
    "Select a talent row, then Confirm or Cancel. While open, this panel captures clicks.",
    x + 20,
    y + height - 38,
    width - 40,
    "left",
    0,
    0.56,
    0.56,
  );
}

function drawCharacterSheetOverlay(uiState: ExploreUiState): void {
  if (!uiState.isCharacterSheetOpen) {
    return;
  }

  const progression = uiState.playerProgression;
  const width = Math.min(560, Math.floor(uiState.width * 0.78));
  const height = Math.min(560, Math.floor(uiState.height * 0.9));
  const x = Math.floor((uiState.width - width) * 0.5);
  const y = Math.floor((uiState.height - height) * 0.5);

  love.graphics.setColor(0, 0, 0, 0.52);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.08, 0.1, 0.15, 0.97);
  love.graphics.rectangle("fill", x, y, width, height, 10, 10);
  love.graphics.setColor(0.74, 0.84, 0.98, 0.92);
  love.graphics.rectangle("line", x, y, width, height, 10, 10);

  love.graphics.setColor(0.96, 0.98, 1, 1);
  love.graphics.printf("Character Sheet", x + 18, y + 18, width - 36, "left", 0, 0.9, 0.9);

  const lines = [
    `Class: ${progression.className}`,
    `Race: ${progression.raceName}`,
    `Level: ${progression.level}`,
    `Current XP: ${progression.xp}`,
    `XP to next level: ${progression.xpToNextLevel}`,
    `Total XP earned: ${progression.totalXp}`,
    `Battles won: ${progression.battlesWon}`,
    `Max HP (progression): ${progression.maxHp}`,
    `Dice slots: ${progression.diceSlots}`,
  ];

  let textY = y + 64;
  for (const line of lines) {
    love.graphics.setColor(0.85, 0.92, 1, 0.96);
    love.graphics.printf(line, x + 20, textY, width - 40, "left", 0, 0.68, 0.68);
    textY += 24;
  }

  textY += 8;
  love.graphics.setColor(0.92, 0.96, 1, 0.98);
  love.graphics.printf("Equipped Items (combat-capable dice slots)", x + 20, textY, width - 40, "left", 0, 0.66, 0.66);
  textY += 24;

  for (const slotId of EQUIPMENT_SLOT_ORDER) {
    const slotLabel = EQUIPMENT_SLOT_LABELS[slotId];
    const item = progression.items.equipped[slotId];
    const itemName = item?.name ?? "Empty";

    love.graphics.setColor(item ? 0.82 : 0.67, item ? 0.92 : 0.78, item ? 1 : 0.9, 0.95);
    love.graphics.printf(`${slotLabel}: ${itemName}`, x + 20, textY, width - 40, "left", 0, 0.62, 0.62);
    textY += 19;
  }

  love.graphics.setColor(0.74, 0.82, 0.94, 0.9);
  love.graphics.printf(
    "Press C or Escape to close.",
    x + 20,
    y + height - 38,
    width - 40,
    "left",
    0,
    0.6,
    0.6,
  );
}

function drawInventoryOverlay(uiState: ExploreUiState): void {
  if (!uiState.isInventoryOpen) {
    return;
  }

  const progression = uiState.playerProgression;
  const width = Math.min(560, Math.floor(uiState.width * 0.78));
  const height = Math.min(360, Math.floor(uiState.height * 0.72));
  const x = Math.floor((uiState.width - width) * 0.5);
  const y = Math.floor((uiState.height - height) * 0.5);

  love.graphics.setColor(0, 0, 0, 0.52);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.08, 0.1, 0.15, 0.97);
  love.graphics.rectangle("fill", x, y, width, height, 10, 10);
  love.graphics.setColor(0.74, 0.84, 0.98, 0.92);
  love.graphics.rectangle("line", x, y, width, height, 10, 10);

  love.graphics.setColor(0.96, 0.98, 1, 1);
  love.graphics.printf("Inventory", x + 18, y + 18, width - 36, "left", 0, 0.9, 0.9);

  love.graphics.setColor(0.96, 0.87, 0.42, 0.98);
  love.graphics.printf(`Gold: ${progression.gold}`, x + 18, y + 38, width - 36, "left", 0, 0.7, 0.7);

  love.graphics.setColor(0.82, 0.9, 1, 0.95);
  love.graphics.printf("Carried Items (exploration access)", x + 20, y + 64, width - 40, "left", 0, 0.66, 0.66);

  let textY = y + 90;
  if (progression.items.inventory.length === 0) {
    love.graphics.setColor(0.72, 0.8, 0.94, 0.9);
    love.graphics.printf("No items in inventory yet.", x + 20, textY, width - 40, "left", 0, 0.62, 0.62);
    textY += 24;
  } else {
    for (const item of progression.items.inventory) {
      love.graphics.setColor(0.84, 0.92, 1, 0.96);
      love.graphics.printf(`- ${item.name}`, x + 20, textY, width - 40, "left", 0, 0.62, 0.62);
      textY += 20;
    }
  }

  love.graphics.setColor(0.74, 0.82, 0.94, 0.9);
  love.graphics.printf(
    "Press I or Escape to close. Press U for upgrade shop.",
    x + 20,
    y + height - 38,
    width - 40,
    "left",
    0,
    0.6,
    0.6,
  );
}

function drawCraftShopOverlay(uiState: ExploreUiState): void {
  if (!uiState.isCraftShopOpen) {
    return;
  }

  const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
  const layout = getCraftShopLayout(uiState, dice);

  const selectedDie =
    dice.find((die) => die.id === uiState.selectedUpgradeDieId) ??
    dice[0];

  if (!uiState.selectedUpgradeDieId && selectedDie) {
    uiState.selectedUpgradeDieId = selectedDie.id;
  }

  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);

  love.graphics.setColor(0, 0, 0, 0.56);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.08, 0.1, 0.15, 0.98);
  love.graphics.rectangle(
    "fill",
    layout.panelRect.x,
    layout.panelRect.y,
    layout.panelRect.width,
    layout.panelRect.height,
    10,
    10,
  );
  love.graphics.setColor(0.92, 0.78, 0.45, 0.94);
  love.graphics.rectangle(
    "line",
    layout.panelRect.x,
    layout.panelRect.y,
    layout.panelRect.width,
    layout.panelRect.height,
    10,
    10,
  );

  love.graphics.setColor(0.98, 0.96, 0.9, 1);
  love.graphics.printf("Craftsfolk Upgrade Shop", layout.panelRect.x + 20, layout.panelRect.y + 18, layout.panelRect.width - 180, "left", 0, 0.92, 0.92);

  love.graphics.setColor(0.96, 0.88, 0.42, 0.98);
  love.graphics.printf(
    `Gold: ${formatGold(uiState.playerProgression.gold)}`,
    layout.panelRect.x + 20,
    layout.panelRect.y + 42,
    layout.panelRect.width - 200,
    "left",
    0,
    0.66,
    0.66,
  );

  love.graphics.setColor(0.27, 0.19, 0.19, 0.95);
  love.graphics.rectangle(
    "fill",
    layout.closeButtonRect.x,
    layout.closeButtonRect.y,
    layout.closeButtonRect.width,
    layout.closeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(0.95, 0.75, 0.75, 0.98);
  love.graphics.rectangle(
    "line",
    layout.closeButtonRect.x,
    layout.closeButtonRect.y,
    layout.closeButtonRect.width,
    layout.closeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(1, 1, 1, 0.98);
  love.graphics.printf("Close", layout.closeButtonRect.x, layout.closeButtonRect.y + 9, layout.closeButtonRect.width, "center", 0, 0.6, 0.6);

  love.graphics.setColor(0.85, 0.9, 0.98, 0.94);
  love.graphics.printf("Choose Craftsfolk", layout.panelRect.x + 20, layout.panelRect.y + 56, layout.panelRect.width - 40, "left", 0, 0.58, 0.58);

  for (const row of layout.craftsfolkRows) {
    const option = uiState.availableCraftsfolk.find((entry) => entry.id === row.id);
    const isSelected = uiState.selectedCraftsfolkId === row.id;

    love.graphics.setColor(isSelected ? 0.3 : 0.19, isSelected ? 0.29 : 0.2, isSelected ? 0.17 : 0.27, 0.95);
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);
    love.graphics.setColor(isSelected ? 0.96 : 0.75, isSelected ? 0.84 : 0.8, isSelected ? 0.49 : 0.93, 0.96);
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);

    love.graphics.setColor(0.98, 0.98, 1, 1);
    love.graphics.printf(
      `${option?.name ?? row.id} - ${option?.description ?? ""}`,
      row.rect.x + 10,
      row.rect.y + 12,
      row.rect.width - 20,
      "left",
      0,
      0.54,
      0.54,
    );
  }

  love.graphics.setColor(0.14, 0.16, 0.22, 0.95);
  love.graphics.rectangle("fill", layout.dieListRect.x, layout.dieListRect.y, layout.dieListRect.width, layout.dieListRect.height, 8, 8);
  love.graphics.setColor(0.75, 0.83, 0.96, 0.93);
  love.graphics.rectangle("line", layout.dieListRect.x, layout.dieListRect.y, layout.dieListRect.width, layout.dieListRect.height, 8, 8);
  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf("Current Dice", layout.dieListRect.x + 10, layout.dieListRect.y + 10, layout.dieListRect.width - 20, "left", 0, 0.62, 0.62);

  for (const row of layout.dieRows) {
    const die = dice.find((entry) => entry.id === row.id);
    const isSelected = uiState.selectedUpgradeDieId === row.id;

    love.graphics.setColor(isSelected ? 0.26 : 0.2, isSelected ? 0.34 : 0.25, isSelected ? 0.44 : 0.33, 0.95);
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);
    love.graphics.setColor(isSelected ? 0.85 : 0.7, isSelected ? 0.92 : 0.79, isSelected ? 1 : 0.94, 0.95);
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);

    love.graphics.setColor(1, 1, 1, 0.98);
    love.graphics.printf(die?.name ?? row.id, row.rect.x + 8, row.rect.y + 8, row.rect.width - 16, "left", 0, 0.56, 0.56);
  }

  love.graphics.setColor(0.14, 0.16, 0.22, 0.95);
  love.graphics.rectangle("fill", layout.faceListRect.x, layout.faceListRect.y, layout.faceListRect.width, layout.faceListRect.height, 8, 8);
  love.graphics.setColor(0.75, 0.83, 0.96, 0.93);
  love.graphics.rectangle("line", layout.faceListRect.x, layout.faceListRect.y, layout.faceListRect.width, layout.faceListRect.height, 8, 8);
  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf("Die Faces", layout.faceListRect.x + 10, layout.faceListRect.y + 10, layout.faceListRect.width - 20, "left", 0, 0.62, 0.62);

  for (const row of layout.faceRows) {
    const side = selectedDie?.sides.find((entry) => entry.id === row.id);
    const isSelected = uiState.selectedUpgradeSideId === row.id;
    const details = side?.describe ? side.describe() : side?.label ?? row.id;

    love.graphics.setColor(isSelected ? 0.28 : 0.22, isSelected ? 0.3 : 0.24, isSelected ? 0.17 : 0.31, 0.95);
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);
    love.graphics.setColor(isSelected ? 0.97 : 0.78, isSelected ? 0.87 : 0.82, isSelected ? 0.55 : 0.94, 0.95);
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);

    love.graphics.setColor(1, 1, 1, 0.98);
    love.graphics.printf(details, row.rect.x + 8, row.rect.y + 8, row.rect.width - 16, "left", 0, 0.52, 0.52);
  }

  love.graphics.setColor(0.14, 0.16, 0.22, 0.95);
  love.graphics.rectangle(
    "fill",
    layout.propertyListRect.x,
    layout.propertyListRect.y,
    layout.propertyListRect.width,
    layout.propertyListRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.75, 0.83, 0.96, 0.93);
  love.graphics.rectangle(
    "line",
    layout.propertyListRect.x,
    layout.propertyListRect.y,
    layout.propertyListRect.width,
    layout.propertyListRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf(
    "Adjustable Properties",
    layout.propertyListRect.x + 10,
    layout.propertyListRect.y + 10,
    layout.propertyListRect.width - 20,
    "left",
    0,
    0.62,
    0.62,
  );

  const selectedAdjustableSide = asAdjustableShopSide(selectedSide);
  for (const row of layout.propertyRows) {
    const property = selectedAdjustableSide
      ?.getAdjustmentProperties()
      .find((entry) => entry.id === row.id);
    const isSelected = uiState.selectedUpgradePropertyId === row.id;

    love.graphics.setColor(isSelected ? 0.29 : 0.22, isSelected ? 0.32 : 0.25, isSelected ? 0.16 : 0.31, 0.95);
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);
    love.graphics.setColor(isSelected ? 0.97 : 0.78, isSelected ? 0.87 : 0.82, isSelected ? 0.55 : 0.94, 0.95);
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);

    love.graphics.setColor(1, 1, 1, 0.98);
    love.graphics.printf(
      `${property?.label ?? row.id}: ${property?.value ?? "?"}`,
      row.rect.x + 8,
      row.rect.y + 8,
      row.rect.width - 16,
      "left",
      0,
      0.5,
      0.5,
    );

    if (property?.description) {
      love.graphics.setColor(0.78, 0.84, 0.95, 0.9);
      love.graphics.printf(
        property.description,
        row.rect.x + 8,
        row.rect.y + 24,
        row.rect.width - 16,
        "left",
        0,
        0.44,
        0.44,
      );
    }
  }

  const canAdjust = uiState.selectedUpgradePropertyId !== undefined;
  love.graphics.setColor(canAdjust ? 0.22 : 0.2, canAdjust ? 0.43 : 0.22, canAdjust ? 0.26 : 0.24, canAdjust ? 0.95 : 0.7);
  love.graphics.rectangle(
    "fill",
    layout.upgradeButtonRect.x,
    layout.upgradeButtonRect.y,
    layout.upgradeButtonRect.width,
    layout.upgradeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(canAdjust ? 0.73 : 0.6, canAdjust ? 0.95 : 0.7, canAdjust ? 0.78 : 0.72, 0.95);
  love.graphics.rectangle(
    "line",
    layout.upgradeButtonRect.x,
    layout.upgradeButtonRect.y,
    layout.upgradeButtonRect.width,
    layout.upgradeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(1, 1, 1, canAdjust ? 1 : 0.74);
  love.graphics.printf(
    "Upgrade",
    layout.upgradeButtonRect.x,
    layout.upgradeButtonRect.y + 8,
    layout.upgradeButtonRect.width,
    "center",
    0,
    0.52,
    0.52,
  );

  love.graphics.setColor(canAdjust ? 0.26 : 0.2, canAdjust ? 0.25 : 0.22, canAdjust ? 0.16 : 0.24, canAdjust ? 0.95 : 0.7);
  love.graphics.rectangle(
    "fill",
    layout.downgradeButtonRect.x,
    layout.downgradeButtonRect.y,
    layout.downgradeButtonRect.width,
    layout.downgradeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(canAdjust ? 0.96 : 0.6, canAdjust ? 0.86 : 0.7, canAdjust ? 0.6 : 0.72, 0.95);
  love.graphics.rectangle(
    "line",
    layout.downgradeButtonRect.x,
    layout.downgradeButtonRect.y,
    layout.downgradeButtonRect.width,
    layout.downgradeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(1, 1, 1, canAdjust ? 1 : 0.74);
  love.graphics.printf(
    "Downgrade",
    layout.downgradeButtonRect.x,
    layout.downgradeButtonRect.y + 8,
    layout.downgradeButtonRect.width,
    "center",
    0,
    0.52,
    0.52,
  );

  love.graphics.setColor(0.84, 0.89, 0.98, 0.92);
  love.graphics.printf(
    uiState.shopStatusText ?? "Select a craftsfolk, then choose a die and a face.",
    layout.panelRect.x + 20,
    layout.panelRect.y + layout.panelRect.height - 34,
    layout.panelRect.width - 40,
    "left",
    0,
    0.56,
    0.56,
  );

  if (selectedSide) {
    love.graphics.setColor(0.9, 0.94, 1, 0.95);
    love.graphics.printf(
      `Selected face: ${selectedSide.label}`,
      layout.faceListRect.x + 10,
      layout.faceListRect.y + layout.faceListRect.height - 28,
      layout.faceListRect.width - 20,
      "left",
      0,
      0.54,
      0.54,
    );
  }
}

function drawPlannerDebugOverlay(uiState: ExploreUiState): void {
  love.graphics.setColor(0.02, 0.02, 0.03, 0.86);
  love.graphics.rectangle("fill", 24, 24, uiState.width - 48, uiState.height - 48, 10, 10);
  love.graphics.setColor(0.85, 0.9, 0.98, 0.8);
  love.graphics.rectangle("line", 24, 24, uiState.width - 48, uiState.height - 48, 10, 10);

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf("GamePlanner Debug Spec", 40, 40, uiState.width - 80, "left", 0, 0.95, 0.95);

  love.graphics.setColor(0.74, 0.82, 0.94, 0.92);
  love.graphics.printf(
    "Spec generated for proc-gen constraints. Press P to close, R to reroll.",
    40,
    68,
    uiState.width - 80,
    "left",
    0,
    0.64,
    0.64,
  );

  const lines = formatGamePlanSpec(uiState.plannerSpec);
  let y = 98;
  for (const line of lines) {
    if (y > uiState.height - 58) {
      break;
    }

    love.graphics.setColor(0.9, 0.93, 1, 0.95);
    love.graphics.printf(line, 42, y, uiState.width - 84, "left", 0, 0.58, 0.58);
    y += 18;
  }

  const validationY = uiState.height - 180;
  love.graphics.setColor(0.84, 0.9, 0.99, 0.95);
  love.graphics.printf("World Validation", 42, validationY, uiState.width - 84, "left", 0, 0.72, 0.72);

  love.graphics.setColor(uiState.worldValidation.isValid ? 0.58 : 1, uiState.worldValidation.isValid ? 0.9 : 0.6, 0.62, 0.95);
  love.graphics.printf(
    uiState.worldValidation.isValid ? "Status: PASS" : "Status: FAIL",
    42,
    validationY + 22,
    uiState.width - 84,
    "left",
    0,
    0.64,
    0.64,
  );

  let issueY = validationY + 46;
  if (uiState.worldValidation.issues.length === 0) {
    love.graphics.setColor(0.74, 0.88, 0.8, 0.9);
    love.graphics.printf("All required constraints satisfied.", 42, issueY, uiState.width - 84, "left", 0, 0.56, 0.56);
  } else {
    for (const issue of uiState.worldValidation.issues) {
      if (issueY > uiState.height - 26) {
        break;
      }

      love.graphics.setColor(1, 0.72, 0.72, 0.92);
      love.graphics.printf(`- ${issue.message}`, 42, issueY, uiState.width - 84, "left", 0, 0.54, 0.54);
      issueY += 16;
    }
  }
}

export function drawExploreUi(uiState: ExploreUiState, visitCount: number): void {
  refreshLayoutIfNeeded(uiState);

  love.graphics.setColor(0.07, 0.09, 0.13, 1);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  const pulse = Math.sin(uiState.time * 0.9) * 0.05 + 0.95;

  for (const tile of uiState.model.tiles) {
    const center = axialToScreen(uiState, tile.coord.q, tile.coord.r);
    const zoneColor = tile.color;
    const isHovered = uiState.hoveredTileKey === tile.key;
    const isPlayerTile = toCoordKey(uiState.model.playerCoord) === tile.key;
    const isNeighbor = getHexDistance(uiState.model.playerCoord, tile.coord) === 1;

    const fillAlpha = isPlayerTile ? 1 : isNeighbor ? 0.95 : 0.85;
    love.graphics.setColor(zoneColor[0], zoneColor[1], zoneColor[2], fillAlpha);
    drawHex(center.x, center.y, uiState.hexSize * (isHovered ? 1.03 : 1), "fill");

    if (isPlayerTile) {
      love.graphics.setColor(0.98, 0.98, 1, 1);
      drawHex(center.x, center.y, uiState.hexSize * 1.03, "line");
      love.graphics.setColor(0.98, 0.98, 1, 0.9);
      love.graphics.circle("line", center.x, center.y, Math.max(4, uiState.hexSize * 0.22));
      love.graphics.setColor(0.04, 0.04, 0.04, 1);
      love.graphics.circle("fill", center.x, center.y, Math.max(5, uiState.hexSize * 0.18));
    } else if (isNeighbor) {
      love.graphics.setColor(0.95, 0.95, 1, 0.72 * pulse);
      drawHex(center.x, center.y, uiState.hexSize * 1.01, "line");
    } else {
      love.graphics.setColor(0.16, 0.18, 0.25, 0.7);
      drawHex(center.x, center.y, uiState.hexSize, "line");
    }

    love.graphics.setColor(1, 1, 1, 0.84);
    love.graphics.printf(tile.name, center.x - 40, center.y - 4, 80, "center", 0, 0.39, 0.39);
  }

  love.graphics.setColor(0.9, 0.95, 1, 0.96);
  love.graphics.printf(`Explore Visits: ${visitCount}`, 20, 18, 280, "left", 0, 0.75, 0.75);

  drawPlayerProgressHud(uiState);

  drawActionPanel(uiState);

  if (uiState.isPlannerDebugOpen) {
    drawPlannerDebugOverlay(uiState);
  }

  drawTalentTreeOverlay(uiState);
  drawCharacterSheetOverlay(uiState);
  drawInventoryOverlay(uiState);
  drawCraftShopOverlay(uiState);
}
