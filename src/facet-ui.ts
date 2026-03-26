import {
  canInvestInFacet,
  investInFacet,
  type FacetTree,
  type PlayerProgressionState,
} from "./game/player-progression";

type Rect = { x: number; y: number; width: number; height: number };

export type FacetUiState = {
  playerProgression: PlayerProgressionState;
  width: number;
  height: number;
  selectedFacetId?: string;
};

type FacetScreenLayout = {
  soldierColumnRect: Rect;
  berserkerColumnRect: Rect;
  investButtonRect: Rect;
  closeButtonRect: Rect;
};

export function createFacetUiState(playerProgression: PlayerProgressionState): FacetUiState {
  return {
    playerProgression,
    width: love.graphics.getWidth(),
    height: love.graphics.getHeight(),
    selectedFacetId: undefined,
  };
}

function isPointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function getLayout(uiState: FacetUiState): FacetScreenLayout {
  const w = uiState.width;
  const h = uiState.height;

  const colPadding = 32;
  const gap = 20;
  const totalColWidth = w - colPadding * 2 - gap;
  const colWidth = Math.floor(totalColWidth / 2);
  const colTop = 90;
  const colHeight = h - colTop - 90;

  const buttonY = h - 72;
  const buttonWidth = 160;
  const buttonHeight = 40;
  const centerX = Math.floor(w / 2);

  return {
    soldierColumnRect: { x: colPadding, y: colTop, width: colWidth, height: colHeight },
    berserkerColumnRect: { x: colPadding + colWidth + gap, y: colTop, width: colWidth, height: colHeight },
    investButtonRect: { x: centerX - buttonWidth - 8, y: buttonY, width: buttonWidth, height: buttonHeight },
    closeButtonRect: { x: centerX + 8, y: buttonY, width: buttonWidth, height: buttonHeight },
  };
}

function canInvestInSelected(uiState: FacetUiState): boolean {
  if (!uiState.selectedFacetId) return false;
  return canInvestInFacet(uiState.playerProgression, uiState.selectedFacetId);
}

function drawFacetColumn(
  uiState: FacetUiState,
  facet: FacetTree,
  colRect: Rect,
): void {
  const isSelected = uiState.selectedFacetId === facet.id;
  const { x: colX, y: colY, width: colW, height: colH } = colRect;

  // Column background
  love.graphics.setColor(0.13, 0.15, 0.22, 1);
  love.graphics.rectangle("fill", colX, colY - 34, colW, colH + 34, 8, 8);
  if (isSelected) {
    love.graphics.setColor(0.88, 0.78, 0.32, 0.9);
  } else {
    love.graphics.setColor(0.55, 0.62, 0.82, 0.45);
  }
  love.graphics.rectangle("line", colX, colY - 34, colW, colH + 34, 8, 8);

  // Facet name
  love.graphics.setColor(0.98, 0.96, 0.88, 1);
  love.graphics.printf(facet.name, colX + 12, colY - 27, colW - 24, "left", 0, 0.82, 0.82);

  // Points progress
  love.graphics.setColor(0.72, 0.82, 0.64, 0.9);
  love.graphics.printf(
    `${facet.pointsInvested}/${facet.maxPoints} pts`,
    colX + 12,
    colY - 27,
    colW - 16,
    "right",
    0,
    0.64,
    0.64,
  );

  // Ability rows
  const rowH = 36;
  const rowGap = 5;
  for (let i = 0; i < facet.abilities.length; i += 1) {
    const ability = facet.abilities[i];
    const rowY = colY + i * (rowH + rowGap);
    if (rowY + rowH > colY + colH) break;

    const isNextUnlock = i === facet.pointsInvested;
    const isHighlighted = isNextUnlock && isSelected;

    // Row background
    if (ability.unlocked) {
      love.graphics.setColor(0.14, 0.26, 0.18, 0.95);
    } else if (isHighlighted) {
      love.graphics.setColor(0.18, 0.2, 0.12, 0.92);
    } else {
      love.graphics.setColor(0.1, 0.12, 0.18, 0.85);
    }
    love.graphics.rectangle("fill", colX + 4, rowY, colW - 8, rowH, 5, 5);

    // Row border
    if (ability.unlocked) {
      love.graphics.setColor(0.52, 0.88, 0.62, 0.7);
    } else if (isHighlighted) {
      love.graphics.setColor(0.9, 0.8, 0.3, 0.8);
    } else {
      love.graphics.setColor(0.38, 0.44, 0.6, 0.35);
    }
    love.graphics.rectangle("line", colX + 4, rowY, colW - 8, rowH, 5, 5);

    // Left accent bar for selected next-unlock row
    if (isHighlighted) {
      love.graphics.setColor(0.95, 0.82, 0.28, 1);
      love.graphics.rectangle("fill", colX + 4, rowY + 2, 3, rowH - 4, 2, 2);
    }

    // Rank indicator
    const rankLabel = ability.unlocked ? `✓` : `${i + 1}`;
    if (ability.unlocked) {
      love.graphics.setColor(0.52, 0.92, 0.64, 0.96);
    } else {
      love.graphics.setColor(0.56, 0.62, 0.8, 0.7);
    }
    love.graphics.printf(rankLabel, colX + 8, rowY + 12, 20, "left", 0, 0.58, 0.58);

    // Ability name
    if (ability.unlocked) {
      love.graphics.setColor(0.88, 0.97, 0.9, 0.98);
    } else if (isNextUnlock) {
      love.graphics.setColor(0.96, 0.94, 0.78, 0.96);
    } else {
      love.graphics.setColor(0.62, 0.68, 0.8, 0.72);
    }
    love.graphics.printf(ability.name, colX + 28, rowY + 5, colW - 36, "left", 0, 0.68, 0.68);

    // Ability description
    if (ability.unlocked || isNextUnlock) {
      love.graphics.setColor(0.68, 0.78, 0.9, 0.8);
    } else {
      love.graphics.setColor(0.44, 0.5, 0.64, 0.5);
    }
    love.graphics.printf(ability.description, colX + 28, rowY + 21, colW - 36, "left", 0, 0.58, 0.58);
  }
}

