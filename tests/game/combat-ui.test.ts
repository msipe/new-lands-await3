import {
  createCombatUiState,
  onCombatMousePressed,
  onCombatMouseReleased,
  updateCombatUiState,
} from "../../src/combat-ui";
import { createCombatEncounter } from "../../src/game/combat-encounter";

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

    expect(uiState.enemyArenaDice).toHaveLength(0);
    expect(uiState.enemyParkedDice).toHaveLength(2);
    expect(uiState.enemyThrowResolvedForRound).toBe(encounter.state.round);
  });
});
