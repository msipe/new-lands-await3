type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CharacterClassId = "class:warrior";
type CharacterRaceId = "race:human";

type SetupOption<TOptionId extends string> = {
  id: TOptionId;
  label: string;
  description: string;
  rect: Rect;
};

type SetupButton = {
  id: "continue";
  label: string;
  description: string;
  rect: Rect;
};

export type CharacterSetupUiAction =
  | {
      kind: "confirm-character";
      classId: CharacterClassId;
      raceId: CharacterRaceId;
    }
  | undefined;

export type CharacterSetupUiState = {
  selectedClassId: CharacterClassId;
  selectedRaceId: CharacterRaceId;
  classOptions: SetupOption<CharacterClassId>[];
  raceOptions: SetupOption<CharacterRaceId>[];
  continueButton: SetupButton;
  hoveredButtonId?: string;
  pressedButtonId?: string;
  hoveredOptionKey?: string;
  pressedOptionKey?: string;
  width: number;
  height: number;
  time: number;
};

function isPointInsideRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function createContinueButton(width: number, height: number): SetupButton {
  const buttonWidth = Math.max(250, Math.min(360, Math.floor(width * 0.32)));
  const buttonHeight = 64;
  const x = Math.floor((width - buttonWidth) * 0.5);
  const y = Math.floor(height * 0.78);

  return {
    id: "continue",
    label: "Begin Expedition",
    description: "Confirm class and race",
    rect: {
      x,
      y,
      width: buttonWidth,
      height: buttonHeight,
    },
  };
}

function getCardRect(width: number, height: number, side: "class" | "race"): Rect {
  const cardWidth = Math.max(260, Math.min(380, Math.floor(width * 0.28)));
  const cardHeight = Math.max(180, Math.min(230, Math.floor(height * 0.34)));
  const gap = 28;
  const totalWidth = cardWidth * 2 + gap;
  const left = Math.floor((width - totalWidth) * 0.5);
  const y = Math.floor(height * 0.33);

  return {
    x: side === "class" ? left : left + cardWidth + gap,
    y,
    width: cardWidth,
    height: cardHeight,
  };
}

function createOptionRect(cardRect: Rect): Rect {
  return {
    x: cardRect.x + 16,
    y: cardRect.y + 54,
    width: cardRect.width - 32,
    height: cardRect.height - 70,
  };
}

function createClassOptions(width: number, height: number): SetupOption<CharacterClassId>[] {
  return [
    {
      id: "class:warrior",
      label: "Warrior",
      description: "Frontline bruiser with reliable durability and direct offense.",
      rect: createOptionRect(getCardRect(width, height, "class")),
    },
  ];
}

function createRaceOptions(width: number, height: number): SetupOption<CharacterRaceId>[] {
  return [
    {
      id: "race:human",
      label: "Human",
      description: "Adaptable adventurer with balanced growth and broad potential.",
      rect: createOptionRect(getCardRect(width, height, "race")),
    },
  ];
}

function getOptionKey(group: "class" | "race", optionId: string): string {
  return `${group}:${optionId}`;
}

function getClassOptionAt(
  uiState: CharacterSetupUiState,
  x: number,
  y: number,
): SetupOption<CharacterClassId> | undefined {
  for (const option of uiState.classOptions) {
    if (isPointInsideRect(x, y, option.rect)) {
      return option;
    }
  }

  return undefined;
}

function getRaceOptionAt(
  uiState: CharacterSetupUiState,
  x: number,
  y: number,
): SetupOption<CharacterRaceId> | undefined {
  for (const option of uiState.raceOptions) {
    if (isPointInsideRect(x, y, option.rect)) {
      return option;
    }
  }

  return undefined;
}

function refreshLayoutIfNeeded(uiState: CharacterSetupUiState): void {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  if (uiState.width === width && uiState.height === height) {
    return;
  }

  uiState.width = width;
  uiState.height = height;
  uiState.continueButton = createContinueButton(width, height);
  uiState.classOptions = createClassOptions(width, height);
  uiState.raceOptions = createRaceOptions(width, height);
}

function getButtonAt(uiState: CharacterSetupUiState, x: number, y: number): SetupButton | undefined {
  if (isPointInsideRect(x, y, uiState.continueButton.rect)) {
    return uiState.continueButton;
  }

  return undefined;
}

export function createCharacterSetupUiState(): CharacterSetupUiState {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();

  return {
    selectedClassId: "class:warrior",
    selectedRaceId: "race:human",
    classOptions: createClassOptions(width, height),
    raceOptions: createRaceOptions(width, height),
    continueButton: createContinueButton(width, height),
    hoveredButtonId: undefined,
    pressedButtonId: undefined,
    hoveredOptionKey: undefined,
    pressedOptionKey: undefined,
    width,
    height,
    time: 0,
  };
}

