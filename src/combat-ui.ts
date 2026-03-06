import type { CombatEncounterState, CombatResolutionPopup } from "./game/combat-encounter";

type Owner = "player" | "enemy";

type Layout = {
  playerNameX: number;
  playerNameY: number;
  enemyNameX: number;
  enemyNameY: number;
  hpBarWidth: number;
  hpBarHeight: number;
  arenaX: number;
  arenaY: number;
  arenaWidth: number;
  arenaHeight: number;
  arenaLogWidth: number;
  arenaGapToLog: number;
  poolX: number;
  poolY: number;
  poolWidth: number;
  poolHeight: number;
};

type VisualDie = {
  id: string;
  owner: Owner;
  combatDieId?: string;
  label: string;
  displayLabel?: string;
  rollingLabel?: string;
  rollingFaceTimer?: number;
  faceLocked?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  state: "arena" | "dragging" | "parking" | "parked";
  slotIndex?: number;
  parkX?: number;
  parkY?: number;
  parkSize?: number;
  parkStartX?: number;
  parkStartY?: number;
  parkStartSize?: number;
  parkProgress?: number;
  parkDuration?: number;
  flashTimer?: number;
};

type DragState = {
  dieId: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastDt: number;
  skipOnRelease: boolean;
};

type QueuedPlayerThrow = {
  dieId: string;
  dropX: number;
  dropY: number;
  startX: number;
  startY: number;
};

type DiceInspectorState = {
  owner: Owner;
  combatDieId: string;
  selectedSideIndex?: number;
  hoveredSideIndex?: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FloatingResolutionPopup = {
  x: number;
  y: number;
  text: string;
  source: Owner;
  timer: number;
};

type InspectorTile = {
  sideIndex: number;
  rect: Rect;
};

type InspectorLayout = {
  panel: Rect;
  diagramRect: Rect;
  detailsRect: Rect;
  closeButtonRect: Rect;
  tiles: InspectorTile[];
  denseMode: boolean;
};

export type CombatUiState = {
  layout: Layout;
  enemyArenaDice: VisualDie[];
  enemyParkedDice: VisualDie[];
  enemyPendingDice: VisualDie[];
  playerDice: VisualDie[];
  arenaPlayerDice: VisualDie[];
  drag?: DragState;
  roundSeen: number;
  pendingRound?: number;
  playerResetDelay: number;
  playerResetTimer: number;
  enemySpawnTimer: number;
  enemySpawnInterval: number;
  enemySettleTimer: number;
  enemySettleDelay: number;
  enemyThrowResolvedForRound: number;
  rolledPlayerDieIds: string[];
  pendingPlayerDieIds: string[];
  readyPlayerDieIds: string[];
  settledPlayerDieIds: string[];
  settledEnemyDieIds: string[];
  floatingPopups: FloatingResolutionPopup[];
  queuedPlayerThrow?: QueuedPlayerThrow;
  inspector?: DiceInspectorState;
  resolvedContinueEnabled: boolean;
  requestedSceneAdvance: boolean;
};

const BACKGROUND = { r: 0.16, g: 0.16, b: 0.16 };
const WHITE = { r: 1, g: 1, b: 1 };
const GREEN = { r: 0.2, g: 0.72, b: 0.33 };
const BLACK = { r: 0, g: 0, b: 0 };
const RESOLVE_FLASH_DURATION = 0.26;
const POPUP_DURATION = 0.9;
const FACE_ROLL_MIN_INTERVAL = 0.04;
const FACE_ROLL_MAX_INTERVAL = 0.24;
const FACE_ROLL_MOTION_REFERENCE = 520;

function createLayout(): Layout {
  const width = love.graphics.getWidth();

  return {
    playerNameX: 50,
    playerNameY: 28,
    enemyNameX: width - 280,
    enemyNameY: 28,
    hpBarWidth: 140,
    hpBarHeight: 18,
    arenaX: 35,
    arenaY: 125,
    arenaWidth: width - 70,
    arenaHeight: 230,
    arenaLogWidth: 210,
    arenaGapToLog: 10,
    poolX: 40,
    poolY: 420,
    poolWidth: width - 80,
    poolHeight: 165,
  };
}

function makePoolPosition(layout: Layout, slotIndex: number): { x: number; y: number } {
  const spacing = 140;
  return {
    x: layout.poolX + 70 + slotIndex * spacing,
    y: layout.poolY + 105,
  };
}

function getEnemyRolledSideLabel(state: CombatEncounterState, dieId: string): string {
  const side = state.enemyIntent.sideByDieId[dieId];
  return side !== undefined ? side.label : "?";
}

function spawnEnemyThrowDice(uiState: CombatUiState, state: CombatEncounterState): void {
  uiState.enemyArenaDice = [];
  uiState.enemyParkedDice = [];
  uiState.enemyPendingDice = [];

  const dieIds =
    state.pendingEnemyDieIds.length > 0
      ? [...state.pendingEnemyDieIds]
      : state.enemyIntent.dieOrder.length > 0
        ? [...state.enemyIntent.dieOrder]
        : state.enemy.dice.map((die) => die.id);

  const laneWidth = uiState.layout.hpBarWidth;
  const minGap = 4;
  const maxPreviewSize = 46;
  const availablePerDie = dieIds.length > 0 ? (laneWidth - minGap * (dieIds.length - 1)) / dieIds.length : maxPreviewSize;
  const parkedSize = Math.max(18, Math.min(maxPreviewSize, availablePerDie));
  const totalWidth = parkedSize * dieIds.length + minGap * Math.max(0, dieIds.length - 1);
  const parkStartX = uiState.layout.enemyNameX + (laneWidth - totalWidth) * 0.5 + parkedSize * 0.5;
  const parkY = uiState.layout.enemyNameY + 26 + uiState.layout.hpBarHeight + 24;

  for (let index = 0; index < dieIds.length; index += 1) {
    const dieId = dieIds[index];
    const spawnX =
      uiState.layout.arenaX +
      uiState.layout.arenaWidth * 0.5 +
      (Math.random() - 0.5) * (uiState.layout.arenaWidth * 0.3);
    const spawnY = uiState.layout.arenaY + 30 + Math.random() * 18;

    uiState.enemyPendingDice.push({
      id: `enemy-preview-${state.round}-${dieId}`,
      owner: "enemy",
      combatDieId: dieId,
      label: getEnemyRolledSideLabel(state, dieId),
      displayLabel: undefined,
      rollingLabel: undefined,
      rollingFaceTimer: 0,
      faceLocked: false,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 360,
      vy: 220 + Math.random() * 180,
      angle: 0,
      spin: (Math.random() - 0.5) * 12,
      size: maxPreviewSize,
      state: "arena",
      parkX: parkStartX + index * (parkedSize + minGap),
      parkY,
      parkSize: parkedSize,
    });
  }

  uiState.enemySpawnTimer = 0;
  uiState.enemySettleTimer = 0;
  uiState.enemyThrowResolvedForRound = 0;
}

function ensurePlayerDice(uiState: CombatUiState, state: CombatEncounterState): void {
  if (uiState.playerDice.length > 0 && uiState.roundSeen === state.round) {
    return;
  }

  uiState.playerDice = state.player.dice.map((die, index) => {
    const position = makePoolPosition(uiState.layout, index);
    return {
      id: `player-pool-${die.id}`,
      owner: "player",
      combatDieId: die.id,
      label: die.name,
      displayLabel: undefined,
      rollingLabel: undefined,
      rollingFaceTimer: 0,
      faceLocked: false,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      size: 54,
      state: "parked",
      slotIndex: index,
      parkX: position.x,
      parkY: position.y,
    };
  });
}

function isInsideArena(uiState: CombatUiState, x: number, y: number): boolean {
  const l = uiState.layout;
  const playableRight = l.arenaX + l.arenaWidth - l.arenaLogWidth - l.arenaGapToLog;
  return x >= l.arenaX && x <= playableRight && y >= l.arenaY && y <= l.arenaY + l.arenaHeight;
}

function applyWallBounce(layout: Layout, die: VisualDie): void {
  // Use diagonal half-extent so rotated square corners stay inside the arena.
  const collisionHalfExtent = (die.size / 2) * Math.SQRT2;
  const playableRight = layout.arenaX + layout.arenaWidth - layout.arenaLogWidth - layout.arenaGapToLog;
  const minX = layout.arenaX + collisionHalfExtent;
  const maxX = playableRight - collisionHalfExtent;
  const minY = layout.arenaY + collisionHalfExtent;
  const maxY = layout.arenaY + layout.arenaHeight - collisionHalfExtent;

  if (die.x < minX) {
    die.x = minX;
    die.vx = Math.abs(die.vx) * 0.85;
    die.spin += die.vx * 0.005;
  } else if (die.x > maxX) {
    die.x = maxX;
    die.vx = -Math.abs(die.vx) * 0.85;
    die.spin += die.vx * 0.005;
  }

  if (die.y < minY) {
    die.y = minY;
    die.vy = Math.abs(die.vy) * 0.85;
    die.spin += die.vy * 0.005;
  } else if (die.y > maxY) {
    die.y = maxY;
    die.vy = -Math.abs(die.vy) * 0.85;
    die.spin += die.vy * 0.005;
  }
}

function resolvePairCollision(a: VisualDie, b: VisualDie): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distanceSq = dx * dx + dy * dy;
  const minDist = (a.size + b.size) * 0.5;

  if (distanceSq <= 0.0001 || distanceSq > minDist * minDist) {
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDist - distance;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) {
    return;
  }

  const impulse = -(1 + 0.88) * velAlongNormal / 2;
  const ix = impulse * nx;
  const iy = impulse * ny;

  a.vx -= ix;
  a.vy -= iy;
  b.vx += ix;
  b.vy += iy;

  const tx = -ny;
  const ty = nx;
  const tangentSpeed = rvx * tx + rvy * ty;
  a.spin -= tangentSpeed * 0.01;
  b.spin += tangentSpeed * 0.01;
}

