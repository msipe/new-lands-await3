import {
  createExploreState,
  getCurrentTile,
  getHexDistance,
  toCoordKey,
  tryTravelToCoord,
  type ExploreBranch,
  type ExploreState,
  type ExploreTile,
  type ZoneType,
} from "./explore-state";
import {
  createDefaultGamePlannerConfig,
  formatGamePlanSpec,
  GamePlanner,
  type GamePlanSpec,
} from "../planning/game-planner";
import { createWorldSpecFromPlan, type WorldSpec } from "../planning/world-spec-builder";
import { validateWorldAgainstSpec, type WorldValidationResult } from "../planning/world-validator";
import { recordTileVisited } from "../planning/quest-events";
import { getQuestById } from "../planning/content-registry";
import type { ContentQuest } from "../planning/content-types";
import { listQuestEntries, type QuestLogEntry } from "../planning/quest-log";
import { applyWorldSpecToExploreState } from "./world-generator";
import {
  buildGeneratedFaceId,
  recordAppendFaceCopy,
  recordFaceAdjustment,
  recordRemoveFace,
  createPlayerProgression,
  type PlayerProgressionState,
} from "../game/player-progression";
import { createPlayerCombatDiceLoadout } from "../game/player-combat-dice";
import {
  appendCopiedFaceEntry,
  applyFaceAdjustmentEntry,
  removeFaceEntry,
} from "../game/face-adjustments";
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

type CraftsfolkId = "craft:up-down-smith" | "craft:face-smith";

type CraftsfolkOption = {
  id: CraftsfolkId;
  name: string;
  description: string;
};

type ShopRowRect = {
  id: string;
  rect: Rect;
};

type ShopVisualDie = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
};

type ShopLayout = {
  panelRect: Rect;
  closeButtonRect: Rect;
  dieListRect: Rect;
  faceListRect: Rect;
  propertyListRect: Rect;
  primaryActionButtonRect: Rect;
  secondaryActionButtonRect: Rect;
  visibleDieCount: number;
  visibleFaceCount: number;
  visiblePropertyCount: number;
  totalDieCount: number;
  totalFaceCount: number;
  totalPropertyCount: number;
  dieStartIndex: number;
  faceStartIndex: number;
  propertyStartIndex: number;
  craftsfolkRows: ShopRowRect[];
  dieRows: ShopRowRect[];
  faceRows: ShopRowRect[];
  propertyRows: ShopRowRect[];
};

type ShopFocusColumn = "craftsfolk" | "dice" | "faces" | "properties" | "actions";
type ShopHoveredAction = "close" | "primary" | "secondary";
type QuestCategory = ContentQuest["category"];

