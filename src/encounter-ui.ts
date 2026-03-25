import type { TownLocation, ZoneType } from "./exploration/explore-state";
import {
  getQuestDialogPromptsForNpc,
  getStandardDialogForNpc,
  type QuestDialogPrompt,
} from "./planning/dialog-service";
import { acceptQuest, turnInQuest } from "./planning/quest-log";
import { recordNpcInteracted } from "./planning/quest-events";
import { getExplorationFlowById } from "./planning/content-registry";
import type { ContentExplorationFlow } from "./planning/content-types";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type LocationButton = {
  locationId: string;
  rect: Rect;
};

type CharacterButton = {
  characterId: string;
  rect: Rect;
};

type DialogMode = "none" | "standard" | "quest";

type DialogButtons = {
  standard: Rect;
  quest: Rect;
  yes: Rect;
  no: Rect;
};

type EncounterMode = "generic" | "town";

export type EncounterUiContext = {
  tileName: string;
  tileZone: ZoneType;
  tileDescription: string;
  locations: TownLocation[];
  explorationFlowId: string | null;
  flowLevel: number;
};

type GenericButtons = {
  backToMap: Rect;
  exploreFurther: Rect;
  previousArea: Rect;
};

export type EncounterUiState = {
  mode: EncounterMode;
  tileName: string;
  tileZone: ZoneType;
  tileDescription: string;
  explorationFlow: ContentExplorationFlow | null;
  flowLevel: number;
  viewLevel: number;
  locations: TownLocation[];
  selectedLocationId?: string;
  selectedCharacterId?: string;
  width: number;
  height: number;
  continueButton: Rect;
  genericButtons: GenericButtons;
  locationButtons: LocationButton[];
  characterButtons: CharacterButton[];
  dialogButtons: DialogButtons;
  dialogMode: DialogMode;
  dialogText: string;
  availableQuestPrompts: QuestDialogPrompt[];
  canQuestTalk: boolean;
  selectedQuestPrompt?: QuestDialogPrompt;
  questResponseText?: string;
  hoveredContinue: boolean;
  hoveredGenericButton: "back" | "explore" | "previous" | undefined;
  hoveredLocationId?: string;
  hoveredCharacterId?: string;
  time: number;
};

function createContinueButton(width: number, height: number): Rect {
  const buttonWidth = Math.max(220, Math.floor(width * 0.24));
  const buttonHeight = 56;
  return {
    x: Math.floor((width - buttonWidth) * 0.5),
    y: Math.floor(height * 0.7),
    width: buttonWidth,
    height: buttonHeight,
  };
}

function createGenericButtons(width: number, height: number): GenericButtons {
  const btnH = 48;
  const btnY = Math.floor(height * 0.77);
  const cx = Math.floor(width * 0.5);
  const backW = 160;
  const prevW = 152;
  const exploreW = 188;
  const gap = 14;

  return {
    backToMap: {
      x: cx - Math.floor(backW / 2),
      y: btnY,
      width: backW,
      height: btnH,
    },
    previousArea: {
      x: cx - Math.floor(backW / 2) - gap - prevW,
      y: btnY,
      width: prevW,
      height: btnH,
    },
    exploreFurther: {
      x: cx + Math.ceil(backW / 2) + gap,
      y: btnY,
      width: exploreW,
      height: btnH,
    },
  };
}

function createLocationButtons(width: number, locations: TownLocation[]): LocationButton[] {
  const buttonWidth = Math.max(280, Math.floor(width * 0.42));
  const buttonHeight = 44;
  const x = Math.floor(width * 0.08);
  const startY = 186;
  const gap = 10;

  return locations.map((location, index) => ({
    locationId: location.id,
    rect: {
      x,
      y: startY + index * (buttonHeight + gap),
      width: buttonWidth,
      height: buttonHeight,
    },
  }));
}