function updateArenaDice(uiState: CombatUiState, dt: number): void {
  const dynamicDice = [...uiState.enemyArenaDice, ...uiState.arenaPlayerDice].filter(
    (die) => die.state === "arena",
  );

  for (const die of dynamicDice) {
    die.x += die.vx * dt;
    die.y += die.vy * dt;
    die.angle += die.spin * dt;

    const speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
    const speedRatio = Math.max(0, Math.min(1, speed / 460));
    const frameLinearDamping = 0.962 + speedRatio * 0.034;
    const frameSpinDamping = 0.9 + speedRatio * 0.095;
    const linearDamping = Math.pow(frameLinearDamping, dt * 60);
    const spinDamping = Math.pow(frameSpinDamping, dt * 60);

    die.vx *= linearDamping;
    die.vy *= linearDamping;
    die.spin *= spinDamping;

    // Add extra drag near rest so low-energy throws settle quickly.
    if (speed < 70) {
      const lowSpeedDamping = Math.pow(0.86, dt * 60);
      die.vx *= lowSpeedDamping;
      die.vy *= lowSpeedDamping;
      die.spin *= Math.pow(0.78, dt * 60);
    }

    applyWallBounce(uiState.layout, die);
  }

  for (let left = 0; left < dynamicDice.length; left += 1) {
    for (let right = left + 1; right < dynamicDice.length; right += 1) {
      resolvePairCollision(dynamicDice[left], dynamicDice[right]);
    }
  }
}

function getDieSideLabels(state: CombatEncounterState, die: VisualDie): string[] {
  if (!die.combatDieId) {
    return [];
  }

  const ownerDice = die.owner === "player" ? state.player.dice : state.enemy.dice;
  const match = ownerDice.find((entry) => entry.id === die.combatDieId);
  if (!match) {
    return [];
  }

  return match.sides.map((side) => side.label);
}

function lockVisualDieFace(die: VisualDie): void {
  die.faceLocked = true;
  die.rollingLabel = undefined;
  die.rollingFaceTimer = 0;
}

function updateRollingFaceLabels(uiState: CombatUiState, state: CombatEncounterState, dt: number): void {
  const activeDice = [...uiState.enemyArenaDice, ...uiState.arenaPlayerDice];

  for (const die of activeDice) {
    if (die.faceLocked || die.state !== "arena") {
      die.rollingLabel = undefined;
      die.rollingFaceTimer = 0;
      continue;
    }

    if (isDieSettled(die)) {
      continue;
    }

    const labels = getDieSideLabels(state, die);
    if (labels.length === 0) {
      continue;
    }

    const speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
    const motion = speed + Math.abs(die.spin) * 45;
    const normalizedMotion = Math.max(0, Math.min(1, motion / FACE_ROLL_MOTION_REFERENCE));
    const interval = FACE_ROLL_MAX_INTERVAL - (FACE_ROLL_MAX_INTERVAL - FACE_ROLL_MIN_INTERVAL) * normalizedMotion;

    die.rollingFaceTimer = (die.rollingFaceTimer ?? 0) - dt;
    if (die.rollingLabel !== undefined && die.rollingFaceTimer > 0) {
      continue;
    }

    const randomIndex = Math.floor(Math.random() * labels.length);
    let nextLabel = labels[randomIndex];
    if (labels.length > 1 && nextLabel === die.rollingLabel) {
      nextLabel = labels[(randomIndex + 1) % labels.length];
    }

    die.rollingLabel = nextLabel;
    die.rollingFaceTimer = interval;
  }
}