type QuestMenuLayout = {
  panelRect: Rect;
  closeButtonRect: Rect;
  clearGoToRect: Rect;
  categoryTabs: Array<{ category: QuestCategory; rect: Rect }>;
  questRows: Array<{ questId: string; rect: Rect }>;
  objectiveGoToButtons: Array<{ objectiveId: string; rect: Rect }>;
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
  isQuestMenuOpen: boolean;
  questMenuButtonRect: Rect;
  selectedQuestCategory: QuestCategory;
  selectedQuestId?: string;
  isGoToTileMode: boolean;
  goToTileZone?: ZoneType;
  goToTileIds?: string[];
  goToTileHint?: string;
  availableCraftsfolk: CraftsfolkOption[];
  selectedCraftsfolkId?: CraftsfolkId;
  selectedUpgradeDieId?: string;
  selectedUpgradeSideId?: string;
  selectedUpgradePropertyId?: string;
  shopStatusText?: string;
  shopHoveredCraftsfolkId?: string;
  shopHoveredDieId?: string;
  shopHoveredFaceId?: string;
  shopHoveredPropertyId?: string;
  shopHoveredAction?: ShopHoveredAction;
  shopFocusedColumn: ShopFocusColumn;
  shopFocusedAction: "primary" | "secondary";
  shopDieScrollIndex: number;
  shopFaceScrollIndex: number;
  shopPropertyScrollIndex: number;
  shopGoldPulseTimer: number;
  shopAwaitingRemoveConfirm: boolean;
  shopVisualDice: ShopVisualDie[];
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

function createQuestMenuButtonRect(): Rect {
  return {
    x: 616,
    y: 52,
    width: 180,
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
    {
      id: "craft:face-smith",
      name: "Face Smith",
      description: "Copies an existing face onto a die or removes a selected face.",
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
  uiState.questMenuButtonRect = createQuestMenuButtonRect();
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

function listQuestEntriesForCategory(category: QuestCategory): QuestLogEntry[] {
  return listQuestEntries().filter((entry) => entry.category === category);
}

function ensureQuestSelection(uiState: ExploreUiState): void {
  const entries = listQuestEntriesForCategory(uiState.selectedQuestCategory);
  if (entries.length === 0) {
    uiState.selectedQuestId = undefined;
    return;
  }

  const selectedExists = entries.some((entry) => entry.questId === uiState.selectedQuestId);
  if (!selectedExists) {
    uiState.selectedQuestId = entries[0]?.questId;
  }
}

function getSelectedQuestEntry(uiState: ExploreUiState): QuestLogEntry | undefined {
  ensureQuestSelection(uiState);
  if (uiState.selectedQuestId === undefined) {
    return undefined;
  }

  return listQuestEntriesForCategory(uiState.selectedQuestCategory).find(
    (entry) => entry.questId === uiState.selectedQuestId,
  );
}

function getQuestMenuLayout(uiState: ExploreUiState): QuestMenuLayout {
  const panelWidth = Math.min(860, Math.floor(uiState.width * 0.88));
  const panelHeight = Math.min(560, Math.floor(uiState.height * 0.9));
  const panelX = Math.floor((uiState.width - panelWidth) * 0.5);
  const panelY = Math.floor((uiState.height - panelHeight) * 0.5);

  const categories: QuestCategory[] = ["main", "side", "town"];
  const categoryTabs = categories.map((category, index) => ({
    category,
    rect: {
      x: panelX + 20 + index * 132,
      y: panelY + 56,
      width: 120,
      height: 32,
    },
  }));

  const questRows: Array<{ questId: string; rect: Rect }> = [];
  let rowY = panelY + 104;
  const entries = listQuestEntriesForCategory(uiState.selectedQuestCategory);
  for (const entry of entries) {
    if (rowY > panelY + panelHeight - 64) {
      break;
    }

    questRows.push({
      questId: entry.questId,
      rect: {
        x: panelX + 20,
        y: rowY,
        width: 280,
        height: 34,
      },
    });
    rowY += 42;
  }

  const objectiveGoToButtons: Array<{ objectiveId: string; rect: Rect }> = [];
  const selectedQuest = getSelectedQuestEntry(uiState);
  if (selectedQuest !== undefined) {
    const quest = getQuestById(selectedQuest.questId);
    let objectiveY = panelY + 146;
    for (const objective of quest.objectives) {
      if (objectiveY > panelY + panelHeight - 64) {
        break;
      }

      if (objective.kind === "visit-tile") {
        objectiveGoToButtons.push({
          objectiveId: objective.id,
          rect: {
            x: panelX + panelWidth - 180,
            y: objectiveY - 2,
            width: 120,
            height: 24,
          },
        });
      }

      objectiveY += 52;
    }
  }

  return {
    panelRect: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    closeButtonRect: {
      x: panelX + panelWidth - 50,
      y: panelY + 12,
      width: 34,
      height: 24,
    },
    clearGoToRect: {
      x: panelX + panelWidth - 220,
      y: panelY + 56,
      width: 140,
      height: 32,
    },
    categoryTabs,
    questRows,
    objectiveGoToButtons,
  };
}

function tileMatchesGoToMode(uiState: ExploreUiState, tile: ExploreTile): boolean {
  if (!uiState.isGoToTileMode) {
    return false;
  }

  if (uiState.goToTileZone !== undefined && tile.zone !== uiState.goToTileZone) {
    return false;
  }

  if (uiState.goToTileIds !== undefined && uiState.goToTileIds.length > 0) {
    const specialTileId =
      typeof tile.metadata.specialTileId === "string" ? tile.metadata.specialTileId : undefined;
    if (specialTileId === undefined) {
      return false;
    }

    return uiState.goToTileIds.includes(specialTileId);
  }

  return true;
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

  const rowTopInset = 36;
  const rowBottomInset = 10;
  const dieRowHeight = 28;
  const dieRowGap = 4;
  const faceRowHeight = 28;
  const faceRowGap = 4;
  const propertyRowHeight = 46;
  const propertyRowGap = 6;

  const dieVisibleCount = Math.max(
    1,
    Math.floor((dieListRect.height - rowTopInset - rowBottomInset) / (dieRowHeight + dieRowGap)),
  );
  const clampedDieStart = Math.max(0, Math.min(uiState.shopDieScrollIndex, Math.max(0, dice.length - dieVisibleCount)));
  uiState.shopDieScrollIndex = clampedDieStart;

  const dieRows: ShopRowRect[] = [];
  let dieY = dieListRect.y + rowTopInset;
  for (let index = clampedDieStart; index < dice.length && dieRows.length < dieVisibleCount; index += 1) {
    const die = dice[index];
    dieRows.push({
      id: die.id,
      rect: {
        x: dieListRect.x + 10,
        y: dieY,
        width: dieListRect.width - 20,
        height: dieRowHeight,
      },
    });
    dieY += dieRowHeight + dieRowGap;
  }

  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId) ?? dice[0];
  const faceRows: ShopRowRect[] = [];
  let faceY = faceListRect.y + rowTopInset;
  const totalFaceCount = selectedDie?.sides.length ?? 0;
  const faceVisibleCount = Math.max(
    1,
    Math.floor((faceListRect.height - rowTopInset - rowBottomInset) / (faceRowHeight + faceRowGap)),
  );
  const clampedFaceStart = Math.max(
    0,
    Math.min(uiState.shopFaceScrollIndex, Math.max(0, totalFaceCount - faceVisibleCount)),
  );
  uiState.shopFaceScrollIndex = clampedFaceStart;
  if (selectedDie !== undefined) {
    for (
      let index = clampedFaceStart;
      index < selectedDie.sides.length && faceRows.length < faceVisibleCount;
      index += 1
    ) {
      const side = selectedDie.sides[index];
      faceRows.push({
        id: side.id,
        rect: {
          x: faceListRect.x + 10,
          y: faceY,
          width: faceListRect.width - 20,
          height: faceRowHeight,
        },
      });
      faceY += faceRowHeight + faceRowGap;
    }
  }

  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  const adjustableSide = asAdjustableShopSide(selectedSide);
  const propertyRows: ShopRowRect[] = [];
  let propertyY = propertyListRect.y + rowTopInset;
  const properties = adjustableSide?.getAdjustmentProperties() ?? [];
  const actionButtonHeight = 28;
  const actionRowGap = 8;
  const footerHeight = 58;
  const footerBottomInset = 16;
  const actionAndFooterReservedHeight =
    actionButtonHeight + actionRowGap + footerHeight + footerBottomInset;

  const propertyVisibleCount = Math.max(
    1,
    Math.floor(
      (propertyListRect.height - rowTopInset - actionAndFooterReservedHeight) /
        (propertyRowHeight + propertyRowGap),
    ),
  );
  const clampedPropertyStart = Math.max(
    0,
    Math.min(uiState.shopPropertyScrollIndex, Math.max(0, properties.length - propertyVisibleCount)),
  );
  uiState.shopPropertyScrollIndex = clampedPropertyStart;
  if (adjustableSide !== undefined) {
    for (
      let index = clampedPropertyStart;
      index < properties.length && propertyRows.length < propertyVisibleCount;
      index += 1
    ) {
      const property = properties[index];
      propertyRows.push({
        id: property.id,
        rect: {
          x: propertyListRect.x + 10,
          y: propertyY,
          width: propertyListRect.width - 20,
          height: propertyRowHeight,
        },
      });
      propertyY += propertyRowHeight + propertyRowGap;
    }
  }

  const actionButtonWidth = Math.max(90, Math.floor((propertyListRect.width - 30) * 0.5));
  const footerTopY = panelY + panelHeight - footerHeight - footerBottomInset;
  const actionButtonY = footerTopY - actionButtonHeight - actionRowGap;
  const primaryActionButtonRect: Rect = {
    x: propertyListRect.x + 10,
    y: actionButtonY,
    width: actionButtonWidth,
    height: actionButtonHeight,
  };
  const secondaryActionButtonRect: Rect = {
    x: propertyListRect.x + propertyListRect.width - actionButtonWidth - 10,
    y: actionButtonY,
    width: actionButtonWidth,
    height: actionButtonHeight,
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
    primaryActionButtonRect,
    secondaryActionButtonRect,
    visibleDieCount: dieVisibleCount,
    visibleFaceCount: faceVisibleCount,
    visiblePropertyCount: propertyVisibleCount,
    totalDieCount: dice.length,
    totalFaceCount,
    totalPropertyCount: properties.length,
    dieStartIndex: clampedDieStart,
    faceStartIndex: clampedFaceStart,
    propertyStartIndex: clampedPropertyStart,
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

const FACE_APPEND_COST = 12;
const FACE_REMOVE_REFUND = 4;

function isUpDownSmithSelected(uiState: ExploreUiState): boolean {
  return uiState.selectedCraftsfolkId === "craft:up-down-smith";
}

function isFaceSmithSelected(uiState: ExploreUiState): boolean {
  return uiState.selectedCraftsfolkId === "craft:face-smith";
}

function applyShopPropertyAdjustment(
  uiState: ExploreUiState,
  dice: Die[],
  operationType: FaceAdjustmentModalityType.Improve | FaceAdjustmentModalityType.Reduce,
): void {
  if (!isUpDownSmithSelected(uiState)) {
    uiState.shopStatusText = "Select the Up/Down Smith to adjust face properties.";
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
    // Revert optimistic in-memory mutation when affordability check fails.
    const rollbackType =
      operationType === FaceAdjustmentModalityType.Improve
        ? FaceAdjustmentModalityType.Reduce
        : FaceAdjustmentModalityType.Improve;
    applyFaceAdjustmentEntry(dice, {
      dieId: selectedDie.id,
      sideId: selectedSide.id,
      operation: {
        propertyId: selectedProperty.id,
        type: rollbackType,
        steps: 1,
      },
    });

    uiState.shopStatusText = "Not enough gold for that adjustment.";
    return;
  }

  uiState.playerProgression.gold = nextGold;
  uiState.shopGoldPulseTimer = 0.55;
  uiState.shopAwaitingRemoveConfirm = false;
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

function appendCopiedFaceInShop(uiState: ExploreUiState, dice: Die[]): void {
  if (!isFaceSmithSelected(uiState)) {
    uiState.shopStatusText = "Select the Face Smith to copy or remove die faces.";
    return;
  }

  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId);
  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  if (!selectedDie || !selectedSide) {
    uiState.shopStatusText = "Select a die and face to copy first.";
    return;
  }

  if (uiState.playerProgression.gold < FACE_APPEND_COST) {
    uiState.shopStatusText = "Not enough gold to copy that face.";
    return;
  }

  const newSideId = buildGeneratedFaceId(uiState.playerProgression, selectedDie.id);
  const result = appendCopiedFaceEntry(dice, {
    dieId: selectedDie.id,
    sourceSideId: selectedSide.id,
    newSideId,
  });
  if (!result.applied) {
    uiState.shopStatusText = result.reason ?? "Could not copy selected face.";
    return;
  }

  uiState.playerProgression.gold -= FACE_APPEND_COST;
  uiState.shopGoldPulseTimer = 0.55;
  uiState.shopAwaitingRemoveConfirm = false;
  recordAppendFaceCopy(uiState.playerProgression, {
    dieId: selectedDie.id,
    sourceSideId: selectedSide.id,
    newSideId,
  });
  uiState.selectedUpgradeSideId = newSideId;
  uiState.selectedUpgradePropertyId = undefined;
  uiState.shopStatusText = `Copied face onto die. Spent ${FACE_APPEND_COST} gold. Gold now ${formatGold(uiState.playerProgression.gold)}.`;
}

function removeFaceInShop(uiState: ExploreUiState, dice: Die[]): void {
  if (!isFaceSmithSelected(uiState)) {
    uiState.shopStatusText = "Select the Face Smith to copy or remove die faces.";
    return;
  }

  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId);
  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  if (!selectedDie || !selectedSide) {
    uiState.shopStatusText = "Select a die face to remove.";
    return;
  }

  if (selectedDie.sides.length <= 1) {
    uiState.shopStatusText = "A die must keep at least one face.";
    return;
  }

  const result = removeFaceEntry(dice, {
    dieId: selectedDie.id,
    sideId: selectedSide.id,
  });
  if (!result.applied) {
    uiState.shopStatusText = result.reason ?? "Could not remove selected face.";
    return;
  }

  uiState.playerProgression.gold += FACE_REMOVE_REFUND;
  uiState.shopGoldPulseTimer = 0.55;
  uiState.shopAwaitingRemoveConfirm = false;
  recordRemoveFace(uiState.playerProgression, {
    dieId: selectedDie.id,
    sideId: selectedSide.id,
  });

  const remainingSide = selectedDie.sides[0];
  uiState.selectedUpgradeSideId = remainingSide?.id;
  const adjustableSide = asAdjustableShopSide(remainingSide);
  uiState.selectedUpgradePropertyId = adjustableSide?.getAdjustmentProperties()[0]?.id;
  uiState.shopStatusText = `Removed face. Refunded ${FACE_REMOVE_REFUND} gold. Gold now ${formatGold(uiState.playerProgression.gold)}.`;
}

function clearShopHoverState(uiState: ExploreUiState): void {
  uiState.shopHoveredCraftsfolkId = undefined;
  uiState.shopHoveredDieId = undefined;
  uiState.shopHoveredFaceId = undefined;
  uiState.shopHoveredPropertyId = undefined;
  uiState.shopHoveredAction = undefined;
}

function openCraftShop(uiState: ExploreUiState): void {
  uiState.isCraftShopOpen = true;
  uiState.isCharacterSheetOpen = false;
  uiState.isInventoryOpen = false;
  uiState.isTalentTreeOpen = false;
  uiState.selectedTalentId = undefined;
  uiState.shopFocusedColumn = "craftsfolk";
  uiState.shopFocusedAction = "primary";
  uiState.shopAwaitingRemoveConfirm = false;
  uiState.selectedCraftsfolkId = uiState.selectedCraftsfolkId ?? uiState.availableCraftsfolk[0]?.id;

  const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId) ?? dice[0];
  uiState.selectedUpgradeDieId = selectedDie?.id;
  uiState.selectedUpgradeSideId = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId)?.id ?? selectedDie?.sides[0]?.id;
  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
  const selectedAdjustableSide = asAdjustableShopSide(selectedSide);
  uiState.selectedUpgradePropertyId = selectedAdjustableSide
    ?.getAdjustmentProperties()
    .find((entry) => entry.id === uiState.selectedUpgradePropertyId)?.id ?? selectedAdjustableSide?.getAdjustmentProperties()[0]?.id;

  const layout = getCraftShopLayout(uiState, dice);
  syncShopVisualDice(uiState, dice, layout, true);
}

function closeCraftShop(uiState: ExploreUiState): void {
  uiState.isCraftShopOpen = false;
  uiState.shopAwaitingRemoveConfirm = false;
  uiState.shopVisualDice = [];
  clearShopHoverState(uiState);
}

function getShopActionState(uiState: ExploreUiState, dice: Die[]): {
  canPrimary: boolean;
  canSecondary: boolean;
  primaryReason?: string;
  secondaryReason?: string;
} {
  const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId);
  const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);

  if (isFaceSmithSelected(uiState)) {
    if (!selectedDie || !selectedSide) {
      return {
        canPrimary: false,
        canSecondary: false,
        primaryReason: "Select a die face to copy.",
        secondaryReason: "Select a die face to remove.",
      };
    }

    return {
      canPrimary: uiState.playerProgression.gold >= FACE_APPEND_COST,
      canSecondary: selectedDie.sides.length > 1,
      primaryReason:
        uiState.playerProgression.gold >= FACE_APPEND_COST
          ? undefined
          : `Need ${FACE_APPEND_COST} gold to copy a face.`,
      secondaryReason:
        selectedDie.sides.length > 1 ? undefined : "A die must keep at least one face.",
    };
  }

  if (!isUpDownSmithSelected(uiState)) {
    return {
      canPrimary: false,
      canSecondary: false,
      primaryReason: "Select the Up/Down Smith.",
      secondaryReason: "Select the Up/Down Smith.",
    };
  }

  const canAdjust = uiState.selectedUpgradePropertyId !== undefined;
  return {
    canPrimary: canAdjust,
    canSecondary: canAdjust,
    primaryReason: canAdjust ? undefined : "Select a face property first.",
    secondaryReason: canAdjust ? undefined : "Select a face property first.",
  };
}

