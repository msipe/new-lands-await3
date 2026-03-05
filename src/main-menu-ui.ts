type ButtonAction = "start-run" | "quit";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MenuButton = {
  id: string;
  label: string;
  description: string;
  action: ButtonAction;
  rect: Rect;
};

export type MainMenuUiState = {
  buttons: MenuButton[];
  hoveredButtonId?: string;
  pressedButtonId?: string;
  time: number;
  width: number;
  height: number;
};

function isPointInsideRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function createButtons(width: number, height: number): MenuButton[] {
  const buttonWidth = Math.max(260, Math.min(430, Math.floor(width * 0.36)));
  const buttonHeight = 68;
  const gap = 16;
  const startY = Math.floor(height * 0.52);
  const x = Math.floor((width - buttonWidth) * 0.5);

  return [
    {
      id: "start-run",
      label: "Start Run",
      description: "Enter the wilds and begin a new expedition.",
      action: "start-run",
      rect: { x, y: startY, width: buttonWidth, height: buttonHeight },
    },
    {
      id: "quit",
      label: "Quit",
      description: "Leave for now and return when the dice call again.",
      action: "quit",
      rect: { x, y: startY + buttonHeight + gap, width: buttonWidth, height: buttonHeight },
    },
  ];
}

function refreshLayoutIfNeeded(uiState: MainMenuUiState): void {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();
  if (uiState.width === width && uiState.height === height) {
    return;
  }

  uiState.width = width;
  uiState.height = height;
  uiState.buttons = createButtons(width, height);
}

function getButtonAt(uiState: MainMenuUiState, x: number, y: number): MenuButton | undefined {
  for (const button of uiState.buttons) {
    if (isPointInsideRect(x, y, button.rect)) {
      return button;
    }
  }

  return undefined;
}

export function createMainMenuUiState(): MainMenuUiState {
  const width = love.graphics.getWidth();
  const height = love.graphics.getHeight();

  return {
    buttons: createButtons(width, height),
    hoveredButtonId: undefined,
    pressedButtonId: undefined,
    time: 0,
    width,
    height,
  };
}

export function updateMainMenuUiState(uiState: MainMenuUiState, dt: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.time += dt;
}

export function onMainMenuMouseMoved(uiState: MainMenuUiState, x: number, y: number): void {
  refreshLayoutIfNeeded(uiState);
  uiState.hoveredButtonId = getButtonAt(uiState, x, y)?.id;
}

export function onMainMenuMousePressed(uiState: MainMenuUiState, x: number, y: number, button: number): void {
  if (button !== 1) {
    return;
  }

  refreshLayoutIfNeeded(uiState);
  uiState.pressedButtonId = getButtonAt(uiState, x, y)?.id;
}

export function onMainMenuMouseReleased(
  uiState: MainMenuUiState,
  x: number,
  y: number,
  button: number,
): ButtonAction | undefined {
  if (button !== 1) {
    return undefined;
  }

  refreshLayoutIfNeeded(uiState);
  const releasedOn = getButtonAt(uiState, x, y);
  const isClick = releasedOn && releasedOn.id === uiState.pressedButtonId;
  uiState.pressedButtonId = undefined;

  if (!isClick || !releasedOn) {
    return undefined;
  }

  return releasedOn.action;
}

function drawButton(uiState: MainMenuUiState, button: MenuButton): void {
  const isHovered = uiState.hoveredButtonId === button.id;
  const isPressed = uiState.pressedButtonId === button.id;
  const hoverLift = isHovered ? -2 : 0;

  const x = button.rect.x;
  const y = button.rect.y + hoverLift;
  const width = button.rect.width;
  const height = button.rect.height;

  if (isPressed) {
    love.graphics.setColor(0.18, 0.25, 0.37, 0.96);
  } else if (isHovered) {
    love.graphics.setColor(0.24, 0.34, 0.5, 0.97);
  } else {
    love.graphics.setColor(0.16, 0.22, 0.33, 0.95);
  }
  love.graphics.rectangle("fill", x, y, width, height, 8, 8);

  if (isHovered) {
    love.graphics.setColor(0.85, 0.94, 1, 1);
  } else {
    love.graphics.setColor(0.7, 0.81, 0.96, 0.9);
  }
  love.graphics.rectangle("line", x, y, width, height, 8, 8);

  love.graphics.setColor(1, 1, 1, 0.98);
  love.graphics.printf(button.label, x, y + 17, width, "center", 0, 1.02, 1.02);

  love.graphics.setColor(0.76, 0.85, 0.96, 0.95);
  love.graphics.printf(button.description, x, y + 43, width, "center", 0, 0.66, 0.66);
}

export function drawMainMenuUi(uiState: MainMenuUiState, runCount: number): void {
  refreshLayoutIfNeeded(uiState);
  const width = uiState.width;
  const height = uiState.height;

  love.graphics.setColor(0.05, 0.08, 0.13, 1);
  love.graphics.rectangle("fill", 0, 0, width, height);

  const drift = Math.sin(uiState.time * 0.8) * 18;
  love.graphics.setColor(0.12, 0.2, 0.32, 0.45);
  love.graphics.circle("fill", width * 0.18 + drift, height * 0.2, 170);
  love.graphics.setColor(0.16, 0.28, 0.44, 0.38);
  love.graphics.circle("fill", width * 0.82 - drift, height * 0.24, 190);
  love.graphics.setColor(0.2, 0.14, 0.32, 0.26);
  love.graphics.circle("fill", width * 0.5, height * 0.78, 250);

  love.graphics.setColor(0.86, 0.93, 1, 0.16);
  love.graphics.rectangle("fill", 42, 38, width - 84, 120, 14, 14);
  love.graphics.setColor(0.72, 0.82, 0.95, 0.48);
  love.graphics.rectangle("line", 42, 38, width - 84, 120, 14, 14);

  love.graphics.setColor(1, 1, 1, 0.98);
  love.graphics.printf("NEW LANDS AWAIT", 58, 58, width - 116, "left", 0, 1.45, 1.45);

  love.graphics.setColor(0.8, 0.88, 0.98, 0.95);
  love.graphics.printf(
    "Forge enchanted dice, discover broken synergies, and push your run deeper.",
    60,
    112,
    width - 120,
    "left",
    0,
    0.78,
    0.78,
  );

  for (const button of uiState.buttons) {
    drawButton(uiState, button);
  }

  love.graphics.setColor(0.74, 0.83, 0.95, 0.9);
  love.graphics.printf(
    `Runs started: ${runCount}  |  Keyboard: Space = Start`,
    0,
    height - 34,
    width,
    "center",
    0,
    0.72,
    0.72,
  );
}