function updateEnemyParkingTransitions(uiState: CombatUiState, dt: number): void {
  for (const die of uiState.enemyParkedDice) {
    if (die.state !== "parking") {
      continue;
    }

    if (
      die.parkX === undefined ||
      die.parkY === undefined ||
      die.parkStartX === undefined ||
      die.parkStartY === undefined
    ) {
      die.state = "parked";
      continue;
    }

    const duration = Math.max(0.05, die.parkDuration ?? 0.3);
    const progress = Math.min(1, (die.parkProgress ?? 0) + dt / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const startSize = die.parkStartSize ?? die.size;
    const targetSize = die.parkSize ?? die.size;

    die.parkProgress = progress;
    die.x = die.parkStartX + (die.parkX - die.parkStartX) * eased;
    die.y = die.parkStartY + (die.parkY - die.parkStartY) * eased;
    die.size = startSize + (targetSize - startSize) * eased;

    if (progress >= 1) {
      die.state = "parked";
      die.x = die.parkX;
      die.y = die.parkY;
      die.size = targetSize;
      die.flashTimer = RESOLVE_FLASH_DURATION;
      die.parkStartX = undefined;
      die.parkStartY = undefined;
      die.parkStartSize = undefined;
      die.parkProgress = undefined;
      die.parkDuration = undefined;
    }
  }
}

function updateDieFlashes(uiState: CombatUiState, dt: number): void {
  const allDice = [...uiState.playerDice, ...uiState.enemyArenaDice, ...uiState.enemyPendingDice, ...uiState.enemyParkedDice];
  for (const die of allDice) {
    if (die.flashTimer === undefined || die.flashTimer <= 0) {
      continue;
    }

    die.flashTimer = Math.max(0, die.flashTimer - dt);
  }
}

function updateFloatingPopups(uiState: CombatUiState, dt: number): void {
  const next: FloatingResolutionPopup[] = [];
  for (const popup of uiState.floatingPopups) {
    const remaining = popup.timer - dt;
    if (remaining <= 0) {
      continue;
    }

    next.push({
      ...popup,
      timer: remaining,
      y: popup.y - 24 * dt,
    });
  }

  uiState.floatingPopups = next;
}

function enqueueLocalPlayerPopup(uiState: CombatUiState, die: VisualDie, popupText?: string): void {
  const resolvedText = popupText ?? die.rollingLabel ?? die.displayLabel ?? die.label;
  uiState.floatingPopups.push({
    x: die.x,
    y: die.y - die.size * 0.72,
    text: resolvedText,
    source: "player",
    timer: POPUP_DURATION,
  });
}

function queueSettledEnemyDieId(uiState: CombatUiState, dieId: string): void {
  if (uiState.settledEnemyDieIds.includes(dieId)) {
    return;
  }

  uiState.settledEnemyDieIds.push(dieId);
}

function settleEnemyArenaDice(uiState: CombatUiState): void {
  for (const die of uiState.enemyArenaDice) {
    if (!isDieSettled(die)) {
      continue;
    }

    die.state = "arena";
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.angle = 0;
    if (!die.faceLocked) {
      die.flashTimer = RESOLVE_FLASH_DURATION;
    }
    lockVisualDieFace(die);
  }
}

function parkEnemyDice(uiState: CombatUiState): void {
  for (const die of uiState.enemyArenaDice) {
    if (die.parkX === undefined || die.parkY === undefined) {
      continue;
    }

    die.state = "parking";
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.angle = 0;
    die.parkStartX = die.x;
    die.parkStartY = die.y;
    die.parkStartSize = die.size;
    die.parkProgress = 0;
    die.parkDuration = 0.32 + Math.random() * 0.16;
    die.flashTimer = undefined;
    lockVisualDieFace(die);
    uiState.enemyParkedDice.push(die);
    if (die.combatDieId) {
      queueSettledEnemyDieId(uiState, die.combatDieId);
    }
  }

  for (const die of uiState.enemyPendingDice) {
    if (die.parkX === undefined || die.parkY === undefined) {
      continue;
    }

    die.state = "parking";
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.angle = 0;
    die.parkStartX = die.x;
    die.parkStartY = die.y;
    die.parkStartSize = die.size;
    die.parkProgress = 0;
    die.parkDuration = 0.32 + Math.random() * 0.16;
    die.flashTimer = undefined;
    lockVisualDieFace(die);
    uiState.enemyParkedDice.push(die);
    if (die.combatDieId) {
      queueSettledEnemyDieId(uiState, die.combatDieId);
    }
  }

  uiState.enemyArenaDice = [];
  uiState.enemyPendingDice = [];
}

function parkPlayerArenaDice(uiState: CombatUiState, state: CombatEncounterState): void {
  for (const die of uiState.arenaPlayerDice) {
    die.state = "parked";
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.angle = 0;
    die.label = state.player.dice.find((entry) => entry.id === die.combatDieId)?.name ?? die.label;
    die.displayLabel = undefined;
    die.rollingLabel = undefined;
    die.rollingFaceTimer = 0;
    die.faceLocked = false;

    if (die.parkX !== undefined && die.parkY !== undefined) {
      die.x = die.parkX;
      die.y = die.parkY;
    }
  }

  uiState.arenaPlayerDice = [];
  uiState.pendingPlayerDieIds = [];
}

export function createCombatUiState(state: CombatEncounterState): CombatUiState {
  const uiState: CombatUiState = {
    layout: createLayout(),
    enemyArenaDice: [],
    enemyParkedDice: [],
    enemyPendingDice: [],
    playerDice: [],
    arenaPlayerDice: [],
    roundSeen: state.round,
    pendingRound: undefined,
    playerResetDelay: 2.35,
    playerResetTimer: 0,
    enemySpawnTimer: 0,
    enemySpawnInterval: 0.33,
    enemySettleTimer: 0,
    enemySettleDelay: 1.9,
    enemyThrowResolvedForRound: 0,
    rolledPlayerDieIds: [],
    pendingPlayerDieIds: [],
    readyPlayerDieIds: [],
    settledPlayerDieIds: [],
    settledEnemyDieIds: [],
    floatingPopups: [],
    queuedPlayerThrow: undefined,
    inspector: undefined,
    resolvedContinueEnabled: false,
    requestedSceneAdvance: false,
  };

  ensurePlayerDice(uiState, state);

  return uiState;
}

function finalizeRoundTransition(uiState: CombatUiState, state: CombatEncounterState): void {
  uiState.roundSeen = state.round;
  uiState.pendingRound = undefined;
  uiState.playerResetTimer = 0;
  uiState.drag = undefined;

  uiState.arenaPlayerDice = [];
  uiState.rolledPlayerDieIds = [];
  uiState.pendingPlayerDieIds = [];
  uiState.readyPlayerDieIds = [];
  uiState.settledPlayerDieIds = [];
  uiState.settledEnemyDieIds = [];

  for (const die of uiState.playerDice) {
    if (die.parkX !== undefined && die.parkY !== undefined) {
      die.x = die.parkX;
      die.y = die.parkY;
    }
    die.vx = 0;
    die.vy = 0;
    die.spin = 0;
    die.angle = 0;
    die.state = "parked";
    die.label = state.player.dice.find((entry) => entry.id === die.combatDieId)?.name ?? die.label;
    die.displayLabel = undefined;
    die.rollingLabel = undefined;
    die.rollingFaceTimer = 0;
    die.faceLocked = false;
  }

  ensurePlayerDice(uiState, state);
  if (state.phase !== "enemy-turn") {
    uiState.enemyArenaDice = [];
    uiState.enemyPendingDice = [];
  }
  // Keep last resolved enemy dice visible through the player turn.
}

function areDiceSettled(dice: VisualDie[]): boolean {
  for (const die of dice) {
    const speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
    if (speed > 60 || Math.abs(die.spin) > 1.3) {
      return false;
    }
  }

  return true;
}

function isDieSettled(die: VisualDie): boolean {
  const speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
  return speed <= 60 && Math.abs(die.spin) <= 1.3;
}

function enqueueSettledPlayerDice(uiState: CombatUiState): void {
  const remaining: string[] = [];

  for (const dieId of uiState.pendingPlayerDieIds) {
    const visualDie = uiState.arenaPlayerDice.find((entry) => entry.combatDieId === dieId);
    if (!visualDie) {
      continue;
    }

    if (!isDieSettled(visualDie)) {
      remaining.push(dieId);
      continue;
    }

    visualDie.vx = 0;
    visualDie.vy = 0;
    visualDie.spin = 0;
    visualDie.flashTimer = RESOLVE_FLASH_DURATION;
    const popupText = visualDie.rollingLabel ?? visualDie.label;
    visualDie.displayLabel = popupText;
    lockVisualDieFace(visualDie);
    enqueueLocalPlayerPopup(uiState, visualDie, popupText);

    if (!uiState.settledPlayerDieIds.includes(dieId)) {
      uiState.settledPlayerDieIds.push(dieId);
    }

    if (!uiState.readyPlayerDieIds.includes(dieId)) {
      uiState.readyPlayerDieIds.push(dieId);
    }
  }

  uiState.pendingPlayerDieIds = remaining;
}

function settleAllPendingPlayerDice(uiState: CombatUiState): void {
  for (const dieId of uiState.pendingPlayerDieIds) {
    const visualDie = uiState.arenaPlayerDice.find((entry) => entry.combatDieId === dieId);
    if (visualDie) {
      visualDie.vx = 0;
      visualDie.vy = 0;
      visualDie.spin = 0;
      const popupText = visualDie.rollingLabel ?? visualDie.label;
      visualDie.displayLabel = popupText;
      lockVisualDieFace(visualDie);
      enqueueLocalPlayerPopup(uiState, visualDie, popupText);
    }

    if (!uiState.settledPlayerDieIds.includes(dieId)) {
      uiState.settledPlayerDieIds.push(dieId);
    }

    if (!uiState.readyPlayerDieIds.includes(dieId)) {
      uiState.readyPlayerDieIds.push(dieId);
    }
  }

  uiState.pendingPlayerDieIds = [];
}

function commitReadyPlayerDice(uiState: CombatUiState): void {
  for (const dieId of uiState.readyPlayerDieIds) {
    if (!uiState.settledPlayerDieIds.includes(dieId)) {
      uiState.settledPlayerDieIds.push(dieId);
    }
  }

  uiState.readyPlayerDieIds = [];
}

function canAdvancePlayerTurn(uiState: CombatUiState, state: CombatEncounterState): boolean {
  if (state.phase !== "player-turn" || uiState.pendingRound !== undefined) {
    return false;
  }

  return (
    uiState.rolledPlayerDieIds.length === state.player.dice.length &&
    uiState.pendingPlayerDieIds.length === 0 &&
    uiState.readyPlayerDieIds.length > 0
  );
}

function updateEnemyPresentation(uiState: CombatUiState, state: CombatEncounterState, dt: number): void {
  if (state.phase !== "enemy-turn") {
    return;
  }

  if (uiState.arenaPlayerDice.length > 0) {
    parkPlayerArenaDice(uiState, state);
  }

  if (
    uiState.enemyThrowResolvedForRound !== state.round &&
    uiState.enemyPendingDice.length === 0 &&
    uiState.enemyArenaDice.length === 0
  ) {
    if (uiState.enemyParkedDice.length > 0) {
      uiState.enemyParkedDice = [];
    }

    spawnEnemyThrowDice(uiState, state);
  }

  if (uiState.enemyThrowResolvedForRound === state.round) {
    return;
  }

  uiState.enemySpawnTimer += dt;
  if (uiState.enemyArenaDice.length === 0 && uiState.enemyPendingDice.length > 0) {
    const immediate = uiState.enemyPendingDice.shift();
    if (immediate) {
      uiState.enemyArenaDice.push(immediate);
    }
  }

  while (uiState.enemyPendingDice.length > 0 && uiState.enemySpawnTimer >= uiState.enemySpawnInterval) {
    uiState.enemySpawnTimer -= uiState.enemySpawnInterval;
    const next = uiState.enemyPendingDice.shift();
    if (next) {
      uiState.enemyArenaDice.push(next);
    }
  }

  settleEnemyArenaDice(uiState);

  if (uiState.enemyPendingDice.length === 0) {
    if (areDiceSettled(uiState.enemyArenaDice)) {
      uiState.enemySettleTimer += dt;
      if (uiState.enemySettleTimer >= uiState.enemySettleDelay) {
        parkEnemyDice(uiState);
        uiState.enemyThrowResolvedForRound = state.round;
      }
    } else {
      uiState.enemySettleTimer = 0;
    }
  }
}

function executePlayerThrow(
  uiState: CombatUiState,
  state: CombatEncounterState,
  dragged: VisualDie,
  startX: number,
  startY: number,
  x: number,
  y: number,
): boolean {
  if (!dragged.combatDieId) {
    return false;
  }

  if (
    uiState.rolledPlayerDieIds.includes(dragged.combatDieId) ||
    !canPlayerThrow(uiState, state) ||
    !isInsideArena(uiState, x, y)
  ) {
    dragged.state = "parked";
    if (dragged.parkX !== undefined && dragged.parkY !== undefined) {
      dragged.x = dragged.parkX;
      dragged.y = dragged.parkY;
    }
    return false;
  }

  dragged.state = "arena";
  dragged.displayLabel = undefined;
  dragged.x = x;
  dragged.y = y;

  const dragDx = x - startX;
  const dragDy = y - startY;
  const dragDistance = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
  const baseScale = 3.6;
  const minHorizontal = 26 + Math.min(42, dragDistance * 0.18);
  const minVerticalLift = 90 + Math.min(120, dragDistance * 0.42);

  let launchVx = dragDx * baseScale;
  let launchVy = dragDy * baseScale;

  if (Math.abs(launchVx) < minHorizontal) {
    const horizontalDirection = dragDx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dragDx);
    launchVx = horizontalDirection * minHorizontal;
  }

  // Keep an upward impulse even for short drags, but scale by drag distance.
  if (launchVy > -minVerticalLift) {
    launchVy = -minVerticalLift;
  }

  dragged.vx = launchVx;
  dragged.vy = launchVy;
  dragged.spin = (dragged.vx - dragged.vy) * 0.01;
  dragged.angle = 0;

  if (!uiState.arenaPlayerDice.find((entry) => entry.id === dragged.id)) {
    uiState.arenaPlayerDice.push(dragged);
  }

  uiState.rolledPlayerDieIds.push(dragged.combatDieId);
  if (!uiState.pendingPlayerDieIds.includes(dragged.combatDieId)) {
    uiState.pendingPlayerDieIds.push(dragged.combatDieId);
  }

  return true;
}