function triggerPrimaryShopAction(uiState: ExploreUiState, dice: Die[]): void {
  const actionState = getShopActionState(uiState, dice);
  if (!actionState.canPrimary) {
    uiState.shopStatusText = actionState.primaryReason ?? "Action unavailable.";
    return;
  }

  if (isFaceSmithSelected(uiState)) {
    appendCopiedFaceInShop(uiState, dice);
    return;
  }

  applyShopPropertyAdjustment(uiState, dice, FaceAdjustmentModalityType.Improve);
}

function triggerSecondaryShopAction(uiState: ExploreUiState, dice: Die[]): void {
  const actionState = getShopActionState(uiState, dice);
  if (!actionState.canSecondary) {
    uiState.shopStatusText = actionState.secondaryReason ?? "Action unavailable.";
    return;
  }

  if (isFaceSmithSelected(uiState)) {
    if (!uiState.shopAwaitingRemoveConfirm) {
      uiState.shopAwaitingRemoveConfirm = true;
      uiState.shopStatusText = "Press Remove Face again to confirm.";
      return;
    }

    removeFaceInShop(uiState, dice);
    return;
  }

  applyShopPropertyAdjustment(uiState, dice, FaceAdjustmentModalityType.Reduce);
}

function setShopHoverFromPoint(uiState: ExploreUiState, layout: ShopLayout, dice: Die[], x: number, y: number): void {
  clearShopHoverState(uiState);

  const selectedDie = dice.find((entry) => entry.id === uiState.selectedUpgradeDieId) ?? dice[0];

  if (isPointInRect(x, y, layout.closeButtonRect)) {
    uiState.shopHoveredAction = "close";
    return;
  }

  for (const row of layout.craftsfolkRows) {
    if (isPointInRect(x, y, row.rect)) {
      uiState.shopHoveredCraftsfolkId = row.id;
      return;
    }
  }

  const hoveredVisualDie = getShopVisualDieAt(uiState, x, y);
  if (hoveredVisualDie) {
    uiState.shopHoveredDieId = hoveredVisualDie.id;
    return;
  }

  const hoveredFaceTile = getShopFaceTileAt(layout, selectedDie, x, y);
  if (hoveredFaceTile) {
    uiState.shopHoveredFaceId = hoveredFaceTile.id;
    return;
  }

  for (const row of layout.propertyRows) {
    if (isPointInRect(x, y, row.rect)) {
      uiState.shopHoveredPropertyId = row.id;
      return;
    }
  }

  if (isPointInRect(x, y, layout.primaryActionButtonRect)) {
    uiState.shopHoveredAction = "primary";
    return;
  }

  if (isPointInRect(x, y, layout.secondaryActionButtonRect)) {
    uiState.shopHoveredAction = "secondary";
  }
}

function changeShopSelectionByStep(currentId: string | undefined, ids: string[], direction: -1 | 1): string | undefined {
  if (ids.length === 0) {
    return undefined;
  }

  if (!currentId) {
    return ids[0];
  }

  const currentIndex = ids.findIndex((id) => id === currentId);
  if (currentIndex === -1) {
    return ids[0];
  }

  const nextIndex = Math.max(0, Math.min(ids.length - 1, currentIndex + direction));
  return ids[nextIndex];
}

function clampShopScrollAfterSelection(uiState: ExploreUiState, layout: ShopLayout, dice: Die[]): void {
  const dieIndex = Math.max(0, dice.findIndex((entry) => entry.id === uiState.selectedUpgradeDieId));
  if (dieIndex < layout.dieStartIndex) {
    uiState.shopDieScrollIndex = dieIndex;
  } else if (dieIndex >= layout.dieStartIndex + layout.visibleDieCount) {
    uiState.shopDieScrollIndex = dieIndex - layout.visibleDieCount + 1;
  }

  const selectedDie = dice.find((entry) => entry.id === uiState.selectedUpgradeDieId);
  const faces = selectedDie?.sides ?? [];
  const faceIndex = Math.max(0, faces.findIndex((entry) => entry.id === uiState.selectedUpgradeSideId));
  if (faceIndex < layout.faceStartIndex) {
    uiState.shopFaceScrollIndex = faceIndex;
  } else if (faceIndex >= layout.faceStartIndex + layout.visibleFaceCount) {
    uiState.shopFaceScrollIndex = faceIndex - layout.visibleFaceCount + 1;
  }

  const selectedAdjustableSide = asAdjustableShopSide(selectedDie?.sides.find((entry) => entry.id === uiState.selectedUpgradeSideId));
  const properties = selectedAdjustableSide?.getAdjustmentProperties() ?? [];
  const propertyIndex = Math.max(
    0,
    properties.findIndex((entry) => entry.id === uiState.selectedUpgradePropertyId),
  );
  if (propertyIndex < layout.propertyStartIndex) {
    uiState.shopPropertyScrollIndex = propertyIndex;
  } else if (propertyIndex >= layout.propertyStartIndex + layout.visiblePropertyCount) {
    uiState.shopPropertyScrollIndex = propertyIndex - layout.visiblePropertyCount + 1;
  }
}

function drawShopScrollIndicator(
  x: number,
  y: number,
  width: number,
  height: number,
  startIndex: number,
  visibleCount: number,
  totalCount: number,
): void {
  if (totalCount <= visibleCount) {
    return;
  }

  const trackX = x + width - 7;
  const trackY = y + 34;
  const trackHeight = Math.max(20, height - 44);
  const handleHeight = Math.max(18, Math.floor((visibleCount / totalCount) * trackHeight));
  const maxStart = Math.max(1, totalCount - visibleCount);
  const ratio = Math.max(0, Math.min(1, startIndex / maxStart));
  const handleY = trackY + Math.floor((trackHeight - handleHeight) * ratio);

  love.graphics.setColor(0.22, 0.26, 0.34, 0.85);
  love.graphics.rectangle("fill", trackX, trackY, 3, trackHeight, 2, 2);
  love.graphics.setColor(0.82, 0.88, 0.98, 0.92);
  love.graphics.rectangle("fill", trackX, handleY, 3, handleHeight, 2, 2);
}