function createCharacterButtons(
  width: number,
  selectedLocation: TownLocation | undefined,
): CharacterButton[] {
  if (selectedLocation === undefined) {
    return [];
  }

  const panelX = Math.floor(width * 0.56);
  const buttonWidth = Math.floor(width * 0.36) - 24;
  const buttonHeight = 34;
  const startY = 296;
  const gap = 8;

  return selectedLocation.characters.map((character, index) => ({
    characterId: character.id,
    rect: {
      x: panelX + 12,
      y: startY + index * (buttonHeight + gap),
      width: buttonWidth,
      height: buttonHeight,
    },
  }));
}

function createDialogButtons(width: number): DialogButtons {
  const panelX = Math.floor(width * 0.56);
  const detailsWidth = Math.floor(width * 0.36);
  const buttonWidth = Math.floor((detailsWidth - 32) * 0.5);

  return {
    standard: {
      x: panelX + 12,
      y: 436,
      width: buttonWidth,
      height: 34,
    },
    quest: {
      x: panelX + 20 + buttonWidth,
      y: 436,
      width: buttonWidth,
      height: 34,
    },
    yes: {
      x: panelX + 12,
      y: 514,
      width: buttonWidth,
      height: 30,
    },
    no: {
      x: panelX + 20 + buttonWidth,
      y: 514,
      width: buttonWidth,
      height: 30,
    },
  };
}

function refreshLayoutIfNeeded(uiState: EncounterUiState): void {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  if (uiState.width === width && uiState.height === height) {
    return;
  }

  uiState.width = width;
  uiState.height = height;
  uiState.continueButton = createContinueButton(width, height);
  uiState.genericButtons = createGenericButtons(width, height);
  uiState.locationButtons = createLocationButtons(width, uiState.locations);
  uiState.characterButtons = createCharacterButtons(width, getSelectedLocation(uiState));
  uiState.dialogButtons = createDialogButtons(width);
}

function isInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function getSelectedLocation(uiState: EncounterUiState): TownLocation | undefined {
  if (uiState.selectedLocationId === undefined) {
    return undefined;
  }

  return uiState.locations.find((location) => location.id === uiState.selectedLocationId);
}

function getLocationButtonAt(uiState: EncounterUiState, x: number, y: number): LocationButton | undefined {
  for (const button of uiState.locationButtons) {
    if (isInRect(x, y, button.rect)) {
      return button;
    }
  }

  return undefined;
}

function getCharacterButtonAt(uiState: EncounterUiState, x: number, y: number): CharacterButton | undefined {
  for (const button of uiState.characterButtons) {
    if (isInRect(x, y, button.rect)) {
      return button;
    }
  }

  return undefined;
}

function getSelectedCharacterName(uiState: EncounterUiState): string | undefined {
  const selectedLocation = getSelectedLocation(uiState);
  if (selectedLocation === undefined || uiState.selectedCharacterId === undefined) {
    return undefined;
  }

  return selectedLocation.characters.find((entry) => entry.id === uiState.selectedCharacterId)?.name;
}

function getSelectedCharacter(
  uiState: EncounterUiState,
): (TownLocation["characters"][number] & { npcId?: string }) | undefined {
  const selectedLocation = getSelectedLocation(uiState);
  if (selectedLocation === undefined || uiState.selectedCharacterId === undefined) {
    return undefined;
  }

  return selectedLocation.characters.find((entry) => entry.id === uiState.selectedCharacterId);
}

function refreshDialogForSelection(uiState: EncounterUiState): void {
  const character = getSelectedCharacter(uiState);
  if (character === undefined) {
    uiState.dialogMode = "none";
    uiState.dialogText = "Select a character to begin dialog.";
    uiState.availableQuestPrompts = [];
    uiState.canQuestTalk = false;
    uiState.selectedQuestPrompt = undefined;
    uiState.questResponseText = undefined;
    return;
  }

  if (character.npcId === undefined) {
    uiState.dialogMode = "standard";
    uiState.dialogText = character.description;
    uiState.availableQuestPrompts = [];
    uiState.canQuestTalk = false;
    uiState.selectedQuestPrompt = undefined;
    uiState.questResponseText = undefined;
    return;
  }

  const lines = getStandardDialogForNpc(character.npcId);
  recordNpcInteracted(character.npcId);
  const prompts = getQuestDialogPromptsForNpc(character.npcId);
  uiState.dialogMode = "standard";
  uiState.dialogText = lines[0] ?? character.description;
  uiState.availableQuestPrompts = prompts;
  uiState.canQuestTalk = prompts.length > 0;
  uiState.selectedQuestPrompt = prompts[0];
  uiState.questResponseText = undefined;
}