export function fastForwardCombatUi(uiState: CombatUiState, state: CombatEncounterState): void {
  if (uiState.pendingRound === state.round) {
    finalizeRoundTransition(uiState, state);
    return;
  }

  if (state.phase === "player-turn") {
    if (uiState.pendingPlayerDieIds.length > 0) {
      settleAllPendingPlayerDice(uiState);
    }

    if (canAdvancePlayerTurn(uiState, state)) {
      commitReadyPlayerDice(uiState);
    }

    return;
  }

  if (uiState.pendingPlayerDieIds.length > 0) {
    settleAllPendingPlayerDice(uiState);
    return;
  }

  if (state.phase !== "enemy-turn") {
    return;
  }

  if (
    uiState.enemyPendingDice.length === 0 &&
    uiState.enemyArenaDice.length === 0
  ) {
    if (uiState.enemyParkedDice.length > 0) {
      uiState.enemyParkedDice = [];
    }

    spawnEnemyThrowDice(uiState, state);
  }

  if (uiState.enemyThrowResolvedForRound !== state.round) {
    parkEnemyDice(uiState);
    uiState.enemyThrowResolvedForRound = state.round;
  }
}

export function updateCombatUiState(uiState: CombatUiState, state: CombatEncounterState, dt: number): void {
  if (state.round !== uiState.roundSeen && uiState.pendingRound !== state.round) {
    uiState.pendingRound = state.round;
    uiState.playerResetTimer = 0;
  }

  if (uiState.pendingRound === state.round) {
    uiState.playerResetTimer += dt;

    if (
      (uiState.playerResetTimer >= uiState.playerResetDelay && areDiceSettled(uiState.arenaPlayerDice)) ||
      uiState.playerResetTimer >= uiState.playerResetDelay + 2.1
    ) {
      finalizeRoundTransition(uiState, state);
    }
  }

  updateEnemyPresentation(uiState, state, dt);

  if (uiState.queuedPlayerThrow && uiState.pendingRound === state.round) {
    fastForwardCombatUi(uiState, state);
  }

  if (
    uiState.queuedPlayerThrow &&
    state.phase === "player-turn" &&
    uiState.pendingRound === undefined
  ) {
    const queued = uiState.queuedPlayerThrow;
    const queuedDie = uiState.playerDice.find((die) => die.id === queued.dieId);
    if (queuedDie) {
      executePlayerThrow(uiState, state, queuedDie, queued.startX, queued.startY, queued.dropX, queued.dropY);
    }
    uiState.queuedPlayerThrow = undefined;
  }

  updateArenaDice(uiState, dt);
  updateEnemyParkingTransitions(uiState, dt);
  updateRollingFaceLabels(uiState, state, dt);
  updateDieFlashes(uiState, dt);
  updateFloatingPopups(uiState, dt);
  enqueueSettledPlayerDice(uiState);
}