function getShopDieTargetRects(layout: ShopLayout, dice: Die[]): ShopRowRect[] {
  const listRect = layout.dieListRect;
  const count = dice.length;
  if (count <= 0) {
    return [];
  }

  const horizontalPadding = 16;
  const topPadding = 56;
  const bottomPadding = 28;
  const gap = 14;
  const availableWidth = Math.max(80, listRect.width - horizontalPadding * 2);
  const availableHeight = Math.max(80, listRect.height - topPadding - bottomPadding);
  const columns = count <= 3 ? count : count <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(count / columns));

  const tileSize = Math.max(
    38,
    Math.min(
      78,
      Math.floor((availableWidth - gap * Math.max(0, columns - 1)) / Math.max(1, columns)),
      Math.floor((availableHeight - gap * Math.max(0, rows - 1)) / rows),
    ),
  );

  const usedWidth = tileSize * columns + gap * Math.max(0, columns - 1);
  const usedHeight = tileSize * rows + gap * Math.max(0, rows - 1);
  const startX = listRect.x + Math.floor((listRect.width - usedWidth) * 0.5);
  const startY = listRect.y + topPadding + Math.floor((availableHeight - usedHeight) * 0.5);

  return dice.map((die, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const rectX = startX + col * (tileSize + gap);
    const rectY = startY + row * (tileSize + gap);

    return {
      id: die.id,
      rect: {
        x: rectX,
        y: rectY,
        width: tileSize,
        height: tileSize,
      },
    };
  });
}

function syncShopVisualDice(uiState: ExploreUiState, dice: Die[], layout: ShopLayout, _forceRespawn = false): void {
  const targetRects = getShopDieTargetRects(layout, dice);

  const nextVisuals: ShopVisualDie[] = [];
  for (const target of targetRects) {
    const die = dice.find((entry) => entry.id === target.id);
    if (!die) {
      continue;
    }

    const targetX = target.rect.x + target.rect.width * 0.5;
    const targetY = target.rect.y + target.rect.height * 0.5;
    nextVisuals.push({
      id: target.id,
      label: die.name,
      x: targetX,
      y: targetY,
      size: target.rect.width,
    });
  }

  uiState.shopVisualDice = nextVisuals;
}
function updateShopVisualDice(_uiState: ExploreUiState, _layout: ShopLayout, _dt: number): void {
  // Static ordered grid style: no per-frame motion.
}

function getShopVisualDieAt(uiState: ExploreUiState, x: number, y: number): ShopVisualDie | undefined {
  for (let index = uiState.shopVisualDice.length - 1; index >= 0; index -= 1) {
    const die = uiState.shopVisualDice[index];
    const half = die.size * 0.5;
    if (x >= die.x - half && x <= die.x + half && y >= die.y - half && y <= die.y + half) {
      return die;
    }
  }

  return undefined;
}

function getShopFaceTiles(layout: ShopLayout, selectedDie: Die | undefined): ShopRowRect[] {
  if (!selectedDie || selectedDie.sides.length <= 0) {
    return [];
  }

  const count = selectedDie.sides.length;
  const listRect = layout.faceListRect;
  const topPadding = 56;
  const bottomPadding = 36;
  const horizontalPadding = 14;
  const gap = 10;
  const availableWidth = Math.max(80, listRect.width - horizontalPadding * 2);
  const availableHeight = Math.max(80, listRect.height - topPadding - bottomPadding);
  const columns = count <= 3 ? 1 : count <= 8 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(count / columns));

  const tileSize = Math.max(
    34,
    Math.min(
      64,
      Math.floor((availableWidth - gap * Math.max(0, columns - 1)) / Math.max(1, columns)),
      Math.floor((availableHeight - gap * Math.max(0, rows - 1)) / rows),
    ),
  );

  const usedWidth = tileSize * columns + gap * Math.max(0, columns - 1);
  const usedHeight = tileSize * rows + gap * Math.max(0, rows - 1);
  const startX = listRect.x + Math.floor((listRect.width - usedWidth) * 0.5);
  const startY = listRect.y + topPadding + Math.floor((availableHeight - usedHeight) * 0.5);

  return selectedDie.sides.map((side, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: side.id,
      rect: {
        x: startX + col * (tileSize + gap),
        y: startY + row * (tileSize + gap),
        width: tileSize,
        height: tileSize,
      },
    };
  });
}

function getShopFaceTileAt(layout: ShopLayout, selectedDie: Die | undefined, x: number, y: number): ShopRowRect | undefined {
  const tiles = getShopFaceTiles(layout, selectedDie);
  for (const tile of tiles) {
    if (isPointInRect(x, y, tile.rect)) {
      return tile;
    }
  }

  return undefined;
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
    isQuestMenuOpen: false,
    questMenuButtonRect: createQuestMenuButtonRect(),
    selectedQuestCategory: "main",
    selectedQuestId: undefined,
    isGoToTileMode: false,
    goToTileZone: undefined,
    goToTileIds: undefined,
    goToTileHint: undefined,
    availableCraftsfolk: createCraftsfolkOptions(),
    selectedCraftsfolkId: undefined,
    selectedUpgradeDieId: undefined,
    selectedUpgradeSideId: undefined,
    selectedUpgradePropertyId: undefined,
    shopStatusText: undefined,
    shopHoveredCraftsfolkId: undefined,
    shopHoveredDieId: undefined,
    shopHoveredFaceId: undefined,
    shopHoveredPropertyId: undefined,
    shopHoveredAction: undefined,
    shopFocusedColumn: "craftsfolk",
    shopFocusedAction: "primary",
    shopDieScrollIndex: 0,
    shopFaceScrollIndex: 0,
    shopPropertyScrollIndex: 0,
    shopGoldPulseTimer: 0,
    shopAwaitingRemoveConfirm: false,
    shopVisualDice: [],
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
  if (uiState.isQuestMenuOpen) {
    if (key === "escape" || key === "q") {
      uiState.isQuestMenuOpen = false;
      return true;
    }

    if (key === "left" || key === "right") {
      const categories: QuestCategory[] = ["main", "side", "town"];
      const currentIndex = categories.findIndex((category) => category === uiState.selectedQuestCategory);
      const delta = key === "left" ? -1 : 1;
      const nextIndex = Math.max(0, Math.min(categories.length - 1, currentIndex + delta));
      uiState.selectedQuestCategory = categories[nextIndex] ?? uiState.selectedQuestCategory;
      ensureQuestSelection(uiState);
      return true;
    }

    return true;
  }

  if (uiState.isCraftShopOpen) {
    if (key === "escape" || key === "u") {
      closeCraftShop(uiState);
      return true;
    }

    const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
    const selectedDie = dice.find((die) => die.id === uiState.selectedUpgradeDieId) ?? dice[0];
    const selectedSide = selectedDie?.sides.find((side) => side.id === uiState.selectedUpgradeSideId);
    const selectedAdjustableSide = asAdjustableShopSide(selectedSide);
    const craftsfolkIds = uiState.availableCraftsfolk.map((entry) => entry.id);
    const dieIds = dice.map((entry) => entry.id);
    const faceIds = selectedDie?.sides.map((entry) => entry.id) ?? [];
    const propertyIds = selectedAdjustableSide?.getAdjustmentProperties().map((entry) => entry.id) ?? [];
    const layout = getCraftShopLayout(uiState, dice);

    if (key === "left") {
      if (uiState.shopFocusedColumn === "actions") {
        uiState.shopFocusedColumn = "properties";
      } else if (uiState.shopFocusedColumn === "properties") {
        uiState.shopFocusedColumn = "faces";
      } else if (uiState.shopFocusedColumn === "faces") {
        uiState.shopFocusedColumn = "dice";
      } else if (uiState.shopFocusedColumn === "dice") {
        uiState.shopFocusedColumn = "craftsfolk";
      }
      return true;
    }

    if (key === "right") {
      if (uiState.shopFocusedColumn === "craftsfolk") {
        uiState.shopFocusedColumn = "dice";
      } else if (uiState.shopFocusedColumn === "dice") {
        uiState.shopFocusedColumn = "faces";
      } else if (uiState.shopFocusedColumn === "faces") {
        uiState.shopFocusedColumn = "properties";
      } else if (uiState.shopFocusedColumn === "properties") {
        uiState.shopFocusedColumn = "actions";
      }
      return true;
    }

    if (key === "tab") {
      if (uiState.shopFocusedColumn === "craftsfolk") {
        uiState.shopFocusedColumn = "dice";
      } else if (uiState.shopFocusedColumn === "dice") {
        uiState.shopFocusedColumn = "faces";
      } else if (uiState.shopFocusedColumn === "faces") {
        uiState.shopFocusedColumn = "properties";
      } else if (uiState.shopFocusedColumn === "properties") {
        uiState.shopFocusedColumn = "actions";
      } else {
        uiState.shopFocusedColumn = "craftsfolk";
      }
      return true;
    }

    if (key === "up" || key === "down") {
      const direction: -1 | 1 = key === "up" ? -1 : 1;

      if (uiState.shopFocusedColumn === "actions") {
        uiState.shopFocusedAction = uiState.shopFocusedAction === "primary" ? "secondary" : "primary";
        return true;
      }

      if (uiState.shopFocusedColumn === "craftsfolk") {
        uiState.selectedCraftsfolkId = changeShopSelectionByStep(uiState.selectedCraftsfolkId, craftsfolkIds, direction) as CraftsfolkId | undefined;
      } else if (uiState.shopFocusedColumn === "dice") {
        const nextDieId = changeShopSelectionByStep(uiState.selectedUpgradeDieId, dieIds, direction);
        if (nextDieId && nextDieId !== uiState.selectedUpgradeDieId) {
          uiState.selectedUpgradeDieId = nextDieId;
          const nextDie = dice.find((entry) => entry.id === nextDieId);
          uiState.selectedUpgradeSideId = nextDie?.sides[0]?.id;
          const nextAdjustableSide = asAdjustableShopSide(nextDie?.sides[0]);
          uiState.selectedUpgradePropertyId = nextAdjustableSide?.getAdjustmentProperties()[0]?.id;
          uiState.shopAwaitingRemoveConfirm = false;
        }
      } else if (uiState.shopFocusedColumn === "faces") {
        const nextFaceId = changeShopSelectionByStep(uiState.selectedUpgradeSideId, faceIds, direction);
        if (nextFaceId && nextFaceId !== uiState.selectedUpgradeSideId) {
          uiState.selectedUpgradeSideId = nextFaceId;
          const nextSide = selectedDie?.sides.find((entry) => entry.id === nextFaceId);
          const nextAdjustableSide = asAdjustableShopSide(nextSide);
          uiState.selectedUpgradePropertyId = nextAdjustableSide?.getAdjustmentProperties()[0]?.id;
          uiState.shopAwaitingRemoveConfirm = false;
        }
      } else if (uiState.shopFocusedColumn === "properties") {
        uiState.selectedUpgradePropertyId = changeShopSelectionByStep(
          uiState.selectedUpgradePropertyId,
          propertyIds,
          direction,
        );
      }

      clampShopScrollAfterSelection(uiState, layout, dice);
      return true;
    }

    if (key === "return" || key === "kpenter" || key === "space") {
      if (uiState.shopFocusedColumn === "actions") {
        if (uiState.shopFocusedAction === "primary") {
          triggerPrimaryShopAction(uiState, dice);
        } else {
          triggerSecondaryShopAction(uiState, dice);
        }
      } else {
        triggerPrimaryShopAction(uiState, dice);
      }
      return true;
    }

    if (key === "backspace" || key === "delete") {
      triggerSecondaryShopAction(uiState, dice);
      return true;
    }

    return true;
  }

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
    if (uiState.isCraftShopOpen) {
      closeCraftShop(uiState);
    } else {
      openCraftShop(uiState);
    }
    return true;
  }

  if (key === "q") {
    uiState.isQuestMenuOpen = !uiState.isQuestMenuOpen;
    if (uiState.isQuestMenuOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
      uiState.isCraftShopOpen = false;
      ensureQuestSelection(uiState);
    }
    return true;
  }

  if (key === "g" && uiState.isGoToTileMode) {
    uiState.isGoToTileMode = false;
    uiState.goToTileZone = undefined;
    uiState.goToTileIds = undefined;
    uiState.goToTileHint = undefined;
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
    closeCraftShop(uiState);
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
  if (uiState.shopGoldPulseTimer > 0) {
    uiState.shopGoldPulseTimer = Math.max(0, uiState.shopGoldPulseTimer - dt);
  }

  if (uiState.isCraftShopOpen) {
    const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
    const layout = getCraftShopLayout(uiState, dice);
    syncShopVisualDice(uiState, dice, layout);
    updateShopVisualDice(uiState, layout, dt);
  }
}