export function createEncounterUiState(context?: EncounterUiContext): EncounterUiState {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  const tileZone = context?.tileZone ?? "forest";
  const locations = context?.locations ?? [];
  const mode: EncounterMode = tileZone === "town" ? "town" : "generic";
  const explorationFlowId = context?.explorationFlowId ?? null;
  const explorationFlow =
    explorationFlowId !== null ? getExplorationFlowById(explorationFlowId) : null;
  const flowLevel = context?.flowLevel ?? 0;
  const maxLevels = explorationFlow !== null ? explorationFlow.levels.length : 0;
  const viewLevel = maxLevels > 0 ? Math.min(flowLevel, maxLevels - 1) : 0;

  const initialState: EncounterUiState = {
    mode,
    tileName: context?.tileName ?? "Unknown Tile",
    tileZone,
    tileDescription: context?.tileDescription ?? "",
    explorationFlow,
    flowLevel,
    viewLevel,
    locations,
    selectedLocationId: locations[0]?.id,
    selectedCharacterId: locations[0]?.characters[0]?.id,
    width,
    height,
    continueButton: createContinueButton(width, height),
    genericButtons: createGenericButtons(width, height),
    locationButtons: createLocationButtons(width, locations),
    characterButtons: createCharacterButtons(width, locations[0]),
    dialogButtons: createDialogButtons(width),
    dialogMode: "none",
    dialogText: "Select a character to begin dialog.",
    availableQuestPrompts: [],
    canQuestTalk: false,
    selectedQuestPrompt: undefined,
    questResponseText: undefined,
    hoveredContinue: false,
    hoveredGenericButton: undefined,
    hoveredLocationId: undefined,
    hoveredCharacterId: undefined,
    time: 0,
  };

  refreshDialogForSelection(initialState);
  return initialState;
}

export function updateEncounterUiState(uiState: EncounterUiState, dt: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.time += dt;
}

export function onEncounterMouseMoved(uiState: EncounterUiState, x: number, y: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.hoveredContinue = isInRect(x, y, uiState.continueButton);

  if (uiState.mode === "generic") {
    const { backToMap, exploreFurther, previousArea } = uiState.genericButtons;
    if (isInRect(x, y, backToMap)) {
      uiState.hoveredGenericButton = "back";
    } else if (isInRect(x, y, exploreFurther)) {
      uiState.hoveredGenericButton = "explore";
    } else if (isInRect(x, y, previousArea)) {
      uiState.hoveredGenericButton = "previous";
    } else {
      uiState.hoveredGenericButton = undefined;
    }
  }

  const hoveredLocationButton = getLocationButtonAt(uiState, x, y);
  uiState.hoveredLocationId = hoveredLocationButton?.locationId;

  const hoveredCharacterButton = getCharacterButtonAt(uiState, x, y);
  uiState.hoveredCharacterId = hoveredCharacterButton?.characterId;
}