export function drainSettledPlayerDieIds(uiState: CombatUiState): string[] {
  if (uiState.settledPlayerDieIds.length === 0) {
    return [];
  }

  const settled = [...uiState.settledPlayerDieIds];
  uiState.settledPlayerDieIds = [];
  return settled;
}

type TurnButtonState = {
  visible: boolean;
  enabled: boolean;
  label: string;
};

export function setResolvedContinueEnabled(uiState: CombatUiState, enabled: boolean): void {
  uiState.resolvedContinueEnabled = enabled;
}

export function consumeRequestedSceneAdvance(uiState: CombatUiState): boolean {
  if (!uiState.requestedSceneAdvance) {
    return false;
  }

  uiState.requestedSceneAdvance = false;
  return true;
}

function getTurnButtonRect(layout: Layout): Rect {
  const width = 148;
  const height = 36;
  return {
    x: layout.poolX + layout.poolWidth - width - 14,
    y: layout.poolY - height - 12,
    width,
    height,
  };
}

function getTurnButtonState(uiState: CombatUiState, state: CombatEncounterState): TurnButtonState {
  if (state.phase === "resolved") {
    return {
      visible: true,
      enabled: uiState.resolvedContinueEnabled,
      label: "Return to Explore",
    };
  }

  if (uiState.pendingRound !== undefined) {
    return { visible: true, enabled: true, label: "Continue" };
  }

  if (state.phase === "enemy-turn") {
    return { visible: true, enabled: true, label: "Skip Enemy" };
  }

  if (state.phase === "player-turn") {
    return {
      visible: true,
      enabled: canAdvancePlayerTurn(uiState, state),
      label: "Next Turn",
    };
  }

  return { visible: false, enabled: false, label: "" };
}

export function drainSettledEnemyDieIds(uiState: CombatUiState): string[] {
  if (uiState.settledEnemyDieIds.length === 0) {
    return [];
  }

  const settled = [...uiState.settledEnemyDieIds];
  uiState.settledEnemyDieIds = [];
  return settled;
}

function findVisualDieByCombatId(uiState: CombatUiState, dieId: string): VisualDie | undefined {
  return [
    ...uiState.playerDice,
    ...uiState.arenaPlayerDice,
    ...uiState.enemyArenaDice,
    ...uiState.enemyParkedDice,
    ...uiState.enemyPendingDice,
  ].find((die) => die.combatDieId === dieId);
}

export function enqueueCombatResolutionPopups(
  uiState: CombatUiState,
  popups: CombatResolutionPopup[],
): void {
  for (const popup of popups) {
    const die = findVisualDieByCombatId(uiState, popup.dieId);
    if (!die) {
      continue;
    }

    die.flashTimer = RESOLVE_FLASH_DURATION;
    if (popup.sideLabel !== undefined) {
      die.label = popup.sideLabel;
      die.displayLabel = popup.sideLabel;
    }
    lockVisualDieFace(die);

    if (popup.source === "player") {
      // Player popup timing is handled locally on settle; only sync authoritative label here.
      continue;
    }

    uiState.floatingPopups.push({
      x: die.x,
      y: die.y - die.size * 0.72,
      text: popup.text,
      source: popup.source,
      timer: POPUP_DURATION,
    });
  }
}

export function canPlayerThrow(uiState: CombatUiState, state: CombatEncounterState): boolean {
  return state.phase === "player-turn" && uiState.pendingRound === undefined;
}

function isPointInsideRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function isPointInsideDie(x: number, y: number, die: VisualDie): boolean {
  const half = die.size / 2;
  return x >= die.x - half && x <= die.x + half && y >= die.y - half && y <= die.y + half;
}

function findInteractiveDieAt(uiState: CombatUiState, x: number, y: number): VisualDie | undefined {
  const drawOrder: VisualDie[] = [];
  drawOrder.push(...uiState.enemyArenaDice);
  drawOrder.push(...uiState.enemyParkedDice);
  drawOrder.push(...uiState.arenaPlayerDice.filter((die) => die.state === "arena"));
  drawOrder.push(...uiState.playerDice.filter((die) => die.state === "parked" || die.state === "dragging"));

  for (let index = drawOrder.length - 1; index >= 0; index -= 1) {
    const die = drawOrder[index];
    if (isPointInsideDie(x, y, die)) {
      return die;
    }
  }

  return undefined;
}

function getInspectorRect(): Rect {
  const screenWidth = love.graphics.getWidth();
  const screenHeight = love.graphics.getHeight();
  const width = Math.max(580, Math.min(980, screenWidth - 70));
  const height = Math.max(420, Math.min(560, screenHeight - 60));
  return {
    x: (screenWidth - width) * 0.5,
    y: (screenHeight - height) * 0.5,
    width,
    height,
  };
}

function getInspectorLayout(faceCount: number): InspectorLayout {
  const panel = getInspectorRect();
  const headerHeight = 72;
  const closeButtonRect: Rect = {
    x: panel.x + panel.width - 42,
    y: panel.y + 10,
    width: 28,
    height: 28,
  };
  const detailsHeight = Math.min(160, Math.max(118, panel.height * 0.24));
  const diagramRect: Rect = {
    x: panel.x + 22,
    y: panel.y + headerHeight,
    width: panel.width - 44,
    height: panel.height - headerHeight - detailsHeight - 20,
  };
  const detailsRect: Rect = {
    x: panel.x + 22,
    y: diagramRect.y + diagramRect.height + 10,
    width: panel.width - 44,
    height: detailsHeight,
  };

  const resolvedFaceCount = Math.max(1, faceCount);
  const areaPadding = 20;
  const aspect = diagramRect.width / Math.max(1, diagramRect.height);
  const columnCount = Math.max(1, Math.min(resolvedFaceCount, Math.ceil(Math.sqrt(resolvedFaceCount * aspect))));
  const rowCount = Math.max(1, Math.ceil(resolvedFaceCount / columnCount));
  const gap = Math.max(4, Math.min(14, Math.floor(Math.min(diagramRect.width, diagramRect.height) * 0.02)));
  const availableWidth = Math.max(24, diagramRect.width - areaPadding * 2 - gap * (columnCount - 1));
  const availableHeight = Math.max(24, diagramRect.height - areaPadding * 2 - gap * (rowCount - 1));
  const tileSize = Math.max(16, Math.floor(Math.min(availableWidth / columnCount, availableHeight / rowCount)));
  const contentWidth = columnCount * tileSize + (columnCount - 1) * gap;
  const contentHeight = rowCount * tileSize + (rowCount - 1) * gap;
  const startX = diagramRect.x + (diagramRect.width - contentWidth) * 0.5;
  const startY = diagramRect.y + (diagramRect.height - contentHeight) * 0.5;

  const tiles: InspectorTile[] = [];
  for (let index = 0; index < faceCount; index += 1) {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    const x = startX + column * (tileSize + gap);
    const y = startY + row * (tileSize + gap);
    tiles.push({
      sideIndex: index,
      rect: {
        x,
        y,
        width: tileSize,
        height: tileSize,
      },
    });
  }

  return {
    panel,
    diagramRect,
    detailsRect,
    closeButtonRect,
    tiles,
    denseMode: faceCount > 20,
  };
}

