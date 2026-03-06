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

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ActionButton = {
  branch: ExploreBranch;
  rect: Rect;
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
      branch: "combat",
      rect: { x, y: top, width: buttonWidth, height: buttonHeight },
    },
    {
      branch: "encounter",
      rect: { x, y: top + buttonHeight + 14, width: buttonWidth, height: buttonHeight },
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

export function createExploreUiState(initialSeedIndex?: number): ExploreUiState {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  const plannerSeedIndex = Math.max(1, Math.floor(initialSeedIndex ?? 1));
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
  const hovered = getTileAt(uiState, x, y);
  uiState.hoveredTileKey = hovered?.key;
}

export function onExploreMouseReleased(uiState: ExploreUiState, x: number, y: number, button: number): ExploreUiAction {
  if (button !== 1) {
    return undefined;
  }

  refreshLayoutIfNeeded(uiState);

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
    "Movement: click neighboring hexes only | P: Planner Debug | R: Reroll Plan",
    panelX + 14,
    uiState.height - 62,
    panelWidth - 28,
    "left",
    0,
    0.66,
    0.66,
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

    love.graphics.setColor(1, 1, 1, 0.84);
    love.graphics.printf(tile.name, center.x - 40, center.y - 4, 80, "center", 0, 0.39, 0.39);
  }

  love.graphics.setColor(0.9, 0.95, 1, 0.96);
  love.graphics.printf(`Explore Visits: ${visitCount}`, 20, 18, 280, "left", 0, 0.75, 0.75);

  drawActionPanel(uiState);

  if (uiState.isPlannerDebugOpen) {
    drawPlannerDebugOverlay(uiState);
  }
}