export function onEncounterMouseReleased(uiState: EncounterUiState, x: number, y: number, button: number): boolean {
  if (button !== 1) {
    return false;
  }

  refreshLayoutIfNeeded(uiState);

  if (uiState.mode === "town") {
    const locationButton = getLocationButtonAt(uiState, x, y);
    if (locationButton) {
      uiState.selectedLocationId = locationButton.locationId;
      const selectedLocation = getSelectedLocation(uiState);
      uiState.characterButtons = createCharacterButtons(uiState.width, selectedLocation);
      uiState.selectedCharacterId = selectedLocation?.characters[0]?.id;
      refreshDialogForSelection(uiState);
      return false;
    }

    const characterButton = getCharacterButtonAt(uiState, x, y);
    if (characterButton) {
      uiState.selectedCharacterId = characterButton.characterId;
      refreshDialogForSelection(uiState);
      return false;
    }

    if (isInRect(x, y, uiState.dialogButtons.standard)) {
      const character = getSelectedCharacter(uiState);
      if (character?.npcId !== undefined) {
        const lines = getStandardDialogForNpc(character.npcId);
        uiState.dialogMode = "standard";
        uiState.dialogText = lines[0] ?? character.description;
      } else if (character !== undefined) {
        uiState.dialogMode = "standard";
        uiState.dialogText = character.description;
      }
      uiState.questResponseText = undefined;
      return false;
    }

    if (isInRect(x, y, uiState.dialogButtons.quest)) {
      if (!uiState.canQuestTalk) {
        return false;
      }

      const character = getSelectedCharacter(uiState);
      if (character?.npcId !== undefined) {
        uiState.selectedQuestPrompt = uiState.availableQuestPrompts[0];
      }

      if (uiState.selectedQuestPrompt !== undefined) {
        uiState.dialogMode = "quest";
        uiState.dialogText = uiState.selectedQuestPrompt.prompt;
      } else {
        uiState.dialogMode = "quest";
        uiState.dialogText = "No quest dialog is currently available for this character.";
      }
      uiState.questResponseText = undefined;
      return false;
    }

    if (uiState.dialogMode === "quest" && isInRect(x, y, uiState.dialogButtons.yes)) {
      if (uiState.selectedQuestPrompt !== undefined) {
        if (uiState.selectedQuestPrompt.kind === "turn-in") {
          const questName = uiState.selectedQuestPrompt.questName;
          turnInQuest(uiState.selectedQuestPrompt.questId);
          refreshDialogForSelection(uiState);
          uiState.questResponseText = `Turned in: ${questName}`;
        } else {
          const questName = uiState.selectedQuestPrompt.questName;
          acceptQuest(uiState.selectedQuestPrompt.questId);
          refreshDialogForSelection(uiState);
          uiState.questResponseText = `Accepted: ${questName}`;
        }
      } else {
        uiState.questResponseText = "No quest selected.";
      }
      return false;
    }

    if (uiState.dialogMode === "quest" && isInRect(x, y, uiState.dialogButtons.no)) {
      if (uiState.selectedQuestPrompt !== undefined) {
        uiState.questResponseText = `Declined: ${uiState.selectedQuestPrompt.questName}`;
      } else {
        uiState.questResponseText = "No quest selected.";
      }
      return false;
    }
  }

  if (uiState.mode === "generic") {
    const flow = uiState.explorationFlow;
    const maxLevels = flow !== null ? flow.levels.length : 0;
    const { backToMap, exploreFurther, previousArea } = uiState.genericButtons;

    if (isInRect(x, y, previousArea) && uiState.viewLevel > 0) {
      uiState.viewLevel -= 1;
      return false;
    }

    if (isInRect(x, y, exploreFurther) && uiState.viewLevel < maxLevels - 1) {
      uiState.viewLevel += 1;
      return false;
    }

    if (isInRect(x, y, backToMap)) {
      return true;
    }

    return false;
  }

  return isInRect(x, y, uiState.continueButton);
}