function getInspectorSideIndexAt(uiState: CombatUiState, state: CombatEncounterState, x: number, y: number): number | undefined {
  const die = getDieFromInspector(uiState, state);
  if (!die) {
    return undefined;
  }

  const layout = getInspectorLayout(die.sides.length);
  for (const tile of layout.tiles) {
    if (isPointInsideRect(x, y, tile.rect)) {
      return tile.sideIndex;
    }
  }

  return undefined;
}

function getDieFromInspector(uiState: CombatUiState, state: CombatEncounterState) {
  if (!uiState.inspector) {
    return undefined;
  }

  const dice = uiState.inspector.owner === "player" ? state.player.dice : state.enemy.dice;
  return dice.find((die) => die.id === uiState.inspector?.combatDieId);
}

function describeDieSide(side: { label: string; describe?: () => string }): string {
  if (typeof side.describe === "function") {
    return side.describe();
  }

  return side.label;
}

function drawDieInspector(uiState: CombatUiState, state: CombatEncounterState): void {
  const die = getDieFromInspector(uiState, state);
  if (!die) {
    uiState.inspector = undefined;
    return;
  }

  const layout = getInspectorLayout(die.sides.length);
  const panel = layout.panel;
  const diagramRect = layout.diagramRect;
  const detailsRect = layout.detailsRect;
  const closeButtonRect = layout.closeButtonRect;

  love.graphics.setColor(0, 0, 0, 0.64);
  love.graphics.rectangle("fill", 0, 0, love.graphics.getWidth(), love.graphics.getHeight());

  love.graphics.setColor(0.08, 0.1, 0.13, 0.98);
  love.graphics.rectangle("fill", panel.x, panel.y, panel.width, panel.height, 8, 8);
  love.graphics.setColor(0.75, 0.82, 0.91, 0.95);
  love.graphics.rectangle("line", panel.x, panel.y, panel.width, panel.height, 8, 8);

  const ownerLabel = uiState.inspector?.owner === "player" ? "Ally" : "Enemy";
  love.graphics.setColor(1, 1, 1);
  love.graphics.print(`${ownerLabel} Die: ${die.name}`, panel.x + 20, panel.y + 14);
  love.graphics.setColor(0.78, 0.83, 0.9);
  love.graphics.print(`${die.sides.length} faces`, panel.x + 20, panel.y + 40);

  love.graphics.setColor(0.2, 0.24, 0.31, 0.95);
  love.graphics.rectangle("fill", closeButtonRect.x, closeButtonRect.y, closeButtonRect.width, closeButtonRect.height, 5, 5);
  love.graphics.setColor(0.75, 0.82, 0.91, 0.95);
  love.graphics.rectangle("line", closeButtonRect.x, closeButtonRect.y, closeButtonRect.width, closeButtonRect.height, 5, 5);
  love.graphics.setColor(1, 1, 1, 0.98);
  love.graphics.printf("X", closeButtonRect.x, closeButtonRect.y + 6, closeButtonRect.width, "center", 0, 0.88, 0.88);

  love.graphics.setColor(0.14, 0.17, 0.22, 0.92);
  love.graphics.rectangle("fill", diagramRect.x, diagramRect.y, diagramRect.width, diagramRect.height, 6, 6);
  love.graphics.setColor(0.62, 0.69, 0.8);
  love.graphics.rectangle("line", diagramRect.x, diagramRect.y, diagramRect.width, diagramRect.height, 6, 6);

  const activeSideIndex = uiState.inspector?.hoveredSideIndex ?? uiState.inspector?.selectedSideIndex;

  for (const tile of layout.tiles) {
    const side = die.sides[tile.sideIndex];
    const label = layout.denseMode ? `${tile.sideIndex + 1}` : side.label;
    const tileLabelScale = layout.denseMode ? 0.6 : 0.8;
    const isActive = activeSideIndex === tile.sideIndex;

    if (isActive) {
      love.graphics.setColor(1, 0.96, 0.82, 1);
    } else {
      love.graphics.setColor(0.94, 0.97, 1, 1);
    }
    love.graphics.rectangle("fill", tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height, 4, 4);
    love.graphics.setColor(0.08, 0.1, 0.14, 1);
    love.graphics.rectangle("line", tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height, 4, 4);

    love.graphics.setColor(0.08, 0.1, 0.14, 1);
    love.graphics.printf(
      label,
      tile.rect.x + 4,
      tile.rect.y + tile.rect.height * 0.42,
      tile.rect.width - 8,
      "center",
      0,
      tileLabelScale,
      tileLabelScale,
    );
  }

  love.graphics.setColor(0.14, 0.17, 0.22, 0.9);
  love.graphics.rectangle("fill", detailsRect.x, detailsRect.y, detailsRect.width, detailsRect.height, 6, 6);
  love.graphics.setColor(0.62, 0.69, 0.8);
  love.graphics.rectangle("line", detailsRect.x, detailsRect.y, detailsRect.width, detailsRect.height, 6, 6);

  love.graphics.setColor(0.88, 0.93, 1);
  const detailsTextScale = 0.86;
  if (activeSideIndex === undefined) {
    love.graphics.printf(
      "Hover or click a face above to view its effect details.",
      detailsRect.x + 14,
      detailsRect.y + 24,
      detailsRect.width - 28,
      "left",
      0,
      detailsTextScale,
      detailsTextScale,
    );
  } else {
    const activeSide = die.sides[activeSideIndex];
    const detailsLine = `Face ${activeSideIndex + 1}: ${activeSide.label} - ${describeDieSide(activeSide)}`;
    love.graphics.printf(
      detailsLine,
      detailsRect.x + 14,
      detailsRect.y + 20,
      detailsRect.width - 28,
      "left",
      0,
      detailsTextScale,
      detailsTextScale,
    );
  }
}

function openInspectorForDie(uiState: CombatUiState, die: VisualDie): void {
  if (!die.combatDieId) {
    return;
  }

  uiState.inspector = {
    owner: die.owner,
    combatDieId: die.combatDieId,
    selectedSideIndex: undefined,
    hoveredSideIndex: undefined,
  };
}

export function closeCombatInspector(uiState: CombatUiState): void {
  uiState.inspector = undefined;
}

export function isCombatInspectorOpen(uiState: CombatUiState): boolean {
  return uiState.inspector !== undefined;
}