export function drawFacetUi(uiState: FacetUiState): void {
  const { width: w, height: h } = uiState;
  const progression = uiState.playerProgression;
  const layout = getLayout(uiState);

  // Full solid background — this is its own screen
  love.graphics.setColor(0.07, 0.08, 0.11, 1);
  love.graphics.rectangle("fill", 0, 0, w, h);

  // Header
  love.graphics.setColor(0.98, 0.97, 0.92, 1);
  love.graphics.printf("Facets", 0, 18, w, "center", 0, 1.1, 1.1);

  love.graphics.setColor(0.9, 0.88, 0.75, 0.96);
  love.graphics.printf(
    `Unspent facet points: ${progression.unspentFacetPoints}`,
    20,
    18,
    w - 40,
    "right",
    0,
    0.72,
    0.72,
  );

  // Separator line
  love.graphics.setColor(0.88, 0.8, 0.36, 0.5);
  love.graphics.rectangle("fill", 20, 56, w - 40, 1);

  const soldier = progression.facets.find((f) => f.id === "facet:soldier");
  const berserker = progression.facets.find((f) => f.id === "facet:berserker");

  if (soldier) drawFacetColumn(uiState, soldier, layout.soldierColumnRect);
  if (berserker) drawFacetColumn(uiState, berserker, layout.berserkerColumnRect);

  // Invest button
  const canInvest = canInvestInSelected(uiState);
  love.graphics.setColor(canInvest ? 0.26 : 0.18, canInvest ? 0.5 : 0.2, canInvest ? 0.31 : 0.22, canInvest ? 0.95 : 0.72);
  love.graphics.rectangle("fill", layout.investButtonRect.x, layout.investButtonRect.y, layout.investButtonRect.width, layout.investButtonRect.height, 7, 7);
  love.graphics.setColor(canInvest ? 0.78 : 0.5, canInvest ? 0.95 : 0.6, canInvest ? 0.84 : 0.65, 0.95);
  love.graphics.rectangle("line", layout.investButtonRect.x, layout.investButtonRect.y, layout.investButtonRect.width, layout.investButtonRect.height, 7, 7);
  love.graphics.setColor(1, 1, 1, canInvest ? 0.98 : 0.6);
  love.graphics.printf("Invest", layout.investButtonRect.x, layout.investButtonRect.y + 12, layout.investButtonRect.width, "center", 0, 0.68, 0.68);

  // Close button
  love.graphics.setColor(0.28, 0.22, 0.22, 0.9);
  love.graphics.rectangle("fill", layout.closeButtonRect.x, layout.closeButtonRect.y, layout.closeButtonRect.width, layout.closeButtonRect.height, 7, 7);
  love.graphics.setColor(0.9, 0.76, 0.76, 0.95);
  love.graphics.rectangle("line", layout.closeButtonRect.x, layout.closeButtonRect.y, layout.closeButtonRect.width, layout.closeButtonRect.height, 7, 7);
  love.graphics.setColor(1, 1, 1, 0.96);
  love.graphics.printf("Close", layout.closeButtonRect.x, layout.closeButtonRect.y + 12, layout.closeButtonRect.width, "center", 0, 0.68, 0.68);

  // Footer hint
  const hint = uiState.selectedFacetId
    ? "Press Invest to unlock the next ability."
    : "Click a facet column to select it, then Invest to unlock.";
  love.graphics.setColor(0.72, 0.78, 0.9, 0.8);
  love.graphics.printf(hint, 0, h - 30, w, "center", 0, 0.58, 0.58);
}

export function onFacetKeyPressed(uiState: FacetUiState, key: string): boolean {
  if (key === "escape") {
    return true; // signals close to caller
  }
  return false;
}

export function onFacetMouseReleased(
  uiState: FacetUiState,
  x: number,
  y: number,
  button: number,
): "close" | undefined {
  if (button !== 1) return undefined;

  const layout = getLayout(uiState);

  if (isPointInRect(x, y, layout.closeButtonRect)) {
    return "close";
  }

  if (isPointInRect(x, y, layout.investButtonRect) && canInvestInSelected(uiState)) {
    investInFacet(uiState.playerProgression, uiState.selectedFacetId!);
    uiState.selectedFacetId = undefined;
    // Stay on the facet screen — no close
    return undefined;
  }

  if (isPointInRect(x, y, layout.soldierColumnRect)) {
    uiState.selectedFacetId = "facet:soldier";
    return undefined;
  }

  if (isPointInRect(x, y, layout.berserkerColumnRect)) {
    uiState.selectedFacetId = "facet:berserker";
    return undefined;
  }

  return undefined;
}
