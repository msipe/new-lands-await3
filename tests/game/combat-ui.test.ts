import {
  createCombatUiState,
  onCombatMousePressed,
  onCombatMouseReleased,
  updateCombatUiState,
  drainSettledPlayerDieIds,
  fastForwardCombatUi,
} from "../../src/combat-ui";
import { createCombatEncounter, resolveNextEnemyDie } from "../../src/game/combat-encounter";

describe("combat ui", () => {
  beforeAll(() => {
    const loveMock = {
      graphics: {
        getWidth: () => 1120,
        getHeight: () => 620,
      },
    };

    (global as unknown as { love: unknown }).love = loveMock;
  });

  it("cancels drag-to-skip when released outside arena", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, 0, 0, 1);

    expect(die.state).toBe("parked");
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);
  });

  it("fast-forwards enemy presentation when dropped in arena during enemy turn", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 40;
    const dropY = uiState.layout.arenaY + 40;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.enemyArenaDice).toHaveLength(0);
    expect(uiState.enemyPendingDice).toHaveLength(0);
    expect(uiState.enemyParkedDice.length).toBeGreaterThan(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(encounter.state.round);
  });

  it("keeps enemy dice in arena until all enemy dice settle", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);

    uiState.enemyPendingDice = [];
    uiState.enemyParkedDice = [];
    uiState.enemyArenaDice = [
      {
        id: "enemy-a",
        owner: "enemy",
        combatDieId: "enemy-die-1",
        label: "Shield Bash",
        x: 260,
        y: 240,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        size: 46,
        state: "arena",
        parkX: 880,
        parkY: 90,
        parkSize: 36,
        faceLocked: false,
      },
      {
        id: "enemy-b",
        owner: "enemy",
        combatDieId: "enemy-die-2",
        label: "Sword Slash",
        x: 330,
        y: 260,
        vx: 260,
        vy: 70,
        angle: 0,
        spin: 4,
        size: 46,
        state: "arena",
        parkX: 930,
        parkY: 90,
        parkSize: 36,
        faceLocked: false,
      },
    ];

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.enemyArenaDice).toHaveLength(2);
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);

    uiState.enemyArenaDice[1].vx = 0;
    uiState.enemyArenaDice[1].vy = 0;
    uiState.enemyArenaDice[1].spin = 0;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.enemyArenaDice).toHaveLength(2);
    expect(uiState.enemyParkedDice).toHaveLength(0);
    expect(uiState.enemyThrowResolvedForRound).toBe(0);

    updateCombatUiState(uiState, encounter.state, uiState.enemySettleDelay + 0.05);

    expect(uiState.enemyArenaDice).toHaveLength(0);
    expect(uiState.enemyParkedDice).toHaveLength(2);
    expect(uiState.enemyThrowResolvedForRound).toBe(encounter.state.round);
  });

  it("requires explicit advance to commit settled player dice", () => {
    const encounter = createCombatEncounter();
    while (encounter.state.phase === "enemy-turn") {
      resolveNextEnemyDie(encounter.state, encounter.eventBus);
    }

    const uiState = createCombatUiState(encounter.state);

    for (let index = 0; index < uiState.playerDice.length; index += 1) {
      const die = uiState.playerDice[index];
      onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
      onCombatMouseReleased(
        uiState,
        encounter.state,
        uiState.layout.arenaX + 80 + index * 60,
        uiState.layout.arenaY + 80,
        1,
      );
    }

    for (const die of uiState.arenaPlayerDice) {
      die.vx = 0;
      die.vy = 0;
      die.spin = 0;
    }

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.readyPlayerDieIds).toHaveLength(3);
    expect(drainSettledPlayerDieIds(uiState)).toHaveLength(0);

    fastForwardCombatUi(uiState, encounter.state);

    expect(drainSettledPlayerDieIds(uiState)).toHaveLength(3);
  });

  it("queues throw during enemy turn and executes it when player turn is available", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 70;
    const dropY = uiState.layout.arenaY + 90;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.queuedPlayerThrow?.dieId).toBe(die.id);

    encounter.state.phase = "player-turn";
    uiState.pendingRound = undefined;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.queuedPlayerThrow).toBeUndefined();
    expect(uiState.arenaPlayerDice.find((entry) => entry.id === die.id)).toBeDefined();
    expect(uiState.rolledPlayerDieIds).toContain(die.combatDieId);
  });

  it("preserves queued throw through pending-round finalize", () => {
    const encounter = createCombatEncounter();
    const uiState = createCombatUiState(encounter.state);
    const die = uiState.playerDice[0];

    const dropX = uiState.layout.arenaX + 95;
    const dropY = uiState.layout.arenaY + 110;

    onCombatMousePressed(uiState, encounter.state, die.x, die.y, 1);
    onCombatMouseReleased(uiState, encounter.state, dropX, dropY, 1);

    expect(uiState.queuedPlayerThrow?.dieId).toBe(die.id);
    expect(die.state).toBe("parked");

    encounter.state.phase = "player-turn";
    uiState.pendingRound = encounter.state.round;

    updateCombatUiState(uiState, encounter.state, 1 / 60);

    expect(uiState.queuedPlayerThrow).toBeUndefined();
    expect(uiState.pendingRound).toBeUndefined();
    expect(uiState.arenaPlayerDice.find((entry) => entry.id === die.id)).toBeDefined();
    expect(uiState.rolledPlayerDieIds).toContain(die.combatDieId);
  });
});