export function onCombatMousePressed(
  uiState: CombatUiState,
  state: CombatEncounterState,
  x: number,
  y: number,
  button: number,
): void {
  if (button === 2) {
    const clickedDie = findInteractiveDieAt(uiState, x, y);
    if (clickedDie) {
      openInspectorForDie(uiState, clickedDie);
      return;
    }

    if (uiState.inspector) {
      const inspectorRect = getInspectorRect();
      if (!isPointInsideRect(x, y, inspectorRect)) {
        uiState.inspector = undefined;
      }
    }
    return;
  }

  if (button !== 1) {
    return;
  }

  const turnButton = getTurnButtonState(uiState, state);
  if (turnButton.visible && turnButton.enabled) {
    const turnButtonRect = getTurnButtonRect(uiState.layout);
    if (isPointInsideRect(x, y, turnButtonRect)) {
      if (state.phase === "resolved") {
        uiState.requestedSceneAdvance = true;
        return;
      }

      fastForwardCombatUi(uiState, state);
      return;
    }
  }

  if (uiState.inspector) {
    const die = getDieFromInspector(uiState, state);
    if (!die) {
      uiState.inspector = undefined;
      return;
    }

    const inspectorLayout = getInspectorLayout(die.sides.length);
    if (isPointInsideRect(x, y, inspectorLayout.closeButtonRect)) {
      uiState.inspector = undefined;
      uiState.drag = undefined;
      return;
    }

    const selectedIndex = getInspectorSideIndexAt(uiState, state, x, y);
    if (selectedIndex !== undefined) {
      uiState.inspector.selectedSideIndex = selectedIndex;
      return;
    }

    const inspectorRect = getInspectorRect();
    if (!isPointInsideRect(x, y, inspectorRect)) {
      uiState.inspector = undefined;
    }
    uiState.drag = undefined;
    return;
  }

  for (const die of uiState.playerDice) {
    if (die.state === "arena") {
      continue;
    }

    const half = die.size / 2;
    const inside = x >= die.x - half && x <= die.x + half && y >= die.y - half && y <= die.y + half;
    if (!inside) {
      continue;
    }

    die.state = "dragging";
    die.x = x;
    die.y = y;
    uiState.drag = {
      dieId: die.id,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastDt: 1 / 60,
      skipOnRelease: !canPlayerThrow(uiState, state),
    };
    return;
  }
}

export function onCombatMouseMoved(
  uiState: CombatUiState,
  state: CombatEncounterState,
  x: number,
  y: number,
  dx: number,
  dy: number,
): void {
  if (uiState.inspector) {
    const inspectorRect = getInspectorRect();
    if (isPointInsideRect(x, y, inspectorRect)) {
      uiState.inspector.hoveredSideIndex = getInspectorSideIndexAt(uiState, state, x, y);
    } else {
      uiState.inspector.hoveredSideIndex = undefined;
    }

    return;
  }

  if (!uiState.drag) {
    return;
  }

  const dragged = uiState.playerDice.find((die) => die.id === uiState.drag?.dieId);
  if (!dragged) {
    return;
  }

  dragged.x = x;
  dragged.y = y;
  uiState.drag.lastX = x;
  uiState.drag.lastY = y;
  uiState.drag.lastDt = Math.max(1 / 120, Math.min(1 / 15, Math.sqrt(dx * dx + dy * dy) / 500));
}

export function onCombatMouseReleased(
  uiState: CombatUiState,
  state: CombatEncounterState,
  x: number,
  y: number,
  button: number,
): void {
  if (button !== 1 || !uiState.drag) {
    return;
  }

  const drag = uiState.drag;
  uiState.drag = undefined;

  const dragged = uiState.playerDice.find((die) => die.id === drag.dieId);
  if (!dragged || dragged.slotIndex === undefined || !dragged.combatDieId) {
    return;
  }

  const releaseCanThrow = canPlayerThrow(uiState, state);

  if (drag.skipOnRelease && !releaseCanThrow) {
    if (isInsideArena(uiState, x, y) && state.phase === "enemy-turn") {
      dragged.state = "parked";
      if (dragged.parkX !== undefined && dragged.parkY !== undefined) {
        dragged.x = dragged.parkX;
        dragged.y = dragged.parkY;
      }

      uiState.queuedPlayerThrow = {
        dieId: dragged.id,
        dropX: x,
        dropY: y,
        startX: drag.startX,
        startY: drag.startY,
      };
      fastForwardCombatUi(uiState, state);
      return;
    }

    dragged.state = "parked";
    if (dragged.parkX !== undefined && dragged.parkY !== undefined) {
      dragged.x = dragged.parkX;
      dragged.y = dragged.parkY;
    }

    if (isInsideArena(uiState, x, y)) {
      fastForwardCombatUi(uiState, state);
    }

    return;
  }

  executePlayerThrow(uiState, state, dragged, drag.startX, drag.startY, x, y);
}

function drawHpBar(x: number, y: number, width: number, height: number, ratio: number): void {
  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b);
  love.graphics.rectangle("line", x, y, width, height);
  love.graphics.setColor(GREEN.r, GREEN.g, GREEN.b);
  love.graphics.rectangle("fill", x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4);
}

function drawPlayerIncomingDamagePreview(
  x: number,
  y: number,
  width: number,
  height: number,
  state: CombatEncounterState,
): void {
  if (state.phase !== "player-turn" || state.enemy.hp <= 0) {
    return;
  }

  const incomingDamage = Math.max(0, state.enemyIntent.pendingPlayerDamage - state.player.armor);
  if (incomingDamage <= 0 || state.player.maxHp <= 0) {
    return;
  }

  const currentHp = Math.max(0, Math.min(state.player.maxHp, state.player.hp));
  const projectedHp = Math.max(0, currentHp - incomingDamage);
  const innerWidth = width - 4;
  const startX = x + 2 + (innerWidth * projectedHp) / state.player.maxHp;
  const overlayWidth = (innerWidth * (currentHp - projectedHp)) / state.player.maxHp;

  if (overlayWidth > 0) {
    love.graphics.setColor(0, 0, 0, 0.45);
    love.graphics.rectangle("fill", startX, y + 2, overlayWidth, height - 4);

    love.graphics.setColor(0, 0, 0, 0.7);
    love.graphics.rectangle("fill", startX, y + 2, 2, height - 4);
  }
}

function drawDie(die: VisualDie): void {
  const half = die.size / 2;
  const textScale = 0.56;
  const font = love.graphics.getFont();
  let text = die.rollingLabel ?? die.displayLabel ?? die.label;
  let textX = -half + 4;
  let textY = -6;

  if (font) {
    const maxWidth = die.size - 8;
    while (text.length > 0 && font.getWidth(text) * textScale > maxWidth) {
      text = `${text.slice(0, Math.max(1, text.length - 1))}`;
    }

    if (text !== die.label && text.length > 1) {
      text = `${text.slice(0, Math.max(1, text.length - 1))}…`;
    }

    const textWidth = font.getWidth(text) * textScale;
    textX = -textWidth / 2;
    textY = -font.getHeight() * textScale * 0.5;
  }

  love.graphics.push();
  love.graphics.translate(die.x, die.y);
  love.graphics.rotate(die.angle);
  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b);
  love.graphics.rectangle("fill", -half, -half, die.size, die.size);
  love.graphics.setColor(BLACK.r, BLACK.g, BLACK.b);
  love.graphics.rectangle("line", -half, -half, die.size, die.size);

  if (die.flashTimer !== undefined && die.flashTimer > 0) {
    const flashRatio = die.flashTimer / RESOLVE_FLASH_DURATION;
    const pad = 2 + (1 - flashRatio) * 4;
    love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b, 0.25 + flashRatio * 0.55);
    love.graphics.rectangle("line", -half - pad, -half - pad, die.size + pad * 2, die.size + pad * 2);
  }

  love.graphics.print(text, textX, textY, 0, textScale, textScale);
  love.graphics.pop();
}