export function drawEncounterUi(uiState: EncounterUiState, visitCount: number): void {
  refreshLayoutIfNeeded(uiState);

  love.graphics.setColor(0.1, 0.09, 0.12, 1);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.21, 0.18, 0.28, 0.58);
  love.graphics.circle("fill", uiState.width * 0.5, uiState.height * 0.36, 180);

  if (uiState.mode === "town") {
    love.graphics.setColor(0.95, 0.92, 1, 1);
    love.graphics.printf(`Town: ${uiState.tileName}`, 0, 52, uiState.width, "center", 0, 1.2, 1.2);

    love.graphics.setColor(0.82, 0.78, 0.91, 0.95);
    love.graphics.printf(
      "Select a location to view available characters.",
      0,
      96,
      uiState.width,
      "center",
      0,
      0.8,
      0.8,
    );

    for (const button of uiState.locationButtons) {
      const isSelected = uiState.selectedLocationId === button.locationId;
      const isHovered = uiState.hoveredLocationId === button.locationId;
      const location = uiState.locations.find((entry) => entry.id === button.locationId);
      const label = location ? location.name : button.locationId;

      if (isSelected) {
        love.graphics.setColor(0.38, 0.3, 0.5, 0.98);
      } else if (isHovered) {
        love.graphics.setColor(0.33, 0.25, 0.45, 0.96);
      } else {
        love.graphics.setColor(0.26, 0.2, 0.37, 0.93);
      }
      love.graphics.rectangle("fill", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 8, 8);
      love.graphics.setColor(0.86, 0.8, 0.97, 0.9);
      love.graphics.rectangle("line", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 8, 8);

      love.graphics.setColor(1, 1, 1, 1);
      love.graphics.printf(label, button.rect.x + 12, button.rect.y + 13, button.rect.width - 24, "left", 0, 0.7, 0.7);
    }

    const detailsX = Math.floor(uiState.width * 0.56);
    const detailsY = 186;
    const detailsWidth = Math.floor(uiState.width * 0.36);
    const detailsHeight = Math.floor(uiState.height * 0.46);
    const selectedLocation = getSelectedLocation(uiState);

    love.graphics.setColor(0.16, 0.14, 0.24, 0.9);
    love.graphics.rectangle("fill", detailsX, detailsY, detailsWidth, detailsHeight, 8, 8);
    love.graphics.setColor(0.76, 0.71, 0.9, 0.72);
    love.graphics.rectangle("line", detailsX, detailsY, detailsWidth, detailsHeight, 8, 8);

    if (selectedLocation !== undefined) {
      love.graphics.setColor(0.95, 0.92, 1, 1);
      love.graphics.printf(selectedLocation.name, detailsX + 12, detailsY + 12, detailsWidth - 24, "left", 0, 0.8, 0.8);

      love.graphics.setColor(0.82, 0.78, 0.91, 0.92);
      love.graphics.printf(
        selectedLocation.description,
        detailsX + 12,
        detailsY + 36,
        detailsWidth - 24,
        "left",
        0,
        0.62,
        0.62,
      );

      love.graphics.setColor(0.88, 0.84, 0.95, 0.96);
      love.graphics.printf("Characters", detailsX + 12, detailsY + 94, detailsWidth - 24, "left", 0, 0.65, 0.65);

      for (const button of uiState.characterButtons) {
        const character = selectedLocation.characters.find((entry) => entry.id === button.characterId);
        const isSelectedCharacter = uiState.selectedCharacterId === button.characterId;
        const isHoveredCharacter = uiState.hoveredCharacterId === button.characterId;
        const label = character ? `${character.name} - ${character.role}` : button.characterId;

        if (isSelectedCharacter) {
          love.graphics.setColor(0.31, 0.26, 0.42, 0.98);
        } else if (isHoveredCharacter) {
          love.graphics.setColor(0.27, 0.22, 0.37, 0.97);
        } else {
          love.graphics.setColor(0.22, 0.18, 0.3, 0.95);
        }
        love.graphics.rectangle("fill", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 6, 6);
        love.graphics.setColor(0.74, 0.69, 0.86, 0.82);
        love.graphics.rectangle("line", button.rect.x, button.rect.y, button.rect.width, button.rect.height, 6, 6);

        love.graphics.setColor(0.93, 0.9, 0.99, 0.98);
        love.graphics.printf(label, button.rect.x + 8, button.rect.y + 11, button.rect.width - 16, "left", 0, 0.56, 0.56);
      }

      const selectedCharacterName = getSelectedCharacterName(uiState);
      if (selectedCharacterName !== undefined) {
        love.graphics.setColor(0.79, 0.75, 0.91, 0.94);
        love.graphics.printf(
          `Interact: ${selectedCharacterName}`,
          detailsX + 12,
          detailsY + detailsHeight - 30,
          detailsWidth - 24,
          "left",
          0,
          0.57,
          0.57,
        );
      }

      love.graphics.setColor(0.9, 0.94, 1, 0.95);
      love.graphics.printf("Dialog", detailsX + 12, 394, detailsWidth - 24, "left", 0, 0.64, 0.64);

      love.graphics.setColor(0.2, 0.19, 0.29, 0.95);
      love.graphics.rectangle("fill", detailsX + 12, 414, detailsWidth - 24, 92, 6, 6);
      love.graphics.setColor(0.74, 0.69, 0.86, 0.72);
      love.graphics.rectangle("line", detailsX + 12, 414, detailsWidth - 24, 92, 6, 6);
      love.graphics.setColor(0.92, 0.9, 0.99, 0.96);
      love.graphics.printf(uiState.dialogText, detailsX + 20, 422, detailsWidth - 40, "left", 0, 0.55, 0.55);

      love.graphics.setColor(0.31, 0.24, 0.43, 0.96);
      love.graphics.rectangle(
        "fill",
        uiState.dialogButtons.standard.x,
        uiState.dialogButtons.standard.y,
        uiState.dialogButtons.standard.width,
        uiState.dialogButtons.standard.height,
        6,
        6,
      );
      love.graphics.setColor(0.79, 0.73, 0.91, 0.85);
      love.graphics.rectangle(
        "line",
        uiState.dialogButtons.standard.x,
        uiState.dialogButtons.standard.y,
        uiState.dialogButtons.standard.width,
        uiState.dialogButtons.standard.height,
        6,
        6,
      );
      love.graphics.setColor(1, 1, 1, 0.98);
      love.graphics.printf(
        "Standard Talk",
        uiState.dialogButtons.standard.x,
        uiState.dialogButtons.standard.y + 10,
        uiState.dialogButtons.standard.width,
        "center",
        0,
        0.56,
        0.56,
      );

      if (uiState.canQuestTalk) {
        love.graphics.setColor(0.31, 0.24, 0.43, 0.96);
        love.graphics.rectangle(
          "fill",
          uiState.dialogButtons.quest.x,
          uiState.dialogButtons.quest.y,
          uiState.dialogButtons.quest.width,
          uiState.dialogButtons.quest.height,
          6,
          6,
        );
        love.graphics.setColor(0.79, 0.73, 0.91, 0.85);
        love.graphics.rectangle(
          "line",
          uiState.dialogButtons.quest.x,
          uiState.dialogButtons.quest.y,
          uiState.dialogButtons.quest.width,
          uiState.dialogButtons.quest.height,
          6,
          6,
        );
        love.graphics.setColor(1, 1, 1, 0.98);
        love.graphics.printf(
          "Quest Talk",
          uiState.dialogButtons.quest.x,
          uiState.dialogButtons.quest.y + 10,
          uiState.dialogButtons.quest.width,
          "center",
          0,
          0.56,
          0.56,
        );
      }

      if (uiState.canQuestTalk && uiState.dialogMode === "quest") {
        love.graphics.setColor(0.35, 0.27, 0.47, 0.96);
        love.graphics.rectangle(
          "fill",
          uiState.dialogButtons.yes.x,
          uiState.dialogButtons.yes.y,
          uiState.dialogButtons.yes.width,
          uiState.dialogButtons.yes.height,
          6,
          6,
        );
        love.graphics.setColor(0.83, 0.78, 0.93, 0.86);
        love.graphics.rectangle(
          "line",
          uiState.dialogButtons.yes.x,
          uiState.dialogButtons.yes.y,
          uiState.dialogButtons.yes.width,
          uiState.dialogButtons.yes.height,
          6,
          6,
        );
        love.graphics.setColor(1, 1, 1, 1);
        love.graphics.printf(
          "Yes",
          uiState.dialogButtons.yes.x,
          uiState.dialogButtons.yes.y + 8,
          uiState.dialogButtons.yes.width,
          "center",
          0,
          0.55,
          0.55,
        );

        love.graphics.setColor(0.35, 0.27, 0.47, 0.96);
        love.graphics.rectangle(
          "fill",
          uiState.dialogButtons.no.x,
          uiState.dialogButtons.no.y,
          uiState.dialogButtons.no.width,
          uiState.dialogButtons.no.height,
          6,
          6,
        );
        love.graphics.setColor(0.83, 0.78, 0.93, 0.86);
        love.graphics.rectangle(
          "line",
          uiState.dialogButtons.no.x,
          uiState.dialogButtons.no.y,
          uiState.dialogButtons.no.width,
          uiState.dialogButtons.no.height,
          6,
          6,
        );
        love.graphics.setColor(1, 1, 1, 1);
        love.graphics.printf(
          "No",
          uiState.dialogButtons.no.x,
          uiState.dialogButtons.no.y + 8,
          uiState.dialogButtons.no.width,
          "center",
          0,
          0.55,
          0.55,
        );
      }

      if (uiState.questResponseText !== undefined) {
        love.graphics.setColor(0.8, 0.9, 0.83, 0.92);
        love.graphics.printf(
          uiState.questResponseText,
          detailsX + 12,
          548,
          detailsWidth - 24,
          "left",
          0,
          0.52,
          0.52,
        );
      }
    }
  } else {
    const flow = uiState.explorationFlow;
    const maxLevels = flow !== null ? flow.levels.length : 0;
    const currentLevel = flow !== null ? flow.levels[uiState.viewLevel] : undefined;
    const isFullyExplored = flow !== null && uiState.flowLevel >= maxLevels;
    const contentW = Math.floor(uiState.width * 0.62);
    const contentX = Math.floor((uiState.width - contentW) * 0.5);

    // Tile name — small, top-left of content area
    love.graphics.setColor(0.58, 0.56, 0.7, 0.72);
    love.graphics.printf(uiState.tileName, contentX, 38, contentW, "left", 0, 0.64, 0.64);

    if (flow !== null && currentLevel !== undefined) {
      // Flow name — large title
      love.graphics.setColor(0.96, 0.93, 1, 1);
      love.graphics.printf(flow.name, contentX, 56, contentW, "left", 0, 1.12, 1.12);

      // Level badge + fully explored indicator
      const badge = isFullyExplored
        ? `${currentLevel.label}  ·  Fully Explored`
        : currentLevel.label;
      love.graphics.setColor(isFullyExplored ? 0.68 : 0.62, isFullyExplored ? 0.9 : 0.8, isFullyExplored ? 0.62 : 1, 0.88);
      love.graphics.printf(badge, contentX, 108, contentW, "left", 0, 0.74, 0.74);

      // Divider line
      love.graphics.setColor(0.4, 0.36, 0.52, 0.5);
      love.graphics.line(contentX, 136, contentX + contentW, 136);

      // Hook — accent subtitle
      love.graphics.setColor(0.94, 0.91, 0.98, 0.94);
      love.graphics.printf(currentLevel.hook, contentX, 150, contentW, "left", 0, 0.86, 0.86);

      // Description — body
      love.graphics.setColor(0.72, 0.69, 0.84, 0.78);
      love.graphics.printf(currentLevel.description, contentX, 196, contentW, "left", 0, 0.74, 0.74);
    } else {
      // No flow — just show tile info
      love.graphics.setColor(0.96, 0.93, 1, 1);
      love.graphics.printf(uiState.tileName, 0, 72, uiState.width, "center", 0, 1.12, 1.12);

      love.graphics.setColor(0.72, 0.69, 0.84, 0.78);
      love.graphics.printf(
        uiState.tileDescription,
        contentX,
        160,
        contentW,
        "center",
        0,
        0.76,
        0.76,
      );
    }

    // Generic buttons
    const { backToMap, exploreFurther, previousArea } = uiState.genericButtons;

    const showPrevious = uiState.viewLevel > 0;
    const showExplore = flow !== null && uiState.viewLevel < maxLevels - 1;

    // Previous Area button
    if (showPrevious) {
      const hovered = uiState.hoveredGenericButton === "previous";
      love.graphics.setColor(hovered ? 0.3 : 0.22, hovered ? 0.24 : 0.18, hovered ? 0.42 : 0.32, 0.94);
      love.graphics.rectangle("fill", previousArea.x, previousArea.y, previousArea.width, previousArea.height, 8, 8);
      love.graphics.setColor(0.62, 0.56, 0.78, 0.7);
      love.graphics.rectangle("line", previousArea.x, previousArea.y, previousArea.width, previousArea.height, 8, 8);
      love.graphics.setColor(0.82, 0.8, 0.94, 1);
      love.graphics.printf("← Previous Area", previousArea.x, previousArea.y + 15, previousArea.width, "center", 0, 0.72, 0.72);
    }

    // Back to Map button
    const hoveredBack = uiState.hoveredGenericButton === "back";
    love.graphics.setColor(hoveredBack ? 0.28 : 0.2, hoveredBack ? 0.22 : 0.16, hoveredBack ? 0.38 : 0.28, 0.96);
    love.graphics.rectangle("fill", backToMap.x, backToMap.y, backToMap.width, backToMap.height, 8, 8);
    love.graphics.setColor(0.72, 0.68, 0.88, 0.82);
    love.graphics.rectangle("line", backToMap.x, backToMap.y, backToMap.width, backToMap.height, 8, 8);
    love.graphics.setColor(0.9, 0.88, 0.98, 1);
    love.graphics.printf("Back to Map", backToMap.x, backToMap.y + 15, backToMap.width, "center", 0, 0.72, 0.72);

    // Explore Further button
    if (showExplore) {
      const hovered = uiState.hoveredGenericButton === "explore";
      love.graphics.setColor(hovered ? 0.22 : 0.16, hovered ? 0.34 : 0.26, hovered ? 0.52 : 0.42, 0.96);
      love.graphics.rectangle("fill", exploreFurther.x, exploreFurther.y, exploreFurther.width, exploreFurther.height, 8, 8);
      love.graphics.setColor(0.52, 0.72, 0.98, 0.82);
      love.graphics.rectangle("line", exploreFurther.x, exploreFurther.y, exploreFurther.width, exploreFurther.height, 8, 8);
      love.graphics.setColor(0.86, 0.94, 1, 1);
      love.graphics.printf("Explore Further →", exploreFurther.x, exploreFurther.y + 15, exploreFurther.width, "center", 0, 0.72, 0.72);
    }
  }

  if (uiState.mode === "town") {
    if (uiState.hoveredContinue) {
      love.graphics.setColor(0.36, 0.27, 0.49, 0.98);
    } else {
      love.graphics.setColor(0.26, 0.2, 0.37, 0.96);
    }
    love.graphics.rectangle(
      "fill",
      uiState.continueButton.x,
      uiState.continueButton.y,
      uiState.continueButton.width,
      uiState.continueButton.height,
      8,
      8,
    );
    love.graphics.setColor(0.86, 0.8, 0.97, 0.95);
    love.graphics.rectangle(
      "line",
      uiState.continueButton.x,
      uiState.continueButton.y,
      uiState.continueButton.width,
      uiState.continueButton.height,
      8,
      8,
    );
    love.graphics.setColor(1, 1, 1, 1);
    love.graphics.printf(
      "Leave Town",
      uiState.continueButton.x,
      uiState.continueButton.y + 18,
      uiState.continueButton.width,
      "center",
      0,
      0.78,
      0.78,
    );
  }

  love.graphics.setColor(0.46, 0.44, 0.58, 0.6);
  love.graphics.printf(
    uiState.mode === "town"
      ? `Town visits: ${visitCount}  |  Space = Leave`
      : `Explore visits: ${visitCount}  |  Space = Back to Map`,
    0,
    uiState.height - 38,
    uiState.width,
    "center",
    0,
    0.64,
    0.64,
  );
}