export function updateCharacterSetupUiState(uiState: CharacterSetupUiState, dt: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.time += dt;
}

export function onCharacterSetupKeyPressed(
  uiState: CharacterSetupUiState,
  key: string,
): CharacterSetupUiAction {
  if (key === "space" || key === "return" || key === "kpenter") {
    return {
      kind: "confirm-character",
      classId: uiState.selectedClassId,
      raceId: uiState.selectedRaceId,
    };
  }

  return undefined;
}

export function onCharacterSetupMouseMoved(
  uiState: CharacterSetupUiState,
  x: number,
  y: number,
): void {
  refreshLayoutIfNeeded(uiState);
  uiState.hoveredButtonId = getButtonAt(uiState, x, y)?.id;

  const hoveredClassOption = getClassOptionAt(uiState, x, y);
  if (hoveredClassOption) {
    uiState.hoveredOptionKey = getOptionKey("class", hoveredClassOption.id);
    return;
  }

  const hoveredRaceOption = getRaceOptionAt(uiState, x, y);
  if (hoveredRaceOption) {
    uiState.hoveredOptionKey = getOptionKey("race", hoveredRaceOption.id);
    return;
  }

  uiState.hoveredOptionKey = undefined;
}

export function onCharacterSetupMousePressed(
  uiState: CharacterSetupUiState,
  x: number,
  y: number,
  button: number,
): void {
  if (button !== 1) {
    return;
  }

  refreshLayoutIfNeeded(uiState);
  uiState.pressedButtonId = getButtonAt(uiState, x, y)?.id;

  const classOption = getClassOptionAt(uiState, x, y);
  if (classOption) {
    uiState.pressedOptionKey = getOptionKey("class", classOption.id);
    return;
  }

  const raceOption = getRaceOptionAt(uiState, x, y);
  if (raceOption) {
    uiState.pressedOptionKey = getOptionKey("race", raceOption.id);
    return;
  }

  uiState.pressedOptionKey = undefined;
}

export function onCharacterSetupMouseReleased(
  uiState: CharacterSetupUiState,
  x: number,
  y: number,
  button: number,
): CharacterSetupUiAction {
  if (button !== 1) {
    return undefined;
  }

  refreshLayoutIfNeeded(uiState);

  const releasedClassOption = getClassOptionAt(uiState, x, y);
  if (
    releasedClassOption &&
    uiState.pressedOptionKey === getOptionKey("class", releasedClassOption.id)
  ) {
    uiState.selectedClassId = releasedClassOption.id;
    uiState.pressedOptionKey = undefined;
    return undefined;
  }

  const releasedRaceOption = getRaceOptionAt(uiState, x, y);
  if (
    releasedRaceOption &&
    uiState.pressedOptionKey === getOptionKey("race", releasedRaceOption.id)
  ) {
    uiState.selectedRaceId = releasedRaceOption.id;
    uiState.pressedOptionKey = undefined;
    return undefined;
  }

  uiState.pressedOptionKey = undefined;

  const releasedOn = getButtonAt(uiState, x, y);
  const isClick = releasedOn && releasedOn.id === uiState.pressedButtonId;
  uiState.pressedButtonId = undefined;

  if (!isClick) {
    return undefined;
  }

  return {
    kind: "confirm-character",
    classId: uiState.selectedClassId,
    raceId: uiState.selectedRaceId,
  };
}

function drawRadioOption(
  uiState: CharacterSetupUiState,
  group: "class" | "race",
  option: SetupOption<string>,
  isSelected: boolean,
): void {
  const optionKey = getOptionKey(group, option.id);
  const isHovered = uiState.hoveredOptionKey === optionKey;

  if (isSelected) {
    love.graphics.setColor(0.18, 0.33, 0.5, 0.98);
  } else if (isHovered) {
    love.graphics.setColor(0.2, 0.26, 0.38, 0.96);
  } else {
    love.graphics.setColor(0.17, 0.24, 0.33, 0.95);
  }
  love.graphics.rectangle("fill", option.rect.x, option.rect.y, option.rect.width, option.rect.height, 8, 8);
  love.graphics.setColor(0.73, 0.84, 0.98, isSelected ? 1 : 0.82);
  love.graphics.rectangle("line", option.rect.x, option.rect.y, option.rect.width, option.rect.height, 8, 8);

  love.graphics.setColor(0.98, 0.99, 1, 1);
  love.graphics.printf(option.label, option.rect.x + 14, option.rect.y + 10, option.rect.width - 20, "left", 0, 0.9, 0.9);

  love.graphics.setColor(0.78, 0.86, 0.98, 0.94);
  love.graphics.printf(
    option.description,
    option.rect.x + 14,
    option.rect.y + 34,
    option.rect.width - 20,
    "left",
    0,
    0.62,
    0.62,
  );
}