function drawCombatLogPanel(uiState: CombatUiState, state: CombatEncounterState): void {
  const layout = uiState.layout;
  const panelX = layout.arenaX + layout.arenaWidth - layout.arenaLogWidth;
  const panelY = layout.arenaY;
  const panelWidth = layout.arenaLogWidth;
  const panelHeight = layout.arenaHeight;

  love.graphics.setColor(0.13, 0.14, 0.16, 0.94);
  love.graphics.rectangle("fill", panelX, panelY, panelWidth, panelHeight);
  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b, 0.7);
  love.graphics.rectangle("line", panelX, panelY, panelWidth, panelHeight);

  love.graphics.setColor(0.84, 0.89, 0.96, 0.98);
  love.graphics.printf("Combat Log", panelX + 10, panelY + 12, panelWidth - 20, "left", 0, 0.86, 0.86);

  const recent = state.combatLog.slice(Math.max(0, state.combatLog.length - 9));
  let lineY = panelY + 38;
  for (let index = 0; index < recent.length; index += 1) {
    love.graphics.setColor(0.9, 0.93, 0.98, 0.94);
    love.graphics.printf(recent[index], panelX + 10, lineY, panelWidth - 16, "left", 0, 0.62, 0.62);
    lineY += 20;
  }
}

function drawFloatingResolutionPopups(uiState: CombatUiState): void {
  for (const popup of uiState.floatingPopups) {
    const alpha = Math.max(0, Math.min(1, popup.timer / POPUP_DURATION));

    if (popup.source === "player") {
      love.graphics.setColor(0.72, 0.96, 0.78, alpha);
    } else {
      love.graphics.setColor(0.96, 0.84, 0.72, alpha);
    }

    love.graphics.printf(popup.text, popup.x - 70, popup.y, 140, "center", 0, 0.72, 0.72);
  }
}

function drawCombatResolutionBanner(state: CombatEncounterState): void {
  if (state.phase !== "resolved") {
    return;
  }

  const screenWidth = love.graphics.getWidth();
  const bannerWidth = 460;
  const bannerHeight = 96;
  const x = (screenWidth - bannerWidth) * 0.5;
  const y = 44;

  const playerWon = state.enemy.hp <= 0 && state.player.hp > 0;
  const title = playerWon ? "You Win" : "Defeat";
  const subtitle = playerWon
    ? "Regrouping and returning to exploration..."
    : "Falling back to exploration...";

  love.graphics.setColor(0.06, 0.08, 0.1, 0.94);
  love.graphics.rectangle("fill", x, y, bannerWidth, bannerHeight, 10, 10);

  if (playerWon) {
    love.graphics.setColor(0.76, 0.95, 0.82, 0.98);
  } else {
    love.graphics.setColor(0.96, 0.78, 0.78, 0.98);
  }
  love.graphics.rectangle("line", x, y, bannerWidth, bannerHeight, 10, 10);

  love.graphics.setColor(1, 1, 1, 1);
  love.graphics.printf(title, x, y + 20, bannerWidth, "center", 0, 1.05, 1.05);

  love.graphics.setColor(0.88, 0.92, 0.97, 0.96);
  love.graphics.printf(subtitle, x, y + 58, bannerWidth, "center", 0, 0.72, 0.72);
}

export function drawCombatUi(uiState: CombatUiState, state: CombatEncounterState): void {
  const layout = uiState.layout;
  const playerHpRatio = state.player.maxHp <= 0 ? 0 : state.player.hp / state.player.maxHp;
  const enemyHpRatio = state.enemy.maxHp <= 0 ? 0 : state.enemy.hp / state.enemy.maxHp;

  love.graphics.setColor(BACKGROUND.r, BACKGROUND.g, BACKGROUND.b);
  love.graphics.rectangle("fill", 0, 0, love.graphics.getWidth(), love.graphics.getHeight());

  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b);
  love.graphics.print(state.player.name, layout.playerNameX, layout.playerNameY);
  drawHpBar(layout.playerNameX, layout.playerNameY + 26, layout.hpBarWidth, layout.hpBarHeight, playerHpRatio);
  drawPlayerIncomingDamagePreview(
    layout.playerNameX,
    layout.playerNameY + 26,
    layout.hpBarWidth,
    layout.hpBarHeight,
    state,
  );

  love.graphics.print(state.enemy.name, layout.enemyNameX, layout.enemyNameY);
  drawHpBar(layout.enemyNameX, layout.enemyNameY + 26, layout.hpBarWidth, layout.hpBarHeight, enemyHpRatio);

  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b);
  love.graphics.rectangle("line", layout.arenaX, layout.arenaY, layout.arenaWidth, layout.arenaHeight);
  drawCombatLogPanel(uiState, state);

  love.graphics.rectangle("line", layout.poolX, layout.poolY, layout.poolWidth, layout.poolHeight);
  love.graphics.print("Dice Pool", layout.poolX + layout.poolWidth * 0.5 - 40, layout.poolY - 34);

  const turnButton = getTurnButtonState(uiState, state);
  if (turnButton.visible) {
    const buttonRect = getTurnButtonRect(layout);
    if (turnButton.enabled) {
      love.graphics.setColor(0.22, 0.5, 0.31, 0.95);
    } else {
      love.graphics.setColor(0.24, 0.24, 0.24, 0.8);
    }
    love.graphics.rectangle("fill", buttonRect.x, buttonRect.y, buttonRect.width, buttonRect.height, 5, 5);

    if (turnButton.enabled) {
      love.graphics.setColor(0.8, 0.95, 0.86, 1);
    } else {
      love.graphics.setColor(0.72, 0.72, 0.72, 0.92);
    }
    love.graphics.rectangle("line", buttonRect.x, buttonRect.y, buttonRect.width, buttonRect.height, 5, 5);

    love.graphics.setColor(1, 1, 1, turnButton.enabled ? 0.98 : 0.84);
    love.graphics.printf(turnButton.label, buttonRect.x, buttonRect.y + 11, buttonRect.width, "center", 0, 0.78, 0.78);
  }

  for (const die of uiState.enemyArenaDice) {
    drawDie(die);
  }

  for (const die of uiState.enemyParkedDice) {
    drawDie(die);
  }

  for (const die of uiState.arenaPlayerDice) {
    if (die.state === "arena") {
      drawDie(die);
    }
  }

  for (const die of uiState.playerDice) {
    if (die.state === "parked" || die.state === "dragging") {
      drawDie(die);
    }
  }

  drawFloatingResolutionPopups(uiState);
  drawCombatResolutionBanner(state);

  love.graphics.setColor(WHITE.r, WHITE.g, WHITE.b);
  love.graphics.print(`Round ${state.round}`, layout.arenaX + 12, layout.arenaY + 10);
  love.graphics.print(`Combat: ${state.phase}`, layout.arenaX + 12, layout.arenaY + 34);

  if (state.phase === "resolved") {
    love.graphics.print("Combat resolved.", layout.poolX + layout.poolWidth - 180, layout.poolY + 14);
  } else if (uiState.pendingRound !== undefined) {
    love.graphics.print("Gathering dice for next round... (Space to skip)", layout.poolX + layout.poolWidth - 360, layout.poolY + 14);
  } else if (state.phase === "player-turn" && !canAdvancePlayerTurn(uiState, state)) {
    const thrown = uiState.rolledPlayerDieIds.length;
    const total = state.player.dice.length;
    love.graphics.print(`Roll and settle dice (${thrown}/${total}) then press Next Turn or Space`, layout.poolX + 14, layout.poolY + 14);
  } else if (canPlayerThrow(uiState, state)) {
    love.graphics.print("Right-click die to inspect, left-drag into arena to throw", layout.poolX + layout.poolWidth - 420, layout.poolY + 14);
  } else {
    love.graphics.print("Right-click any die to inspect. Enemy dice resolving... (Space to skip)", layout.poolX + layout.poolWidth - 468, layout.poolY + 14);
  }

  if (uiState.inspector) {
    drawDieInspector(uiState, state);
  }
}