export function onExploreMouseMoved(uiState: ExploreUiState, x: number, y: number): void {
  refreshLayoutIfNeeded(uiState);
  if (uiState.isQuestMenuOpen) {
    return;
  }

  if (uiState.isCraftShopOpen) {
    const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
    const layout = getCraftShopLayout(uiState, dice);
    syncShopVisualDice(uiState, dice, layout);
    setShopHoverFromPoint(uiState, layout, dice, x, y);
    return;
  }

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

  if (uiState.isQuestMenuOpen) {
    const layout = getQuestMenuLayout(uiState);

    if (isPointInRect(x, y, layout.closeButtonRect)) {
      uiState.isQuestMenuOpen = false;
      return undefined;
    }

    if (isPointInRect(x, y, layout.clearGoToRect)) {
      uiState.isGoToTileMode = false;
      uiState.goToTileZone = undefined;
      uiState.goToTileIds = undefined;
      uiState.goToTileHint = undefined;
      return undefined;
    }

    for (const tab of layout.categoryTabs) {
      if (!isPointInRect(x, y, tab.rect)) {
        continue;
      }

      uiState.selectedQuestCategory = tab.category;
      ensureQuestSelection(uiState);
      return undefined;
    }

    for (const row of layout.questRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedQuestId = row.questId;
      return undefined;
    }

    for (const goToButton of layout.objectiveGoToButtons) {
      if (!isPointInRect(x, y, goToButton.rect)) {
        continue;
      }

      const selectedQuest = getSelectedQuestEntry(uiState);
      if (selectedQuest === undefined) {
        return undefined;
      }

      const quest = getQuestById(selectedQuest.questId);
      const objective = quest.objectives.find((candidate) => candidate.id === goToButton.objectiveId);
      if (objective?.kind !== "visit-tile") {
        return undefined;
      }

      uiState.isGoToTileMode = true;
      uiState.goToTileZone = objective.zone;
      uiState.goToTileIds = objective.tileIds !== undefined ? [...objective.tileIds] : undefined;
      uiState.goToTileHint = objective.goToTileHint;
      uiState.isQuestMenuOpen = false;
      return undefined;
    }

    return undefined;
  }

  if (uiState.isCraftShopOpen) {
    const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
    const layout = getCraftShopLayout(uiState, dice);
    syncShopVisualDice(uiState, dice, layout);
    const selectedDie =
      dice.find((die) => die.id === uiState.selectedUpgradeDieId) ??
      dice[0];

    if (isPointInRect(x, y, layout.closeButtonRect)) {
      closeCraftShop(uiState);
      return undefined;
    }

    for (const row of layout.craftsfolkRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedCraftsfolkId = row.id as CraftsfolkId;
      uiState.shopAwaitingRemoveConfirm = false;
      uiState.shopStatusText = `Selected craftsfolk: ${
        uiState.availableCraftsfolk.find((entry) => entry.id === row.id)?.name ?? row.id
      }`;
      return undefined;
    }

    const clickedVisualDie = getShopVisualDieAt(uiState, x, y);
    if (clickedVisualDie) {
      uiState.selectedUpgradeDieId = clickedVisualDie.id;
      const clickedDie = dice.find((die) => die.id === clickedVisualDie.id);
      uiState.selectedUpgradeSideId = clickedDie?.sides[0]?.id;
      const initialAdjustableSide = asAdjustableShopSide(clickedDie?.sides[0]);
      uiState.selectedUpgradePropertyId = initialAdjustableSide?.getAdjustmentProperties()[0]?.id;
      uiState.shopAwaitingRemoveConfirm = false;
      uiState.shopStatusText = `Selected die: ${clickedDie?.name ?? clickedVisualDie.id}`;
      return undefined;
    }

    const selectedFaceTile = getShopFaceTileAt(layout, selectedDie, x, y);
    if (selectedFaceTile) {
      uiState.selectedUpgradeSideId = selectedFaceTile.id;
      const selectedSide = selectedDie?.sides.find((side) => side.id === selectedFaceTile.id);
      const adjustableSide = asAdjustableShopSide(selectedSide);
      uiState.selectedUpgradePropertyId = adjustableSide?.getAdjustmentProperties()[0]?.id;
      uiState.shopAwaitingRemoveConfirm = false;
      uiState.shopStatusText = "Selected die face.";
      return undefined;
    }

    for (const row of layout.propertyRows) {
      if (!isPointInRect(x, y, row.rect)) {
        continue;
      }

      uiState.selectedUpgradePropertyId = row.id;
      uiState.shopAwaitingRemoveConfirm = false;
      uiState.shopStatusText = "Selected face property.";
      return undefined;
    }

    if (isPointInRect(x, y, layout.primaryActionButtonRect)) {
      uiState.shopFocusedAction = "primary";
      triggerPrimaryShopAction(uiState, dice);
      return undefined;
    }

    if (isPointInRect(x, y, layout.secondaryActionButtonRect)) {
      uiState.shopFocusedAction = "secondary";
      triggerSecondaryShopAction(uiState, dice);
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
    if (uiState.isCraftShopOpen) {
      closeCraftShop(uiState);
    } else {
      openCraftShop(uiState);
    }
    return undefined;
  }

  if (isPointInRect(x, y, uiState.questMenuButtonRect)) {
    uiState.isQuestMenuOpen = !uiState.isQuestMenuOpen;
    if (uiState.isQuestMenuOpen) {
      uiState.isCharacterSheetOpen = false;
      uiState.isInventoryOpen = false;
      uiState.isTalentTreeOpen = false;
      uiState.selectedTalentId = undefined;
      uiState.isCraftShopOpen = false;
      ensureQuestSelection(uiState);
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
    const traveled = tryTravelToCoord(uiState.model, clickedTile.coord);
    if (traveled) {
      const activeTile = getCurrentTile(uiState.model);
      const progress = recordTileVisited({
        tileKey: activeTile.key,
        zone: activeTile.zone,
        specialTileId:
          typeof activeTile.metadata.specialTileId === "string"
            ? activeTile.metadata.specialTileId
            : undefined,
      });

      if (progress.length > 0) {
        const first = progress[0];
        if (first !== undefined) {
          uiState.model.notice = `${uiState.model.notice} Quest progress: ${first.currentCount}/${first.targetCount}.`;
        }
      }
    }
  }

  return undefined;
}

export function onExploreWheelMoved(uiState: ExploreUiState, wheelY: number): boolean {
  if (!uiState.isCraftShopOpen || wheelY === 0) {
    return false;
  }

  const dice = createPlayerCombatDiceLoadout(uiState.playerProgression);
  const layout = getCraftShopLayout(uiState, dice);
  const [mouseX, mouseY] = love.mouse.getPosition();
  const scrollStep = wheelY > 0 ? -1 : 1;

  if (isPointInRect(mouseX, mouseY, layout.propertyListRect)) {
    const maxStart = Math.max(0, layout.totalPropertyCount - layout.visiblePropertyCount);
    uiState.shopPropertyScrollIndex = Math.max(0, Math.min(maxStart, uiState.shopPropertyScrollIndex + scrollStep));
    return true;
  }

  return false;
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

  love.graphics.setColor(0.2, 0.28, 0.43, 0.96);
  love.graphics.rectangle(
    "fill",
    uiState.questMenuButtonRect.x,
    uiState.questMenuButtonRect.y,
    uiState.questMenuButtonRect.width,
    uiState.questMenuButtonRect.height,
    8,
    8,
  );
  love.graphics.setColor(0.73, 0.84, 0.98, 0.95);
  love.graphics.rectangle(
    "line",
    uiState.questMenuButtonRect.x,
    uiState.questMenuButtonRect.y,
    uiState.questMenuButtonRect.width,
    uiState.questMenuButtonRect.height,
    8,
    8,
  );

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(
    uiState.isQuestMenuOpen ? "Close Quests (Q)" : "Open Quests (Q)",
    uiState.questMenuButtonRect.x,
    uiState.questMenuButtonRect.y + 9,
    uiState.questMenuButtonRect.width,
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
    "Movement: click neighboring hexes | Q: Quest Menu | Click XP bar or T: Talents | C: Character | I: Inventory | U: Upgrade Shop | P: Planner Debug | R: Reroll Plan",
    panelX + 14,
    uiState.height - 62,
    panelWidth - 28,
    "left",
    0,
    0.66,
    0.66,
  );

  if (uiState.isGoToTileMode) {
    love.graphics.setColor(0.95, 0.89, 0.52, 0.96);
    love.graphics.printf(
      uiState.goToTileHint ?? "Go To Tile mode active. Follow highlighted tiles. Press G to clear.",
      panelX + 14,
      uiState.height - 86,
      panelWidth - 28,
      "left",
      0,
      0.6,
      0.6,
    );
  }
}

function drawQuestMenuOverlay(uiState: ExploreUiState): void {
  if (!uiState.isQuestMenuOpen) {
    return;
  }

  const layout = getQuestMenuLayout(uiState);
  const entries = listQuestEntriesForCategory(uiState.selectedQuestCategory);
  const selectedEntry = getSelectedQuestEntry(uiState);
  const selectedQuest = selectedEntry !== undefined ? getQuestById(selectedEntry.questId) : undefined;

  love.graphics.setColor(0, 0, 0, 0.54);
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
  love.graphics.setColor(0.8, 0.88, 0.98, 0.88);
  love.graphics.rectangle(
    "line",
    layout.panelRect.x,
    layout.panelRect.y,
    layout.panelRect.width,
    layout.panelRect.height,
    10,
    10,
  );

  love.graphics.setColor(0.96, 0.98, 1, 1);
  love.graphics.printf("Quest Journal", layout.panelRect.x + 20, layout.panelRect.y + 16, 260, "left", 0, 0.9, 0.9);

  love.graphics.setColor(0.32, 0.24, 0.24, 0.94);
  love.graphics.rectangle(
    "fill",
    layout.closeButtonRect.x,
    layout.closeButtonRect.y,
    layout.closeButtonRect.width,
    layout.closeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(0.95, 0.77, 0.77, 0.98);
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
  love.graphics.printf("X", layout.closeButtonRect.x, layout.closeButtonRect.y + 5, layout.closeButtonRect.width, "center", 0, 0.62, 0.62);

  for (const tab of layout.categoryTabs) {
    const selected = tab.category === uiState.selectedQuestCategory;
    love.graphics.setColor(selected ? 0.26 : 0.17, selected ? 0.38 : 0.24, selected ? 0.5 : 0.35, 0.95);
    love.graphics.rectangle("fill", tab.rect.x, tab.rect.y, tab.rect.width, tab.rect.height, 7, 7);
    love.graphics.setColor(selected ? 0.88 : 0.7, selected ? 0.94 : 0.8, 1, 0.95);
    love.graphics.rectangle("line", tab.rect.x, tab.rect.y, tab.rect.width, tab.rect.height, 7, 7);
    love.graphics.setColor(1, 1, 1, 1);
    love.graphics.printf(tab.category.toUpperCase(), tab.rect.x, tab.rect.y + 9, tab.rect.width, "center", 0, 0.56, 0.56);
  }

  love.graphics.setColor(0.25, 0.31, 0.42, 0.85);
  love.graphics.rectangle("fill", layout.clearGoToRect.x, layout.clearGoToRect.y, layout.clearGoToRect.width, layout.clearGoToRect.height, 7, 7);
  love.graphics.setColor(0.78, 0.85, 0.96, 0.95);
  love.graphics.rectangle("line", layout.clearGoToRect.x, layout.clearGoToRect.y, layout.clearGoToRect.width, layout.clearGoToRect.height, 7, 7);
  love.graphics.setColor(1, 1, 1, 0.96);
  love.graphics.printf("Clear Go To (G)", layout.clearGoToRect.x, layout.clearGoToRect.y + 9, layout.clearGoToRect.width, "center", 0, 0.52, 0.52);

  for (const row of layout.questRows) {
    const entry = entries.find((candidate) => candidate.questId === row.questId);
    if (!entry) {
      continue;
    }

    const selected = row.questId === uiState.selectedQuestId;
    love.graphics.setColor(selected ? 0.24 : 0.16, selected ? 0.35 : 0.21, selected ? 0.46 : 0.3, 0.96);
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);
    love.graphics.setColor(selected ? 0.86 : 0.68, selected ? 0.92 : 0.78, 1, 0.95);
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);

    love.graphics.setColor(1, 1, 1, 0.98);
    love.graphics.printf(entry.questName, row.rect.x + 8, row.rect.y + 8, row.rect.width - 84, "left", 0, 0.52, 0.52);
    love.graphics.setColor(0.88, 0.94, 1, 0.9);
    love.graphics.printf(entry.status, row.rect.x + row.rect.width - 74, row.rect.y + 8, 66, "right", 0, 0.48, 0.48);
  }

  if (selectedEntry === undefined || selectedQuest === undefined) {
    love.graphics.setColor(0.82, 0.88, 0.96, 0.88);
    love.graphics.printf("No quests in this category yet.", layout.panelRect.x + 340, layout.panelRect.y + 126, 460, "left", 0, 0.64, 0.64);
    return;
  }

  love.graphics.setColor(0.96, 0.98, 1, 1);
  love.graphics.printf(selectedQuest.name, layout.panelRect.x + 340, layout.panelRect.y + 108, 460, "left", 0, 0.78, 0.78);
  love.graphics.setColor(0.78, 0.87, 0.98, 0.92);
  love.graphics.printf(selectedQuest.summary, layout.panelRect.x + 340, layout.panelRect.y + 132, 460, "left", 0, 0.56, 0.56);

  let objectiveY = layout.panelRect.y + 174;
  for (const objective of selectedQuest.objectives) {
    const progress = selectedEntry.objectives.find((candidate) => candidate.id === objective.id);
    const progressText = progress ? `${progress.currentCount}/${progress.targetCount}` : `0/${objective.targetCount}`;

    love.graphics.setColor(0.2, 0.26, 0.36, 0.92);
    love.graphics.rectangle("fill", layout.panelRect.x + 330, objectiveY - 6, 470, 42, 7, 7);
    love.graphics.setColor(0.7, 0.82, 0.95, 0.9);
    love.graphics.rectangle("line", layout.panelRect.x + 330, objectiveY - 6, 470, 42, 7, 7);

    love.graphics.setColor(0.96, 0.98, 1, 0.98);
    love.graphics.printf(objective.description, layout.panelRect.x + 344, objectiveY + 2, 300, "left", 0, 0.54, 0.54);
    love.graphics.setColor(0.84, 0.91, 1, 0.95);
    love.graphics.printf(progressText, layout.panelRect.x + 658, objectiveY + 2, 120, "right", 0, 0.54, 0.54);

    if (objective.kind === "visit-tile") {
      const button = layout.objectiveGoToButtons.find((candidate) => candidate.objectiveId === objective.id);
      if (button !== undefined) {
        love.graphics.setColor(0.32, 0.36, 0.2, 0.96);
        love.graphics.rectangle("fill", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 6, 6);
        love.graphics.setColor(0.92, 0.88, 0.56, 0.95);
        love.graphics.rectangle("line", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 6, 6);
        love.graphics.setColor(1, 1, 1, 0.98);
        love.graphics.printf("Go To", button.rect.x, button.rect.y + 6, button.rect.width, "center", 0, 0.5, 0.5);
      }
    }

    objectiveY += 52;
    if (objectiveY > layout.panelRect.y + layout.panelRect.height - 40) {
      break;
    }
  }
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
  const actionState = getShopActionState(uiState, dice);

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

  // Subtle texture bands help the modal feel layered without adding heavy assets.
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const stripeY = layout.panelRect.y + 66 + stripe * 14;
    love.graphics.setColor(0.15, 0.18, 0.26, stripe % 2 === 0 ? 0.18 : 0.09);
    love.graphics.rectangle("fill", layout.panelRect.x + 12, stripeY, layout.panelRect.width - 24, 8, 4, 4);
  }

  const goldPulse = uiState.shopGoldPulseTimer > 0
    ? 1 + 0.12 * Math.sin((0.55 - uiState.shopGoldPulseTimer) * 24)
    : 1;

  love.graphics.setColor(0.96, 0.88, 0.42, 0.98);
  love.graphics.printf(
    `Gold: ${formatGold(uiState.playerProgression.gold)}`,
    layout.panelRect.x + 20,
    layout.panelRect.y + 42,
    layout.panelRect.width - 200,
    "left",
    0,
    0.66 * goldPulse,
    0.66 * goldPulse,
  );

  const isCloseHovered = uiState.shopHoveredAction === "close";
  love.graphics.setColor(isCloseHovered ? 0.34 : 0.27, isCloseHovered ? 0.22 : 0.19, isCloseHovered ? 0.2 : 0.19, 0.95);
  love.graphics.rectangle(
    "fill",
    layout.closeButtonRect.x,
    layout.closeButtonRect.y,
    layout.closeButtonRect.width,
    layout.closeButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(isCloseHovered ? 1 : 0.95, isCloseHovered ? 0.85 : 0.75, isCloseHovered ? 0.85 : 0.75, 0.98);
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
  love.graphics.printf("[I] Choose Craftsfolk", layout.panelRect.x + 20, layout.panelRect.y + 56, layout.panelRect.width - 40, "left", 0, 0.58, 0.58);

  for (const row of layout.craftsfolkRows) {
    const option = uiState.availableCraftsfolk.find((entry) => entry.id === row.id);
    const isSelected = uiState.selectedCraftsfolkId === row.id;
    const isHovered = uiState.shopHoveredCraftsfolkId === row.id;
    const isFocused = uiState.shopFocusedColumn === "craftsfolk";

    love.graphics.setColor(
      isSelected ? 0.3 : isHovered ? 0.25 : 0.19,
      isSelected ? 0.29 : isHovered ? 0.25 : 0.2,
      isSelected ? 0.17 : isHovered ? 0.2 : 0.27,
      0.95,
    );
    love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);
    love.graphics.setColor(
      isSelected ? 0.96 : isHovered ? 0.88 : 0.75,
      isSelected ? 0.84 : isHovered ? 0.86 : 0.8,
      isSelected ? 0.49 : isHovered ? 0.98 : 0.93,
      0.96,
    );
    love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 7, 7);

    if (isFocused) {
      love.graphics.setColor(0.96, 0.91, 0.62, isSelected ? 0.35 : 0.2);
      love.graphics.rectangle("line", row.rect.x - 2, row.rect.y - 2, row.rect.width + 4, row.rect.height + 4, 8, 8);
    }

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
  if (uiState.shopFocusedColumn === "dice") {
    love.graphics.setColor(0.95, 0.89, 0.62, 0.46);
    love.graphics.rectangle("line", layout.dieListRect.x - 2, layout.dieListRect.y - 2, layout.dieListRect.width + 4, layout.dieListRect.height + 4, 9, 9);
  }
  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf("[II] Current Dice", layout.dieListRect.x + 10, layout.dieListRect.y + 10, layout.dieListRect.width - 20, "left", 0, 0.62, 0.62);

  for (const visualDie of uiState.shopVisualDice) {
    const half = visualDie.size * 0.5;
    const isSelected = uiState.selectedUpgradeDieId === visualDie.id;
    const isHovered = uiState.shopHoveredDieId === visualDie.id;
    const dieLabelScale = Math.max(0.54, Math.min(0.72, visualDie.size / 92));

    love.graphics.setColor(
      isSelected ? 0.96 : isHovered ? 0.9 : 0.93,
      isSelected ? 0.93 : isHovered ? 0.93 : 0.95,
      isSelected ? 0.82 : isHovered ? 0.87 : 0.98,
      0.98,
    );
    love.graphics.rectangle("fill", visualDie.x - half, visualDie.y - half, visualDie.size, visualDie.size, 6, 6);
    love.graphics.setColor(isSelected ? 0.98 : 0.1, isSelected ? 0.88 : 0.12, isSelected ? 0.58 : 0.16, 0.98);
    love.graphics.rectangle("line", visualDie.x - half, visualDie.y - half, visualDie.size, visualDie.size, 6, 6);

    love.graphics.setColor(0.08, 0.1, 0.14, 0.98);
    love.graphics.printf(
      visualDie.label,
      visualDie.x - half + 4,
      visualDie.y - 10,
      visualDie.size - 8,
      "center",
      0,
      dieLabelScale,
      dieLabelScale,
    );

    if (isSelected) {
      love.graphics.setColor(0.98, 0.9, 0.6, 0.62);
      love.graphics.circle("line", visualDie.x, visualDie.y, half + 7);
      love.graphics.setColor(0.98, 0.9, 0.6, 0.24);
      love.graphics.circle("line", visualDie.x, visualDie.y, half + 11);
    }
  }

  love.graphics.setColor(0.14, 0.16, 0.22, 0.95);
  love.graphics.rectangle("fill", layout.faceListRect.x, layout.faceListRect.y, layout.faceListRect.width, layout.faceListRect.height, 8, 8);
  love.graphics.setColor(0.75, 0.83, 0.96, 0.93);
  love.graphics.rectangle("line", layout.faceListRect.x, layout.faceListRect.y, layout.faceListRect.width, layout.faceListRect.height, 8, 8);
  if (uiState.shopFocusedColumn === "faces") {
    love.graphics.setColor(0.95, 0.89, 0.62, 0.46);
    love.graphics.rectangle("line", layout.faceListRect.x - 2, layout.faceListRect.y - 2, layout.faceListRect.width + 4, layout.faceListRect.height + 4, 9, 9);
  }
  love.graphics.setColor(0.95, 0.97, 1, 1);
  love.graphics.printf("[III] Die Faces (Unfolded)", layout.faceListRect.x + 10, layout.faceListRect.y + 10, layout.faceListRect.width - 20, "left", 0, 0.62, 0.62);

  const faceTiles = getShopFaceTiles(layout, selectedDie);
  for (const tile of faceTiles) {
    const side = selectedDie?.sides.find((entry) => entry.id === tile.id);
    const isSelected = uiState.selectedUpgradeSideId === tile.id;
    const isHovered = uiState.shopHoveredFaceId === tile.id;
    const faceLabelScale = Math.max(0.52, Math.min(0.68, tile.rect.width / 86));

    love.graphics.setColor(
      isSelected ? 0.97 : isHovered ? 0.91 : 0.93,
      isSelected ? 0.9 : isHovered ? 0.92 : 0.95,
      isSelected ? 0.74 : isHovered ? 0.82 : 0.98,
      0.98,
    );
    love.graphics.rectangle("fill", tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height, 6, 6);
    love.graphics.setColor(isSelected ? 0.98 : 0.12, isSelected ? 0.86 : 0.14, isSelected ? 0.56 : 0.2, 0.98);
    love.graphics.rectangle("line", tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height, 6, 6);

    love.graphics.setColor(0.08, 0.1, 0.14, 0.98);
    love.graphics.printf(
      side?.label ?? tile.id,
      tile.rect.x + 4,
      tile.rect.y + tile.rect.height * 0.34,
      tile.rect.width - 8,
      "center",
      0,
      faceLabelScale,
      faceLabelScale,
    );
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
    isFaceSmithSelected(uiState) ? "[IV] Face Operations" : "[IV] Adjustable Properties",
    layout.propertyListRect.x + 10,
    layout.propertyListRect.y + 10,
    layout.propertyListRect.width - 20,
    "left",
    0,
    0.62,
    0.62,
  );
  if (uiState.shopFocusedColumn === "properties") {
    love.graphics.setColor(0.95, 0.89, 0.62, 0.46);
    love.graphics.rectangle(
      "line",
      layout.propertyListRect.x - 2,
      layout.propertyListRect.y - 2,
      layout.propertyListRect.width + 4,
      layout.propertyListRect.height + 4,
      9,
      9,
    );
  }
  if (!isFaceSmithSelected(uiState)) {
    love.graphics.setColor(0.72, 0.8, 0.93, 0.86);
    love.graphics.printf(
      `${Math.min(layout.totalPropertyCount, layout.propertyStartIndex + 1)}-${Math.min(layout.totalPropertyCount, layout.propertyStartIndex + layout.visiblePropertyCount)} / ${layout.totalPropertyCount}`,
      layout.propertyListRect.x + 10,
      layout.propertyListRect.y + layout.propertyListRect.height - 20,
      layout.propertyListRect.width - 20,
      "right",
      0,
      0.44,
      0.44,
    );
  }
  drawShopScrollIndicator(
    layout.propertyListRect.x,
    layout.propertyListRect.y,
    layout.propertyListRect.width,
    layout.propertyListRect.height,
    layout.propertyStartIndex,
    layout.visiblePropertyCount,
    layout.totalPropertyCount,
  );

  const selectedAdjustableSide = asAdjustableShopSide(selectedSide);
  if (isFaceSmithSelected(uiState)) {
    love.graphics.setColor(0.87, 0.91, 0.98, 0.94);
    love.graphics.printf(
      "Copy duplicates the selected face onto this die. Remove deletes the selected face.",
      layout.propertyListRect.x + 10,
      layout.propertyListRect.y + 42,
      layout.propertyListRect.width - 20,
      "left",
      0,
      0.5,
      0.5,
    );
    love.graphics.setColor(0.79, 0.85, 0.95, 0.92);
    love.graphics.printf(
      `Copy Cost: ${FACE_APPEND_COST} gold | Remove Refund: ${FACE_REMOVE_REFUND} gold`,
      layout.propertyListRect.x + 10,
      layout.propertyListRect.y + 70,
      layout.propertyListRect.width - 20,
      "left",
      0,
      0.5,
      0.5,
    );
  } else {
    for (const row of layout.propertyRows) {
      const property = selectedAdjustableSide
        ?.getAdjustmentProperties()
        .find((entry) => entry.id === row.id);
      const isSelected = uiState.selectedUpgradePropertyId === row.id;
      const isHovered = uiState.shopHoveredPropertyId === row.id;

      love.graphics.setColor(
        isSelected ? 0.29 : isHovered ? 0.25 : 0.22,
        isSelected ? 0.32 : isHovered ? 0.29 : 0.25,
        isSelected ? 0.16 : isHovered ? 0.2 : 0.31,
        0.95,
      );
      love.graphics.rectangle("fill", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);
      love.graphics.setColor(
        isSelected ? 0.97 : isHovered ? 0.88 : 0.78,
        isSelected ? 0.87 : isHovered ? 0.86 : 0.82,
        isSelected ? 0.55 : isHovered ? 0.98 : 0.94,
        0.95,
      );
      love.graphics.rectangle("line", row.rect.x, row.rect.y, row.rect.width, row.rect.height, 6, 6);

      love.graphics.setColor(1, 1, 1, 0.98);
      const pointSuffix =
        property?.pointValue !== undefined
          ? ` | Pts ${formatGold(property.pointValue)}`
          : "";
      love.graphics.printf(
        `${property?.label ?? row.id}: ${property?.value ?? "?"}${pointSuffix}`,
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
  }

  const isPrimaryHovered = uiState.shopHoveredAction === "primary";
  const isSecondaryHovered = uiState.shopHoveredAction === "secondary";
  const isActionFocused = uiState.shopFocusedColumn === "actions";
  love.graphics.setColor(
    actionState.canPrimary ? (isPrimaryHovered ? 0.27 : 0.22) : 0.2,
    actionState.canPrimary ? (isPrimaryHovered ? 0.51 : 0.43) : 0.22,
    actionState.canPrimary ? (isPrimaryHovered ? 0.33 : 0.26) : 0.24,
    actionState.canPrimary ? 0.95 : 0.7,
  );
  love.graphics.rectangle(
    "fill",
    layout.primaryActionButtonRect.x,
    layout.primaryActionButtonRect.y,
    layout.primaryActionButtonRect.width,
    layout.primaryActionButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(actionState.canPrimary ? 0.73 : 0.6, actionState.canPrimary ? 0.95 : 0.7, actionState.canPrimary ? 0.78 : 0.72, 0.95);
  love.graphics.rectangle(
    "line",
    layout.primaryActionButtonRect.x,
    layout.primaryActionButtonRect.y,
    layout.primaryActionButtonRect.width,
    layout.primaryActionButtonRect.height,
    6,
    6,
  );
  if (isActionFocused && uiState.shopFocusedAction === "primary") {
    love.graphics.setColor(0.98, 0.92, 0.64, 0.46);
    love.graphics.rectangle(
      "line",
      layout.primaryActionButtonRect.x - 2,
      layout.primaryActionButtonRect.y - 2,
      layout.primaryActionButtonRect.width + 4,
      layout.primaryActionButtonRect.height + 4,
      8,
      8,
    );
  }
  love.graphics.setColor(1, 1, 1, actionState.canPrimary ? 1 : 0.74);
  love.graphics.printf(
    isFaceSmithSelected(uiState) ? "Copy Face" : "Upgrade",
    layout.primaryActionButtonRect.x,
    layout.primaryActionButtonRect.y + 8,
    layout.primaryActionButtonRect.width,
    "center",
    0,
    0.52,
    0.52,
  );

  love.graphics.setColor(
    actionState.canSecondary ? (isSecondaryHovered ? 0.32 : 0.26) : 0.2,
    actionState.canSecondary ? (isSecondaryHovered ? 0.29 : 0.25) : 0.22,
    actionState.canSecondary ? (isSecondaryHovered ? 0.2 : 0.16) : 0.24,
    actionState.canSecondary ? 0.95 : 0.7,
  );
  love.graphics.rectangle(
    "fill",
    layout.secondaryActionButtonRect.x,
    layout.secondaryActionButtonRect.y,
    layout.secondaryActionButtonRect.width,
    layout.secondaryActionButtonRect.height,
    6,
    6,
  );
  love.graphics.setColor(actionState.canSecondary ? 0.96 : 0.6, actionState.canSecondary ? 0.86 : 0.7, actionState.canSecondary ? 0.6 : 0.72, 0.95);
  love.graphics.rectangle(
    "line",
    layout.secondaryActionButtonRect.x,
    layout.secondaryActionButtonRect.y,
    layout.secondaryActionButtonRect.width,
    layout.secondaryActionButtonRect.height,
    6,
    6,
  );
  if (isActionFocused && uiState.shopFocusedAction === "secondary") {
    love.graphics.setColor(0.98, 0.92, 0.64, 0.46);
    love.graphics.rectangle(
      "line",
      layout.secondaryActionButtonRect.x - 2,
      layout.secondaryActionButtonRect.y - 2,
      layout.secondaryActionButtonRect.width + 4,
      layout.secondaryActionButtonRect.height + 4,
      8,
      8,
    );
  }
  love.graphics.setColor(1, 1, 1, actionState.canSecondary ? 1 : 0.74);
  love.graphics.printf(
    isFaceSmithSelected(uiState)
      ? uiState.shopAwaitingRemoveConfirm
        ? "Confirm Remove"
        : "Remove Face"
      : "Downgrade",
    layout.secondaryActionButtonRect.x,
    layout.secondaryActionButtonRect.y + 8,
    layout.secondaryActionButtonRect.width,
    "center",
    0,
    0.52,
    0.52,
  );

  const footerRect: Rect = {
    x: layout.panelRect.x + 16,
    y: layout.panelRect.y + layout.panelRect.height - 74,
    width: layout.panelRect.width - 32,
    height: 58,
  };
  const statusText =
    uiState.shopStatusText ??
    actionState.primaryReason ??
    actionState.secondaryReason ??
    "Select a craftsfolk, then choose a die and a face.";

  love.graphics.setColor(0.08, 0.11, 0.18, 0.96);
  love.graphics.rectangle("fill", footerRect.x, footerRect.y, footerRect.width, footerRect.height, 7, 7);
  love.graphics.setColor(0.82, 0.89, 0.99, 0.92);
  love.graphics.rectangle("line", footerRect.x, footerRect.y, footerRect.width, footerRect.height, 7, 7);

  love.graphics.setColor(0.95, 0.98, 1, 0.98);
  love.graphics.printf(
    `Status: ${statusText}`,
    footerRect.x + 10,
    footerRect.y + 7,
    footerRect.width - 20,
    "left",
    0,
    0.58,
    0.58,
  );

  love.graphics.setColor(0.9, 0.94, 1, 0.96);
  love.graphics.printf(
    `Selected Face: ${selectedSide?.label ?? "none"}`,
    footerRect.x + 10,
    footerRect.y + 25,
    footerRect.width - 20,
    "left",
    0,
    0.54,
    0.54,
  );

  love.graphics.setColor(0.8, 0.87, 0.99, 0.92);
  love.graphics.printf(
    "Keyboard: Left/Right columns | Up/Down move | Enter primary | Backspace secondary | Esc close",
    footerRect.x + 10,
    footerRect.y + 41,
    footerRect.width - 20,
    "left",
    0,
    0.46,
    0.46,
  );
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

    if (tileMatchesGoToMode(uiState, tile)) {
      love.graphics.setColor(0.95, 0.86, 0.45, 0.94);
      drawHex(center.x, center.y, uiState.hexSize * 1.08, "line");
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
  drawQuestMenuOverlay(uiState);
}