function drawSelectionCard(
  title: string,
  options: SetupOption<string>[],
  selectedId: string,
  rect: Rect,
  pulse: number,
  uiState: CharacterSetupUiState,
  group: "class" | "race",
): void {
  love.graphics.setColor(0.14, 0.19, 0.29, 0.95);
  love.graphics.rectangle("fill", rect.x, rect.y, rect.width, rect.height, 10, 10);
  love.graphics.setColor(0.74, 0.84, 0.98, 0.86 * pulse);
  love.graphics.rectangle("line", rect.x, rect.y, rect.width, rect.height, 10, 10);

  love.graphics.setColor(0.74, 0.84, 0.98, 0.92);
  love.graphics.printf(`${title} (choose one)`, rect.x + 18, rect.y + 18, rect.width - 36, "left", 0, 0.66, 0.66);

  for (const option of options) {
    drawRadioOption(uiState, group, option, option.id === selectedId);
  }
}

function drawContinueButton(uiState: CharacterSetupUiState): void {
  const button = uiState.continueButton;
  const isHovered = uiState.hoveredButtonId === button.id;
  const isPressed = uiState.pressedButtonId === button.id;

  if (isPressed) {
    love.graphics.setColor(0.18, 0.25, 0.37, 0.98);
  } else if (isHovered) {
    love.graphics.setColor(0.24, 0.34, 0.5, 0.98);
  } else {
    love.graphics.setColor(0.16, 0.22, 0.33, 0.96);
  }
  love.graphics.rectangle(
    "fill",
    button.rect.x,
    button.rect.y,
    button.rect.width,
    button.rect.height,
    8,
    8,
  );

  love.graphics.setColor(0.82, 0.91, 1, 0.98);
  love.graphics.rectangle(
    "line",
    button.rect.x,
    button.rect.y,
    button.rect.width,
    button.rect.height,
    8,
    8,
  );

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(button.label, button.rect.x, button.rect.y + 16, button.rect.width, "center", 0, 0.86, 0.86);

  love.graphics.setColor(0.78, 0.87, 0.98, 0.95);
  love.graphics.printf(button.description, button.rect.x, button.rect.y + 40, button.rect.width, "center", 0, 0.6, 0.6);
}

export function drawCharacterSetupUi(uiState: CharacterSetupUiState, runCount: number): void {
  refreshLayoutIfNeeded(uiState);
  const pulse = Math.sin(uiState.time * 1.2) * 0.06 + 0.94;

  love.graphics.setColor(0.06, 0.08, 0.12, 1);
  love.graphics.rectangle("fill", 0, 0, uiState.width, uiState.height);

  love.graphics.setColor(0.12, 0.19, 0.32, 0.42);
  love.graphics.circle("fill", uiState.width * 0.22, uiState.height * 0.22, 160);
  love.graphics.setColor(0.14, 0.28, 0.42, 0.34);
  love.graphics.circle("fill", uiState.width * 0.8, uiState.height * 0.24, 200);

  love.graphics.setColor(0.88, 0.94, 1, 0.98);
  love.graphics.printf("Choose Your Origin", 0, 54, uiState.width, "center", 0, 1.18, 1.18);

  love.graphics.setColor(0.75, 0.84, 0.97, 0.92);
  love.graphics.printf(
    "Start each run by locking your class and race. More options will unlock as progression expands.",
    0,
    98,
    uiState.width,
    "center",
    0,
    0.7,
    0.7,
  );

  drawSelectionCard(
    "Class",
    uiState.classOptions,
    uiState.selectedClassId,
    getCardRect(uiState.width, uiState.height, "class"),
    pulse,
    uiState,
    "class",
  );

  drawSelectionCard(
    "Race",
    uiState.raceOptions,
    uiState.selectedRaceId,
    getCardRect(uiState.width, uiState.height, "race"),
    pulse,
    uiState,
    "race",
  );

  drawContinueButton(uiState);

  love.graphics.setColor(0.75, 0.84, 0.97, 0.9);
  love.graphics.printf(
    `Run ${runCount} | Keyboard: Space/Enter to confirm`,
    0,
    uiState.height - 34,
    uiState.width,
    "center",
    0,
    0.7,
    0.7,
  );
}
